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
    description: '默认柔和配色，适合日常浏览与记录。',
    previewEmoji: '🌤️',
    memberOnly: false,
    variables: {
      mint: '#95E1D3',
      blush: '#F8C8DC',
      cream: '#FFF5E4',
      ivory: '#FAFAFA',
      radiusCard: '12px',
      shadowSoft: '0 12px 30px rgba(149, 225, 211, 0.18)',
    },
  },
  {
    id: ThemeSkinId.Moss,
    label: '青苔温室',
    description: '偏植物馆气质的绿感主题，免费可用。',
    previewEmoji: '🌿',
    memberOnly: false,
    variables: {
      mint: '#8CC9A1',
      blush: '#D8E7C2',
      cream: '#F7F1D8',
      ivory: '#F3F6EF',
      radiusCard: '14px',
      shadowSoft: '0 12px 30px rgba(117, 157, 110, 0.16)',
    },
  },
  {
    id: ThemeSkinId.Peach,
    label: '桃雾露台',
    description: '轻暖果雾色，适合照片和成长海报浏览。',
    previewEmoji: '🍑',
    memberOnly: false,
    variables: {
      mint: '#F0C39D',
      blush: '#F7D2D8',
      cream: '#FFF1E1',
      ivory: '#FFF9F4',
      radiusCard: '16px',
      shadowSoft: '0 12px 32px rgba(236, 171, 145, 0.18)',
    },
  },
  {
    id: ThemeSkinId.ForestLetter,
    label: '林间信笺',
    description: '会员专属，偏纸感与森林墨绿。',
    previewEmoji: '🌲',
    memberOnly: true,
    variables: {
      mint: '#7DB6A5',
      blush: '#D7C7A7',
      cream: '#F4EEDB',
      ivory: '#F5F2EA',
      radiusCard: '18px',
      shadowSoft: '0 14px 34px rgba(80, 110, 100, 0.18)',
    },
  },
  {
    id: ThemeSkinId.AmberDawn,
    label: '琥珀清晨',
    description: '会员专属，偏金杏和晨曦层次。',
    previewEmoji: '🌅',
    memberOnly: true,
    variables: {
      mint: '#E5B56A',
      blush: '#F1C8A8',
      cream: '#FFF0D5',
      ivory: '#FFF8EE',
      radiusCard: '18px',
      shadowSoft: '0 14px 34px rgba(229, 181, 106, 0.18)',
    },
  },
  {
    id: ThemeSkinId.MoonShadow,
    label: '月影夜棚',
    description: '会员专属，沉静冷杉与夜色灰蓝。',
    previewEmoji: '🌙',
    memberOnly: true,
    variables: {
      mint: '#7F9FB3',
      blush: '#B8B4C9',
      cream: '#E9E5DF',
      ivory: '#F3F4F7',
      radiusCard: '18px',
      shadowSoft: '0 14px 36px rgba(91, 109, 130, 0.18)',
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
    '--color-blush': theme.variables.blush,
    '--color-cream': theme.variables.cream,
    '--color-ivory': theme.variables.ivory,
    '--radius-card': theme.variables.radiusCard,
    '--shadow-soft': theme.variables.shadowSoft,
  }
}

export function createInactiveMemberCache(themeSkinId = ThemeSkinId.Default): LocalMemberCache {
  return {
    status: MemberStatus.Inactive,
    activePackageType: null,
    benefitTypes: [],
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
