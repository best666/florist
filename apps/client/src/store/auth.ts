import type { IUser, IUserAuthSession } from '@florist/contracts'
import { defineStore } from 'pinia'
import { fetchAuthSession, loginWithH5PhoneCode, loginWithWechatMiniProgram } from '@/api'
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
    isAuthenticated: state => Boolean(state.session?.sessionUserId),
    currentUser: state => state.session?.user ?? null as IUser | null,
    currentUserId: state => state.session?.sessionUserId ?? null as string | null,
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
        }
        catch {
          this.clearSession()
        }
        finally {
          this.initializingSession = false
          this.sessionInitialized = true
        }
      })()

      try {
        await initializeSessionRequest
      }
      finally {
        initializeSessionRequest = null
      }
    },

    async refreshGardenContext(): Promise<void> {
      const flowerStore = useFlowerStore()
      const recordStore = useRecordStore()
      const memberStore = useMemberStore()

      await memberStore.initializeMembership(true)
      await flowerStore.initializeGarden({ force: true })
      await recordStore.initializeRecordCenter({ force: true })
    },

    async loginByH5PhoneCode(payload: { phoneNumber: string, verificationCode: string, nickname?: string }): Promise<IUserAuthSession> {
      this.switchingSession = true

      try {
        const session = await loginWithH5PhoneCode(payload)
        this.applySession(session)
        await this.refreshGardenContext()
        return session
      }
      finally {
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
            success: result => resolve(result.code),
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
      }
      finally {
        this.switchingSession = false
      }
    },

    async logoutToLocalMode(): Promise<void> {
      this.switchingSession = true

      try {
        this.clearSession()
        await this.refreshGardenContext()
      }
      finally {
        this.switchingSession = false
      }
    },
  },
})
