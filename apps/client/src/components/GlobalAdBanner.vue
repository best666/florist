<script setup lang="ts">
import { computed } from 'vue'
import { useMemberStore } from '@/store'

const memberStore = useMemberStore()

const visible = computed(() => !memberStore.hasAdFree)

function handleOpenMemberCenter(): void {
  uni.navigateTo({
    url: '/pages/member/index',
  })
}
</script>

<template>
  <view v-if="visible"
    class="pointer-events-auto fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+20rpx)] z-50 rounded-[28rpx] bg-linear-to-r from-[#FFF0DD] via-[#FFF8EB] to-[#E7F8F1] px-4 py-3 shadow-[0_18rpx_44rpx_rgba(189,161,120,0.18)]">
    <view class="flex items-center gap-3">
      <view class="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-lg">
        🌟
      </view>
      <view class="min-w-0 flex-1">
        <text class="block text-sm font-800 text-slate-800">升级会员可永久去广告</text>
        <text class="mt-1 block truncate text-2xs text-slate-500">解锁无限 AI、全部皮肤、云端备份和无水印导出</text>
      </view>
      <button class="h-9 rounded-full border-none bg-[#EFD18E] px-4 text-2xs font-800 text-slate-700"
        hover-class="opacity-92" @tap="handleOpenMemberCenter">
        去开通
      </button>
    </view>
  </view>
</template>
