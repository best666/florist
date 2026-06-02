<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import AuthLoginPopup from '@/components/AuthLoginPopup.vue'
import { useAuthSessionActions } from '@/hooks/useAuthSessionActions'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useTheme } from '@/hooks/useTheme'
import { ClientPlatform } from '@/interfaces'
import { useAppStore, useAuthStore } from '@/store'
import { useFlowerStore } from '@/store'
import { useMemberStore } from '@/store'
import { showGentleSuccess } from '@/utils'
import { getRuntimePlatform } from '@/utils/platform'

const appStore = useAppStore()
const authStore = useAuthStore()
const flowerStore = useFlowerStore()
const memberStore = useMemberStore()
const { isOffline, syncMessage, syncStatus } = storeToRefs(appStore)
const { isAuthenticated, sessionInitialized, switchingSession } = storeToRefs(authStore)
const { refreshNetworkStatus } = useNetworkStatus()
const { applyTheme, start: startThemeSystem } = useTheme()
const loginPopupVisible = ref(false)

const themeClass = computed(() => `theme-${memberStore.memberCache.themeSkinId}`)
const runtimeBannerVisible = computed(() => isOffline.value || syncStatus.value !== 'idle')
const authGateVisible = computed(() => sessionInitialized.value && !isAuthenticated.value)
const runtimePlatform = computed(() => appStore.runtimePlatform ?? ClientPlatform.H5)
const runtimeBannerClass = computed(() => {
  if (isOffline.value) {
    return 'border-[var(--color-gold)]/30 bg-[var(--color-cream)]/80 text-[var(--color-ink)]'
  }

  if (syncStatus.value === 'syncing') {
    return 'border-[var(--color-mint)]/30 bg-[var(--color-mint)]/15 text-[var(--color-ink)]'
  }

  return 'border-[var(--color-blush)]/30 bg-[var(--color-blush)]/15 text-[var(--color-ink)]'
})
const runtimeBannerText = computed(() => (
  isOffline.value
    ? '网络先暂时休息一下，离线记录会继续安全留在本地。'
    : syncMessage.value
))

async function syncAppRuntime(message: string, showSuccess = false): Promise<void> {
  await appStore.syncLocalGarden(message)

  if (showSuccess && !appStore.isOffline) {
    showGentleSuccess('网络回来了，离线记录已经重新对齐。')
  }
}

async function initializeAppSession(): Promise<void> {
  await authStore.initializeSession()
  await memberStore.initializeMembership()
}

function openLoginPopup(): void {
  loginPopupVisible.value = true
}

const { handleH5Login, handleWechatLogin } = useAuthSessionActions({
  onCloseLoginPopup: () => {
    loginPopupVisible.value = false
  },
})

onLaunch(() => {
  void (async () => {
    appStore.setRuntimePlatform(getRuntimePlatform())
    refreshNetworkStatus()
    await initializeAppSession()
    startThemeSystem()
    void flowerStore.cleanupRecycleBin()

    if (!appStore.isOffline && authStore.isAuthenticated) {
      await syncAppRuntime('正在整理最近的花园状态。')
    }
  })()
})

onShow(() => {
  void (async () => {
    appStore.setRuntimePlatform(getRuntimePlatform())
    refreshNetworkStatus()
    await initializeAppSession()
    applyTheme(memberStore.memberCache.themeSkinId)

    if (appStore.isOffline || !authStore.isAuthenticated) {
      void flowerStore.cleanupRecycleBin()
      return
    }

    await syncAppRuntime('正在把最近记录轻轻对齐。')
  })()
})

watch(
  isOffline,
  (offline, previousOffline) => {
    if (offline) {
      void flowerStore.cleanupRecycleBin()
      return
    }

    if (previousOffline) {
      void syncAppRuntime('网络回来了，正在把离线记录重新对齐。', true)
    }
  },
)
</script>

<template>
  <view :class="['min-h-screen', themeClass]">
    <view v-if="runtimeBannerVisible && runtimeBannerText" class="sticky top-0 z-80 px-4 pb-2 pt-3">
      <view
        class="app-fade-up mx-auto flex max-w-[760rpx] items-center gap-3 rounded-full border px-4 py-3 text-sm shadow-[0_12rpx_28rpx_rgba(148,163,184,0.14)] backdrop-blur-[12rpx]"
        :class="runtimeBannerClass">
        <view v-if="syncStatus === 'syncing' && !isOffline"
          class="app-breathe h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        <text class="flex-1 leading-6">
          {{ runtimeBannerText }}
        </text>
      </view>
    </view>
    <slot />
    <view v-if="authGateVisible"
      class="fixed inset-0 z-90 flex items-center justify-center bg-[var(--color-cream)]/92 px-6 backdrop-blur-[18rpx]">
      <view class="w-full max-w-[720rpx] rounded-[40rpx] bg-white px-6 py-6 shadow-[0_22rpx_80rpx_rgba(15,23,42,0.16)]">
        <view class="badge-soft bg-[var(--color-cream)]/60 text-app-muted">
          登录后使用
        </view>
        <view class="mt-4 text-[44rpx] font-900 leading-tight text-app-ink">
          登录后开始使用你的花园
        </view>
        <view class="mt-3 text-sm leading-7 text-app-muted">
          登录后即可使用植物管理、打卡记录、成长相册和云端备份等全部功能。
        </view>
        <button class="btn-panel mt-5 bg-[#D4EFEA] text-[#4A8C7E] dark:bg-[#3D6B5E] dark:text-[#B5E0D4]" hover-class="opacity-92" :loading="switchingSession"
          @tap="openLoginPopup">
          {{ runtimePlatform === ClientPlatform.MpWeixin ? '使用微信登录' : '手机号登录' }}
        </button>
      </view>
    </view>
    <AuthLoginPopup v-model="loginPopupVisible" :platform="runtimePlatform" :loading="switchingSession"
      @submitH5="handleH5Login" @loginWechat="handleWechatLogin" />

  </view>
</template>
