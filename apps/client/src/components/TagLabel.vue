<script setup lang="ts">
import { computed } from 'vue'
import type { SoftTone, TagLabelStatus } from '@/interfaces'

interface TagLabelProps {
  /**
   * 业务状态值。未传时按自定义标签处理。
   */
  status?: TagLabelStatus
  /**
   * 文案优先级高于默认映射文案。
   */
  text?: string
  /**
   * 自定义色调，适用于非标准状态。
   */
  tone?: SoftTone
  /**
   * 是否显示小圆点，适合在卡片和时间轴中弱化状态信息。
   */
  showDot?: boolean
  /**
   * 可选图标字符，适合“已就绪”“已准备好”这类状态提示。
   */
  icon?: string
  /**
   * 标签尺寸。
   */
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<TagLabelProps>(), {
  status: 'custom',
  text: '',
  tone: 'mint',
  showDot: true,
  icon: '',
  size: 'sm',
})

const toneClassMap: Record<SoftTone, string> = {
  mint: 'bg-[var(--color-mint)]/10 text-[var(--color-ink)] dark:bg-emerald-500/12 dark:text-emerald-200',
  blush: 'bg-[var(--color-blush)]/10 text-[var(--color-ink)] dark:bg-rose-500/12 dark:text-rose-200',
  cream: 'bg-[var(--color-cream)]/20 text-[var(--color-ink)] dark:bg-amber-500/10 dark:text-amber-100',
  slate: 'bg-[var(--color-muted)]/8 text-[var(--color-ink)] dark:bg-slate-700/40 dark:text-slate-100',
}

const statusMetaMap: Record<Exclude<TagLabelStatus, 'custom'>, { text: string; tone: SoftTone }> = {
  'watering-needed': {
    text: '缺水',
    tone: 'blush',
  },
  healthy: {
    text: '正常',
    tone: 'mint',
  },
  dormant: {
    text: '休眠',
    tone: 'slate',
  },
  'fertilizing-needed': {
    text: '需施肥',
    tone: 'cream',
  },
}

const resolvedLabel = computed(() => {
  if (props.text.trim().length > 0) {
    return props.text
  }

  if (props.status !== 'custom') {
    return statusMetaMap[props.status].text
  }

  return '状态'
})

const resolvedTone = computed<SoftTone>(() => {
  if (props.status !== 'custom') {
    return statusMetaMap[props.status].tone
  }

  return props.tone
})

const badgeClass = computed(() => toneClassMap[resolvedTone.value])
const hasLeadingIcon = computed(() => props.icon.trim().length > 0)
const sizeClass = computed(() =>
  props.size === 'md' ? 'min-h-[60rpx] gap-2 px-3.5 py-2 text-xs' : 'gap-1.5 px-3 py-1.5 text-2xs',
)
</script>

<template>
  <view
    :class="[
      'badge-soft whitespace-nowrap shadow-[0_8rpx_18rpx_rgba(148,163,184,0.08)]',
      sizeClass,
      badgeClass,
    ]"
  >
    <view
      v-if="hasLeadingIcon"
      class="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--color-surface)]/65 text-[20rpx] leading-none"
    >
      {{ props.icon }}
    </view>
    <view
      v-else-if="props.showDot"
      class="h-1.5 w-1.5 rounded-full bg-current opacity-70"
    />
    <text class="leading-none whitespace-nowrap">{{ resolvedLabel }}</text>
  </view>
</template>
