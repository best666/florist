<script setup lang="ts">
import { usePageTheme } from '@/hooks/usePageTheme'

const themeClass = usePageTheme()
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-app-ivory via-[var(--color-cream)] to-app-ivory" :class="themeClass">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-[40rpx]">
      <view
        class="hero-shell bg-linear-to-br from-[var(--color-blush)] via-[var(--color-cream)] to-[var(--color-mint)] px-5 py-5 shadow-[var(--shadow-hero)]">
        <view class="badge-soft bg-[var(--color-surface)]/80 text-app-muted">用户协议</view>
        <view class="mt-3 text-[42rpx] font-900 leading-tight text-app-ink">
          在继续使用前，请确认你理解本应用以本地工具和辅助建议为主
        </view>
        <view class="mt-2 text-sm leading-6 text-app-muted">
          本协议用于明确产品能力边界、使用责任和数据管理方式，帮助你更稳定地使用养花人。
        </view>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">1. 使用边界</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          养花人提供植物管理、打卡记录、提醒、AI 建议、病虫害识别、相册和备份恢复等功能。这些内容用于日常养护辅助，不构成专业农业、医疗或财务建议。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">2. 用户责任</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          你需要对自行录入的植物信息、反馈内容、备份串保管和恢复操作负责。如果你选择清空或覆盖本地数据，请先自行确认备份完整性。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">3. 服务可用性</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          某些功能依赖天气服务、AI 中转或系统权限。当相关服务不可用时，应用会尽量提供本地兜底，但不承诺所有联网能力始终稳定可达。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">4. 知识产权</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          应用内的图标、界面设计、文案和代码均属于植愈日记开发团队。未经许可，不得复制、修改或分发本应用的任何部分用于商业目的。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">5. 协议更新与法律适用</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          当产品能力、权限使用方式或数据处理策略发生明显变化时，我们会同步更新说明页面。继续使用即视为你接受更新后的协议内容。本协议适用中华人民共和国法律。
        </text>
      </view>

      <view class="card-soft rounded-[32rpx]">
        <text class="block text-base font-800 text-app-ink">6. 联系我们</text>
        <text class="mt-3 block text-sm leading-7 text-app-muted">
          植愈日记由植愈日记开发团队开发和运营。如果你对本协议有任何疑问，可以通过应用内的「反馈与建议」功能联系我们。
        </text>
      </view>
    </view>
  </view>
</template>
