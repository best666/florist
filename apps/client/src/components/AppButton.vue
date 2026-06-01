<script setup lang="ts">
import { computed } from 'vue'

type ButtonVariant = 'pill' | 'card' | 'chip' | 'text' | 'none'
type ButtonSize = 'sm' | 'md' | 'lg' | 'none'
type ButtonTone = 'mint' | 'blush' | 'cream' | 'slate' | 'none'

interface AppButtonProps {
  /** 预设样式变体 */
  variant?: ButtonVariant
  /** 预设尺寸 */
  size?: ButtonSize
  /** 语义色调 */
  tone?: ButtonTone
  /** 加载中 */
  loading?: boolean
  /** 禁用 */
  disabled?: boolean
  /** 块级（100% 宽度） */
  block?: boolean
  /** hover 时的 class */
  hoverClass?: string
  /** 额外的 UnoCSS class，会追加到预设 class 之后 */
  customClass?: string
}

const props = withDefaults(defineProps<AppButtonProps>(), {
  variant: 'none',
  size: 'none',
  tone: 'none',
  loading: false,
  disabled: false,
  block: false,
  hoverClass: 'opacity-92',
  customClass: '',
})

const emit = defineEmits<{
  tap: []
}>()

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  pill: 'rounded-full',
  card: 'rounded-[24rpx]',
  chip: 'rounded-full',
  text: 'rounded-full bg-transparent',
  none: '',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-[72rpx] min-h-[72rpx] px-4 text-2xs font-700',
  md: 'h-[80rpx] min-h-[80rpx] px-5 text-sm font-700',
  lg: 'h-[88rpx] min-h-[88rpx] px-5 text-sm font-800',
  none: '',
}

const TONE_CLASS: Record<ButtonTone, string> = {
  mint: 'bg-[var(--color-mint)]/25 text-[var(--color-sage)]',
  blush: 'bg-[var(--color-blush)]/25 text-app-ink',
  cream: 'bg-[var(--color-cream)]/50 text-app-ink',
  slate: 'bg-[var(--color-muted)]/15 text-app-ink',
  none: '',
}

const resolvedClass = computed(() => [
  // btn-base 保证文字居中 + 点击动画
  'btn-base',
  // 变体圆角
  VARIANT_CLASS[props.variant],
  // 尺寸
  SIZE_CLASS[props.size],
  // 色调
  TONE_CLASS[props.tone],
  // 块级宽度
  props.block ? 'w-full' : '',
  // 自定义
  props.customClass,
].filter(Boolean).join(' '))
</script>

<template>
  <button
    :class="resolvedClass"
    :hover-class="hoverClass"
    :loading="loading"
    :disabled="disabled"
    @tap="emit('tap')"
  >
    <slot />
  </button>
</template>
