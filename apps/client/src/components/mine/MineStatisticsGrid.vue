<script setup lang="ts">
import type { MineStatisticsCard } from '@/interfaces'
import InfoPopover from '../app/InfoPopover.vue'

interface MineStatisticsGridProps {
  readonly cards: ReadonlyArray<MineStatisticsCard>
}

const props = defineProps<MineStatisticsGridProps>()

function handleTap(card: MineStatisticsCard): void {
  card.onTap?.()
}
</script>

<template>
  <view class="grid grid-cols-2 gap-3">
    <view
      v-for="card in props.cards"
      :key="card.key"
      class="surface-soft app-fade-up rounded-[30rpx] p-4"
      :class="card.onTap ? 'app-pressable' : ''"
      :hover-class="card.onTap ? 'opacity-80' : ''"
      @tap="handleTap(card)"
    >
      <view :class="`mb-3 h-[12rpx] rounded-full bg-linear-to-r ${card.accentClass}`" />
      <view class="flex items-center gap-1">
        <text class="text-xs tracking-[0.22em] text-app-muted/80">
          {{ card.label }}
        </text>
        <InfoPopover :content="card.hint" />
      </view>
      <text class="mt-2 block text-[42rpx] font-900 text-app-ink">
        {{ card.value }}
      </text>
    </view>
  </view>
</template>
