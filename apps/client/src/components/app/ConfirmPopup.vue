<script setup lang="ts">
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import SubmitBtn from './SubmitBtn.vue'

interface ConfirmPopupProps {
  /**
   * 是否展示弹窗，由父层控制。
   */
  modelValue: boolean
  /**
   * 标题文案。
   */
  title?: string
  /**
   * 说明文案。
   */
  description?: string
  /**
   * 确认按钮文案。
   */
  confirmText?: string
  /**
   * 取消按钮文案。
   */
  cancelText?: string
  /**
   * 确认态 loading。
   */
  confirmLoading?: boolean
  /**
   * 点击遮罩是否允许关闭。
   */
  closeOnMask?: boolean
}

const props = withDefaults(defineProps<ConfirmPopupProps>(), {
  title: '再确认一下下',
  description: '这一步会影响当前内容，确认后我们会轻轻地继续往前走。',
  confirmText: '确认继续',
  cancelText: '我再想想',
  confirmLoading: false,
  closeOnMask: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function closePopup(): void {
  emit('update:modelValue', false)
}

const { handleTouchEnd, handleTouchMove, handleTouchStart, maskMotionStyle, panelMotionStyle } =
  useBottomSheetGesture({
    visible: () => props.modelValue,
    onClose: handleCancel,
    closeThreshold: 96,
    hiddenOffset: 56,
  })

function handleMaskTap(): void {
  if (!props.closeOnMask) {
    return
  }

  emit('cancel')
  closePopup()
}

function handleCancel(): void {
  emit('cancel')
  closePopup()
}

function handleConfirm(): void {
  emit('confirm')
}
</script>

<template>
  <view
    class="fixed inset-0 z-60 flex items-end justify-center bg-slate-900/32 px-5 pb-8 pt-10 backdrop-blur-[6rpx]"
    :class="props.modelValue ? 'pointer-events-auto' : 'pointer-events-none'"
    :style="maskMotionStyle"
    @tap="handleMaskTap"
  >
    <view
      class="w-full max-w-[720rpx] rounded-[36rpx] bg-[var(--color-surface)] px-5 py-5 shadow-[0_18rpx_60rpx_rgba(15,23,42,0.18)] will-change-transform dark:bg-slate-900"
      :style="panelMotionStyle"
      @tap.stop="() => {}"
    >
      <view
        @touchstart.stop="handleTouchStart"
        @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd"
        @touchcancel.stop="handleTouchEnd"
      >
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
        <view class="mb-5 flex flex-col gap-2 text-center">
          <text class="text-lg font-700 text-app-ink dark:text-slate-100">
            {{ props.title }}
          </text>
          <text class="text-sm leading-6 text-app-muted dark:text-slate-300">
            {{ props.description }}
          </text>
        </view>
      </view>
      <view
        class="rounded-[28rpx] bg-linear-to-br from-app-cream to-app-ivory p-4 text-sm leading-6 text-app-muted dark:from-slate-800 dark:to-slate-800/80 dark:text-slate-200"
      >
        一点点确认，能让你的花园更稳稳地被照顾好。
      </view>
      <view class="mt-5 flex flex-col gap-3">
        <SubmitBtn
          :text="props.confirmText"
          :loading="props.confirmLoading"
          variant="mint"
          size="md"
          @click="handleConfirm"
          class="text-red!"
        />
        <button
          class="btn-pill-md bg-slate-100 text-app-muted dark:bg-slate-800 dark:text-slate-200"
          hover-class="opacity-92"
          @tap="handleCancel"
        >
          {{ props.cancelText }}
        </button>
      </view>
    </view>
  </view>
</template>
