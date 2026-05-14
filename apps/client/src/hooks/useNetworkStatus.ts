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
        networkType.value = 'unknown'
        isOffline.value = false
        appStore.setNetworkStatus({
          isOffline: false,
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
