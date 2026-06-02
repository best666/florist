<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed } from 'vue'
import PageHero from '@/components/PageHero.vue'
import { useMemberStore } from '@/store'
import { useFreeTierLimits } from '@/hooks/useFreeTierLimits'
import { THEME_SKIN_DEFINITIONS } from '@/utils'
import { usePageTheme } from '@/hooks/usePageTheme'
import { MAX_FREE_PHOTO_UPLOADS } from '@/interfaces'

const themeClass = usePageTheme()
const memberStore = useMemberStore()
const freeTier = useFreeTierLimits()

onShow(() => {
  void memberStore.initializeMembership(true)
  freeTier.refreshFromStorage()
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
      <PageHero
        badge="限时免费"
        title="当前所有功能免费开放中"
        tip="植株数据云端保存、皮肤主题自由切换、备份恢复都免费开放。AI 识别和咨询有每日免费次数，会员可不限次数使用。"
        emoji="🎁"
      />

      <!-- 使用统计 -->
      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">今日使用</text>
        <view class="mt-4 grid grid-cols-2 gap-3">
          <view class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-3">
            <text class="block text-2xs text-app-muted">AI 天气建议</text>
            <text class="mt-1 block text-lg font-800" :class="freeTier.weatherAdviceExceeded.value ? 'text-[var(--color-blush)]' : 'text-[var(--color-sage)]'">
              {{ freeTier.weatherAdviceRemaining.value }} 次剩余
            </text>
          </view>
          <view class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-3">
            <text class="block text-2xs text-app-muted">AI 养护咨询</text>
            <text class="mt-1 block text-lg font-800" :class="freeTier.consultationExceeded.value ? 'text-[var(--color-blush)]' : 'text-[var(--color-sage)]'">
              {{ freeTier.consultationRemaining.value }} 次剩余
            </text>
          </view>
          <view class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-3 col-span-2">
            <text class="block text-2xs text-app-muted">照片上传（共 {{ MAX_FREE_PHOTO_UPLOADS }} 张额度）</text>
            <text class="mt-1 block text-lg font-800" :class="freeTier.photoUploadsExceeded.value ? 'text-[var(--color-blush)]' : 'text-[var(--color-sage)]'">
              {{ freeTier.photoUploadsRemaining.value }} 张剩余
            </text>
          </view>
        </view>
      </view>

      <!-- 免费权益说明 -->
      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">免费权益</text>
        <view class="mt-4 flex flex-col gap-2">
          <view class="flex items-center gap-2 text-sm text-app-muted">
            <text class="text-[var(--color-sage)]">✓</text>
            <text>植株全部保存云端，永久同步</text>
          </view>
          <view class="flex items-center gap-2 text-sm text-app-muted">
            <text class="text-[var(--color-sage)]">✓</text>
            <text>全部皮肤主题免费切换</text>
          </view>
          <view class="flex items-center gap-2 text-sm text-app-muted">
            <text class="text-[var(--color-sage)]">✓</text>
            <text>本地备份与恢复（AES 加密）</text>
          </view>
          <view class="flex items-center gap-2 text-sm text-app-muted">
            <text class="text-[var(--color-sage)]">✓</text>
            <text>成长海报无水印导出</text>
          </view>
          <view class="flex items-center gap-2 text-sm text-app-muted">
            <text class="text-[var(--color-sage)]">✓</text>
            <text>照片上传 5 张额度</text>
          </view>
          <view class="flex items-center gap-2 text-sm text-app-muted">
            <text class="text-app-ink">→</text>
            <text>AI 天气建议每日 2 次</text>
          </view>
          <view class="flex items-center gap-2 text-sm text-app-muted">
            <text class="text-app-ink">→</text>
            <text>AI 养护咨询每日 1 次</text>
          </view>
        </view>
      </view>

      <!-- 主题选择 -->
      <view class="card-soft rounded-[32rpx]">
        <view>
          <text class="block text-base font-800 text-app-ink">皮肤主题</text>
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
