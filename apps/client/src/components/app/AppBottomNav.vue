<script setup lang="ts">
import { computed } from 'vue'

interface AppBottomNavProps {
  activeKey: 'home' | 'record' | 'album' | 'mine'
}

interface NavItem {
  readonly key: 'home' | 'record' | 'album' | 'mine'
  readonly label: string
  readonly icon: string
  readonly url: string
}

const props = defineProps<AppBottomNavProps>()

const navItems = computed<ReadonlyArray<NavItem>>(() => ([
  { key: 'home', label: '花园', icon: '⌂', url: '/pages/index/index' },
  { key: 'record', label: '打卡', icon: '✎', url: '/pages/record/index' },
  { key: 'album', label: '相册', icon: '▣', url: '/pages/album/index' },
  { key: 'mine', label: '我的', icon: '◌', url: '/pages/mine/index' },
]))

function handleNavigate(item: NavItem): void {
  if (item.key === props.activeKey) {
    return
  }

  uni.reLaunch({
    url: item.url,
  })
}
</script>

<template>
  <view
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+12rpx)]">
    <view class="bottom-nav-shell pointer-events-auto">
      <button v-for="item in navItems" :key="item.key" class="bottom-nav-item"
        :class="item.key === props.activeKey ? 'bg-[var(--color-surface)] text-app-ink shadow-[0_10rpx_24rpx_rgba(148,163,184,0.18)] dark:bg-slate-900 dark:text-slate-100' : 'bg-transparent text-app-muted/78 dark:text-app-muted/70'"
        hover-class="opacity-92" @tap="handleNavigate(item)">
        <text class="text-[28rpx] leading-none">{{ item.icon }}</text>
        <text class="mt-1 text-2xs font-700 leading-none">{{ item.label }}</text>
      </button>
    </view>
  </view>
</template>
