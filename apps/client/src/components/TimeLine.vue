<script setup lang="ts">
import { computed } from 'vue'
import type { SoftTone, TimelineItem } from '@/interfaces'
import TagLabel from './TagLabel.vue'

interface TimeLineProps {
  /**
   * 节点列表。
   */
  items: ReadonlyArray<TimelineItem>
  /**
   * 节点为空时的提示文案。
   */
  emptyText?: string
}

const props = withDefaults(defineProps<TimeLineProps>(), {
  emptyText: '还没有时间轴内容',
})

const toneDotClassMap: Record<SoftTone, string> = {
  mint: 'bg-[#caeee2] text-[#356f5d] dark:bg-emerald-300 dark:text-emerald-900',
  blush: 'bg-[#f6d8e5] text-[#8e5e73] dark:bg-rose-300 dark:text-rose-900',
  cream: 'bg-[#fbe3b7] text-[#8f6c37] dark:bg-amber-200 dark:text-amber-900',
  slate: 'bg-[#dfe6ec] text-[#5b6874] dark:bg-slate-300 dark:text-slate-900',
}

const normalizedItems = computed(() => props.items)

function resolveDotClass(item: TimelineItem): string {
  return toneDotClassMap[item.tone ?? 'mint']
}
</script>

<template>
  <view class="flex flex-col gap-3 rounded-[30rpx] dark:bg-slate-900">
    <view v-if="normalizedItems.length === 0"
      class="surface-soft py-4 text-center text-sm text-app-muted dark:text-slate-500">
      {{ props.emptyText }}
    </view>

    <view v-for="(item, index) in normalizedItems" :key="item.id" class="app-fade-up flex gap-3">
      <view class="flex w-10 flex-col items-center">
        <view
          class="flex h-8 w-8 items-center justify-center rounded-full text-2xs font-700 shadow-[0_10rpx_24rpx_rgba(148,163,184,0.18)]"
          :class="resolveDotClass(item)">
          {{ item.dotLabel || index + 1 }}
        </view>
        <view v-if="index !== normalizedItems.length - 1"
          class="mt-2 min-h-10 w-[2px] flex-1 rounded-full bg-linear-to-b from-app-mint via-app-cream to-white dark:to-slate-900" />
      </view>

      <view class="flex-1 pb-4">
        <view class="surface-soft rounded-[24rpx] bg-white/74 p-4 dark:bg-slate-800/90">
          <view class="flex flex-wrap items-start justify-between gap-2">
            <view class="flex flex-col gap-1">
              <text class="text-sm font-800 text-app-ink dark:text-slate-100">
                {{ item.title }}
              </text>
              <text class="text-2xs text-app-muted/80 dark:text-slate-500">
                {{ item.timestamp }}
              </text>
            </view>
            <TagLabel v-if="item.status" :status="item.status" :show-dot="false" />
          </view>

          <text v-if="item.description" class="mt-2 block text-sm leading-6 text-app-muted dark:text-slate-300">
            {{ item.description }}
          </text>

          <view v-if="item.tags?.length" class="mt-3 flex flex-wrap gap-2">
            <TagLabel v-for="tag in item.tags" :key="tag" :text="tag" tone="slate" />
          </view>

          <slot name="item" :item="item" :index="index" />
        </view>
      </view>
    </view>
  </view>
</template>
