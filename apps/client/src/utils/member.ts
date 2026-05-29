import type {
  IMemberPackagePlan,
  IMemberPaymentOrder,
} from '@florist/contracts'
import {
  MemberBenefitType,
  MemberPackageType,
  MemberPaymentChannel,
  MemberPaymentStatus,
  MemberStatus,
} from '@florist/contracts'
import type {
  LocalMemberCache,
  MemberAccessGuardResult,
  ThemeSkinDefinition,
} from '@/interfaces'
import { ThemeSkinId } from '@/interfaces'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const ORDER_EXPIRES_IN_MS = 15 * 60 * 1000

function createBenefitList(): ReadonlyArray<MemberBenefitType> {
  return [
    MemberBenefitType.UnlimitedAiAdvice,
    MemberBenefitType.NoWatermark,
    MemberBenefitType.AllThemes,
    MemberBenefitType.CloudBackup,
    MemberBenefitType.AdFree,
    MemberBenefitType.GrowthPoster,
    MemberBenefitType.TripCarePlan,
  ]
}

export const MEMBER_PACKAGE_PLANS: ReadonlyArray<IMemberPackagePlan> = [
  {
    packageType: MemberPackageType.Monthly,
    title: '月卡会员',
    subtitle: '适合先体验完整能力的轻量开通方式',
    priceInCents: 1900,
    originPriceInCents: 2900,
    durationDays: 30,
    benefitTypes: createBenefitList(),
    highlightLabel: '灵活开通',
    disclaimer: '一次性支付 19 元，不自动续费，不做隐性扣费。',
  },
  {
    packageType: MemberPackageType.Yearly,
    title: '年卡会员',
    subtitle: '覆盖四季养护、主题中心和长期记录整理',
    priceInCents: 12800,
    originPriceInCents: 22800,
    durationDays: 365,
    benefitTypes: createBenefitList(),
    highlightLabel: '推荐',
    disclaimer: '一次性支付 128 元，不自动续费，到期自动降级。',
  },
  {
    packageType: MemberPackageType.Lifetime,
    title: '终身卡',
    subtitle: '一次开通，长期解锁全部皮肤、无广告和会员能力',
    priceInCents: 39900,
    originPriceInCents: 59900,
    benefitTypes: createBenefitList(),
    highlightLabel: '长期陪伴',
    disclaimer: '一次性支付 399 元，永久有效，不自动续费。',
  },
] as const

export const THEME_SKIN_DEFINITIONS: ReadonlyArray<ThemeSkinDefinition> = [
  {
    id: ThemeSkinId.Default,
    label: '奶油晨光',
    description: '暖杏米调，柔和日常。',
    previewEmoji: '🌸',
    memberOnly: false,
    variables: {
      mint: '#7EC8B8',
      sage: '#5E9E8E',
      blush: '#E8B4B8',
      cream: '#FDF0E0',
      gold: '#E0C090',
      ivory: '#FFF9F3',
      surface: '#ffffff',
      ink: '#3D3840',
      muted: '#908C94',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(140,135,130,0.12)',
      shadowLift: '0 14rpx 30rpx rgba(130,145,140,0.14)',
      shadowHero: '0 20rpx 56rpx rgba(180,170,155,0.18)',
    },
  },
  {
    id: ThemeSkinId.Moss,
    label: '青苔温室',
    description: '鲜绿清亮，雨后苔色。',
    previewEmoji: '🌿',
    memberOnly: false,
    variables: {
      mint: '#5CBF8A',
      sage: '#3D8B60',
      blush: '#A8D8B8',
      cream: '#E4F2E0',
      gold: '#88C878',
      ivory: '#F0F8EE',
      surface: '#FAFEFA',
      ink: '#2A3A2C',
      muted: '#6B8B6E',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(80,140,100,0.12)',
      shadowLift: '0 14rpx 30rpx rgba(70,140,100,0.14)',
      shadowHero: '0 20rpx 56rpx rgba(100,170,130,0.16)',
    },
  },
  {
    id: ThemeSkinId.Peach,
    label: '桃雾露台',
    description: '桃粉珊瑚，甜美浪漫。',
    previewEmoji: '🍑',
    memberOnly: false,
    variables: {
      mint: '#F0A890',
      sage: '#D48878',
      blush: '#F4C4C8',
      cream: '#FFF0EA',
      gold: '#E8A880',
      ivory: '#FFFAF8',
      surface: '#FFFEFD',
      ink: '#4A3838',
      muted: '#A08888',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(210,150,140,0.12)',
      shadowLift: '0 14rpx 30rpx rgba(220,160,145,0.14)',
      shadowHero: '0 20rpx 56rpx rgba(230,175,160,0.16)',
    },
  },
  {
    id: ThemeSkinId.ForestLetter,
    label: '林间信笺',
    description: '棕绿大地，书卷质感。',
    previewEmoji: '🌲',
    memberOnly: false,
    variables: {
      mint: '#8AA878',
      sage: '#6B8A5E',
      blush: '#C8B898',
      cream: '#F0E8D5',
      gold: '#B89860',
      ivory: '#F5F0E6',
      surface: '#FDFAF4',
      ink: '#3A3428',
      muted: '#8B8070',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(140,130,110,0.12)',
      shadowLift: '0 14rpx 30rpx rgba(130,125,105,0.14)',
      shadowHero: '0 20rpx 56rpx rgba(160,155,130,0.16)',
    },
  },
  {
    id: ThemeSkinId.AmberDawn,
    label: '琥珀清晨',
    description: '金黄琥珀，秋日暖阳。',
    previewEmoji: '🌅',
    memberOnly: false,
    variables: {
      mint: '#E0C060',
      sage: '#C4A040',
      blush: '#F0D8A8',
      cream: '#FFF4E0',
      gold: '#D4A438',
      ivory: '#FFFBF0',
      surface: '#FFFEFA',
      ink: '#4A3828',
      muted: '#A09070',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(200,175,120,0.12)',
      shadowLift: '0 14rpx 30rpx rgba(200,155,105,0.14)',
      shadowHero: '0 20rpx 56rpx rgba(220,185,135,0.16)',
    },
  },
  {
    id: ThemeSkinId.MoonShadow,
    label: '月影夜棚',
    description: '蓝紫冷调，月下静谧。',
    previewEmoji: '🌙',
    memberOnly: false,
    variables: {
      mint: '#8A98C0',
      sage: '#6A7AA8',
      blush: '#A8A8D0',
      cream: '#E8E6F2',
      gold: '#9890B8',
      ivory: '#F2F2FA',
      surface: '#FAFAFD',
      ink: '#383850',
      muted: '#8888A0',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(120,130,160,0.12)',
      shadowLift: '0 14rpx 30rpx rgba(110,125,155,0.14)',
      shadowHero: '0 20rpx 56rpx rgba(130,145,170,0.16)',
    },
  },
] as const

export function resolveMemberPlan(packageType: MemberPackageType): IMemberPackagePlan {
  return MEMBER_PACKAGE_PLANS.find(plan => plan.packageType === packageType) ?? MEMBER_PACKAGE_PLANS[1]!
}

export function resolveThemeSkin(themeSkinId: ThemeSkinId): ThemeSkinDefinition {
  return THEME_SKIN_DEFINITIONS.find(theme => theme.id === themeSkinId) ?? THEME_SKIN_DEFINITIONS[0]!
}

export function buildThemeStyleVariables(themeSkinId: ThemeSkinId): Record<string, string> {
  const theme = resolveThemeSkin(themeSkinId)

  return {
    '--color-mint': theme.variables.mint,
    '--color-sage': theme.variables.sage,
    '--color-blush': theme.variables.blush,
    '--color-cream': theme.variables.cream,
    '--color-gold': theme.variables.gold,
    '--color-ivory': theme.variables.ivory,
    '--color-surface': theme.variables.surface,
    '--color-ink': theme.variables.ink,
    '--color-muted': theme.variables.muted,
    '--radius-card': theme.variables.radiusCard,
    '--radius-panel': theme.variables.radiusPanel,
    '--radius-control': theme.variables.radiusControl,
    '--radius-pill': theme.variables.radiusPill,
    '--space-page-x': theme.variables.spacePageX,
    '--space-page-y': theme.variables.spacePageY,
    '--space-card': theme.variables.spaceCard,
    '--shadow-soft': theme.variables.shadowSoft,
    '--shadow-lift': theme.variables.shadowLift,
    '--shadow-hero': theme.variables.shadowHero,
  }
}

export function syncNativeThemeColors(themeSkinId: ThemeSkinId): void {
  const theme = resolveThemeSkin(themeSkinId)
  const bgColor = theme.variables.ivory

  uni.setNavigationBarColor({
    frontColor: '#000000',
    backgroundColor: bgColor,
  })

  // H5 端背景渐变由 useTheme.ts 通过 DOM 直接设置 uni-page-body
  // 避免 uni.setBackgroundColor 的纯色覆盖 CSS 渐变
  // #ifdef MP-WEIXIN
  uni.setBackgroundColor({
    backgroundColor: bgColor,
  })
  // #endif
}

export function createInactiveMemberCache(themeSkinId = ThemeSkinId.Default): LocalMemberCache {
  return {
    status: MemberStatus.Inactive,
    activePackageType: null,
    benefitTypes: Object.values(MemberBenefitType),
    startedAt: null,
    expiredAt: null,
    themeSkinId,
    latestOrder: null,
    updatedAt: new Date().toISOString(),
  }
}

export function calculateMemberExpiredAt(packageType: MemberPackageType, startedAt: string): string | null {
  if (packageType === MemberPackageType.Lifetime) {
    return null
  }

  const durationDays = resolveMemberPlan(packageType).durationDays ?? 0
  return new Date(new Date(startedAt).getTime() + durationDays * DAY_IN_MS).toISOString()
}

export function activateMemberCache(
  packageType: MemberPackageType,
  previousThemeSkinId: ThemeSkinId,
  paidOrder: IMemberPaymentOrder,
): LocalMemberCache {
  const startedAt = new Date().toISOString()

  return {
    status: MemberStatus.Active,
    activePackageType: packageType,
    benefitTypes: resolveMemberPlan(packageType).benefitTypes,
    startedAt,
    expiredAt: calculateMemberExpiredAt(packageType, startedAt),
    themeSkinId: previousThemeSkinId,
    latestOrder: {
      ...paidOrder,
      status: MemberPaymentStatus.Paid,
    },
    updatedAt: startedAt,
  }
}

export function syncExpiredMemberCache(cache: LocalMemberCache): LocalMemberCache {
  if (!cache.expiredAt) {
    return cache
  }

  if (new Date(cache.expiredAt).getTime() > Date.now()) {
    return cache
  }

  return {
    ...createInactiveMemberCache(cache.themeSkinId),
    status: MemberStatus.Expired,
    latestOrder: cache.latestOrder,
    updatedAt: new Date().toISOString(),
  }
}

export function hasMemberBenefit(cache: LocalMemberCache, benefit: MemberBenefitType): boolean {
  const syncedCache = syncExpiredMemberCache(cache)
  return syncedCache.status === MemberStatus.Active && syncedCache.benefitTypes.includes(benefit)
}

export function guardMemberBenefit(
  cache: LocalMemberCache,
  benefit: MemberBenefitType,
  message: string,
): MemberAccessGuardResult {
  return {
    allowed: hasMemberBenefit(cache, benefit),
    requiredBenefit: benefit,
    message,
  }
}

export function resolveMemberPaymentChannel(platform: string): MemberPaymentChannel {
  return platform === 'mp-weixin'
    ? MemberPaymentChannel.MpWeixin
    : MemberPaymentChannel.H5QrCode
}

export function formatPriceInYuan(priceInCents: number): string {
  return (priceInCents / 100).toFixed(priceInCents % 100 === 0 ? 0 : 2)
}

export function getMemberBenefitLabel(benefit: MemberBenefitType): string {
  const labelMap: Record<MemberBenefitType, string> = {
    [MemberBenefitType.UnlimitedAiAdvice]: 'AI 无限次',
    [MemberBenefitType.NoWatermark]: '海报无水印',
    [MemberBenefitType.CloudBackup]: '云端备份',
    [MemberBenefitType.AllThemes]: '全部皮肤',
    [MemberBenefitType.AdvancedTheme]: '高级主题',
    [MemberBenefitType.GrowthPoster]: '高清成长海报',
    [MemberBenefitType.TripCarePlan]: '完整出差方案',
    [MemberBenefitType.AdFree]: '永久去广告',
  }

  return labelMap[benefit]
}

export function getMemberBenefitDescription(benefit: MemberBenefitType): string {
  const descriptionMap: Record<MemberBenefitType, string> = {
    [MemberBenefitType.UnlimitedAiAdvice]: '植物医生识别、AI 养护建议与相关能力不再受免费次数限制。',
    [MemberBenefitType.NoWatermark]: '成长海报导出时去除水印，并保留高清质量。',
    [MemberBenefitType.CloudBackup]: '解锁云端备份资格，方便后续接服务端同步与恢复。',
    [MemberBenefitType.AllThemes]: '解锁全部会员皮肤主题，并支持随时切换。',
    [MemberBenefitType.AdvancedTheme]: '兼容旧权益定义，等价于主题增强能力。',
    [MemberBenefitType.GrowthPoster]: '成长相册中的会员模板和高清海报导出能力可用。',
    [MemberBenefitType.TripCarePlan]: '出差期间的更完整养护方案与 AI 辅助可直接使用。',
    [MemberBenefitType.AdFree]: '全局广告位永久隐藏，不再打断页面浏览。',
  }

  return descriptionMap[benefit]
}
