<script setup lang="ts">
import InfoPopover from './InfoPopover.vue'

interface PageHeroProps {
  /** 顶部徽章文字 */
  badge: string
  /** 主标题 */
  title: string
  /** 提示内容（显示为 InfoPopover） */
  tip?: string | undefined
  /** 右侧装饰 emoji */
  emoji?: string
  /** InfoPopover 图标样式 */
  tipIcon?: 'info' | 'help'
}

withDefaults(defineProps<PageHeroProps>(), {
  tip: '',
  emoji: '🌱',
  tipIcon: 'info',
})
</script>

<template>
  <view
    class="hero-shell app-fade-up bg-linear-to-br from-[var(--color-blush)] via-[var(--color-cream)] to-[var(--color-mint)]"
  >
    <view class="flex items-start justify-between gap-4">
      <view class="flex-1">
        <view class="badge-soft bg-[var(--color-surface)]/78 text-app-muted dark:bg-[var(--color-surface)]/10 dark:text-slate-100">
          {{ badge }}
        </view>
        <view class="mt-3 flex items-center gap-2 text-title font-900 leading-tight text-app-ink dark:text-slate-50">
          {{ title }}
          <InfoPopover v-if="tip" :content="tip" :icon="tipIcon" />
        </view>
      </view>
      <view
        class="app-float-soft flex h-[150rpx] w-[150rpx] flex-none items-center justify-center rounded-full bg-[var(--color-surface)]/58 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.35)] dark:bg-[var(--color-surface)]/8"
      >
        {{ emoji }}
      </view>
    </view>
  </view>
</template>
