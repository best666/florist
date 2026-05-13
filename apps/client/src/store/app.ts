import { defineStore } from 'pinia'
import type { ClientPlatform, Nullable } from '@/interfaces'

export interface AppState {
  runtimePlatform: Nullable<ClientPlatform>
  lastSyncAt: Nullable<string>
}

export const useAppStore = defineStore(
  'app',
  {
    state: (): AppState => ({
      runtimePlatform: null,
      lastSyncAt: null,
    }),
    actions: {
      setRuntimePlatform(platform: ClientPlatform) {
        this.runtimePlatform = platform
      },
      markSyncFinished(timestamp: string) {
        this.lastSyncAt = timestamp
      },
    },
    persist: true,
  },
)
