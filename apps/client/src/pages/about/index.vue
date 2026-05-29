<script setup lang="ts">
import { usePageTheme } from '@/hooks/usePageTheme'

const themeClass = usePageTheme()

const featureList = [
  '本地加密保存植株、打卡、提醒和成长记录，断网也能继续使用。',
  '支持天气提醒、AI 养护建议、病虫害识别、出差照护方案。',
  '强调轻量、稳定和可持续维护，不把复杂流程堆进单一页面。',
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
          它服务于日常养护、小程序双端体验和本地数据安全，不追求堆砌复杂功能，而是希望让每一次照顾都更轻一点、更稳一点。
        </view>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">产品定位</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          我们希望把花卉养护中最容易被忽略的细节做成一个温和的陪伴系统：记录发生过什么、提醒今天该做什么、在出错时还能把数据找回来。
        </text>
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
        <text class="block text-base font-800 text-app-ink">设计原则</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          功能先落在现有工程边界里，能复用现有 request、storage、platform、Pinia 状态就不平行再造一套。页面负责编排，组件负责展示，副作用逻辑尽量下沉到 hook 和工具层。
        </text>
      </view>
    </view>
  </view>
</template>
