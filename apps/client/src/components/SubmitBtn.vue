<script setup lang="ts">
import { computed } from 'vue'
import type { SubmitButtonVariant } from '@/interfaces'

interface SubmitBtnProps {
  /**
   * 默认按钮文案。
   */
  text: string
  /**
   * 加载态文案。
   */
  loadingText?: string
  /**
   * 是否处于加载中。
   */
  loading?: boolean
  /**
   * 是否禁用交互。
   */
  disabled?: boolean
  /**
   * 是否铺满父容器宽度。
   */
  block?: boolean
  /**
   * 渐变配色主题。
   */
  variant?: SubmitButtonVariant
}

const props = withDefaults(defineProps<SubmitBtnProps>(), {
  loadingText: '保存中...',
  loading: false,
  disabled: false,
  block: true,
  variant: 'mint',
})

const emit = defineEmits<{
  click: []
}>()

const gradientClassMap: Record<SubmitButtonVariant, string> = {
  mint: 'from-[#8DE4D3] via-[#A9EDD7] to-[#FFF1CF]',
  blush: 'from-[#F7C5DC] via-[#F7D4E6] to-[#FFE8C8]',
  sunrise: 'from-[#FFC6A5] via-[#FFD7B8] to-[#FFF2CC]',
}

const isInactive = computed(() => props.disabled || props.loading)

const buttonText = computed(() => (props.loading ? props.loadingText : props.text))

const buttonClass = computed(() => [
  props.block ? 'w-full' : 'w-auto min-w-[220rpx]',
  gradientClassMap[props.variant],
  isInactive.value
    ? 'opacity-55 saturate-70'
    : 'active:translate-y-[2rpx] active:shadow-none',
])

function handleTap(): void {
  if (isInactive.value) {
    return
  }

  emit('click')
}
</script>

<template>
  <button
    class="h-11 rounded-full border-none bg-linear-to-r px-5 text-sm font-700 text-slate-700 shadow-[0_14rpx_36rpx_rgba(148,197,193,0.28)] transition-all duration-200 dark:text-slate-900"
    :class="buttonClass"
    :disabled="isInactive"
    hover-class="opacity-95"
    @tap="handleTap"
  >
    <view class="flex items-center justify-center gap-2">
      <view
        v-if="props.loading"
        class="h-4 w-4 animate-spin rounded-full border-2 border-slate-500/25 border-t-slate-600"
      />
      <text>{{ buttonText }}</text>
    </view>
  </button>
</template>
