<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
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
const { refreshNetworkStatus } = useNetworkStatus()

const themeStyleVariables = computed(() => memberStore.themeStyleVariables)
const runtimeBannerVisible = computed(() => isOffline.value || syncStatus.value !== 'idle')
const runtimeBannerClass = computed(() => {
  if (isOffline.value) {
    return 'border-[#f1d7ad] bg-[#fff5e7]/92 text-[#8a633e]'
  }

  if (syncStatus.value === 'syncing') {
    return 'border-[#cfeadd] bg-[#eef9f4]/92 text-[#2e7e67]'
  }

  return 'border-[#f4d4d0] bg-[#fff2f1]/92 text-[#9a5b5b]'
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
}

onLaunch(() => {
  void (async () => {
    appStore.setRuntimePlatform(getRuntimePlatform())
    memberStore.syncMembershipStatus()
    refreshNetworkStatus()
    await initializeAppSession()
    void flowerStore.cleanupRecycleBin()

    if (!appStore.isOffline) {
      await syncAppRuntime('正在整理最近的花园状态。')
    }
  })()
})

onShow(() => {
  void (async () => {
    appStore.setRuntimePlatform(getRuntimePlatform())
    memberStore.syncMembershipStatus()
    refreshNetworkStatus()
    await initializeAppSession()

    if (appStore.isOffline) {
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
  <view class="min-h-screen" :style="themeStyleVariables">
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
    <GlobalAdBanner />
  </view>
</template>
