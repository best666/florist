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
    description: '默认柔和暖调，适合日常浏览与记录。',
    previewEmoji: '🌸',
    memberOnly: false,
    variables: {
      mint: '#8ad8c5',
      sage: '#6ea891',
      blush: '#f2c8d7',
      cream: '#fff1dc',
      gold: '#eabf7d',
      ivory: '#fff8f1',
      surface: '#ffffff',
      ink: '#32404a',
      muted: '#7a8794',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(148,163,184,0.14)',
      shadowLift: '0 14rpx 30rpx rgba(111,165,149,0.18)',
      shadowHero: '0 20rpx 56rpx rgba(210,191,160,0.24)',
    },
  },
  {
    id: ThemeSkinId.Moss,
    label: '青苔温室',
    description: '偏植物馆气质的绿感主题。',
    previewEmoji: '🌿',
    memberOnly: false,
    variables: {
      mint: '#8CC9A1',
      sage: '#5A8F6A',
      blush: '#D8E7C2',
      cream: '#F7F1D8',
      gold: '#C9A96E',
      ivory: '#F3F6EF',
      surface: '#ffffff',
      ink: '#2D3A2F',
      muted: '#6E7E70',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(100,140,110,0.14)',
      shadowLift: '0 14rpx 30rpx rgba(90,143,106,0.18)',
      shadowHero: '0 20rpx 56rpx rgba(160,190,140,0.22)',
    },
  },
  {
    id: ThemeSkinId.Peach,
    label: '桃雾露台',
    description: '轻暖果雾色，适合照片浏览。',
    previewEmoji: '🍑',
    memberOnly: false,
    variables: {
      mint: '#F0C39D',
      sage: '#C9A082',
      blush: '#F7D2D8',
      cream: '#FFF1E1',
      gold: '#E8B878',
      ivory: '#FFF9F4',
      surface: '#ffffff',
      ink: '#3D2E2A',
      muted: '#8C7A72',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(200,160,140,0.14)',
      shadowLift: '0 14rpx 30rpx rgba(236,171,145,0.18)',
      shadowHero: '0 20rpx 56rpx rgba(220,180,150,0.22)',
    },
  },
  {
    id: ThemeSkinId.ForestLetter,
    label: '林间信笺',
    description: '偏纸感与森林墨绿，沉静内敛。',
    previewEmoji: '🌲',
    memberOnly: false,
    variables: {
      mint: '#7DB6A5',
      sage: '#5A8372',
      blush: '#D7C7A7',
      cream: '#F4EEDB',
      gold: '#B8A47A',
      ivory: '#F5F2EA',
      surface: '#FDFCF9',
      ink: '#2D332A',
      muted: '#6E756A',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(80,110,100,0.14)',
      shadowLift: '0 14rpx 30rpx rgba(90,115,105,0.18)',
      shadowHero: '0 20rpx 56rpx rgba(140,170,150,0.20)',
    },
  },
  {
    id: ThemeSkinId.AmberDawn,
    label: '琥珀清晨',
    description: '金杏与晨曦层次，温暖明亮。',
    previewEmoji: '🌅',
    memberOnly: false,
    variables: {
      mint: '#E5B56A',
      sage: '#B89550',
      blush: '#F1C8A8',
      cream: '#FFF0D5',
      gold: '#D4A44A',
      ivory: '#FFF8EE',
      surface: '#ffffff',
      ink: '#3A2E20',
      muted: '#8A7B68',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(200,170,120,0.14)',
      shadowLift: '0 14rpx 30rpx rgba(210,170,100,0.18)',
      shadowHero: '0 20rpx 56rpx rgba(220,180,120,0.22)',
    },
  },
  {
    id: ThemeSkinId.MoonShadow,
    label: '月影夜棚',
    description: '冷杉与夜色灰蓝，沉静深邃。',
    previewEmoji: '🌙',
    memberOnly: false,
    variables: {
      mint: '#7F9FB3',
      sage: '#5E7D8E',
      blush: '#B8B4C9',
      cream: '#E9E5DF',
      gold: '#A09880',
      ivory: '#F3F4F7',
      surface: '#FAFAFC',
      ink: '#2A3038',
      muted: '#6E7A88',
      radiusCard: '28rpx',
      radiusPanel: '36rpx',
      radiusControl: '24rpx',
      radiusPill: '999px',
      spacePageX: '24rpx',
      spacePageY: '24rpx',
      spaceCard: '24rpx',
      shadowSoft: '0 18rpx 44rpx rgba(100,120,140,0.14)',
      shadowLift: '0 14rpx 30rpx rgba(91,109,130,0.18)',
      shadowHero: '0 20rpx 56rpx rgba(130,150,170,0.20)',
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
