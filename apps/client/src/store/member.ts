import type { IMember, IMemberPaymentOrder } from '@florist/contracts'
import {
  MemberBenefitType,
  MemberPackageType,
  MemberPaymentChannel,
  MemberPaymentStatus,
  MemberStatus,
} from '@florist/contracts'
import { acceptHMRUpdate, defineStore } from 'pinia'
import type { LocalMemberCache, ThemeSkinId } from '@/interfaces'
import { ThemeSkinId as ThemeSkinIdEnum } from '@/interfaces'
import { fetchCurrentMember, rechargeCurrentMember } from '@/api'
import {
  MEMBER_PACKAGE_PLANS,
  buildThemeStyleVariables,
  createInactiveMemberCache,
  guardMemberBenefit,
  hasMemberBenefit,
  readAuthUserIdFromStorage,
  resolveThemeSkin,
  syncExpiredMemberCache,
  syncNativeThemeColors,
} from '@/utils'

export interface MemberStoreState {
  memberCache: LocalMemberCache
  selectedPackageType: MemberPackageType
  currentOrder: IMemberPaymentOrder | null
  latestMessage: string
  processingPayment: boolean
  initializedUserId: string | null
  initializingMembership: boolean
}

let initializeMembershipRequest: Promise<LocalMemberCache> | null = null

function toLocalMemberCache(
  member: IMember,
  themeSkinId: ThemeSkinId,
  latestOrder: IMemberPaymentOrder | null,
): LocalMemberCache {
  return {
    status: member.status,
    activePackageType: member.status === MemberStatus.Active ? member.packageType : null,
    benefitTypes: member.benefitTypes,
    startedAt: member.startedAt ?? null,
    expiredAt: member.expiredAt ?? null,
    themeSkinId,
    latestOrder,
    updatedAt: new Date().toISOString(),
  }
}

export const useMemberStore = defineStore('member', {
  state: (): MemberStoreState => ({
    memberCache: createInactiveMemberCache(),
    selectedPackageType: MemberPackageType.Yearly,
    currentOrder: null,
    latestMessage: '',
    processingPayment: false,
    initializedUserId: null,
    initializingMembership: false,
  }),
  getters: {
    packagePlans: () => MEMBER_PACKAGE_PLANS,
    currentTheme: (state) => resolveThemeSkin(state.memberCache.themeSkinId),
    themeStyleVariables: (state) => buildThemeStyleVariables(state.memberCache.themeSkinId),
    isMemberActive: () => true,
    hasCloudGardenAccess: () => true,
    hasAdFree: () => true,
    hasCloudBackup: () => true,
    currentStatusLabel(): string {
      const cache = syncExpiredMemberCache(this.memberCache)

      if (cache.status === MemberStatus.Active) {
        return cache.activePackageType === MemberPackageType.Lifetime ? '终身会员' : '会员已生效'
      }

      if (cache.status === MemberStatus.Expired) {
        return '会员已到期'
      }

      return '当前未开通'
    },
  },
  actions: {
    applyServerMember(member: IMember): LocalMemberCache {
      const nextCache = toLocalMemberCache(member, this.memberCache.themeSkinId, this.currentOrder)
      const theme = resolveThemeSkin(nextCache.themeSkinId)

      this.memberCache =
        theme.memberOnly && nextCache.status !== MemberStatus.Active
          ? {
              ...nextCache,
              themeSkinId: ThemeSkinIdEnum.Default,
              updatedAt: new Date().toISOString(),
            }
          : nextCache

      return this.memberCache
    },

    resetMembershipForLoggedOut(): LocalMemberCache {
      this.currentOrder = null
      this.initializedUserId = null
      this.memberCache = createInactiveMemberCache(this.memberCache.themeSkinId)
      return this.memberCache
    },

    syncMembershipStatus(): LocalMemberCache {
      const nextCache = syncExpiredMemberCache(this.memberCache)

      if (nextCache !== this.memberCache) {
        this.memberCache = nextCache

        const theme = resolveThemeSkin(nextCache.themeSkinId)

        if (theme.memberOnly && nextCache.status !== MemberStatus.Active) {
          this.memberCache = {
            ...nextCache,
            themeSkinId: ThemeSkinIdEnum.Default,
            updatedAt: new Date().toISOString(),
          }
        }
      }

      if (this.currentOrder && new Date(this.currentOrder.expiredAt).getTime() <= Date.now()) {
        this.currentOrder = {
          ...this.currentOrder,
          status: MemberPaymentStatus.Expired,
        }
      }

      return this.memberCache
    },

    async initializeMembership(force = false): Promise<LocalMemberCache> {
      const currentUserId = readAuthUserIdFromStorage()

      this.syncMembershipStatus()

      if (!currentUserId) {
        return this.resetMembershipForLoggedOut()
      }

      if (!force && this.initializedUserId === currentUserId) {
        return this.memberCache
      }

      if (!force && initializeMembershipRequest) {
        return initializeMembershipRequest
      }

      initializeMembershipRequest = (async () => {
        this.initializingMembership = true

        try {
          const member = await fetchCurrentMember()
          this.initializedUserId = currentUserId
          return this.applyServerMember(member)
        } catch {
          this.initializedUserId = currentUserId
          return this.resetMembershipForLoggedOut()
        } finally {
          this.initializingMembership = false
        }
      })()

      try {
        return await initializeMembershipRequest
      } finally {
        initializeMembershipRequest = null
      }
    },

    selectPackage(packageType: MemberPackageType): void {
      this.selectedPackageType = packageType
    },

    async purchaseSelectedPackage(channel: MemberPaymentChannel): Promise<LocalMemberCache> {
      this.processingPayment = true

      try {
        const result = await rechargeCurrentMember({
          packageType: this.selectedPackageType,
          channel,
        })

        this.currentOrder = result.order
        this.applyServerMember(result.member)
        this.latestMessage =
          result.order.packageType === MemberPackageType.Lifetime
            ? '终身会员已开通，权益已立即生效。'
            : '会员已开通，权益已立即生效，到期后会自动降级回免费版。'

        return this.memberCache
      } finally {
        this.processingPayment = false
      }
    },

    downgradeToFree(): void {
      this.memberCache = {
        ...createInactiveMemberCache(this.memberCache.themeSkinId),
        status: MemberStatus.Expired,
        latestOrder: this.currentOrder,
        updatedAt: new Date().toISOString(),
      }

      const theme = resolveThemeSkin(this.memberCache.themeSkinId)

      if (theme.memberOnly) {
        this.memberCache = {
          ...this.memberCache,
          themeSkinId: ThemeSkinIdEnum.Default,
          updatedAt: new Date().toISOString(),
        }
      }
    },

    hasBenefit(benefit: MemberBenefitType): boolean {
      this.syncMembershipStatus()
      // 限时免费阶段：所有用户均为免费层，无会员专属权益
      return false
    },

    canUseBenefit(benefit: MemberBenefitType, message: string) {
      this.syncMembershipStatus()
      return { allowed: false, requiredBenefit: benefit, message }
    },

    setTheme(themeSkinId: ThemeSkinId): boolean {
      this.syncMembershipStatus()
      const theme = resolveThemeSkin(themeSkinId)

      this.memberCache = {
        ...this.memberCache,
        themeSkinId,
        updatedAt: new Date().toISOString(),
      }
      this.latestMessage = `主题已切换为”${theme.label}”。`
      syncNativeThemeColors(themeSkinId)
      return true
    },
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMemberStore, import.meta.hot))
}
