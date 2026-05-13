<script setup lang="ts">
import { computed } from 'vue'
import AppSectionCard from '@/components/AppSectionCard.vue'
import { usePlatform } from '@/hooks/usePlatform'
import type { PlatformSnapshot } from '@/interfaces'
import { getH5ViewportInfo, getWeixinMiniProgramInfo } from '@/utils/platform'

const { runtimePlatform } = usePlatform()

const platformSnapshot = computed<PlatformSnapshot>(() => ({
  viewport: getH5ViewportInfo(),
  miniProgram: getWeixinMiniProgramInfo(),
}))

const baseFeatures = [
  '严格 TypeScript 基线与通用类型',
  'AES 加密本地持久化封装',
  '统一 request 请求、拦截与重复请求取消',
  'H5 / 微信小程序条件编译适配',
]
</script>

<template>
  <view class="page-shell safe-pb">
    <view class="mx-auto flex max-w-[720rpx] flex-col gap-4">
      <view class="card-soft overflow-hidden bg-linear-to-br from-app-mint to-app-cream">
        <view class="flex items-center justify-between gap-4">
          <view>
            <view class="badge-soft bg-white/70 text-slate-600">
              Florist App Shell
            </view>
            <view class="mt-3 text-2xl font-800 text-slate-800">
              养花人前端基础架构
            </view>
            <view class="mt-2 text-sm leading-6 text-slate-600">
              基于 UniApp + Unibest + UnoCSS，面向微信小程序与 H5 双端。
            </view>
          </view>
          <view class="h-24 w-24 rounded-full bg-white/55" />
        </view>
      </view>

      <AppSectionCard
        title="当前平台"
        description="通过条件编译和平台适配函数区分 H5 与微信小程序独有能力。"
        accent-class="bg-app-mint"
      >
        <view class="flex flex-col gap-2 text-sm text-slate-600">
          <view>
            运行平台：{{ runtimePlatform ?? 'unknown' }}
          </view>
          <view v-if="platformSnapshot.viewport">
            H5 视口：{{ platformSnapshot.viewport.width }} x {{ platformSnapshot.viewport.height }}
          </view>
          <view v-if="platformSnapshot.miniProgram">
            小程序 AppID：{{ platformSnapshot.miniProgram.appId }}
          </view>
        </view>
      </AppSectionCard>

      <AppSectionCard
        title="基础能力"
        description="当前骨架默认集成的前端全局能力。"
        accent-class="bg-app-blush"
      >
        <view class="grid grid-cols-1 gap-2">
          <view
            v-for="feature in baseFeatures"
            :key="feature"
            class="rounded-3 bg-app-ivory px-3 py-3 text-sm text-slate-600"
          >
            {{ feature }}
          </view>
        </view>
      </AppSectionCard>
    </view>
  </view>
</template>
