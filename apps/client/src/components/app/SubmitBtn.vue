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
  mint: 'from-[#5cc4a8] via-[#8ddbc8] to-[#e8d58a]',
  blush: 'from-[#e8a0b8] via-[#ecc4d4] to-[#f5d89e]',
  sunrise: 'from-[#f0a878] via-[#f5c090] to-[#f5d89e]',
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
    <view class="relative flex items-center justify-center gap-2 whitespace-nowrap leading-none">
      <view v-if="props.loading"
        class="h-4 w-4 animate-spin rounded-full border-2 border-app-ink/20 border-t-app-ink" />
      <text class="whitespace-nowrap leading-none">{{ buttonText }}</text>
    </view>
  </button>
</template>
