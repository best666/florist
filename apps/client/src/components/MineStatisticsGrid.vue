<script setup lang="ts">
import type { MineStatisticsCard } from '@/interfaces'

interface MineStatisticsGridProps {
  readonly cards: ReadonlyArray<MineStatisticsCard>
}

const props = defineProps<MineStatisticsGridProps>()
</script>

<template>
  <view class="grid grid-cols-2 gap-3">
    <view v-for="card in props.cards" :key="card.key"
      class="surface-soft app-fade-up overflow-hidden rounded-[30rpx] p-4">
      <view :class="`mb-3 h-[12rpx] rounded-full bg-linear-to-r ${card.accentClass}`" />
      <text class="block text-xs tracking-[0.22em] text-app-muted/80">
        {{ card.label }}
      </text>
      <text class="mt-2 block text-[42rpx] font-900 text-app-ink">
        {{ card.value }}
      </text>
      <text class="mt-2 block text-2xs leading-5 text-app-muted">
        {{ card.hint }}
      </text>
    </view>
  </view>
</template>
