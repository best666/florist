<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { getEncryptedStorage, setEncryptedStorage } from '@/utils/storage'

const DISMISS_KEY = 'pwa-install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const visible = ref(false)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isIos = ref(false)
const isStandalone = ref(false)

// 检查是否已安装或已关闭
function checkShouldShow(): boolean {
  // 已在独立模式（已安装 PWA）
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return false
  }

  // 用户之前关闭过，24 小时内不再提示
  const dismissed = getEncryptedStorage<number>(DISMISS_KEY)
  if (dismissed && Date.now() - dismissed < 24 * 60 * 60 * 1000) {
    return false
  }

  return true
}

function detectPlatform(): void {
  // #ifdef H5
  const ua = navigator.userAgent
  isIos.value = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches
  // #endif
}

// 监听 Chrome 的 beforeinstallprompt 事件
function listenInstallPrompt(): void {
  // #ifdef H5
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    if (checkShouldShow()) {
      // 延迟显示，避免页面刚加载就弹窗
      setTimeout(() => { visible.value = true }, 3000)
    }
  })

  // 用户已安装后隐藏
  window.addEventListener('appinstalled', () => {
    visible.value = false
    deferredPrompt.value = null
  })
  // #endif
}

// 对于不支持 beforeinstallprompt 的浏览器（如 iOS Safari），
// 延迟显示手动引导
function showManualGuide(): void {
  if (!checkShouldShow()) return
  // 等待 beforeinstallprompt 超时（约 3 秒），如果没触发则显示手动引导
  setTimeout(() => {
    if (!deferredPrompt.value && !isStandalone.value && checkShouldShow()) {
      visible.value = true
    }
  }, 3500)
}

async function handleInstall(): Promise<void> {
  if (deferredPrompt.value) {
    // Chrome/Android：触发原生安装提示
    await deferredPrompt.value.prompt()
    const choice = await deferredPrompt.value.userChoice
    if (choice.outcome === 'accepted') {
      visible.value = false
    }
    deferredPrompt.value = null
  } else if (isIos.value) {
    // iOS：无原生安装 API，引导手动操作——保持弹窗并显示动画提示
    return
  }
  dismiss()
}

function dismiss(): void {
  visible.value = false
  setEncryptedStorage(DISMISS_KEY, Date.now())
}

// 初始化（仅 H5 环境）
// #ifdef H5
detectPlatform()

if (!isStandalone.value && checkShouldShow()) {
  listenInstallPrompt()
  showManualGuide()
}
// #endif

onBeforeUnmount(() => {
  visible.value = false
})
</script>

<template>
  <view
    v-if="visible"
    class="fixed bottom-6 left-4 right-4 z-80 animate-bounce-in rounded-[28rpx] bg-white px-5 py-4 shadow-[0_18rpx_60rpx_rgba(15,23,42,0.22)] dark:bg-slate-800"
  >
    <!-- 关闭按钮 -->
    <view
      class="absolute right-3 top-3 flex h-[44rpx] w-[44rpx] items-center justify-center rounded-full bg-slate-100 text-[24rpx] text-app-muted dark:bg-slate-700 dark:text-slate-300"
      hover-class="opacity-70"
      @tap="dismiss"
    >
      ×
    </view>

    <!-- Chrome / Android 原生安装 -->
    <template v-if="deferredPrompt">
      <view class="mb-2 flex items-center gap-3 pr-6">
        <text class="text-[40rpx]">🧑‍🌾</text>
        <view class="min-w-0 flex-1">
          <text class="block text-sm font-800 text-app-ink dark:text-slate-100">
            将植愈日记添加到主屏幕
          </text>
          <text class="mt-1 block text-2xs leading-5 text-app-muted dark:text-slate-400">
            像原生 App 一样快速打开，离线也能查看花园
          </text>
        </view>
      </view>
      <button
        class="btn-base mt-3 h-[80rpx] min-h-[80rpx] w-full rounded-full bg-[#7EC8B8] text-sm font-700 text-white dark:bg-[#5CBF8A]"
        hover-class="opacity-92"
        @tap="handleInstall"
      >
        添加到主屏幕
      </button>
    </template>

    <!-- iOS Safari 手动引导 -->
    <template v-else-if="isIos">
      <view class="mb-2 flex items-start gap-3 pr-6">
        <text class="text-[40rpx]">📲</text>
        <view class="min-w-0 flex-1">
          <text class="block text-sm font-800 text-app-ink dark:text-slate-100">
            添加到主屏幕，像 App 一样使用
          </text>
          <text class="mt-1 block text-2xs leading-5 text-app-muted dark:text-slate-400">
            点击底部 <text class="font-700">分享按钮</text> <text class="text-base">⎋</text>，然后选择 <text class="font-700">「添加到主屏幕」</text>
          </text>
        </view>
      </view>
      <!-- 示意箭头 -->
      <view class="mt-3 flex justify-center">
        <view class="flex flex-col items-center gap-1 text-app-muted/60 dark:text-slate-500">
          <text class="text-[32rpx]">↓</text>
          <text class="text-2xs">点击底部中间</text>
          <text class="text-[32rpx]">⎋</text>
          <text class="text-2xs">然后选择"添加到主屏幕"</text>
        </view>
      </view>
    </template>

    <!-- 桌面端 / 其他浏览器 -->
    <template v-else>
      <view class="mb-2 flex items-start gap-3 pr-6">
        <text class="text-[40rpx]">💻</text>
        <view class="min-w-0 flex-1">
          <text class="block text-sm font-800 text-app-ink dark:text-slate-100">
            安装到桌面，更方便打开
          </text>
          <text class="mt-1 block text-2xs leading-5 text-app-muted dark:text-slate-400">
            点击浏览器地址栏右侧的 <text class="font-700">安装图标 ⊕</text> 即可添加到桌面
          </text>
        </view>
      </view>
      <button
        class="btn-base mt-3 h-[72rpx] min-h-[72rpx] w-full rounded-full bg-slate-100 text-sm font-700 text-app-muted dark:bg-slate-700 dark:text-slate-300"
        hover-class="opacity-70"
        @tap="dismiss"
      >
        知道了
      </button>
    </template>
  </view>
</template>

<style scoped>
@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: translateY(40rpx) scale(0.94);
  }
  60% {
    opacity: 1;
    transform: translateY(-6rpx) scale(1.01);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}
.animate-bounce-in {
  animation: bounce-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
</style>
