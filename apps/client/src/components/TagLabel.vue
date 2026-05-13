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
}

const props = withDefaults(defineProps<TagLabelProps>(), {
  status: 'custom',
  text: '',
  tone: 'mint',
  showDot: true,
})

const toneClassMap: Record<SoftTone, string> = {
  mint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-200',
  blush: 'bg-rose-100 text-rose-700 dark:bg-rose-500/18 dark:text-rose-200',
  cream: 'bg-amber-50 text-amber-700 dark:bg-amber-500/16 dark:text-amber-100',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700/55 dark:text-slate-100',
}

const statusMetaMap: Record<Exclude<TagLabelStatus, 'custom'>, { text: string, tone: SoftTone }> = {
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
</script>

<template>
  <view :class="['badge-soft gap-1.5 px-3 py-1.5 text-2xs', badgeClass]">
    <view
      v-if="props.showDot"
      class="h-1.5 w-1.5 rounded-full bg-current opacity-70"
    />
    <text>{{ resolvedLabel }}</text>
  </view>
</template>
