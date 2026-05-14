<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useAppStore } from '@/store'
import { useFlowerStore } from '@/store'
import { useMemberStore } from '@/store'
import { showGentleSuccess } from '@/utils'
import { getRuntimePlatform } from '@/utils/platform'

const appStore = useAppStore()
const flowerStore = useFlowerStore()
const memberStore = useMemberStore()
const { isOffline, syncMessage, syncStatus } = storeToRefs(appStore)
const { refreshNetworkStatus } = useNetworkStatus()

const themeStyleVariables = computed(() => memberStore.themeStyleVariables)
const runtimeBannerVisible = computed(() => isOffline.value || syncStatus.value !== 'idle')
const runtimeBannerClass = computed(() => {
  if (isOffline.value) {
    return 'bg-[#FFF5E7] text-[#8A633E]'
  }

  if (syncStatus.value === 'syncing') {
    return 'bg-[#EEF9F4] text-[#2E7E67]'
  }

  return 'bg-[#FFF2F1] text-[#9A5B5B]'
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

onLaunch(() => {
  appStore.setRuntimePlatform(getRuntimePlatform())
  memberStore.syncMembershipStatus()
  refreshNetworkStatus()
  void flowerStore.cleanupRecycleBin()

  if (!appStore.isOffline) {
    void syncAppRuntime('正在整理最近的花园状态。')
  }
})

onShow(() => {
  appStore.setRuntimePlatform(getRuntimePlatform())
  memberStore.syncMembershipStatus()
  refreshNetworkStatus()

  if (appStore.isOffline) {
    void flowerStore.cleanupRecycleBin()
    return
  }

  void syncAppRuntime('正在把最近记录轻轻对齐。')
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
        class="mx-auto flex max-w-[760rpx] items-center gap-3 rounded-full px-4 py-3 text-sm shadow-[0_12rpx_28rpx_rgba(148,163,184,0.14)]"
        :class="runtimeBannerClass">
        <view v-if="syncStatus === 'syncing' && !isOffline"
          class="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        <text class="flex-1 leading-6">
          {{ runtimeBannerText }}
        </text>
      </view>
    </view>
    <slot />
    <GlobalAdBanner />
  </view>
</template>
