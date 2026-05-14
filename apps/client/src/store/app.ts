import { defineStore } from 'pinia'
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
        if (this.isOffline) {
          this.markSyncFailed('网络先暂时休息一下，离线记录会继续安全留在本地。')
          return
        }

        this.markSyncStarted(message)

        const flowerStore = useFlowerStore()
        const recordStore = useRecordStore()
        const memberStore = useMemberStore()

        await flowerStore.cleanupRecycleBin()
        await Promise.all([
          flowerStore.initializeGarden(),
          recordStore.initializeRecordCenter(),
        ])
        memberStore.syncMembershipStatus()
        this.markSyncFinished(new Date().toISOString())
      },
    },
    persist: true,
  },
)
