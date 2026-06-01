<script setup lang="ts">
import InfoPopover from '@/components/InfoPopover.vue'
import { usePageTheme } from '@/hooks/usePageTheme'
import { usePageTip } from '@/hooks/usePageTip'
import { ABOUT_TIPS } from '@/interfaces/page-tips'

const themeClass = usePageTheme()
const { currentTip: aboutTip } = usePageTip(ABOUT_TIPS)

const featureList = [
  '植株、打卡、提醒和成长记录安全保存在你的设备上，离线也能用。',
  '天气提醒、AI 养护建议、病虫害识别、出差照护方案。',
  '轻量、稳定、温柔，帮你把每一盆植物都照顾好。',
]
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-app-ivory via-[var(--color-cream)] to-app-ivory" :class="themeClass">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-8">
      <view
        class="hero-shell bg-linear-to-br from-[var(--color-blush)] via-[var(--color-cream)] to-[var(--color-mint)] px-5 py-5 shadow-[var(--shadow-hero)]">
        <view class="badge-soft bg-[var(--color-surface)]/80 text-app-muted">关于我们</view>
        <view class="mt-3 text-[42rpx] font-900 leading-tight text-app-ink">
          养花人是一款把照护过程慢慢沉淀下来的花园工具
        </view>
        <view class="mt-2 text-sm leading-6 text-app-muted">
          {{ aboutTip }}
        </view>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <view class="flex items-center gap-1">
          <text class="block text-base font-800 text-app-ink">产品定位</text>
          <InfoPopover content="把花卉养护中最容易被忽略的细节做成一个温和的陪伴系统：记录发生过什么、提醒今天该做什么、在出错时还能把数据找回来。" />
        </view>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">你能在这里做什么</text>
        <view class="mt-4 flex flex-col gap-3">
          <view v-for="item in featureList" :key="item"
            class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4 text-sm leading-6 text-app-muted">
            {{ item }}
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <view class="flex items-center gap-1">
          <text class="block text-base font-800 text-app-ink">设计原则</text>
          <InfoPopover content="每一个功能都尽量简单直接，页面负责排版，组件负责展示，复杂逻辑留在底层。让你用起来轻巧顺手。" />
        </view>
      </view>
    </view>
  </view>
</template>
