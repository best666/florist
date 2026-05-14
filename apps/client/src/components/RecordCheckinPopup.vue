<script setup lang="ts">
import type { IImageAsset } from '@florist/contracts'
import { RecordActionType } from '@florist/contracts'
import { computed, reactive, ref, watch } from 'vue'
import {
  DEFAULT_RECORD_ACTION_TYPE,
  RECORD_ACTION_OPTIONS,
  RECORD_COOLDOWN_PRESET_OPTIONS,
  createDefaultRecordFormValues,
  getRecordActionMeta,
  type LocalFlower,
  type RecordFormValues,
} from '@/interfaces'
import {
  cacheImageForOffline,
  compressImageSafely,
  containsIllegalCharacters,
  isBlankString,
  removeCachedImage,
  revokeCompressedImageUrl,
  showGentleToast,
} from '@/utils'
import SubmitBtn from './SubmitBtn.vue'
import TagLabel from './TagLabel.vue'

interface RecordCheckinPopupProps {
  modelValue: boolean
  flowerOptions: ReadonlyArray<LocalFlower>
  initialFlowerId?: string
  initialActionType?: RecordActionType
  submitting?: boolean
}

const props = withDefaults(defineProps<RecordCheckinPopupProps>(), {
  initialFlowerId: '',
  initialActionType: DEFAULT_RECORD_ACTION_TYPE,
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [value: RecordFormValues]
}>()

const formState = reactive<RecordFormValues>(createDefaultRecordFormValues())
const formError = ref('')
const isUploadingImages = ref(false)

const modalClass = computed(() => (
  props.modelValue ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
))

const panelClass = computed(() => (
  props.modelValue ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.98] opacity-0'
))

const selectedActionMeta = computed(() => getRecordActionMeta(formState.actionType))

watch(
  () => [props.modelValue, props.initialFlowerId, props.initialActionType] as const,
  ([visible, initialFlowerId, initialActionType]) => {
    if (!visible) {
      return
    }

    const defaultValues = createDefaultRecordFormValues()
    formState.flowerId = initialFlowerId || props.flowerOptions[0]?.id || ''
    formState.actionType = initialActionType ?? defaultValues.actionType
    formState.note = defaultValues.note
    formState.images = defaultValues.images
    formState.cooldownMinutes = defaultValues.cooldownMinutes
    formError.value = ''
  },
  { immediate: true },
)

function closePopup(): void {
  emit('update:modelValue', false)
}

function showFormError(message: string): void {
  formError.value = message
  showGentleToast(message)
}

function createImageAsset(imageUrl: string, compressedUrl?: string): IImageAsset {
  return {
    id: `record-image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: imageUrl,
    ...(compressedUrl ? { compressedUrl } : {}),
    createdAt: new Date().toISOString(),
  }
}

function validateForm(): boolean {
  if (isBlankString(formState.flowerId)) {
    showFormError('先选一盆植物，再轻轻记录这次照顾。')
    return false
  }

  if (containsIllegalCharacters(formState.note)) {
    showFormError('备注里有不支持的字符，换种更柔和的写法吧。')
    return false
  }

  if (formState.note.trim().length > 100) {
    showFormError('备注最多 100 个字，简短一点会更清楚。')
    return false
  }

  if (!Number.isFinite(formState.cooldownMinutes) || formState.cooldownMinutes <= 0) {
    showFormError('冷却时间需要大于 0 分钟。')
    return false
  }

  return true
}

async function handleChooseImages(): Promise<void> {
  const remainingCount = 4 - formState.images.length

  if (remainingCount <= 0) {
    showFormError('最多添加 4 张配图就够啦。')
    return
  }

  isUploadingImages.value = true

  try {
    const imageResult = await uni.chooseImage({
      count: remainingCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })

    const nextImages = [...formState.images]

    for (const tempFilePath of imageResult.tempFilePaths) {
      const compressedResult = await compressImageSafely(tempFilePath)
      const cachedImagePath = await cacheImageForOffline(compressedResult.filePath)

      if (compressedResult.filePath !== cachedImagePath) {
        revokeCompressedImageUrl(compressedResult.filePath)
      }

      nextImages.push(
        createImageAsset(
          cachedImagePath,
          compressedResult.filePath !== cachedImagePath ? compressedResult.filePath : undefined,
        ),
      )
    }

    formState.images = nextImages
  }
  catch {
    showFormError('这次配图没保存成功，换一张再试试。')
  }
  finally {
    isUploadingImages.value = false
  }
}

function handlePreviewImage(currentImageUrl: string): void {
  uni.previewImage({
    urls: formState.images.map(image => image.url),
    current: currentImageUrl,
  })
}

async function handleRemoveImage(imageId: string): Promise<void> {
  const targetImage = formState.images.find(image => image.id === imageId)

  if (!targetImage) {
    return
  }

  formState.images = formState.images.filter(image => image.id !== imageId)
  await removeCachedImage(targetImage.url)
}

function handleSubmit(): void {
  if (!validateForm()) {
    return
  }

  emit('submit', {
    flowerId: formState.flowerId,
    actionType: formState.actionType,
    note: formState.note.trim(),
    images: [...formState.images],
    cooldownMinutes: Math.round(formState.cooldownMinutes),
  })
}
</script>

<template>
  <view class="fixed inset-0 z-70 flex items-end bg-slate-900/34 transition-opacity duration-250" :class="modalClass"
    @tap="closePopup">
    <view
      class="max-h-[90vh] w-full rounded-t-[40rpx] bg-white px-5 pb-6 pt-4 transition-all duration-250 dark:bg-slate-900"
      :class="panelClass" @tap.stop="() => { }">
      <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />

      <view class="mb-4 flex items-start justify-between gap-3">
        <view>
          <text class="block text-xl font-800 text-slate-800 dark:text-slate-100">
            记录一次温柔照顾
          </text>
          <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
            打卡会先保存到本地加密数据里，断网时也能继续写下今天的小进展。
          </text>
        </view>
        <TagLabel :text="selectedActionMeta.label" :tone="selectedActionMeta.tone" />
      </view>

      <scroll-view scroll-y class="max-h-[68vh] pr-1">
        <view class="flex flex-col gap-4 pb-4">
          <view v-if="formError"
            class="rounded-[24rpx] bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/16 dark:text-rose-200">
            {{ formError }}
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">打卡类型</text>
            <view class="mt-3 grid grid-cols-3 gap-3">
              <button v-for="option in RECORD_ACTION_OPTIONS" :key="option.value"
                class="min-h-[110rpx] rounded-[24rpx] border-none px-3 py-3 text-left"
                :class="formState.actionType === option.value ? 'bg-white shadow-[0_12rpx_28rpx_rgba(148,163,184,0.14)] dark:bg-slate-900' : 'bg-white/60 dark:bg-slate-900/70'"
                hover-class="opacity-92" @tap="formState.actionType = option.value">
                <view class="text-2xl">
                  {{ option.emoji }}
                </view>
                <text class="mt-2 block text-sm font-700 text-slate-700 dark:text-slate-100">
                  {{ option.label }}
                </text>
                <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
                  {{ option.description }}
                </text>
              </button>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">选择植株</text>
            <view class="mt-3 flex flex-wrap gap-2">
              <button v-for="flower in props.flowerOptions" :key="flower.id"
                class="h-10 rounded-full border-none px-4 text-2xs font-700"
                :class="formState.flowerId === flower.id ? 'bg-app-mint text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                hover-class="opacity-92" @tap="formState.flowerId = flower.id">
                {{ flower.nickname || flower.name }}
              </button>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">冷却时间</text>
            <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
              同一盆植物的同类操作会按这次设置的冷却时间做重复拦截。
            </text>

            <view class="mt-3 flex flex-wrap gap-2">
              <button v-for="option in RECORD_COOLDOWN_PRESET_OPTIONS" :key="option.value"
                class="h-9 rounded-full border-none px-4 text-2xs font-700"
                :class="formState.cooldownMinutes === option.value ? 'bg-app-blush text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                hover-class="opacity-92" @tap="formState.cooldownMinutes = option.value">
                {{ option.label }}
              </button>
            </view>

            <view class="mt-3">
              <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">自定义分钟</text>
              <input :value="String(formState.cooldownMinutes)" type="number" placeholder="输入冷却分钟数"
                class="h-11 rounded-[22rpx] bg-white px-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                @input="formState.cooldownMinutes = Number($event.detail.value || 0)">
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">备注与配图</text>
            <view class="mt-3">
              <textarea v-model="formState.note" :maxlength="100" auto-height placeholder="写下今天的变化、叶片状态，或者一点点想说的话。"
                class="min-h-[150rpx] rounded-[22rpx] bg-white px-4 py-3 text-sm leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            </view>

            <view class="mt-3 grid grid-cols-3 gap-3">
              <view v-for="image in formState.images" :key="image.id"
                class="relative overflow-hidden rounded-[24rpx] bg-white dark:bg-slate-900">
                <AppImage :src="image.url" mode="aspectFill" class="h-[180rpx] w-full" error-text="这张配图先休息一下"
                  @tap="handlePreviewImage(image.url)" />
                <button
                  class="absolute right-2 top-2 h-7 w-7 rounded-full border-none bg-slate-900/45 px-0 text-xs text-white"
                  hover-class="opacity-90" @tap.stop="handleRemoveImage(image.id)">
                  ×
                </button>
              </view>

              <button v-if="formState.images.length < 4"
                class="h-[180rpx] rounded-[24rpx] border-none bg-white px-0 text-slate-500 dark:bg-slate-900 dark:text-slate-200"
                hover-class="opacity-92" @tap="handleChooseImages">
                <view class="flex h-full flex-col items-center justify-center gap-2">
                  <text class="text-2xl font-500">+</text>
                  <text class="text-2xs">添加配图</text>
                </view>
              </button>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="mt-4 flex gap-3">
        <button
          class="h-11 flex-1 rounded-full border-none bg-slate-100 text-sm font-700 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          hover-class="opacity-92" @tap="closePopup">
          先不记录
        </button>
        <view class="flex-1">
          <SubmitBtn text="完成打卡" loading-text="保存中..." :loading="props.submitting || isUploadingImages" variant="mint"
            @click="handleSubmit" />
        </view>
      </view>
    </view>
  </view>
</template>
