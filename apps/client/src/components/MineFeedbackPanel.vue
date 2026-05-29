<script setup lang="ts">
import type { IImageAsset } from '@florist/contracts'
import { reactive, ref, watch } from 'vue'
import type { MineFeedbackItem } from '@/interfaces'
import {
  createMineEntityId,
  formatDateTime,
  readMineFeedbackHistory,
  showGentleSuccess,
  showGentleToast,
  writeMineFeedbackHistory,
} from '@/utils'
import AppImage from './AppImage.vue'
import { removePreparedImageAsset, usePreparedImageAssets } from '@/hooks/usePreparedImageAssets'

interface MineFeedbackPanelProps {
  readonly refreshToken: number
}

const props = defineProps<MineFeedbackPanelProps>()

const emit = defineEmits<{
  'count-change': [count: number]
}>()

const feedbackDraft = reactive({
  content: '',
  images: [] as IImageAsset[],
})
const feedbackHistory = ref<ReadonlyArray<MineFeedbackItem>>([])
const isChoosingImages = ref(false)
const isSubmitting = ref(false)
const { chooseCachedImageAssets } = usePreparedImageAssets()

function refreshFeedbackHistory(options?: { resetDraft?: boolean }): void {
  feedbackHistory.value = readMineFeedbackHistory()
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  if (options?.resetDraft) {
    feedbackDraft.content = ''
    feedbackDraft.images = []
  }

  emit('count-change', feedbackHistory.value.length)
}

watch(() => props.refreshToken, () => {
  refreshFeedbackHistory({ resetDraft: true })
}, { immediate: true })

function handleContentInput(event: { detail?: { value?: string } }): void {
  feedbackDraft.content = event.detail?.value ?? ''
}

async function handleChooseImages(): Promise<void> {
  const remaining = 3 - feedbackDraft.images.length

  if (remaining <= 0) {
    showGentleToast('反馈图片先保留 3 张以内，会更好整理。')
    return
  }

  isChoosingImages.value = true

  try {
    const imageAssets = await chooseCachedImageAssets({
      assetPrefix: 'feedback-image',
      count: remaining,
      maxSizeInBytes: 1024 * 1024,
    })

    feedbackDraft.images.push(...imageAssets)
  }
  catch {
    // 用户取消选择图片时不提示。
  }
  finally {
    isChoosingImages.value = false
  }
}

async function handleRemoveImage(imageId: string): Promise<void> {
  const targetImage = feedbackDraft.images.find(image => image.id === imageId)

  if (!targetImage) {
    return
  }

  await removePreparedImageAsset(targetImage)
  feedbackDraft.images = feedbackDraft.images.filter(image => image.id !== imageId)
}

async function handleSubmit(): Promise<void> {
  if (feedbackDraft.content.trim().length < 5) {
    showGentleToast('反馈内容写满 5 个字，我们会更容易看懂你的想法。')
    return
  }

  isSubmitting.value = true

  try {
    const nextFeedback: MineFeedbackItem = {
      id: createMineEntityId('feedback'),
      content: feedbackDraft.content.trim(),
      images: feedbackDraft.images.map(image => ({ ...image })),
      createdAt: new Date().toISOString(),
    }

    const nextHistory = [nextFeedback, ...feedbackHistory.value].slice(0, 10)
    writeMineFeedbackHistory(nextHistory)
    feedbackHistory.value = nextHistory
    feedbackDraft.content = ''
    feedbackDraft.images = []
    emit('count-change', feedbackHistory.value.length)
    showGentleSuccess('反馈草稿已经本地保存好啦。')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <view>
    <textarea class="field-textarea mt-4 min-h-[180rpx] bg-[var(--color-cream)]/50 leading-7 text-app-ink" :maxlength="300"
      :value="feedbackDraft.content" auto-height placeholder="比如：某个页面交互不顺手、希望增加什么能力、或者哪一步让你有点卡住。"
      @input="handleContentInput" />

    <view class="mt-4 grid grid-cols-3 gap-3">
      <view v-for="image in feedbackDraft.images" :key="image.id"
        class="relative overflow-hidden rounded-[24rpx] bg-[var(--color-cream)]/40">
        <AppImage class="h-[180rpx] w-full" :src="image.url" mode="aspectFill" error-text="反馈图片先休息一下" />
        <button
          class="btn-pill-sm absolute right-2 top-2 h-8 min-h-8 w-8 min-w-8 rounded-full bg-black/55 px-0 text-xs text-white"
          hover-class="opacity-92" @tap="handleRemoveImage(image.id)">
          ×
        </button>
      </view>

      <button v-if="feedbackDraft.images.length < 3"
        class="btn-base h-[180rpx] rounded-[24rpx] bg-[var(--color-cream)]/60 text-sm font-700 text-app-muted"
        hover-class="opacity-92" :loading="isChoosingImages" @tap="handleChooseImages">
        + 添加图片
      </button>
    </view>

    <button class="btn-panel mt-4 bg-linear-to-r from-[var(--color-blush)]/45 to-[var(--color-gold)]/60 text-app-ink" hover-class="opacity-92"
      :loading="isSubmitting" @tap="handleSubmit">
      保存反馈草稿
    </button>

    <view v-if="feedbackHistory.length > 0" class="mt-4 flex flex-col gap-3">
      <view v-for="item in feedbackHistory.slice(0, 3)" :key="item.id" class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4">
        <view class="flex items-center justify-between gap-3 text-2xs text-app-muted/70">
          <text>{{ formatDateTime(item.createdAt, { pattern: 'YYYY-MM-DD HH:mm' }) }}</text>
          <text>{{ item.images.length }} 张图片</text>
        </view>
        <text class="mt-2 block text-sm leading-6 text-app-ink">{{ item.content }}</text>
      </view>
    </view>
  </view>
</template>
