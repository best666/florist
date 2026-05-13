import { onBeforeUnmount, onMounted, ref } from 'vue'

type NetworkType = 'unknown' | string

export function useNetworkStatus() {
  const networkType = ref<NetworkType>('unknown')
  const isOffline = ref(false)

  const handleNetworkChange = (event: { isConnected: boolean, networkType: string }) => {
    networkType.value = event.networkType
    isOffline.value = !event.isConnected || event.networkType === 'none'
  }

  function refreshNetworkStatus(): void {
    uni.getNetworkType({
      success: (result) => {
        networkType.value = result.networkType
        isOffline.value = result.networkType === 'none'
      },
      fail: () => {
        networkType.value = 'unknown'
        isOffline.value = false
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
