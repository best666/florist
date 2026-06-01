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
import ImagePicker from './ImagePicker.vue'

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
const isSubmitting = ref(false)

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

    <view class="mt-4">
      <ImagePicker
        v-model="feedbackDraft.images"
        :max-count="3"
        upload-mode="local"
        asset-prefix="feedback-image"
        :max-size-in-bytes="1024 * 1024"
        add-text="添加图片"
        error-text="反馈图片先休息一下"
      />
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
