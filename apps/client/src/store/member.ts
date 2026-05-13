import type { IMemberPaymentOrder } from '@florist/contracts'
import {
  MemberBenefitType,
  MemberPackageType,
  MemberPaymentChannel,
  MemberPaymentStatus,
  MemberStatus,
} from '@florist/contracts'
import { defineStore } from 'pinia'
import type { LocalMemberCache, ThemeSkinId } from '@/interfaces'
import { ThemeSkinId as ThemeSkinIdEnum } from '@/interfaces'
import {
  MEMBER_PACKAGE_PLANS,
  activateMemberCache,
  buildThemeStyleVariables,
  createInactiveMemberCache,
  createLocalMemberPaymentOrder,
  guardMemberBenefit,
  hasMemberBenefit,
  resolveThemeSkin,
  syncExpiredMemberCache,
} from '@/utils'

export interface MemberStoreState {
  memberCache: LocalMemberCache
  selectedPackageType: MemberPackageType
  currentOrder: IMemberPaymentOrder | null
  latestMessage: string
  processingPayment: boolean
}

export const useMemberStore = defineStore(
  'member',
  {
    state: (): MemberStoreState => ({
      memberCache: createInactiveMemberCache(),
      selectedPackageType: MemberPackageType.Yearly,
      currentOrder: null,
      latestMessage: '',
      processingPayment: false,
    }),
    getters: {
      packagePlans: () => MEMBER_PACKAGE_PLANS,
      currentTheme: state => resolveThemeSkin(state.memberCache.themeSkinId),
      themeStyleVariables: state => buildThemeStyleVariables(state.memberCache.themeSkinId),
      isMemberActive: state => syncExpiredMemberCache(state.memberCache).status === MemberStatus.Active,
      hasAdFree(): boolean {
        return hasMemberBenefit(this.memberCache, MemberBenefitType.AdFree)
      },
      hasCloudBackup(): boolean {
        return hasMemberBenefit(this.memberCache, MemberBenefitType.CloudBackup)
      },
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

      selectPackage(packageType: MemberPackageType): void {
        this.selectedPackageType = packageType
      },

      createPaymentOrder(channel: MemberPaymentChannel): IMemberPaymentOrder {
        const order = createLocalMemberPaymentOrder(this.selectedPackageType, channel)
        this.currentOrder = order
        this.latestMessage = channel === MemberPaymentChannel.H5QrCode
          ? '请使用微信扫码完成一次性支付，当前不会自动续费。'
          : '将发起微信支付，一次购买后不会自动续费。'
        return order
      },

      replaceCurrentOrder(order: IMemberPaymentOrder | null): void {
        this.currentOrder = order
      },

      completeCurrentOrder(): LocalMemberCache | null {
        if (!this.currentOrder) {
          return null
        }

        const paidOrder: IMemberPaymentOrder = {
          ...this.currentOrder,
          status: MemberPaymentStatus.Paid,
        }

        this.memberCache = activateMemberCache(
          this.currentOrder.packageType,
          this.memberCache.themeSkinId,
          paidOrder,
        )
        this.currentOrder = paidOrder
        this.latestMessage = this.currentOrder.packageType === MemberPackageType.Lifetime
          ? '终身会员已开通，权益已立即生效。'
          : '会员已开通，权益已立即生效，到期后会自动降级回免费版。'

        return this.memberCache
      },

      cancelCurrentOrder(): void {
        if (!this.currentOrder) {
          return
        }

        this.currentOrder = {
          ...this.currentOrder,
          status: MemberPaymentStatus.Closed,
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
        return hasMemberBenefit(this.memberCache, benefit)
      },

      canUseBenefit(benefit: MemberBenefitType, message: string) {
        this.syncMembershipStatus()
        return guardMemberBenefit(this.memberCache, benefit, message)
      },

      setTheme(themeSkinId: ThemeSkinId): boolean {
        this.syncMembershipStatus()
        const theme = resolveThemeSkin(themeSkinId)

        if (theme.memberOnly && !this.hasBenefit(MemberBenefitType.AllThemes)) {
          this.latestMessage = '这套皮肤是会员专属，开通后可解锁全部主题。'
          return false
        }

        this.memberCache = {
          ...this.memberCache,
          themeSkinId,
          updatedAt: new Date().toISOString(),
        }
        this.latestMessage = `主题已切换为“${theme.label}”。`
        return true
      },
    },
    persist: true,
  },
)
