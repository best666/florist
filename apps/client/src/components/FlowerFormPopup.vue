<script setup lang="ts">
import { FlowerCategory } from '@florist/contracts'
import type { IImageAsset } from '@florist/contracts'
import { computed, reactive, ref, watch } from 'vue'
import { uploadPreparedImage } from '@/api'
import {
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_DIFFICULTY_OPTIONS,
  FLOWER_PLACEMENT_OPTIONS,
  FLOWER_STATUS_OPTIONS,
  createDefaultFlowerFormValues,
  type FlowerFormValues,
} from '@/interfaces'
import { useAuthStore, useFlowerTaxonomyStore, useMemberStore } from '@/store'
import {
  compressImageSafely,
  containsIllegalCharacters,
  isBlankString,
  readImageAsDataUrl,
  removeCachedImage,
  revokeCompressedImageUrl,
  showGentleToast,
} from '@/utils'
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import SubmitBtn from './SubmitBtn.vue'
import TagLabel from './TagLabel.vue'

const CUSTOM_CATEGORY_TRIGGER_VALUE = '__custom-category__'
const CUSTOM_STATUS_TRIGGER_VALUE = '__custom-status__'

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
const flowerTaxonomyStore = useFlowerTaxonomyStore()
const authStore = useAuthStore()
const memberStore = useMemberStore()
const customCategoryDraftLabel = ref('')
const customCategoryDraftBaseValue = ref<FlowerCategory>(FlowerCategory.Herbaceous)
const editingCustomCategoryId = ref('')
const creatingCustomCategory = ref(false)
const customStatusDraftLabel = ref('')
const customStatusDraftBaseValue = ref<FlowerFormValues['careStatus']>('healthy')
const editingCustomStatusId = ref('')
const creatingCustomStatus = ref(false)

const customCategories = computed(() => flowerTaxonomyStore.customCategories)
const customCareStatuses = computed(() => flowerTaxonomyStore.customCareStatuses)
const categoryOptions = computed(() => flowerTaxonomyStore.categoryOptions)
const careStatusOptions = computed(() => flowerTaxonomyStore.careStatusOptions)
const categoryOptionsWithCreate = computed(() => ([
  ...categoryOptions.value,
  { label: '+自定义', value: CUSTOM_CATEGORY_TRIGGER_VALUE },
]))
const careStatusOptionsWithCreate = computed(() => ([
  ...careStatusOptions.value,
  { label: '+自定义', value: CUSTOM_STATUS_TRIGGER_VALUE },
]))
const selectedCategoryOptionValue = computed(() => formState.customCategoryId ?? formState.category)
const selectedCareStatusOptionValue = computed(() => formState.customCareStatusId ?? formState.careStatus)
const selectedCustomCategory = computed(() => flowerTaxonomyStore.getCustomCategoryById(formState.customCategoryId))
const selectedCustomStatus = computed(() => flowerTaxonomyStore.getCustomCareStatusById(formState.customCareStatusId))
const selectedCustomCategoryIndex = computed(() => (
  selectedCustomCategory.value
    ? customCategories.value.findIndex(option => option.id === selectedCustomCategory.value?.id)
    : -1
))
const selectedCustomStatusIndex = computed(() => (
  selectedCustomStatus.value
    ? customCareStatuses.value.findIndex(option => option.id === selectedCustomStatus.value?.id)
    : -1
))
const isCategoryEditorVisible = computed(() => creatingCustomCategory.value || Boolean(editingCustomCategoryId.value))
const isStatusEditorVisible = computed(() => creatingCustomStatus.value || Boolean(editingCustomStatusId.value))
const canMoveCategoryUp = computed(() => selectedCustomCategoryIndex.value > 0)
const canMoveCategoryDown = computed(() => (
  selectedCustomCategoryIndex.value >= 0
  && selectedCustomCategoryIndex.value < customCategories.value.length - 1
))
const canMoveStatusUp = computed(() => selectedCustomStatusIndex.value > 0)
const canMoveStatusDown = computed(() => (
  selectedCustomStatusIndex.value >= 0
  && selectedCustomStatusIndex.value < customCareStatuses.value.length - 1
))

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
  formState.customCategoryId = nextValue.customCategoryId
  formState.placement = nextValue.placement
  formState.careDifficulty = nextValue.careDifficulty
  formState.careStatus = nextValue.careStatus
  formState.customCareStatusId = nextValue.customCareStatusId
  formState.note = nextValue.note
  formState.images = [...nextValue.images]
  formState.lastWateredAt = nextValue.lastWateredAt
  formState.lastFertilizedAt = nextValue.lastFertilizedAt
}

function resetCustomEditors(): void {
  customCategoryDraftLabel.value = ''
  customCategoryDraftBaseValue.value = FlowerCategory.Herbaceous
  editingCustomCategoryId.value = ''
  creatingCustomCategory.value = false
  customStatusDraftLabel.value = ''
  customStatusDraftBaseValue.value = 'healthy'
  editingCustomStatusId.value = ''
  creatingCustomStatus.value = false
}

watch(
  () => [props.modelValue, props.initialValue] as const,
  ([isVisible]) => {
    if (!isVisible) {
      return
    }

    assignFormValue(props.initialValue ?? createDefaultFlowerFormValues())
    formError.value = ''
    resetCustomEditors()
  },
  {
    immediate: true,
  },
)

function closePopup(): void {
  emit('update:modelValue', false)
}

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

function showFormError(message: string): void {
  formError.value = message
  showGentleToast(message)
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
  if (!authStore.isAuthenticated) {
    showFormError('请先登录后再添加植物图片。')
    return
  }

  if (!memberStore.hasCloudGardenAccess) {
    showFormError('植物相册和云端图片上传仅对会员开放。')
    return
  }

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
      const compressedResult = await compressImageSafely(tempFilePath, {
        maxSizeInBytes: 1.8 * 1024 * 1024,
      })
      const dataUrl = await readImageAsDataUrl(compressedResult.filePath)
      const uploadedImage = await uploadPreparedImage({
        dataUrl,
        scope: 'flower',
        cropMode: 'card',
        maxWidth: 1440,
        quality: 82,
      })

      if (compressedResult.filePath !== tempFilePath) {
        revokeCompressedImageUrl(compressedResult.filePath)
      }

      nextImages.push(
        createImageAsset(
          uploadedImage.url,
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

  const nextPayload: FlowerFormValues = {
    ...formState,
    name: formState.name.trim(),
    nickname: formState.nickname.trim(),
    note: formState.note.trim(),
    images: [...formState.images],
    lastWateredAt: formState.lastWateredAt.trim(),
    lastFertilizedAt: formState.lastFertilizedAt.trim(),
  }

  emit('submit', {
    ...nextPayload,
    ...(formState.customCategoryId ? { customCategoryId: formState.customCategoryId } : {}),
    ...(formState.customCareStatusId ? { customCareStatusId: formState.customCareStatusId } : {}),
  })
}

function handleSelectCategory(optionValue: string): void {
  if (optionValue === CUSTOM_CATEGORY_TRIGGER_VALUE) {
    creatingCustomCategory.value = true
    editingCustomCategoryId.value = ''
    customCategoryDraftLabel.value = ''
    customCategoryDraftBaseValue.value = formState.category
    return
  }

  const customOption = flowerTaxonomyStore.getCustomCategoryById(optionValue)

  if (customOption) {
    formState.category = customOption.baseValue
    formState.customCategoryId = customOption.id
    creatingCustomCategory.value = false
    return
  }

  formState.category = optionValue as FlowerCategory
  formState.customCategoryId = undefined
  creatingCustomCategory.value = false
  editingCustomCategoryId.value = ''
}

function handleSelectCareStatus(optionValue: string): void {
  if (optionValue === CUSTOM_STATUS_TRIGGER_VALUE) {
    creatingCustomStatus.value = true
    editingCustomStatusId.value = ''
    customStatusDraftLabel.value = ''
    customStatusDraftBaseValue.value = formState.careStatus
    return
  }

  const customOption = flowerTaxonomyStore.getCustomCareStatusById(optionValue)

  if (customOption) {
    formState.careStatus = customOption.baseValue
    formState.customCareStatusId = customOption.id
    creatingCustomStatus.value = false
    return
  }

  formState.careStatus = optionValue as FlowerFormValues['careStatus']
  formState.customCareStatusId = undefined
  creatingCustomStatus.value = false
  editingCustomStatusId.value = ''
}

function handleSaveCustomCategory(): void {
  const label = customCategoryDraftLabel.value.trim()

  if (label.length === 0) {
    showFormError('先写一个自定义分类名称。')
    return
  }

  if (label.length > 10) {
    showFormError('自定义分类先控制在 10 个字以内。')
    return
  }

  if (editingCustomCategoryId.value) {
    flowerTaxonomyStore.updateCustomCategory(editingCustomCategoryId.value, {
      baseValue: customCategoryDraftBaseValue.value,
      label,
    })
    formState.customCategoryId = editingCustomCategoryId.value
  }
  else {
    const nextOption = flowerTaxonomyStore.addCustomCategory(customCategoryDraftBaseValue.value, label)
    formState.customCategoryId = nextOption.id
  }

  formState.category = customCategoryDraftBaseValue.value
  customCategoryDraftLabel.value = ''
  customCategoryDraftBaseValue.value = formState.category
  editingCustomCategoryId.value = ''
  creatingCustomCategory.value = false
}

function handleEditCustomCategory(customCategoryId: string): void {
  const targetOption = flowerTaxonomyStore.getCustomCategoryById(customCategoryId)

  if (!targetOption) {
    return
  }

  editingCustomCategoryId.value = targetOption.id
  creatingCustomCategory.value = false
  customCategoryDraftLabel.value = targetOption.label
  customCategoryDraftBaseValue.value = targetOption.baseValue
}

function handleRemoveCustomCategory(customCategoryId: string): void {
  flowerTaxonomyStore.removeCustomCategory(customCategoryId)

  if (formState.customCategoryId === customCategoryId) {
    formState.customCategoryId = undefined
    formState.category = FlowerCategory.Herbaceous
  }

  if (editingCustomCategoryId.value === customCategoryId) {
    customCategoryDraftLabel.value = ''
    customCategoryDraftBaseValue.value = formState.category
    editingCustomCategoryId.value = ''
    creatingCustomCategory.value = false
  }
}

function handleSaveCustomStatus(): void {
  const label = customStatusDraftLabel.value.trim()

  if (label.length === 0) {
    showFormError('先写一个自定义状态名称。')
    return
  }

  if (label.length > 10) {
    showFormError('自定义状态先控制在 10 个字以内。')
    return
  }

  if (editingCustomStatusId.value) {
    flowerTaxonomyStore.updateCustomCareStatus(editingCustomStatusId.value, {
      baseValue: customStatusDraftBaseValue.value,
      label,
    })
    formState.customCareStatusId = editingCustomStatusId.value
  }
  else {
    const nextOption = flowerTaxonomyStore.addCustomCareStatus(customStatusDraftBaseValue.value, label)
    formState.customCareStatusId = nextOption.id
  }

  formState.careStatus = customStatusDraftBaseValue.value
  customStatusDraftLabel.value = ''
  customStatusDraftBaseValue.value = formState.careStatus
  editingCustomStatusId.value = ''
  creatingCustomStatus.value = false
}

function handleEditCustomStatus(customStatusId: string): void {
  const targetOption = flowerTaxonomyStore.getCustomCareStatusById(customStatusId)

  if (!targetOption) {
    return
  }

  editingCustomStatusId.value = targetOption.id
  creatingCustomStatus.value = false
  customStatusDraftLabel.value = targetOption.label
  customStatusDraftBaseValue.value = targetOption.baseValue
}

function handleRemoveCustomStatus(customStatusId: string): void {
  flowerTaxonomyStore.removeCustomCareStatus(customStatusId)

  if (formState.customCareStatusId === customStatusId) {
    formState.customCareStatusId = undefined
    formState.careStatus = 'healthy'
  }

  if (editingCustomStatusId.value === customStatusId) {
    customStatusDraftLabel.value = ''
    customStatusDraftBaseValue.value = formState.careStatus
    editingCustomStatusId.value = ''
    creatingCustomStatus.value = false
  }
}

function moveSelectedCustomCategory(direction: 'top' | 'up' | 'down'): void {
  if (!selectedCustomCategory.value) {
    return
  }

  flowerTaxonomyStore.moveCustomCategory(selectedCustomCategory.value.id, direction)
}

function moveSelectedCustomStatus(direction: 'top' | 'up' | 'down'): void {
  if (!selectedCustomStatus.value) {
    return
  }

  flowerTaxonomyStore.moveCustomCareStatus(selectedCustomStatus.value.id, direction)
}

function cancelCategoryEditor(): void {
  customCategoryDraftLabel.value = ''
  customCategoryDraftBaseValue.value = formState.category
  editingCustomCategoryId.value = ''
  creatingCustomCategory.value = false
}

function cancelStatusEditor(): void {
  customStatusDraftLabel.value = ''
  customStatusDraftBaseValue.value = formState.careStatus
  editingCustomStatusId.value = ''
  creatingCustomStatus.value = false
}
</script>

<template>
  <view class="fixed inset-0 z-70 flex items-end bg-slate-900/34 backdrop-blur-[6rpx]" :class="modalClass"
    :style="maskMotionStyle" @tap="closePopup">
    <view
      class="max-h-[90svh] w-full rounded-t-[40rpx] bg-white px-5 pb-6 pt-4 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] will-change-transform dark:bg-slate-900"
      :class="panelClass" :style="panelMotionStyle" @tap.stop="() => { }">
      <view class="mb-4" @touchstart.stop="handleTouchStart" @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd" @touchcancel.stop="handleTouchEnd">
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
        <view class="flex items-start justify-between gap-3">
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
      </view>

      <scroll-view scroll-y class="max-h-[68vh] pr-1">
        <view class="flex flex-col gap-4 pb-4">
          <view v-if="formError"
            class="rounded-[24rpx] bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/16 dark:text-rose-200">
            {{ formError }}
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">基础信息</text>
            <view class="mt-3 flex flex-col gap-3">
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">植株名称</text>
                <input v-model="formState.name" :maxlength="20" placeholder="例如：龟背竹"
                  class="field-input-md dark:bg-slate-900 dark:text-slate-100">
              </view>
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">昵称</text>
                <input v-model="formState.nickname" :maxlength="20" placeholder="给它一个可爱称呼"
                  class="field-input-md dark:bg-slate-900 dark:text-slate-100">
              </view>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">图片相册</text>
            <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
              多图上传、预览、删除都会即时落本地缓存，适合离线记录。
            </text>

            <view class="mt-3 grid grid-cols-3 gap-3">
              <view v-for="image in formState.images" :key="image.id"
                class="relative overflow-hidden rounded-[24rpx] bg-white dark:bg-slate-900">
                <AppImage :src="image.url" mode="aspectFill" class="h-[180rpx] w-full" error-text="这张图片先休息一下"
                  @tap="handlePreviewImage(image.url)" />
                <button
                  class="btn-pill-sm absolute right-2 top-2 h-7 min-h-7 w-7 min-w-7 rounded-full bg-slate-900/45 px-0 text-xs text-white"
                  hover-class="opacity-90" @tap.stop="handleRemoveImage(image.id)">
                  ×
                </button>
              </view>

              <button v-if="formState.images.length < 6"
                class="btn-base h-[180rpx] rounded-[24rpx] bg-white px-0 text-slate-500 dark:bg-slate-900 dark:text-slate-200"
                hover-class="opacity-92" @tap="handleChooseImages">
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
                  <button v-for="option in categoryOptionsWithCreate" :key="option.value" class="btn-chip"
                    :class="selectedCategoryOptionValue === option.value ? 'bg-app-mint text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                    hover-class="opacity-92" @tap="handleSelectCategory(option.value)">
                    {{ option.label }}
                  </button>
                </view>

                <view v-if="selectedCustomCategory"
                  class="mt-3 flex items-center gap-2 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900">
                  <view class="min-w-0 flex-1">
                    <text class="block text-2xs text-slate-400 dark:text-slate-500">当前自定义品类</text>
                    <text class="mt-1 block truncate text-sm font-700 text-slate-700 dark:text-slate-100">
                      {{ selectedCustomCategory.label }}
                    </text>
                  </view>
                  <button class="btn-pill-sm bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-200"
                    hover-class="opacity-92" @tap="handleEditCustomCategory(selectedCustomCategory.id)">
                    编辑
                  </button>
                  <button class="btn-pill-sm bg-rose-50 text-rose-500 dark:bg-rose-500/16 dark:text-rose-200"
                    hover-class="opacity-92" @tap="handleRemoveCustomCategory(selectedCustomCategory.id)">
                    删除
                  </button>
                </view>

                <view v-if="isCategoryEditorVisible"
                  class="surface-soft mt-3 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900">
                  <text class="block text-2xs text-slate-400 dark:text-slate-500">
                    {{ editingCustomCategoryId ? '编辑自定义品类' : '新增自定义品类' }}
                  </text>
                  <input v-model="customCategoryDraftLabel"
                    class="field-input-sm mt-2 dark:bg-slate-800 dark:text-slate-100" :maxlength="10"
                    placeholder="例如：兰花、香草" />
                  <view v-if="editingCustomCategoryId && selectedCustomCategoryIndex >= 0"
                    class="mt-3 rounded-[18rpx] bg-app-ivory/70 p-3 dark:bg-slate-800">
                    <text class="block text-2xs text-slate-400 dark:text-slate-500">
                      排序位置：第 {{ selectedCustomCategoryIndex + 1 }} 位
                    </text>
                    <view class="mt-2 flex flex-wrap gap-2">
                      <button class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveCategoryUp ? 'opacity-45' : ''" :disabled="!canMoveCategoryUp"
                        hover-class="opacity-92" @tap="moveSelectedCustomCategory('top')">
                        置顶
                      </button>
                      <button class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveCategoryUp ? 'opacity-45' : ''" :disabled="!canMoveCategoryUp"
                        hover-class="opacity-92" @tap="moveSelectedCustomCategory('up')">
                        前移
                      </button>
                      <button class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveCategoryDown ? 'opacity-45' : ''" :disabled="!canMoveCategoryDown"
                        hover-class="opacity-92" @tap="moveSelectedCustomCategory('down')">
                        后移
                      </button>
                    </view>
                  </view>
                  <view class="mt-3 flex flex-wrap gap-2">
                    <button v-for="option in FLOWER_CATEGORY_OPTIONS" :key="`base-category-${option.value}`"
                      class="btn-chip"
                      :class="customCategoryDraftBaseValue === option.value ? 'bg-app-cream text-slate-700' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
                      hover-class="opacity-92" @tap="customCategoryDraftBaseValue = option.value">
                      归到{{ option.label }}
                    </button>
                  </view>
                  <view class="mt-3 flex gap-2">
                    <button class="btn-pill-sm flex-1 bg-app-mint text-slate-700" hover-class="opacity-92"
                      @tap="handleSaveCustomCategory">
                      {{ editingCustomCategoryId ? '保存分类' : '保存为自定义' }}
                    </button>
                    <button class="btn-pill-sm flex-1 bg-slate-100 text-slate-600" hover-class="opacity-92"
                      @tap="cancelCategoryEditor">
                      取消
                    </button>
                  </view>
                </view>
              </view>

              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">位置</text>
                <view class="flex flex-wrap gap-2">
                  <button v-for="option in FLOWER_PLACEMENT_OPTIONS" :key="option.value" class="btn-chip"
                    :class="formState.placement === option.value ? 'bg-app-blush text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                    hover-class="opacity-92" @tap="formState.placement = option.value">
                    {{ option.label }}
                  </button>
                </view>
              </view>

              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">养护难度</text>
                <view class="flex flex-wrap gap-2">
                  <button v-for="option in FLOWER_DIFFICULTY_OPTIONS" :key="option.value" class="btn-chip"
                    :class="formState.careDifficulty === option.value ? 'bg-app-cream text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                    hover-class="opacity-92" @tap="formState.careDifficulty = option.value">
                    {{ option.label }}
                  </button>
                </view>
              </view>

              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">当前状态</text>
                <view class="flex flex-wrap gap-2">
                  <button v-for="option in careStatusOptionsWithCreate" :key="option.value" class="btn-chip"
                    :class="selectedCareStatusOptionValue === option.value ? 'bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
                    hover-class="opacity-92" @tap="handleSelectCareStatus(option.value)">
                    {{ option.label }}
                  </button>
                </view>

                <view v-if="selectedCustomStatus"
                  class="mt-3 flex items-center gap-2 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900">
                  <view class="min-w-0 flex-1">
                    <text class="block text-2xs text-slate-400 dark:text-slate-500">当前自定义状态</text>
                    <text class="mt-1 block truncate text-sm font-700 text-slate-700 dark:text-slate-100">
                      {{ selectedCustomStatus.label }}
                    </text>
                  </view>
                  <button class="btn-pill-sm bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-200"
                    hover-class="opacity-92" @tap="handleEditCustomStatus(selectedCustomStatus.id)">
                    编辑
                  </button>
                  <button class="btn-pill-sm bg-rose-50 text-rose-500 dark:bg-rose-500/16 dark:text-rose-200"
                    hover-class="opacity-92" @tap="handleRemoveCustomStatus(selectedCustomStatus.id)">
                    删除
                  </button>
                </view>

                <view v-if="isStatusEditorVisible"
                  class="surface-soft mt-3 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900">
                  <text class="block text-2xs text-slate-400 dark:text-slate-500">
                    {{ editingCustomStatusId ? '编辑自定义状态' : '新增自定义状态' }}
                  </text>
                  <input v-model="customStatusDraftLabel"
                    class="field-input-sm mt-2 dark:bg-slate-800 dark:text-slate-100" :maxlength="10"
                    placeholder="例如：爆盆中、缓苗中" />
                  <view v-if="editingCustomStatusId && selectedCustomStatusIndex >= 0"
                    class="mt-3 rounded-[18rpx] bg-app-ivory/70 p-3 dark:bg-slate-800">
                    <text class="block text-2xs text-slate-400 dark:text-slate-500">
                      排序位置：第 {{ selectedCustomStatusIndex + 1 }} 位
                    </text>
                    <view class="mt-2 flex flex-wrap gap-2">
                      <button class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveStatusUp ? 'opacity-45' : ''" :disabled="!canMoveStatusUp"
                        hover-class="opacity-92" @tap="moveSelectedCustomStatus('top')">
                        置顶
                      </button>
                      <button class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveStatusUp ? 'opacity-45' : ''" :disabled="!canMoveStatusUp"
                        hover-class="opacity-92" @tap="moveSelectedCustomStatus('up')">
                        前移
                      </button>
                      <button class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveStatusDown ? 'opacity-45' : ''" :disabled="!canMoveStatusDown"
                        hover-class="opacity-92" @tap="moveSelectedCustomStatus('down')">
                        后移
                      </button>
                    </view>
                  </view>
                  <view class="mt-3 flex flex-wrap gap-2">
                    <button v-for="option in FLOWER_STATUS_OPTIONS" :key="`base-status-${option.value}`"
                      class="btn-chip"
                      :class="customStatusDraftBaseValue === option.value ? 'bg-app-blush text-slate-700' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
                      hover-class="opacity-92" @tap="customStatusDraftBaseValue = option.value">
                      归到{{ option.label }}
                    </button>
                  </view>
                  <view class="mt-3 flex gap-2">
                    <button class="btn-pill-sm flex-1 bg-app-blush text-slate-700" hover-class="opacity-92"
                      @tap="handleSaveCustomStatus">
                      {{ editingCustomStatusId ? '保存状态' : '保存为自定义' }}
                    </button>
                    <button class="btn-pill-sm flex-1 bg-slate-100 text-slate-600" hover-class="opacity-92"
                      @tap="cancelStatusEditor">
                      取消
                    </button>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-slate-700 dark:text-slate-100">养护信息</text>
            <view class="mt-3 flex flex-col gap-3">
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">最近浇水日期</text>
                <input v-model="formState.lastWateredAt" placeholder="例如：2026-05-13"
                  class="field-input-md dark:bg-slate-900 dark:text-slate-100">
              </view>
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">最近施肥日期</text>
                <input v-model="formState.lastFertilizedAt" placeholder="例如：2026-05-01"
                  class="field-input-md dark:bg-slate-900 dark:text-slate-100">
              </view>
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">备注</text>
                <textarea v-model="formState.note" :maxlength="120" auto-height placeholder="写下这盆小植物的养护偏好或当前状态"
                  class="field-textarea dark:bg-slate-900 dark:text-slate-100" />
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="mt-4 flex gap-3">
        <button class="btn-pill-md flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          hover-class="opacity-92" @tap="closePopup">
          先放一放
        </button>
        <view class="flex-1">
          <SubmitBtn :text="submitText" loading-text="保存中..." :loading="isSubmitDisabled" variant="mint" size="md"
            @click="handleSubmit" />
        </view>
      </view>
    </view>
  </view>
</template>
