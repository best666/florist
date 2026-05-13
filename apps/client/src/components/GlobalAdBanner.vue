<script setup lang="ts">
import { computed } from 'vue'
import { useMemberStore } from '@/store'
import { getWeakAdFeaturedProduct } from '@/utils'

const memberStore = useMemberStore()
const featuredProduct = getWeakAdFeaturedProduct()

const visible = computed(() => !memberStore.hasAdFree)

function handleOpenShop(): void {
  uni.navigateTo({
    url: '/pages/shop/index',
  })
}
</script>

<template>
  <view v-if="visible"
    class="pointer-events-auto fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+16rpx)] z-40 rounded-[24rpx] border border-white/60 bg-[#FFF8EF]/92 px-4 py-3 shadow-[0_10rpx_24rpx_rgba(148,163,184,0.10)] backdrop-blur-[8px]">
    <view class="flex items-center gap-3">
      <view
        class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-[0_8rpx_18rpx_rgba(148,163,184,0.10)]">
        🪴
      </view>
      <view class="min-w-0 flex-1">
        <text class="block text-sm font-800 text-slate-800">刚需补给推荐：{{ featuredProduct.title }}</text>
        <text class="mt-1 block truncate text-2xs text-slate-500">静态弱广告，仅做养花商品导览，无弹窗、无强跳、无开屏广告</text>
      </view>
      <button class="h-9 rounded-full border-none bg-[#EEF3E9] px-4 text-2xs font-800 text-slate-700"
        hover-class="opacity-92" @tap="handleOpenShop">
        去商城
      </button>
    </view>
  </view>
</template>
