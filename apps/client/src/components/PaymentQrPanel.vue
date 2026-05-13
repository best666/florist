<script setup lang="ts">
import { computed } from 'vue'

interface PaymentQrPanelProps {
  text: string
}

const props = defineProps<PaymentQrPanelProps>()

function createSeed(rawText: string): number {
  return Array.from(rawText).reduce((seed, char, index) => (
    (seed + char.charCodeAt(0) * (index + 3)) % 9973
  ), 173)
}

const cellMatrix = computed(() => {
  const size = 21
  const seed = createSeed(props.text)

  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size)
    const column = index % size
    const inPositionBlock = (row < 5 && column < 5)
      || (row < 5 && column > 15)
      || (row > 15 && column < 5)

    if (inPositionBlock) {
      return true
    }

    return ((seed + row * 17 + column * 31 + row * column) % 7) < 3
  })
})
</script>

<template>
  <view class="rounded-[28rpx] bg-white p-4 shadow-[0_14rpx_34rpx_rgba(148,163,184,0.12)]">
    <view class="mx-auto grid w-[360rpx] grid-cols-21 gap-[4rpx] rounded-[22rpx] bg-[#F5F1E7] p-3">
      <view v-for="(filled, index) in cellMatrix" :key="index" class="aspect-square rounded-[2rpx]"
        :class="filled ? 'bg-slate-800' : 'bg-transparent'" />
    </view>
    <text class="mt-3 block text-center text-2xs leading-5 text-slate-500">
      H5 支付二维码展示区，扫码后按页面提示确认一次性支付，不自动续费。
    </text>
  </view>
</template>
