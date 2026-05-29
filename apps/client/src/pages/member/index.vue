<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed } from 'vue'
import { useMemberStore } from '@/store'
import { THEME_SKIN_DEFINITIONS } from '@/utils'
import { usePageTheme } from '@/hooks/usePageTheme'

const themeClass = usePageTheme()

const memberStore = useMemberStore()

onShow(() => {
  void memberStore.initializeMembership(true)
})

const themeSkins = computed(() => THEME_SKIN_DEFINITIONS)
const currentThemeId = computed(() => memberStore.memberCache.themeSkinId)

function handleApplyTheme(themeId: (typeof THEME_SKIN_DEFINITIONS)[number]['id']): void {
  const succeeded = memberStore.setTheme(themeId)
  const label = THEME_SKIN_DEFINITIONS.find((t) => t.id === themeId)?.label
  uni.showToast({ title: succeeded ? `已切换至「${label}」` : '切换失败', icon: 'none', duration: 2000 })
}
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-app-ivory via-[var(--color-cream)] to-app-ivory" :class="themeClass">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-8">
      <view
        class="overflow-hidden rounded-[var(--radius-panel)] bg-linear-to-br from-[var(--color-blush)] via-[var(--color-cream)] to-[var(--color-mint)] px-5 py-5 shadow-[var(--shadow-hero)]"
      >
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-[var(--color-surface)]/80 text-app-muted">皮肤主题中心</view>
            <view class="mt-3 text-[42rpx] font-900 leading-tight text-app-ink">
              选一个喜欢的配色，让花园更有你的风格
            </view>
            <view class="mt-2 text-sm leading-6 text-app-muted">
              莫兰迪色系，柔和低饱和，久看不累。切换后全局配色即时生效。
            </view>
          </view>
          <view
            class="flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-[var(--color-surface)]/60 text-[64rpx]"
          >
            🎨
          </view>
        </view>
      </view>


      <view class="card-soft rounded-[32rpx]">
        <view>
          <text class="block text-base font-800 text-app-ink">皮肤主题中心</text>
          <text class="mt-1 block text-sm text-app-muted">切换后全局配色即时生效。</text>
        </view>

        <view class="mt-4 grid grid-cols-2 gap-3">
          <button
            v-for="theme in themeSkins"
            :key="theme.id"
            class="rounded-[24rpx] border-none px-4 py-4 text-left"
            :class="
              currentThemeId === theme.id ? 'bg-linear-to-br from-[var(--color-gold)]/30 to-[var(--color-mint)]/30' : 'bg-[var(--color-cream)]/50'
            "
            hover-class="opacity-92"
            @tap="handleApplyTheme(theme.id)"
          >
            <text class="text-2xl">{{ theme.previewEmoji }}</text>
            <text class="mt-3 block text-sm font-800 text-app-ink">{{ theme.label }}</text>
            <text class="mt-1 block text-2xs leading-5 text-app-muted">{{ theme.description }}</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>
