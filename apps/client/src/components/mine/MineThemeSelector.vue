<script setup lang="ts">
import { computed } from 'vue'
import { useMemberStore } from '@/store'
import { THEME_SKIN_DEFINITIONS } from '@/utils'

const memberStore = useMemberStore()
const themeSkins = computed(() => THEME_SKIN_DEFINITIONS)
const currentThemeId = computed(() => memberStore.memberCache.themeSkinId)

function handleApplyTheme(themeId: (typeof THEME_SKIN_DEFINITIONS)[number]['id']): void {
  const succeeded = memberStore.setTheme(themeId)
  const label = THEME_SKIN_DEFINITIONS.find((t) => t.id === themeId)?.label
  uni.showToast({ title: succeeded ? `已切换至「${label}」` : '切换失败', icon: 'none', duration: 2000 })
}
</script>

<template>
  <view class="mt-4 flex gap-12rpx">
    <button
      v-for="theme in themeSkins"
      :key="theme.id"
      class="btn-base flex-1 flex-col rounded-[20rpx] px-3 py-3"
      :class="
        currentThemeId === theme.id
          ? 'bg-linear-to-br from-[var(--color-gold)]/30 to-[var(--color-mint)]/30'
          : 'bg-[var(--color-cream)]/50'
      "
      hover-class="opacity-92"
      @tap="handleApplyTheme(theme.id)"
    >
      <text class="text-xl">{{ theme.previewEmoji }}</text>
      <text class="mt-2 block text-2xs font-700 text-app-ink">{{ theme.label }}</text>
    </button>
  </view>
</template>
