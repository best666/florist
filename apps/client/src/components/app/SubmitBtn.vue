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
  /**
   * 按钮尺寸。
   */
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<SubmitBtnProps>(), {
  loadingText: '保存中...',
  loading: false,
  disabled: false,
  block: true,
  variant: 'mint',
  size: 'lg',
})

const emit = defineEmits<{
  click: []
}>()

const gradientClassMap: Record<SubmitButtonVariant, string> = {
  mint: 'from-[#84dbc6] via-[#b6ecde] to-[#fff0c8]',
  blush: 'from-[#f5c1d8] via-[#f7d7e5] to-[#ffefcf]',
  sunrise: 'from-[#ffc39e] via-[#ffd8b3] to-[#fff1ca]',
}

const sizeClassMap: Record<NonNullable<SubmitBtnProps['size']>, string> = {
  sm: 'btn-pill-sm px-4 text-2xs',
  md: 'btn-pill-md px-5 text-sm',
  lg: 'btn-panel px-5 text-sm',
}

const isInactive = computed(() => props.disabled || props.loading)

const buttonText = computed(() => (props.loading ? props.loadingText : props.text))

const buttonClass = computed(() => [
  props.block ? 'w-full' : 'w-auto min-w-0',
  sizeClassMap[props.size],
  gradientClassMap[props.variant],
  isInactive.value
    ? 'opacity-55 saturate-70 shadow-none'
    : 'app-pressable hover:opacity-96',
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
    class="relative overflow-hidden bg-linear-to-r font-800 tracking-[0.02em] text-app-ink shadow-[var(--shadow-lift)]"
    :class="buttonClass" :disabled="isInactive" hover-class="opacity-95" @tap="handleTap">
    <view class="pointer-events-none absolute inset-y-0 right-[-20%] w-[38%] rotate-12 bg-[var(--color-surface)]/26 blur-[8rpx]" />
    <view class="relative z-1 flex items-center justify-center gap-2 whitespace-nowrap leading-none">
      <view v-if="props.loading"
        class="h-4 w-4 animate-spin rounded-full border-2 border-app-ink/20 border-t-app-ink" />
      <text class="whitespace-nowrap leading-none">{{ buttonText }}</text>
    </view>
  </button>
</template>
