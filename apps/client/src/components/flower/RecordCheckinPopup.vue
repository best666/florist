<script setup lang="ts">
import { RecordActionType } from '@florist/contracts'
import { computed, reactive, ref, watch } from 'vue'
import {
  DEFAULT_RECORD_ACTION_TYPE,
  createDefaultRecordFormValues,
  getRecordActionMeta,
  type LocalFlower,
  type RecordFormValues,
} from '@/interfaces'
import { containsIllegalCharacters, isBlankString, showGentleToast } from '@/utils'
import RecordActionGrid from './RecordActionGrid.vue'
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import ImagePicker from '../app/ImagePicker.vue'
import InfoPopover from '../app/InfoPopover.vue'
import SubmitBtn from '../app/SubmitBtn.vue'
import TagLabel from '../app/TagLabel.vue'

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

const modalClass = computed(() =>
  props.modelValue ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
)

const panelClass = computed(() =>
  props.modelValue ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.98] opacity-0',
)

const selectedActionMeta = computed(() => getRecordActionMeta(formState.actionType))

const { handleTouchEnd, handleTouchMove, handleTouchStart, maskMotionStyle, panelMotionStyle } =
  useBottomSheetGesture({
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
  <view
    class="fixed inset-0 z-70 flex items-end bg-slate-900/34 backdrop-blur-[6rpx]"
    :class="modalClass"
    :style="maskMotionStyle"
    @tap="closePopup"
  >
    <view
      class="relative max-h-[90vh] w-full rounded-t-[40rpx] bg-[var(--color-surface)] px-5 pb-6 pt-4 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] will-change-transform dark:bg-slate-900"
      :class="panelClass"
      :style="panelMotionStyle"
      @tap.stop="() => {}"
    >
      <!-- 关闭按钮：置于面板层级，不受底部手势区域影响 -->
      <button
        class="btn-base absolute right-2 top-2 z-20 h-8 w-8 rounded-full bg-[#FFF5E9] text-lg text-[#C28652] shadow-[0_8rpx_18rpx_rgba(233,161,90,0.14)] dark:bg-slate-800 dark:text-[#F3C58E]"
        hover-class="opacity-92"
        @tap.stop="closePopup"
      >
        <text class="leading-none">×</text>
      </button>

      <view
        class="mb-4"
        @touchstart.stop="handleTouchStart"
        @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd"
        @touchcancel.stop="handleTouchEnd"
      >
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />

        <view class="flex items-start justify-between gap-3">
          <view>
            <view class="flex items-center gap-1">
              <text class="block text-xl font-800 text-app-ink dark:text-slate-100"> 记录一次温柔照顾 </text>
              <InfoPopover
                content="打卡记录会安全保存在你的设备上，没有网络也能正常使用。所有的浇水、施肥、修剪都会被温柔记下。"
              />
            </view>
          </view>
          <TagLabel
            :text="selectedActionMeta.label"
            :tone="selectedActionMeta.tone"
          />
        </view>
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
            <text class="text-sm font-700 text-app-ink dark:text-slate-100">选择植株</text>
            <view class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="flower in props.flowerOptions"
                :key="flower.id"
                class="btn-chip"
                :class="
                  formState.flowerId === flower.id
                    ? 'bg-app-mint text-app-ink'
                    : 'bg-[var(--color-surface)] text-app-muted dark:bg-slate-900 dark:text-slate-200'
                "
                hover-class="opacity-92"
                @tap="formState.flowerId = flower.id"
              >
                {{ flower.nickname || flower.name }}
              </button>
            </view>
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-app-ink dark:text-slate-100">备注与配图</text>
            <view class="mt-3">
              <textarea
                v-model="formState.note"
                :maxlength="100"
                auto-height
                placeholder="写下今天的变化、叶片状态，或者一点点想说的话。"
                class="field-textarea dark:bg-slate-900 dark:text-slate-100"
              />
            </view>

            <ImagePicker
              v-model="formState.images"
              :max-count="3"
              upload-mode="cloud"
              asset-prefix="record-image"
              scope="record"
              crop-mode="card"
              :max-width="1440"
              :quality="82"
              :max-size-in-bytes="1.8 * 1024 * 1024"
              add-text="添加配图"
              error-text="这张配图先休息一下"
            />
          </view>

          <view class="rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-sm font-700 text-app-ink dark:text-slate-100">打卡类型</text>
            <RecordActionGrid
              :selected-action-type="formState.actionType"
              variant="popup"
              @select="formState.actionType = $event"
            />
          </view>
        </view>
      </scroll-view>

      <view class="mt-4 flex gap-3">
        <button
          class="btn-pill-md flex-1 bg-slate-100 text-app-muted dark:bg-slate-800 dark:text-slate-200"
          hover-class="opacity-92"
          @tap="closePopup"
        >
          先不记录
        </button>
        <view class="flex-1">
          <SubmitBtn
            text="完成打卡"
            loading-text="保存中..."
            :loading="props.submitting"
            variant="mint"
            size="md"
            @click="handleSubmit"
          />
        </view>
      </view>
    </view>
  </view>
</template>
