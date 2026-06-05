<script setup lang="ts">
import type { RecordActionType } from '@florist/contracts'
import { RECORD_ACTION_OPTIONS } from '@/interfaces'

interface Props {
  /** 当前选中的养护类型，用于高亮 */
  selectedActionType?: RecordActionType | null
  /** 样式变体：page = 页面快捷打卡，popup = 弹窗类型选择 */
  variant?: 'page' | 'popup'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'page',
})

const emit = defineEmits<{
  select: [value: RecordActionType]
}>()

// 显式列出所有 tone → border 颜色 class，确保 UnoCSS 提取
const TONE_BORDER_CLASS: Record<string, string> = {
  mint: 'border-app-mint',
  sage: 'border-app-sage',
  blush: 'border-app-blush',
  cream: 'border-app-cream',
  gold: 'border-app-gold',
  slate: 'border-app-muted',
}

function isSelected(value: RecordActionType): boolean {
  return props.selectedActionType === value
}
</script>

<template>
  <view
    :class="variant === 'page' ? 'mt-4' : 'mt-3'"
    class="grid grid-cols-3 gap-12rpx"
  >
    <button
      v-for="option in RECORD_ACTION_OPTIONS"
      :key="option.value"
      hover-class="opacity-92"
      :class="[
        'app-pressable border-2 border-solid px-3 py-3 text-left',
        isSelected(option.value)
          ? TONE_BORDER_CLASS[option.tone] || ''
          : 'border-transparent',
        variant === 'popup'
          ? 'min-h-[110rpx] rounded-[24rpx]'
          : 'min-h-[122rpx] rounded-[26rpx] bg-[var(--color-surface)]/76 shadow-[var(--shadow-soft)] dark:bg-slate-800',
        variant === 'popup' && isSelected(option.value)
          ? 'bg-[var(--color-surface)] shadow-[0_12rpx_28rpx_rgba(148,163,184,0.14)] dark:bg-slate-900'
          : '',
        variant === 'popup' && !isSelected(option.value)
          ? 'bg-[var(--color-surface)]/60 dark:bg-slate-900/70'
          : '',
      ]"
      @tap="emit('select', option.value)"
    >
      <view class="text-2xl">
        {{ option.emoji }}
      </view>
      <text class="mt-2 block text-sm font-700 text-app-ink dark:text-slate-100">
        {{ option.label }}
      </text>
      <text
        class="mt-1 block text-2xs leading-5 text-app-muted/80 dark:text-app-muted break-words whitespace-normal"
      >
        {{ option.description }}
      </text>
    </button>
  </view>
</template>
