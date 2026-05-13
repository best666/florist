<script setup lang="ts">
import type { IImageAsset } from '@florist/contracts'
import { computed, reactive, ref, watch } from 'vue'
import {
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_DIFFICULTY_OPTIONS,
  FLOWER_PLACEMENT_OPTIONS,
  FLOWER_STATUS_OPTIONS,
  createDefaultFlowerFormValues,
  type FlowerFormValues,
} from '@/interfaces'
import {
  cacheImageForOffline,
  compressImageSafely,
  containsIllegalCharacters,
  isBlankString,
  removeCachedImage,
  revokeCompressedImageUrl,
} from '@/utils'
import SubmitBtn from './SubmitBtn.vue'
import TagLabel from './TagLabel.vue'

interface FlowerFormPopupProps {
  modelValue: boolean
  mode?: 'create' | 'edit'
  initialValue?: FlowerFormValues | null
  submitting?: boolean
}

const props = withDefaults(defineProps<FlowerFormPopupProps>(), {
  mode: 'create',
  initialValue: null,
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [value: FlowerFormValues]
}>()

const formState = reactive<FlowerFormValues>(createDefaultFlowerFormValues())
const formError = ref('')
const isUploadingImages = ref(false)

const modalClass = computed(() => (
  props.modelValue
    ? 'pointer-events-auto opacity-100'
    : 'pointer-events-none opacity-0'
))

const panelClass = computed(() => (
  props.modelValue
    ? 'translate-y-0 scale-100 opacity-100'
    : 'translate-y-8 scale-[0.98] opacity-0'
))

const panelTitle = computed(() => (props.mode === 'edit' ? '编辑植株档案' : '新增一盆小可爱'))
const submitText = computed(() => (props.mode === 'edit' ? '保存修改' : '创建植株'))
const isSubmitDisabled = computed(() => props.submitting || isUploadingImages.value)

function assignFormValue(nextValue: FlowerFormValues): void {
  formState.name = nextValue.name
  formState.nickname = nextValue.nickname
  formState.category = nextValue.category
  formState.placement = nextValue.placement
  formState.careDifficulty = nextValue.careDifficulty
  formState.careStatus = nextValue.careStatus
  formState.note = nextValue.note
  formState.images = [...nextValue.images]
  formState.lastWateredAt = nextValue.lastWateredAt
  formState.lastFertilizedAt = nextValue.lastFertilizedAt
}

watch(
  () => [props.modelValue, props.initialValue] as const,
  ([isVisible]) => {
    if (!isVisible) {
      return
    }

    assignFormValue(props.initialValue ?? createDefaultFlowerFormValues())
    formError.value = ''
  },
  {
    immediate: true,
  },
)

function closePopup(): void {
  emit('update:modelValue', false)
}

function showFormError(message: string): void {
  formError.value = message
  uni.showToast({
    title: message,
    icon: 'none',
  })
}

function validateForm(): boolean {
  if (isBlankString(formState.name)) {
    showFormError('植株名称不能为空')
    return false
  }

  if (containsIllegalCharacters(formState.name) || containsIllegalCharacters(formState.nickname)) {
    showFormError('名称里有不支持的字符，请换成更温柔的文字')
    return false
  }

  if (containsIllegalCharacters(formState.note)) {
    showFormError('备注里包含非法字符，请调整后再提交')
    return false
  }

  if (formState.name.trim().length > 20) {
    showFormError('植株名称最多 20 个字符')
    return false
  }

  if (formState.nickname.trim().length > 20) {
    showFormError('昵称最多 20 个字符')
    return false
  }

  if (formState.note.trim().length > 120) {
    showFormError('备注最多 120 个字符')
    return false
  }

  formError.value = ''
  return true
}

function createImageAsset(imageUrl: string, compressedUrl?: string): IImageAsset {
  return {
    id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: imageUrl,
    ...(compressedUrl ? { compressedUrl } : {}),
    createdAt: new Date().toISOString(),
  }
}

async function handleChooseImages(): Promise<void> {
  const remainingCount = 6 - formState.images.length

  if (remainingCount <= 0) {
    showFormError('最多上传 6 张图片')
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
    showFormError('图片处理失败，请换一张再试试')
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
    ...formState,
    name: formState.name.trim(),
    nickname: formState.nickname.trim(),
    note: formState.note.trim(),
    images: [...formState.images],
    lastWateredAt: formState.lastWateredAt.trim(),
    lastFertilizedAt: formState.lastFertilizedAt.trim(),
  })
}
</script>

<template>
  <view
    class="fixed inset-0 z-70 flex items-end bg-slate-900/34 transition-opacity duration-250"
    :class="modalClass"
    @tap="closePopup"
  >
    <view
      class="max-h-[90vh] w-full rounded-t-[40rpx] bg-white px-5 pb-6 pt-4 transition-all duration-250 dark:bg-slate-900"
      :class="panelClass"
      @tap.stop="() => {}"
    >
      <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
      <view class="mb-4 flex items-start justify-between gap-3">
        <view>
          <text class="block text-xl font-800 text-slate-800 dark:text-slate-100">
            {{ panelTitle }}
          </text>
          <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
            表单会优先保存到本地加密缓存，断网时也能继续使用。
          </text>
        </view>
        <TagLabel :text="props.mode === 'edit' ? '编辑中' : '新增中'" tone="blush" />
      </view>

      <scroll-view
        scroll-y
        class="max-h-[68vh] pr-1"
      >
        <view class="flex flex-col gap-4 pb-4">
          <view
            v-if="formError"
            class="rounded-[24rpx] bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/16 dark:text-rose-200"
          >
            {{ formError }}
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">基础信息</text>
            <view class="mt-3 flex flex-col gap-3">
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">植株名称</text>
                <input
                  v-model="formState.name"
                  :maxlength="20"
                  placeholder="例如：龟背竹"
                  class="h-11 rounded-[22rpx] bg-white px-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
              </view>
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">昵称</text>
                <input
                  v-model="formState.nickname"
                  :maxlength="20"
                  placeholder="给它一个可爱称呼"
                  class="h-11 rounded-[22rpx] bg-white px-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
              </view>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">图片相册</text>
            <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
              多图上传、预览、删除都会即时落本地缓存，适合离线记录。
            </text>

            <view class="mt-3 grid grid-cols-3 gap-3">
              <view
                v-for="image in formState.images"
                :key="image.id"
                class="relative overflow-hidden rounded-[24rpx] bg-white dark:bg-slate-900"
              >
                <image
                  :src="image.url"
                  mode="aspectFill"
                  class="h-[180rpx] w-full"
                  @tap="handlePreviewImage(image.url)"
                />
                <button
                  class="absolute right-2 top-2 h-7 w-7 rounded-full border-none bg-slate-900/45 px-0 text-xs text-white"
                  hover-class="opacity-90"
                  @tap.stop="handleRemoveImage(image.id)"
                >
                  ×
                </button>
              </view>

              <button
                v-if="formState.images.length < 6"
                class="h-[180rpx] rounded-[24rpx] border-none bg-white px-0 text-slate-500 dark:bg-slate-900 dark:text-slate-200"
                hover-class="opacity-92"
                @tap="handleChooseImages"
              >
                <view class="flex h-full flex-col items-center justify-center gap-2">
                  <text class="text-2xl font-500">+</text>
                  <text class="text-2xs">添加图片</text>
                </view>
              </button>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">分类与状态</text>

            <view class="mt-3 flex flex-col gap-4">
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">品类</text>
                <view class="flex flex-wrap gap-2">
                  <button
                    v-for="option in FLOWER_CATEGORY_OPTIONS"
                    :key="option.value"
                    class="h-9 rounded-full border-none px-4 text-2xs font-700"
                    :class="formState.category === option.value ? 'bg-app-mint text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                    hover-class="opacity-92"
                    @tap="formState.category = option.value"
                  >
                    {{ option.label }}
                  </button>
                </view>
              </view>

              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">位置</text>
                <view class="flex flex-wrap gap-2">
                  <button
                    v-for="option in FLOWER_PLACEMENT_OPTIONS"
                    :key="option.value"
                    class="h-9 rounded-full border-none px-4 text-2xs font-700"
                    :class="formState.placement === option.value ? 'bg-app-blush text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                    hover-class="opacity-92"
                    @tap="formState.placement = option.value"
                  >
                    {{ option.label }}
                  </button>
                </view>
              </view>

              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">养护难度</text>
                <view class="flex flex-wrap gap-2">
                  <button
                    v-for="option in FLOWER_DIFFICULTY_OPTIONS"
                    :key="option.value"
                    class="h-9 rounded-full border-none px-4 text-2xs font-700"
                    :class="formState.careDifficulty === option.value ? 'bg-app-cream text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                    hover-class="opacity-92"
                    @tap="formState.careDifficulty = option.value"
                  >
                    {{ option.label }}
                  </button>
                </view>
              </view>

              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">当前状态</text>
                <view class="flex flex-wrap gap-2">
                  <button
                    v-for="option in FLOWER_STATUS_OPTIONS"
                    :key="option.value"
                    class="h-9 rounded-full border-none px-4 text-2xs font-700"
                    :class="formState.careStatus === option.value ? 'bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                    hover-class="opacity-92"
                    @tap="formState.careStatus = option.value"
                  >
                    {{ option.label }}
                  </button>
                </view>
              </view>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">养护信息</text>
            <view class="mt-3 flex flex-col gap-3">
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">最近浇水日期</text>
                <input
                  v-model="formState.lastWateredAt"
                  placeholder="例如：2026-05-13"
                  class="h-11 rounded-[22rpx] bg-white px-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
              </view>
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">最近施肥日期</text>
                <input
                  v-model="formState.lastFertilizedAt"
                  placeholder="例如：2026-05-01"
                  class="h-11 rounded-[22rpx] bg-white px-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
              </view>
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">备注</text>
                <textarea
                  v-model="formState.note"
                  :maxlength="120"
                  auto-height
                  placeholder="写下这盆小植物的养护偏好或当前状态"
                  class="min-h-[160rpx] rounded-[22rpx] bg-white px-4 py-3 text-sm leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="mt-4 flex gap-3">
        <button
          class="h-11 flex-1 rounded-full border-none bg-slate-100 text-sm font-700 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          hover-class="opacity-92"
          @tap="closePopup"
        >
          先放一放
        </button>
        <view class="flex-1">
          <SubmitBtn
            :text="submitText"
            loading-text="保存中..."
            :loading="isSubmitDisabled"
            variant="mint"
            @click="handleSubmit"
          />
        </view>
      </view>
    </view>
  </view>
</template>
