import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useAppStore } from '@/store'

type NetworkType = 'unknown' | string

export function useNetworkStatus() {
  const appStore = useAppStore()
  const networkType = ref<NetworkType>('unknown')
  const isOffline = ref(false)

  const handleNetworkChange = (event: { isConnected: boolean, networkType: string }) => {
    networkType.value = event.networkType
    isOffline.value = !event.isConnected || event.networkType === 'none'
    appStore.setNetworkStatus({
      isOffline: isOffline.value,
      networkType: networkType.value,
    })
  }

  function refreshNetworkStatus(): void {
    uni.getNetworkType({
      success: (result) => {
        networkType.value = result.networkType
        isOffline.value = result.networkType === 'none'
        appStore.setNetworkStatus({
          isOffline: isOffline.value,
          networkType: networkType.value,
        })
      },
      fail: () => {
        // 网络状态检查失败时应保守处理，优先标记为离线
        // 避免 APP 误认为在线后发起注定失败的请求
        networkType.value = 'unknown'
        isOffline.value = true
        appStore.setNetworkStatus({
          isOffline: true,
          networkType: 'unknown',
        })
      },
    })
  }

  onMounted(() => {
    refreshNetworkStatus()
    uni.onNetworkStatusChange(handleNetworkChange)
  })

  onBeforeUnmount(() => {
    const networkApi = uni as typeof uni & {
      offNetworkStatusChange?: (callback: typeof handleNetworkChange) => void
    }

    networkApi.offNetworkStatusChange?.(handleNetworkChange)
  })

  return {
    isOffline,
    networkType,
    refreshNetworkStatus,
  }
}
