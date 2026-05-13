import { storeToRefs } from 'pinia'
import { useAppStore } from '@/store'

export function usePlatform() {
  const appStore = useAppStore()
  const { runtimePlatform } = storeToRefs(appStore)

  return {
    runtimePlatform,
  }
}
