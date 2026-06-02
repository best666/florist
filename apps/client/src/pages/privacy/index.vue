<script setup lang="ts">
import { usePageTheme } from '@/hooks/usePageTheme'

const themeClass = usePageTheme()
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-app-ivory via-[var(--color-cream)] to-app-ivory" :class="themeClass">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-[40rpx]">
      <view
        class="hero-shell bg-linear-to-br from-[var(--color-blush)] via-[var(--color-cream)] to-[var(--color-mint)] px-5 py-5 shadow-[var(--shadow-hero)]">
        <view class="badge-soft bg-[var(--color-surface)]/80 text-app-muted">隐私协议</view>
        <view class="mt-3 text-[42rpx] font-900 leading-tight text-app-ink">
          我们默认把你的花园记录当作需要谨慎对待的私人数据
        </view>
        <view class="mt-2 text-sm leading-6 text-app-muted">
          以下内容用于说明本应用在本地数据、网络请求和设备权限方面的基本处理方式。
        </view>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">1. 本地数据</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          植株、打卡、提醒配置、反馈草稿等数据默认安全保存在你的设备上。你也可以手动生成备份文件，用于自行保存和恢复。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">2. 权限使用</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          定位权限仅用于获取城市和天气提醒；相册和相机权限仅在你主动上传图片、生成海报或反馈截图时触发。未授权时，应用会提供手动选择和本地兜底方案。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">3. 网络与 AI 请求</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          天气、提醒同步和 AI 能力会在你主动使用相关功能时发起网络请求。若网络不可用，应用会优先回退到缓存或本地兜底逻辑，不会强制阻断主要使用流程。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">4. 你的控制权</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          你可以随时在个人中心执行备份、恢复或清空本地数据，也可以打开系统权限设置调整定位、相册和通知相关授权。清空操作不可撤回，请在执行前先做好备份。
        </text>
      </view>
    </view>
  </view>
</template>
