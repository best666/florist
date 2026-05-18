<script setup lang="ts">
import { FlowerCareDifficulty, FlowerCategory, FlowerPlacement } from '@florist/contracts'
import { computed, reactive, ref, watch } from 'vue'
import {
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_DIFFICULTY_OPTIONS,
  FLOWER_PLACEMENT_OPTIONS,
  FLOWER_STATUS_OPTIONS,
  createDefaultFlowerFormValues,
  type FlowerFormValues,
} from '@/interfaces'
import { useAuthStore, useFlowerTaxonomyStore, useMemberStore } from '@/store'
import { containsIllegalCharacters, isBlankString, showGentleToast } from '@/utils'
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import { useCustomOptionEditor } from '@/hooks/useCustomOptionEditor'
import { removePreparedImageAsset, usePreparedImageAssets } from '@/hooks/usePreparedImageAssets'
import SubmitBtn from './SubmitBtn.vue'
import TagLabel from './TagLabel.vue'

const CUSTOM_CATEGORY_TRIGGER_VALUE = '__custom-category__'
const CUSTOM_PLACEMENT_TRIGGER_VALUE = '__custom-placement__'
const CUSTOM_DIFFICULTY_TRIGGER_VALUE = '__custom-difficulty__'
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
const authStore = useAuthStore()
const memberStore = useMemberStore()
const { chooseUploadedImageAssets } = usePreparedImageAssets()

// 自定义选项编辑器（品类/位置/难度/状态共用同一套逻辑）
const categoryEditor = useCustomOptionEditor({
  baseValue: computed({
    get: () => formState.category,
    set: (v: string) => {
      formState.category = v as FlowerCategory
    },
  }),
  customId: computed({
    get: () => formState.customCategoryId,
    set: (v) => {
      formState.customCategoryId = v
    },
  }),
  fallbackBaseValue: FlowerCategory.Herbaceous,
  type: 'category',
  typeLabel: '分类',
})
const placementEditor = useCustomOptionEditor({
  baseValue: computed({
    get: () => formState.placement,
    set: (v: string) => {
      formState.placement = v as FlowerPlacement
    },
  }),
  customId: computed({
    get: () => formState.customPlacementId,
    set: (v) => {
      formState.customPlacementId = v
    },
  }),
  fallbackBaseValue: FlowerPlacement.IndoorBalcony,
  type: 'placement',
  typeLabel: '位置',
})
const difficultyEditor = useCustomOptionEditor({
  baseValue: computed({
    get: () => formState.careDifficulty,
    set: (v: string) => {
      formState.careDifficulty = v as FlowerCareDifficulty
    },
  }),
  customId: computed({
    get: () => formState.customCareDifficultyId,
    set: (v) => {
      formState.customCareDifficultyId = v
    },
  }),
  fallbackBaseValue: FlowerCareDifficulty.Easy,
  type: 'difficulty',
  typeLabel: '难度',
})
const statusEditor = useCustomOptionEditor({
  baseValue: computed({
    get: () => formState.careStatus,
    set: (v: string) => {
      formState.careStatus = v as FlowerFormValues['careStatus']
    },
  }),
  customId: computed({
    get: () => formState.customCareStatusId,
    set: (v) => {
      formState.customCareStatusId = v
    },
  }),
  fallbackBaseValue: 'healthy',
  type: 'status',
  typeLabel: '状态',
})

// 保持原有模板变量名兼容
const {
  draftLabel: customCategoryDraftLabel,
  draftBaseValue: customCategoryDraftBaseValue,
  editingId: editingCustomCategoryId,
  isCreating: creatingCustomCategory,
  selectedOption: selectedCustomCategory,
  selectedIndex: selectedCustomCategoryIndex,
  isEditorVisible: isCategoryEditorVisible,
  canMoveUp: canMoveCategoryUp,
  canMoveDown: canMoveCategoryDown,
} = categoryEditor
const {
  draftLabel: customPlacementDraftLabel,
  draftBaseValue: customPlacementDraftBaseValue,
  editingId: editingCustomPlacementId,
  isCreating: creatingCustomPlacement,
  selectedOption: selectedCustomPlacement,
  selectedIndex: selectedCustomPlacementIndex,
  isEditorVisible: isPlacementEditorVisible,
  canMoveUp: canMovePlacementUp,
  canMoveDown: canMovePlacementDown,
} = placementEditor
const {
  draftLabel: customDifficultyDraftLabel,
  draftBaseValue: customDifficultyDraftBaseValue,
  editingId: editingCustomDifficultyId,
  isCreating: creatingCustomDifficulty,
  selectedOption: selectedCustomDifficulty,
  selectedIndex: selectedCustomDifficultyIndex,
  isEditorVisible: isDifficultyEditorVisible,
  canMoveUp: canMoveDifficultyUp,
  canMoveDown: canMoveDifficultyDown,
} = difficultyEditor
const {
  draftLabel: customStatusDraftLabel,
  draftBaseValue: customStatusDraftBaseValue,
  editingId: editingCustomStatusId,
  isCreating: creatingCustomStatus,
  selectedOption: selectedCustomStatus,
  selectedIndex: selectedCustomStatusIndex,
  isEditorVisible: isStatusEditorVisible,
  canMoveUp: canMoveStatusUp,
  canMoveDown: canMoveStatusDown,
} = statusEditor

const flowerTaxonomyStore = useFlowerTaxonomyStore()
const categoryOptions = computed(() => flowerTaxonomyStore.categoryOptions)
const placementOptions = computed(() => flowerTaxonomyStore.placementOptions)
const careDifficultyOptions = computed(() => flowerTaxonomyStore.careDifficultyOptions)
const careStatusOptions = computed(() => flowerTaxonomyStore.careStatusOptions)
const categoryOptionsWithCreate = computed(() => [
  ...categoryOptions.value,
  { label: '+自定义', value: CUSTOM_CATEGORY_TRIGGER_VALUE },
])
const placementOptionsWithCreate = computed(() => [
  ...placementOptions.value,
  { label: '+自定义', value: CUSTOM_PLACEMENT_TRIGGER_VALUE },
])
const careDifficultyOptionsWithCreate = computed(() => [
  ...careDifficultyOptions.value,
  { label: '+自定义', value: CUSTOM_DIFFICULTY_TRIGGER_VALUE },
])
const careStatusOptionsWithCreate = computed(() => [
  ...careStatusOptions.value,
  { label: '+自定义', value: CUSTOM_STATUS_TRIGGER_VALUE },
])
const selectedCategoryOptionValue = computed(() => formState.customCategoryId ?? formState.category)
const selectedPlacementOptionValue = computed(
  () => formState.customPlacementId ?? formState.placement,
)
const selectedDifficultyOptionValue = computed(
  () => formState.customCareDifficultyId ?? formState.careDifficulty,
)
const selectedCareStatusOptionValue = computed(
  () => formState.customCareStatusId ?? formState.careStatus,
)

const modalClass = computed(() =>
  props.modelValue ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
)

const panelClass = computed(() =>
  props.modelValue ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.98] opacity-0',
)

const panelTitle = computed(() => (props.mode === 'edit' ? '编辑植株档案' : '新增一盆小可爱'))
const submitText = computed(() => (props.mode === 'edit' ? '保存修改' : '创建植株'))
const isSubmitDisabled = computed(() => props.submitting || isUploadingImages.value)

function assignFormValue(nextValue: FlowerFormValues): void {
  formState.name = nextValue.name
  formState.nickname = nextValue.nickname
  formState.category = nextValue.category
  formState.customCategoryId = nextValue.customCategoryId
  formState.placement = nextValue.placement
  formState.customPlacementId = nextValue.customPlacementId
  formState.careDifficulty = nextValue.careDifficulty
  formState.customCareDifficultyId = nextValue.customCareDifficultyId
  formState.careStatus = nextValue.careStatus
  formState.customCareStatusId = nextValue.customCareStatusId
  formState.note = nextValue.note
  formState.images = [...nextValue.images]
  formState.lastWateredAt = nextValue.lastWateredAt
  formState.lastFertilizedAt = nextValue.lastFertilizedAt
}

function resetCustomEditors(): void {
  categoryEditor.resetEditor()
  placementEditor.resetEditor()
  difficultyEditor.resetEditor()
  statusEditor.resetEditor()
}

watch(
  () => [props.modelValue, props.initialValue] as const,
  ([isVisible]) => {
    if (!isVisible) {
      return
    }

    const nextValue = props.initialValue ?? createDefaultFlowerFormValues()
    assignFormValue(nextValue)

    if (!props.initialValue && props.mode === 'create') {
      formState.lastWateredAt = ''
      formState.lastFertilizedAt = ''
    }

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

const { handleTouchEnd, handleTouchMove, handleTouchStart, maskMotionStyle, panelMotionStyle } =
  useBottomSheetGesture({
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
    const uploadedImages = await chooseUploadedImageAssets({
      assetPrefix: 'image',
      count: remainingCount,
      cropMode: 'card',
      maxWidth: 1440,
      quality: 82,
      maxSizeInBytes: 1.8 * 1024 * 1024,
      scope: 'flower',
    })

    formState.images = [...formState.images, ...uploadedImages]
  } catch {
    showFormError('图片处理失败，请换一张再试试')
  } finally {
    isUploadingImages.value = false
  }
}

function handlePreviewImage(currentImageUrl: string): void {
  uni.previewImage({
    urls: formState.images.map((image) => image.url),
    current: currentImageUrl,
  })
}

async function handleRemoveImage(imageId: string): Promise<void> {
  const targetImage = formState.images.find((image) => image.id === imageId)

  if (!targetImage) {
    return
  }

  formState.images = formState.images.filter((image) => image.id !== imageId)
  await removePreparedImageAsset(targetImage)
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
    ...(formState.customPlacementId ? { customPlacementId: formState.customPlacementId } : {}),
    ...(formState.customCareDifficultyId
      ? { customCareDifficultyId: formState.customCareDifficultyId }
      : {}),
    ...(formState.customCareStatusId ? { customCareStatusId: formState.customCareStatusId } : {}),
  })
}

function handleSelectCategory(optionValue: string): void {
  if (optionValue === CUSTOM_CATEGORY_TRIGGER_VALUE) {
    categoryEditor.startCreate(formState.category)
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
    statusEditor.startCreate(formState.careStatus)
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

function handleSelectPlacement(optionValue: string): void {
  if (optionValue === CUSTOM_PLACEMENT_TRIGGER_VALUE) {
    placementEditor.startCreate(formState.placement)
    return
  }
  const customOption = flowerTaxonomyStore.getCustomPlacementById(optionValue)
  if (customOption) {
    formState.placement = customOption.baseValue
    formState.customPlacementId = customOption.id
    creatingCustomPlacement.value = false
    return
  }
  formState.placement = optionValue as FlowerPlacement
  formState.customPlacementId = undefined
  creatingCustomPlacement.value = false
  editingCustomPlacementId.value = ''
}

function handleSelectDifficulty(optionValue: string): void {
  if (optionValue === CUSTOM_DIFFICULTY_TRIGGER_VALUE) {
    difficultyEditor.startCreate(formState.careDifficulty)
    return
  }
  const customOption = flowerTaxonomyStore.getCustomCareDifficultyById(optionValue)
  if (customOption) {
    formState.careDifficulty = customOption.baseValue
    formState.customCareDifficultyId = customOption.id
    creatingCustomDifficulty.value = false
    return
  }
  formState.careDifficulty = optionValue as FlowerCareDifficulty
  formState.customCareDifficultyId = undefined
  creatingCustomDifficulty.value = false
  editingCustomDifficultyId.value = ''
}

function handleSaveCustomCategory(): void {
  const error = categoryEditor.save()
  if (error) showFormError(error)
}
function handleSaveCustomStatus(): void {
  const error = statusEditor.save()
  if (error) showFormError(error)
}
function handleSaveCustomPlacement(): void {
  const error = placementEditor.save()
  if (error) showFormError(error)
}
function handleSaveCustomDifficulty(): void {
  const error = difficultyEditor.save()
  if (error) showFormError(error)
}

function handleEditCustomCategory(customCategoryId: string): void {
  categoryEditor.startEdit(customCategoryId)
}
function handleEditCustomStatus(customStatusId: string): void {
  statusEditor.startEdit(customStatusId)
}
function handleEditCustomPlacement(customPlacementId: string): void {
  placementEditor.startEdit(customPlacementId)
}
function handleEditCustomDifficulty(customCareDifficultyId: string): void {
  difficultyEditor.startEdit(customCareDifficultyId)
}

function handleRemoveCustomCategory(customCategoryId: string): void {
  categoryEditor.removeOption(customCategoryId)
}
function handleRemoveCustomStatus(customStatusId: string): void {
  statusEditor.removeOption(customStatusId)
}
function handleRemoveCustomPlacement(customPlacementId: string): void {
  placementEditor.removeOption(customPlacementId)
}
function handleRemoveCustomDifficulty(customCareDifficultyId: string): void {
  difficultyEditor.removeOption(customCareDifficultyId)
}

function moveSelectedCustomCategory(direction: 'top' | 'up' | 'down'): void {
  categoryEditor.moveSelected(direction)
}
function moveSelectedCustomStatus(direction: 'top' | 'up' | 'down'): void {
  statusEditor.moveSelected(direction)
}
function moveSelectedCustomPlacement(direction: 'top' | 'up' | 'down'): void {
  placementEditor.moveSelected(direction)
}
function moveSelectedCustomDifficulty(direction: 'top' | 'up' | 'down'): void {
  difficultyEditor.moveSelected(direction)
}

function cancelCategoryEditor(): void {
  categoryEditor.cancel()
}

function cancelStatusEditor(): void {
  statusEditor.cancel()
}

function cancelPlacementEditor(): void {
  placementEditor.cancel()
}

function cancelDifficultyEditor(): void {
  difficultyEditor.cancel()
}

function resolvePickerDateValue(value: string): string {
  const normalizedValue = value.trim().slice(0, 10)

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue
  }

  return new Date().toISOString().slice(0, 10)
}

function hasExplicitDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim().slice(0, 10))
}

function resolvePickerDateText(value: string): string {
  return hasExplicitDate(value) ? value.trim().slice(0, 10) : '选填'
}

function handleWateredDateChange(event: { detail: { value: string } }): void {
  formState.lastWateredAt = event.detail.value
}

function handleFertilizedDateChange(event: { detail: { value: string } }): void {
  formState.lastFertilizedAt = event.detail.value
}
</script>

<template>
  <view
    class="fixed inset-0 z-70 flex items-end overflow-hidden bg-slate-900/34 backdrop-blur-[6rpx]"
    :class="modalClass"
    :style="maskMotionStyle"
    @tap="closePopup"
  >
    <view
      class="relative max-h-[90svh] w-full max-w-[100vw] overflow-x-hidden rounded-t-[40rpx] bg-white px-5 pb-6 pt-4 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] will-change-transform dark:bg-slate-900"
      :class="panelClass"
      :style="panelMotionStyle"
      @tap.stop="() => {}"
    >
      <button
        class="absolute right-2 top-2 h-8 w-8 flex items-center justify-center rounded-full border-none bg-[#FFF5E9] text-lg text-[#C28652] shadow-[0_8rpx_18rpx_rgba(233,161,90,0.14)] dark:bg-slate-800 dark:text-[#F3C58E]"
        hover-class="opacity-92"
        @tap="closePopup"
      >
        <text class="leading-none">×</text>
      </button>
      <view
        class="py-4"
        @touchstart.stop="handleTouchStart"
        @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd"
        @touchcancel.stop="handleTouchEnd"
      >
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
        <view class="flex items-start justify-between gap-3">
          <view class="min-w-0 flex-1">
            <text class="block text-xl font-800 text-slate-800 dark:text-slate-100">
              {{ panelTitle }}
            </text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              表单会优先保存到本地加密缓存，断网时也能继续使用。
            </text>
          </view>
          <view class="flex flex-col items-end gap-2">
            <TagLabel
              :text="props.mode === 'edit' ? '编辑中' : '新增中'"
              tone="blush"
            />
          </view>
        </view>
      </view>

      <scroll-view
        scroll-y
        class="max-h-[68vh] w-full overflow-x-hidden pr-1"
      >
        <view class="flex flex-col gap-4 pb-14">
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
                  class="field-input-md dark:bg-slate-900 dark:text-slate-100"
                />
              </view>
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">昵称</text>
                <input
                  v-model="formState.nickname"
                  :maxlength="20"
                  placeholder="给它一个可爱称呼"
                  class="field-input-md dark:bg-slate-900 dark:text-slate-100"
                />
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
                <AppImage
                  :src="image.url"
                  mode="aspectFill"
                  class="h-[180rpx] w-full"
                  error-text="这张图片先休息一下"
                  @tap="handlePreviewImage(image.url)"
                />
                <button
                  class="btn-pill-sm absolute right-2 top-2 h-7 min-h-7 w-7 min-w-7 rounded-full bg-slate-900/45 px-0 text-xs text-white"
                  hover-class="opacity-90"
                  @tap.stop="handleRemoveImage(image.id)"
                >
                  ×
                </button>
              </view>

              <button
                v-if="formState.images.length < 6"
                class="btn-base h-[180rpx] aspect-1 rounded-[24rpx] bg-white px-0 text-slate-500 dark:bg-slate-900 dark:text-slate-200"
                hover-class="opacity-92"
                @tap="handleChooseImages"
              >
                <view class="flex size-full flex-col items-center justify-center gap-2">
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
                <scroll-view
                  scroll-x
                  class="w-full max-w-full overflow-hidden whitespace-nowrap"
                >
                  <view class="inline-flex gap-2 pb-1 pr-2">
                    <button
                      v-for="option in categoryOptionsWithCreate"
                      :key="option.value"
                      class="btn-chip"
                      :class="
                        selectedCategoryOptionValue === option.value
                          ? 'bg-app-mint text-slate-700'
                          : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'
                      "
                      hover-class="opacity-92"
                      @tap="handleSelectCategory(option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </view>
                </scroll-view>

                <view
                  v-if="selectedCustomCategory"
                  class="mt-3 flex items-center gap-2 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900"
                >
                  <view class="min-w-0 flex-1">
                    <text class="block text-2xs text-slate-400 dark:text-slate-500"
                      >当前自定义品类</text
                    >
                    <text
                      class="mt-1 block truncate text-sm font-700 text-slate-700 dark:text-slate-100"
                    >
                      {{ selectedCustomCategory.label }}
                    </text>
                  </view>
                  <button
                    class="btn-pill-sm bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-200"
                    hover-class="opacity-92"
                    @tap="handleEditCustomCategory(selectedCustomCategory.id)"
                  >
                    编辑
                  </button>
                  <button
                    class="btn-pill-sm bg-rose-50 text-rose-500 dark:bg-rose-500/16 dark:text-rose-200"
                    hover-class="opacity-92"
                    @tap="handleRemoveCustomCategory(selectedCustomCategory.id)"
                  >
                    删除
                  </button>
                </view>

                <view
                  v-if="isCategoryEditorVisible"
                  class="surface-soft mt-3 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900"
                >
                  <text class="block text-2xs text-slate-400 dark:text-slate-500">
                    {{ editingCustomCategoryId ? '编辑自定义品类' : '新增自定义品类' }}
                  </text>
                  <input
                    v-model="customCategoryDraftLabel"
                    class="field-input-sm mt-2 dark:bg-slate-800 dark:text-slate-100"
                    :maxlength="10"
                    placeholder="例如：兰花、香草"
                  />
                  <view
                    v-if="editingCustomCategoryId && selectedCustomCategoryIndex >= 0"
                    class="mt-3 rounded-[18rpx] bg-app-ivory/70 p-3 dark:bg-slate-800"
                  >
                    <text class="block text-2xs text-slate-400 dark:text-slate-500">
                      排序位置：第 {{ selectedCustomCategoryIndex + 1 }} 位
                    </text>
                    <view class="mt-2 flex flex-wrap gap-2">
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveCategoryUp ? 'opacity-45' : ''"
                        :disabled="!canMoveCategoryUp"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomCategory('top')"
                      >
                        置顶
                      </button>
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveCategoryUp ? 'opacity-45' : ''"
                        :disabled="!canMoveCategoryUp"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomCategory('up')"
                      >
                        前移
                      </button>
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveCategoryDown ? 'opacity-45' : ''"
                        :disabled="!canMoveCategoryDown"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomCategory('down')"
                      >
                        后移
                      </button>
                    </view>
                  </view>
                  <scroll-view
                    scroll-x
                    class="mt-3 w-full max-w-full overflow-hidden whitespace-nowrap"
                  >
                    <view class="inline-flex gap-2 pb-1 pr-2">
                      <button
                        v-for="option in FLOWER_CATEGORY_OPTIONS"
                        :key="`base-category-${option.value}`"
                        class="btn-chip"
                        :class="
                          customCategoryDraftBaseValue === option.value
                            ? 'bg-app-cream text-slate-700'
                            : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'
                        "
                        hover-class="opacity-92"
                        @tap="customCategoryDraftBaseValue = option.value"
                      >
                        归到{{ option.label }}
                      </button>
                    </view>
                  </scroll-view>
                  <view class="mt-3 flex gap-2">
                    <button
                      class="btn-pill-sm flex-1 bg-app-mint text-slate-700"
                      hover-class="opacity-92"
                      @tap="handleSaveCustomCategory"
                    >
                      {{ editingCustomCategoryId ? '保存分类' : '保存为自定义' }}
                    </button>
                    <button
                      class="btn-pill-sm flex-1 bg-slate-100 text-slate-600"
                      hover-class="opacity-92"
                      @tap="cancelCategoryEditor"
                    >
                      取消
                    </button>
                  </view>
                </view>
              </view>

              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">位置</text>
                <scroll-view
                  scroll-x
                  class="w-full max-w-full overflow-hidden whitespace-nowrap"
                >
                  <view class="inline-flex gap-2 pb-1 pr-2">
                    <button
                      v-for="option in placementOptionsWithCreate"
                      :key="option.value"
                      class="btn-chip"
                      :class="
                        selectedPlacementOptionValue === option.value
                          ? 'bg-app-blush text-slate-700'
                          : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'
                      "
                      hover-class="opacity-92"
                      @tap="handleSelectPlacement(option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </view>
                </scroll-view>

                <view
                  v-if="selectedCustomPlacement"
                  class="mt-3 flex items-center gap-2 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900"
                >
                  <view class="min-w-0 flex-1">
                    <text class="block text-2xs text-slate-400 dark:text-slate-500"
                      >当前自定义位置</text
                    >
                    <text
                      class="mt-1 block truncate text-sm font-700 text-slate-700 dark:text-slate-100"
                    >
                      {{ selectedCustomPlacement.label }}
                    </text>
                  </view>
                  <button
                    class="btn-pill-sm bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-200"
                    hover-class="opacity-92"
                    @tap="handleEditCustomPlacement(selectedCustomPlacement.id)"
                  >
                    编辑
                  </button>
                  <button
                    class="btn-pill-sm bg-rose-50 text-rose-500 dark:bg-rose-500/16 dark:text-rose-200"
                    hover-class="opacity-92"
                    @tap="handleRemoveCustomPlacement(selectedCustomPlacement.id)"
                  >
                    删除
                  </button>
                </view>

                <view
                  v-if="isPlacementEditorVisible"
                  class="surface-soft mt-3 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900"
                >
                  <text class="block text-2xs text-slate-400 dark:text-slate-500">
                    {{ editingCustomPlacementId ? '编辑自定义位置' : '新增自定义位置' }}
                  </text>
                  <input
                    v-model="customPlacementDraftLabel"
                    class="field-input-sm mt-2 dark:bg-slate-800 dark:text-slate-100"
                    :maxlength="10"
                    placeholder="例如：书桌边、飘窗"
                  />
                  <view
                    v-if="editingCustomPlacementId && selectedCustomPlacementIndex >= 0"
                    class="mt-3 rounded-[18rpx] bg-app-ivory/70 p-3 dark:bg-slate-800"
                  >
                    <text class="block text-2xs text-slate-400 dark:text-slate-500">
                      排序位置：第 {{ selectedCustomPlacementIndex + 1 }} 位
                    </text>
                    <view class="mt-2 flex flex-wrap gap-2">
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMovePlacementUp ? 'opacity-45' : ''"
                        :disabled="!canMovePlacementUp"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomPlacement('top')"
                      >
                        置顶
                      </button>
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMovePlacementUp ? 'opacity-45' : ''"
                        :disabled="!canMovePlacementUp"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomPlacement('up')"
                      >
                        前移
                      </button>
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMovePlacementDown ? 'opacity-45' : ''"
                        :disabled="!canMovePlacementDown"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomPlacement('down')"
                      >
                        后移
                      </button>
                    </view>
                  </view>
                  <scroll-view
                    scroll-x
                    class="mt-3 w-full max-w-full overflow-hidden whitespace-nowrap"
                  >
                    <view class="inline-flex gap-2 pb-1 pr-2">
                      <button
                        v-for="option in FLOWER_PLACEMENT_OPTIONS"
                        :key="`base-placement-${option.value}`"
                        class="btn-chip"
                        :class="
                          customPlacementDraftBaseValue === option.value
                            ? 'bg-app-blush text-slate-700'
                            : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'
                        "
                        hover-class="opacity-92"
                        @tap="customPlacementDraftBaseValue = option.value"
                      >
                        归到{{ option.label }}
                      </button>
                    </view>
                  </scroll-view>
                  <view class="mt-3 flex gap-2">
                    <button
                      class="btn-pill-sm flex-1 bg-app-blush text-slate-700"
                      hover-class="opacity-92"
                      @tap="handleSaveCustomPlacement"
                    >
                      {{ editingCustomPlacementId ? '保存位置' : '保存为自定义' }}
                    </button>
                    <button
                      class="btn-pill-sm flex-1 bg-slate-100 text-slate-600"
                      hover-class="opacity-92"
                      @tap="cancelPlacementEditor"
                    >
                      取消
                    </button>
                  </view>
                </view>
              </view>

              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">养护难度</text>
                <scroll-view
                  scroll-x
                  class="w-full max-w-full overflow-hidden whitespace-nowrap"
                >
                  <view class="inline-flex gap-2 pb-1 pr-2">
                    <button
                      v-for="option in careDifficultyOptionsWithCreate"
                      :key="option.value"
                      class="btn-chip"
                      :class="
                        selectedDifficultyOptionValue === option.value
                          ? 'bg-app-cream text-slate-700'
                          : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'
                      "
                      hover-class="opacity-92"
                      @tap="handleSelectDifficulty(option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </view>
                </scroll-view>

                <view
                  v-if="selectedCustomDifficulty"
                  class="mt-3 flex items-center gap-2 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900"
                >
                  <view class="min-w-0 flex-1">
                    <text class="block text-2xs text-slate-400 dark:text-slate-500"
                      >当前自定义难度</text
                    >
                    <text
                      class="mt-1 block truncate text-sm font-700 text-slate-700 dark:text-slate-100"
                    >
                      {{ selectedCustomDifficulty.label }}
                    </text>
                  </view>
                  <button
                    class="btn-pill-sm bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-200"
                    hover-class="opacity-92"
                    @tap="handleEditCustomDifficulty(selectedCustomDifficulty.id)"
                  >
                    编辑
                  </button>
                  <button
                    class="btn-pill-sm bg-rose-50 text-rose-500 dark:bg-rose-500/16 dark:text-rose-200"
                    hover-class="opacity-92"
                    @tap="handleRemoveCustomDifficulty(selectedCustomDifficulty.id)"
                  >
                    删除
                  </button>
                </view>

                <view
                  v-if="isDifficultyEditorVisible"
                  class="surface-soft mt-3 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900"
                >
                  <text class="block text-2xs text-slate-400 dark:text-slate-500">
                    {{ editingCustomDifficultyId ? '编辑自定义难度' : '新增自定义难度' }}
                  </text>
                  <input
                    v-model="customDifficultyDraftLabel"
                    class="field-input-sm mt-2 dark:bg-slate-800 dark:text-slate-100"
                    :maxlength="10"
                    placeholder="例如：新手友好、大神向"
                  />
                  <view
                    v-if="editingCustomDifficultyId && selectedCustomDifficultyIndex >= 0"
                    class="mt-3 rounded-[18rpx] bg-app-ivory/70 p-3 dark:bg-slate-800"
                  >
                    <text class="block text-2xs text-slate-400 dark:text-slate-500">
                      排序位置：第 {{ selectedCustomDifficultyIndex + 1 }} 位
                    </text>
                    <view class="mt-2 flex flex-wrap gap-2">
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveDifficultyUp ? 'opacity-45' : ''"
                        :disabled="!canMoveDifficultyUp"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomDifficulty('top')"
                      >
                        置顶
                      </button>
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveDifficultyUp ? 'opacity-45' : ''"
                        :disabled="!canMoveDifficultyUp"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomDifficulty('up')"
                      >
                        前移
                      </button>
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveDifficultyDown ? 'opacity-45' : ''"
                        :disabled="!canMoveDifficultyDown"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomDifficulty('down')"
                      >
                        后移
                      </button>
                    </view>
                  </view>
                  <scroll-view
                    scroll-x
                    class="mt-3 w-full max-w-full overflow-hidden whitespace-nowrap"
                  >
                    <view class="inline-flex gap-2 pb-1 pr-2">
                      <button
                        v-for="option in FLOWER_DIFFICULTY_OPTIONS"
                        :key="`base-difficulty-${option.value}`"
                        class="btn-chip"
                        :class="
                          customDifficultyDraftBaseValue === option.value
                            ? 'bg-app-cream text-slate-700'
                            : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'
                        "
                        hover-class="opacity-92"
                        @tap="customDifficultyDraftBaseValue = option.value"
                      >
                        归到{{ option.label }}
                      </button>
                    </view>
                  </scroll-view>
                  <view class="mt-3 flex gap-2">
                    <button
                      class="btn-pill-sm flex-1 bg-app-cream text-slate-700"
                      hover-class="opacity-92"
                      @tap="handleSaveCustomDifficulty"
                    >
                      {{ editingCustomDifficultyId ? '保存难度' : '保存为自定义' }}
                    </button>
                    <button
                      class="btn-pill-sm flex-1 bg-slate-100 text-slate-600"
                      hover-class="opacity-92"
                      @tap="cancelDifficultyEditor"
                    >
                      取消
                    </button>
                  </view>
                </view>
              </view>

              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">当前状态</text>
                <scroll-view
                  scroll-x
                  class="w-full max-w-full overflow-hidden whitespace-nowrap"
                >
                  <view class="inline-flex gap-2 pb-1 pr-2">
                    <button
                      v-for="option in careStatusOptionsWithCreate"
                      :key="option.value"
                      class="btn-chip"
                      :class="
                        selectedCareStatusOptionValue === option.value
                          ? 'bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'
                      "
                      hover-class="opacity-92"
                      @tap="handleSelectCareStatus(option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </view>
                </scroll-view>

                <view
                  v-if="selectedCustomStatus"
                  class="mt-3 flex items-center gap-2 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900"
                >
                  <view class="min-w-0 flex-1">
                    <text class="block text-2xs text-slate-400 dark:text-slate-500"
                      >当前自定义状态</text
                    >
                    <text
                      class="mt-1 block truncate text-sm font-700 text-slate-700 dark:text-slate-100"
                    >
                      {{ selectedCustomStatus.label }}
                    </text>
                  </view>
                  <button
                    class="btn-pill-sm bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-200"
                    hover-class="opacity-92"
                    @tap="handleEditCustomStatus(selectedCustomStatus.id)"
                  >
                    编辑
                  </button>
                  <button
                    class="btn-pill-sm bg-rose-50 text-rose-500 dark:bg-rose-500/16 dark:text-rose-200"
                    hover-class="opacity-92"
                    @tap="handleRemoveCustomStatus(selectedCustomStatus.id)"
                  >
                    删除
                  </button>
                </view>

                <view
                  v-if="isStatusEditorVisible"
                  class="surface-soft mt-3 rounded-[22rpx] bg-white/76 p-3 dark:bg-slate-900"
                >
                  <text class="block text-2xs text-slate-400 dark:text-slate-500">
                    {{ editingCustomStatusId ? '编辑自定义状态' : '新增自定义状态' }}
                  </text>
                  <input
                    v-model="customStatusDraftLabel"
                    class="field-input-sm mt-2 dark:bg-slate-800 dark:text-slate-100"
                    :maxlength="10"
                    placeholder="例如：爆盆中、缓苗中"
                  />
                  <view
                    v-if="editingCustomStatusId && selectedCustomStatusIndex >= 0"
                    class="mt-3 rounded-[18rpx] bg-app-ivory/70 p-3 dark:bg-slate-800"
                  >
                    <text class="block text-2xs text-slate-400 dark:text-slate-500">
                      排序位置：第 {{ selectedCustomStatusIndex + 1 }} 位
                    </text>
                    <view class="mt-2 flex flex-wrap gap-2">
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveStatusUp ? 'opacity-45' : ''"
                        :disabled="!canMoveStatusUp"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomStatus('top')"
                      >
                        置顶
                      </button>
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveStatusUp ? 'opacity-45' : ''"
                        :disabled="!canMoveStatusUp"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomStatus('up')"
                      >
                        前移
                      </button>
                      <button
                        class="btn-pill-sm bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        :class="!canMoveStatusDown ? 'opacity-45' : ''"
                        :disabled="!canMoveStatusDown"
                        hover-class="opacity-92"
                        @tap="moveSelectedCustomStatus('down')"
                      >
                        后移
                      </button>
                    </view>
                  </view>
                  <scroll-view
                    scroll-x
                    class="mt-3 w-full max-w-full overflow-hidden whitespace-nowrap"
                  >
                    <view class="inline-flex gap-2 pb-1 pr-2">
                      <button
                        v-for="option in FLOWER_STATUS_OPTIONS"
                        :key="`base-status-${option.value}`"
                        class="btn-chip"
                        :class="
                          customStatusDraftBaseValue === option.value
                            ? 'bg-app-blush text-slate-700'
                            : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'
                        "
                        hover-class="opacity-92"
                        @tap="customStatusDraftBaseValue = option.value"
                      >
                        归到{{ option.label }}
                      </button>
                    </view>
                  </scroll-view>
                  <view class="mt-3 flex gap-2">
                    <button
                      class="btn-pill-sm flex-1 bg-app-blush text-slate-700"
                      hover-class="opacity-92"
                      @tap="handleSaveCustomStatus"
                    >
                      {{ editingCustomStatusId ? '保存状态' : '保存为自定义' }}
                    </button>
                    <button
                      class="btn-pill-sm flex-1 bg-slate-100 text-slate-600"
                      hover-class="opacity-92"
                      @tap="cancelStatusEditor"
                    >
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
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500"
                  >最近浇水日期</text
                >
                <picker
                  mode="date"
                  :value="resolvePickerDateValue(formState.lastWateredAt)"
                  @change="handleWateredDateChange"
                >
                  <view
                    class="field-input-md flex items-center justify-between dark:bg-slate-900 dark:text-slate-100"
                  >
                    <text :class="hasExplicitDate(formState.lastWateredAt) ? '' : 'text-slate-400'">
                      {{ resolvePickerDateText(formState.lastWateredAt) }}
                    </text>
                    <text class="text-xs text-slate-400">选择</text>
                  </view>
                </picker>
              </view>
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500"
                  >最近施肥日期</text
                >
                <picker
                  mode="date"
                  :value="resolvePickerDateValue(formState.lastFertilizedAt)"
                  @change="handleFertilizedDateChange"
                >
                  <view
                    class="field-input-md flex items-center justify-between dark:bg-slate-900 dark:text-slate-100"
                  >
                    <text
                      :class="hasExplicitDate(formState.lastFertilizedAt) ? '' : 'text-slate-400'"
                    >
                      {{ resolvePickerDateText(formState.lastFertilizedAt) }}
                    </text>
                    <text class="text-xs text-slate-400">选择</text>
                  </view>
                </picker>
              </view>
              <view>
                <text class="mb-2 block text-2xs text-slate-400 dark:text-slate-500">备注</text>
                <textarea
                  v-model="formState.note"
                  :maxlength="120"
                  auto-height
                  placeholder="写下这盆小植物的养护偏好或当前状态"
                  class="field-textarea dark:bg-slate-900 dark:text-slate-100"
                />
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="mt-4 absolute bottom-0 left-0 right-0 py-4 px-4 bg-white/88 flex gap-3">
        <button
          class="btn-pill-md flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
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
            size="md"
            @click="handleSubmit"
          />
        </view>
      </view>
    </view>
  </view>
</template>
