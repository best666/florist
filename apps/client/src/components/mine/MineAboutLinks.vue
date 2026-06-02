<script setup lang="ts">
function handleOpenPage(url: string): void {
  uni.navigateTo({ url })
}
</script>

<template>
  <view class="mt-4 flex flex-col gap-3">
    <button
      class="flex h-[88rpx] items-center justify-between rounded-[24rpx] border-none bg-[var(--color-cream)]/60 px-4 text-left text-sm font-700 text-app-ink"
      hover-class="opacity-92"
      @tap="handleOpenPage('/pages/about/index')"
    >
      <text>关于我们</text>
      <text class="text-app-muted/70">查看</text>
    </button>
    <button
      class="flex h-[88rpx] items-center justify-between rounded-[24rpx] border-none bg-[var(--color-cream)]/40 px-4 text-left text-sm font-700 text-app-ink"
      hover-class="opacity-92"
      @tap="handleOpenPage('/pages/privacy/index')"
    >
      <text>隐私协议</text>
      <text class="text-app-muted/70">查看</text>
    </button>
    <button
      class="flex h-[88rpx] items-center justify-between rounded-[24rpx] border-none bg-[var(--color-cream)]/40 px-4 text-left text-sm font-700 text-app-ink"
      hover-class="opacity-92"
      @tap="handleOpenPage('/pages/user-agreement/index')"
    >
      <text>用户协议</text>
      <text class="text-app-muted/70">查看</text>
    </button>
  </view>
</template>
