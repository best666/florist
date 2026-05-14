import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import type { ClientPlatform, Nullable } from '@/interfaces'
import { useFlowerStore } from './flowers'
import { useMemberStore } from './member'
import { useRecordStore } from './records'

export type AppSyncStatus = 'idle' | 'syncing' | 'failed'

export interface AppState {
  runtimePlatform: Nullable<ClientPlatform>
  lastSyncAt: Nullable<string>
  isOffline: boolean
  networkType: string
  syncStatus: AppSyncStatus
  syncMessage: string
}

let syncLocalGardenRequest: Promise<void> | null = null

export const useAppStore = defineStore(
  'app',
  {
    state: (): AppState => ({
      runtimePlatform: null,
      lastSyncAt: null,
      isOffline: false,
      networkType: 'unknown',
      syncStatus: 'idle',
      syncMessage: '',
    }),
    actions: {
      setRuntimePlatform(platform: ClientPlatform) {
        this.runtimePlatform = platform
      },
      setNetworkStatus(payload: { isOffline: boolean, networkType: string }) {
        this.isOffline = payload.isOffline
        this.networkType = payload.networkType

        if (payload.isOffline) {
          this.syncStatus = 'failed'
          this.syncMessage = '网络先暂时休息一下，离线记录会继续安全留在本地。'
        }
      },
      markSyncStarted(message = '正在把最近的花园状态轻轻对齐。') {
        this.syncStatus = 'syncing'
        this.syncMessage = message
      },
      markSyncFinished(timestamp: string) {
        this.lastSyncAt = timestamp
        this.syncStatus = 'idle'
        this.syncMessage = ''
      },
      markSyncFailed(message = '同步还没完全接上，晚一点再试也可以。') {
        this.syncStatus = 'failed'
        this.syncMessage = message
      },
      async syncLocalGarden(message?: string): Promise<void> {
        if (syncLocalGardenRequest) {
          return syncLocalGardenRequest
        }

        if (this.isOffline) {
          this.markSyncFailed('网络先暂时休息一下，离线记录会继续安全留在本地。')
          return
        }

        syncLocalGardenRequest = (async () => {
          this.markSyncStarted(message)

          const authStore = useAuthStore()
          const flowerStore = useFlowerStore()
          const recordStore = useRecordStore()
          const memberStore = useMemberStore()

          try {
            if (!authStore.isAuthenticated) {
              this.markSyncFinished(new Date().toISOString())
              return
            }

            await memberStore.initializeMembership()
            await flowerStore.cleanupRecycleBin()
            await Promise.all([flowerStore.initializeGarden(), recordStore.initializeRecordCenter()])
            memberStore.syncMembershipStatus()
            this.markSyncFinished(new Date().toISOString())
          }
          catch (error) {
            this.markSyncFailed(error instanceof Error ? error.message : '同步还没完全接上，晚一点再试也可以。')
          }
        })()

        try {
          await syncLocalGardenRequest
        }
        finally {
          syncLocalGardenRequest = null
        }
      },
    },
    persist: true,
  },
)
