<script setup lang="ts">
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
  containsIllegalCharacters,
  isBlankString,
  showGentleToast,
} from '@/utils'
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import { removePreparedImageAsset, usePreparedImageAssets } from '@/hooks/usePreparedImageAssets'
import { useAuthStore, useMemberStore } from '@/store'
import AppImage from './AppImage.vue'
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
const authStore = useAuthStore()
const memberStore = useMemberStore()
const { chooseUploadedImageAssets } = usePreparedImageAssets()

const modalClass = computed(() => (
  props.modelValue ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
))

const panelClass = computed(() => (
  props.modelValue ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.98] opacity-0'
))

const selectedActionMeta = computed(() => getRecordActionMeta(formState.actionType))

const {
  handleTouchEnd,
  handleTouchMove,
  handleTouchStart,
  maskMotionStyle,
  panelMotionStyle,
} = useBottomSheetGesture({
  visible: () => props.modelValue,
  onClose: closePopup,
})

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
  if (!authStore.isAuthenticated) {
    showFormError('请先登录后再添加打卡配图。')
    return
  }

  if (!memberStore.hasCloudGardenAccess) {
    showFormError('成长相册和云端打卡配图仅对会员开放。')
    return
  }

  const remainingCount = 4 - formState.images.length

  if (remainingCount <= 0) {
    showFormError('最多添加 4 张配图就够啦。')
    return
  }

  isUploadingImages.value = true

  try {
    const uploadedImages = await chooseUploadedImageAssets({
      assetPrefix: 'record-image',
      count: remainingCount,
      cropMode: 'card',
      maxWidth: 1440,
      quality: 82,
      maxSizeInBytes: 1.8 * 1024 * 1024,
      scope: 'record',
    })

    formState.images = [...formState.images, ...uploadedImages]
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
  await removePreparedImageAsset(targetImage)
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
  <view class="fixed inset-0 z-70 flex items-end bg-slate-900/34 backdrop-blur-[6rpx]" :class="modalClass"
    :style="maskMotionStyle" @tap="closePopup">
    <view
      class="max-h-[90vh] w-full rounded-t-[40rpx] bg-[var(--color-surface)] px-5 pb-6 pt-4 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] will-change-transform dark:bg-slate-900"
      :class="panelClass" :style="panelMotionStyle" @tap.stop="() => { }">
      <view class="mb-4" @touchstart.stop="handleTouchStart" @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd" @touchcancel.stop="handleTouchEnd">
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />

        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-xl font-800 text-app-ink dark:text-slate-100">
              记录一次温柔照顾
            </text>
            <text class="mt-1 block text-sm leading-6 text-app-muted dark:text-slate-300">
              打卡会先保存到本地加密数据里，断网时也能继续写下今天的小进展。
            </text>
          </view>
          <TagLabel :text="selectedActionMeta.label" :tone="selectedActionMeta.tone" />
        </view>
      </view>

      <scroll-view scroll-y class="max-h-[68vh] pr-1">
        <view class="flex flex-col gap-4 pb-4">
          <view v-if="formError"
            class="rounded-[24rpx] bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/16 dark:text-rose-200">
            {{ formError }}
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-app-ink dark:text-slate-100">选择植株</text>
            <view class="mt-3 flex flex-wrap gap-2">
              <button v-for="flower in props.flowerOptions" :key="flower.id" class="btn-chip"
                :class="formState.flowerId === flower.id ? 'bg-app-mint text-app-ink' : 'bg-[var(--color-surface)] text-app-muted dark:bg-slate-900 dark:text-slate-200'"
                hover-class="opacity-92" @tap="formState.flowerId = flower.id">
                {{ flower.nickname || flower.name }}
              </button>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-app-ink dark:text-slate-100">备注与配图</text>
            <view class="mt-3">
              <textarea v-model="formState.note" :maxlength="100" auto-height placeholder="写下今天的变化、叶片状态，或者一点点想说的话。"
                class="field-textarea dark:bg-slate-900 dark:text-slate-100" />
            </view>

            <view class="mt-3 grid grid-cols-3 gap-3">
              <view v-for="image in formState.images" :key="image.id"
                class="relative overflow-hidden rounded-[24rpx] bg-[var(--color-surface)] dark:bg-slate-900">
                <AppImage :src="image.url" mode="aspectFill" class="h-[180rpx] w-full" error-text="这张配图先休息一下"
                  @tap="handlePreviewImage(image.url)" />
                <button
                  class="btn-pill-sm absolute right-2 top-2 h-7 min-h-7 w-7 min-w-7 rounded-full bg-slate-900/45 px-0 text-xs text-white"
                  hover-class="opacity-90" @tap.stop="handleRemoveImage(image.id)">
                  ×
                </button>
              </view>

              <button v-if="formState.images.length < 4"
                class="btn-base h-[180rpx] rounded-[24rpx] bg-[var(--color-surface)] px-0 text-app-muted dark:bg-slate-900 dark:text-slate-200"
                hover-class="opacity-92" @tap="handleChooseImages">
                <view class="flex h-full flex-col items-center justify-center gap-2">
                  <text class="text-2xl font-500">+</text>
                  <text class="text-2xs">添加配图</text>
                </view>
              </button>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-app-ink dark:text-slate-100">打卡类型</text>
            <view class="mt-3 grid grid-cols-3 gap-3">
              <button v-for="option in RECORD_ACTION_OPTIONS" :key="option.value"
                class="app-pressable min-h-[110rpx] rounded-[24rpx] border-2 border-solid px-3 py-3 text-left"
                :class="formState.actionType === option.value ? 'bg-[var(--color-surface)] shadow-[0_12rpx_28rpx_rgba(148,163,184,0.14)] dark:bg-slate-900' : 'bg-[var(--color-surface)]/60 border-transparent dark:bg-slate-900/70'"
                :style="formState.actionType === option.value ? { borderColor: `var(--color-${option.tone === 'slate' ? 'muted' : option.tone})` } : {}"
                hover-class="opacity-92" @tap="formState.actionType = option.value">
                <view class="text-2xl">
                  {{ option.emoji }}
                </view>
                <text class="mt-2 block text-sm font-700 text-app-ink dark:text-slate-100">
                  {{ option.label }}
                </text>
                <text class="mt-1 block text-2xs leading-5 text-app-muted/70 dark:text-app-muted">
                  {{ option.description }}
                </text>
              </button>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="mt-4 flex gap-3">
        <button class="btn-pill-md flex-1 bg-slate-100 text-app-muted dark:bg-slate-800 dark:text-slate-200"
          hover-class="opacity-92" @tap="closePopup">
          先不记录
        </button>
        <view class="flex-1">
          <SubmitBtn text="完成打卡" loading-text="保存中..." :loading="props.submitting || isUploadingImages" variant="mint"
            size="md" @click="handleSubmit" />
        </view>
      </view>
    </view>
  </view>
</template>
