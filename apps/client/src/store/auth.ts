import type { IUser, IUserAuthSession } from '@florist/contracts'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { fetchAuthSession, loginWithH5PhoneCode, loginWithWechatMiniProgram } from '@/api'
import { fetchFlowerCenter, syncFlowersBatch } from '@/api/flowers'
import type { FlowerCenterResponse } from '@/api/flowers'
import { fetchRecordCenter, syncRecordsBatch } from '@/api/records'
import type { RecordCenterResponse } from '@/api/records'
import type { LocalFlower, LocalRecord } from '@/interfaces'
import {
  clearAuthSessionFromStorage,
  readAuthSessionFromStorage,
  writeAuthSessionToStorage,
} from '@/utils'
import { useMemberStore } from './member'
import { useFlowerStore } from './flowers'
import { useRecordStore } from './records'

interface AuthStoreState {
  session: IUserAuthSession | null
  initializingSession: boolean
  switchingSession: boolean
  sessionInitialized: boolean
}

let initializeSessionRequest: Promise<void> | null = null

export const useAuthStore = defineStore('auth', {
  state: (): AuthStoreState => ({
    session: readAuthSessionFromStorage(),
    initializingSession: false,
    switchingSession: false,
    sessionInitialized: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.session?.sessionUserId),
    currentUser: (state) => state.session?.user ?? (null as IUser | null),
    currentUserId: (state) => state.session?.sessionUserId ?? (null as string | null),
  },
  actions: {
    applySession(session: IUserAuthSession): void {
      this.session = session
      this.sessionInitialized = true
      writeAuthSessionToStorage(session)
    },

    patchCurrentUser(user: IUser): void {
      if (!this.session) {
        return
      }

      this.applySession({
        ...this.session,
        user,
      })
    },

    clearSession(): void {
      this.session = null
      this.sessionInitialized = true
      clearAuthSessionFromStorage()
    },

    async initializeSession(force = false): Promise<void> {
      if (!force && initializeSessionRequest) {
        return initializeSessionRequest
      }

      const storedSession = readAuthSessionFromStorage()

      if (!storedSession?.sessionUserId) {
        this.clearSession()
        return
      }

      initializeSessionRequest = (async () => {
        this.initializingSession = true

        try {
          const session = await fetchAuthSession(storedSession.sessionUserId)
          this.applySession(session)
        } catch {
          this.clearSession()
        } finally {
          this.initializingSession = false
          this.sessionInitialized = true
        }
      })()

      try {
        await initializeSessionRequest
      } finally {
        initializeSessionRequest = null
      }
    },

    /**
     * 将本地数据与服务器数据合并，处理多端同步场景。
     *
     * 合并策略：
     * 1. 拉取服务器数据
     * 2. 本地独有的数据 → 推送到服务器
     * 3. 服务器独有的数据 → 保留到本地
     * 4. 两端都有的数据 → 按 updatedAt/createdAt 时间戳，保留较新的版本
     *    - 本地较新 → 推送到服务器
     *    - 服务器较新或相同 → 保留服务器版本
     */
    async refreshGardenContext(): Promise<void> {
      const flowerStore = useFlowerStore()
      const recordStore = useRecordStore()
      const memberStore = useMemberStore()

      await memberStore.initializeMembership(true)

      if (!this.isAuthenticated) {
        // 未登录：直接从服务器拉取（实际不会拉到数据，仅初始化本地状态）
        await flowerStore.initializeGarden({ force: true })
        await recordStore.initializeRecordCenter({ force: true })
        return
      }

      // ── 植株合并 ──
      const localFlowers = [...flowerStore.flowers, ...flowerStore.recycleBin]
      const localRecords = [...recordStore.records]

      try {
        // 1. 拉取服务器植株数据
        const serverFlowerCenter: FlowerCenterResponse = await fetchFlowerCenter()
        const serverFlowerMap = new Map<string, LocalFlower>()
        for (const f of serverFlowerCenter.flowers) serverFlowerMap.set(f.id, f)
        for (const f of serverFlowerCenter.recycleBin) serverFlowerMap.set(f.id, f)

        // 2. 筛选需要推送到服务器的本地植株
        const flowersToPush: LocalFlower[] = []
        for (const local of localFlowers) {
          const server = serverFlowerMap.get(local.id)
          if (!server) {
            // 服务器没有 → 推送
            flowersToPush.push(local)
          } else if (local.updatedAt > server.updatedAt) {
            // 本地较新 → 推送
            flowersToPush.push(local)
          }
          // 服务器较新或相同 → 不推送，保留服务器版本
        }

        // 3. 推送需要同步的植株，获取合并后的完整数据
        if (flowersToPush.length > 0) {
          const mergedCenter = await syncFlowersBatch(flowersToPush)
          flowerStore.replaceLocalCenter({
            flowers: mergedCenter.flowers,
            recycleBin: mergedCenter.recycleBin,
          })
        } else {
          // 无需推送，直接使用服务器数据
          flowerStore.replaceLocalCenter({
            flowers: serverFlowerCenter.flowers,
            recycleBin: serverFlowerCenter.recycleBin,
          })
        }
      } catch {
        // 网络或服务器异常时，回退：直接推送所有本地数据
        if (localFlowers.length > 0) {
          try {
            const center = await syncFlowersBatch(localFlowers)
            flowerStore.replaceLocalCenter({
              flowers: center.flowers,
              recycleBin: center.recycleBin,
            })
          } catch {
            await flowerStore.initializeGarden({ force: true })
          }
        } else {
          await flowerStore.initializeGarden({ force: true })
        }
      }

      // ── 记录合并 ──
      try {
        // 1. 拉取服务器记录数据
        const serverRecordCenter: RecordCenterResponse = await fetchRecordCenter()
        const serverRecordMap = new Map<string, LocalRecord>()
        for (const r of serverRecordCenter.records) serverRecordMap.set(r.id, r)

        // 2. 筛选需要推送到服务器的本地记录
        const recordsToPush: LocalRecord[] = []
        for (const local of localRecords) {
          const server = serverRecordMap.get(local.id)
          if (!server) {
            // 服务器没有 → 推送
            recordsToPush.push(local)
          } else if (local.createdAt > server.createdAt) {
            // 本地较新 → 推送（记录一般不可变，但以防万一）
            recordsToPush.push(local)
          }
          // 服务器已存在且时间相同或更晚 → 保留服务器版本
        }

        // 3. 推送需要同步的记录
        if (recordsToPush.length > 0) {
          const mergedCenter = await syncRecordsBatch(recordsToPush)
          recordStore.replaceLocalCenter(mergedCenter)
        } else {
          recordStore.replaceLocalCenter(serverRecordCenter)
        }
      } catch {
        // 网络或服务器异常时回退
        if (localRecords.length > 0) {
          try {
            const center = await syncRecordsBatch(localRecords)
            recordStore.replaceLocalCenter(center)
          } catch {
            await recordStore.initializeRecordCenter({ force: true })
          }
        } else {
          await recordStore.initializeRecordCenter({ force: true })
        }
      }
    },

    async loginByH5PhoneCode(payload: {
      phoneNumber: string
      verificationCode: string
      nickname?: string
    }): Promise<IUserAuthSession> {
      this.switchingSession = true

      try {
        const session = await loginWithH5PhoneCode(payload)
        this.applySession(session)
        await this.refreshGardenContext()
        return session
      } finally {
        this.switchingSession = false
      }
    },

    async loginByWechatMiniProgram(): Promise<IUserAuthSession> {
      this.switchingSession = true

      try {
        const code = await new Promise<string>((resolve, reject) => {
          // #ifdef MP-WEIXIN
          uni.login({
            provider: 'weixin',
            success: (result) => resolve(result.code),
            fail: () => reject(new Error('微信登录没有成功返回 code')),
          })
          // #endif

          // #ifndef MP-WEIXIN
          reject(new Error('当前平台不支持微信小程序登录'))
          // #endif
        })

        const session = await loginWithWechatMiniProgram({ code })
        this.applySession(session)
        await this.refreshGardenContext()
        return session
      } finally {
        this.switchingSession = false
      }
    },

    async logoutToLocalMode(): Promise<void> {
      this.switchingSession = true

      try {
        this.clearSession()
        await this.refreshGardenContext()
      } finally {
        this.switchingSession = false
      }
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
