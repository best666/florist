<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import ActionHintButton from './ActionHintButton.vue'
import { useFlowerStore, useRecordStore } from '@/store'

defineProps<{
  plantDoctorHistoryCount: number
}>()

const flowerStore = useFlowerStore()
const recordStore = useRecordStore()
const { activeFlowers, recycleBinFlowers } = storeToRefs(flowerStore)
const { sortedRecords } = storeToRefs(recordStore)

const totalPlantCount = computed(() => activeFlowers.value.length + recycleBinFlowers.value.length)

const visualizedStats = computed(() => {
  const entries = [
    { key: 'plants', label: '花园规模', value: totalPlantCount.value, colorClass: 'bg-[#8FD3A8]' },
    { key: 'records', label: '打卡活跃度', value: sortedRecords.value.length, colorClass: 'bg-[#F7B4C8]' },
    { key: 'recycle', label: '待恢复植株', value: recycleBinFlowers.value.length, colorClass: 'bg-[#F4C46A]' },
  ]
  const maxValue = Math.max(...entries.map((item) => item.value), 1)

  return entries.map((item) => ({
    ...item,
    width: `${Math.max(18, Math.round((item.value / maxValue) * 100))}%`,
  }))
})

function handleOpenShop(): void {
  uni.navigateTo({ url: '/pages/shop/index' })
}
</script>

<template>
  <view class="grid gap-3">
    <ActionHintButton
      title="打开极简商城"
      hint="外链种草入口，不做站内交易和营销干扰。"
      icon="↗"
      @click="handleOpenShop"
    />

    <view class="surface-soft rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4 text-sm leading-6 text-app-muted">
      精选园艺好物推荐，发现更多养花灵感和实用工具。
    </view>

    <view class="mt-1 flex flex-col gap-4">
      <view
        v-for="item in visualizedStats"
        :key="item.key"
        class="flex flex-col gap-2"
      >
        <view class="flex items-center justify-between text-sm text-app-muted">
          <text>{{ item.label }}</text>
          <text class="font-700 text-app-ink">{{ item.value }}</text>
        </view>
        <view class="h-[18rpx] overflow-hidden rounded-full bg-[var(--color-cream)]/40">
          <view
            :class="`${item.colorClass} h-full rounded-full transition-all duration-300`"
            :style="{ width: item.width }"
          />
        </view>
      </view>
    </view>
  </view>
</template>
