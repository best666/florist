import type {
  IMemberPackagePlan,
  IMemberPaymentOrder,
  MemberBenefitType,
  MemberPackageType,
  MemberPaymentChannel,
  MemberStatus,
} from '@florist/contracts'
import type { Nullable } from './base'

export enum ThemeSkinId {
  Default = 'default',
  Moss = 'moss',
  Peach = 'peach',
  ForestLetter = 'forest_letter',
  AmberDawn = 'amber_dawn',
  MoonShadow = 'moon_shadow',
}

export interface ThemeSkinDefinition {
  readonly id: ThemeSkinId
  readonly label: string
  readonly description: string
  readonly previewEmoji: string
  readonly memberOnly: boolean
  readonly variables: {
    readonly mint: string
    readonly sage: string
    readonly blush: string
    readonly cream: string
    readonly gold: string
    readonly ivory: string
    readonly surface: string
    readonly ink: string
    readonly muted: string
    readonly radiusCard: string
    readonly radiusPanel: string
    readonly radiusControl: string
    readonly radiusPill: string
    readonly spacePageX: string
    readonly spacePageY: string
    readonly spaceCard: string
    readonly shadowSoft: string
    readonly shadowLift: string
    readonly shadowHero: string
  }
}

export interface LocalMemberCache {
  readonly status: MemberStatus
  readonly activePackageType: Nullable<MemberPackageType>
  readonly benefitTypes: ReadonlyArray<MemberBenefitType>
  readonly startedAt: Nullable<string>
  readonly expiredAt: Nullable<string>
  readonly themeSkinId: ThemeSkinId
  readonly latestOrder: Nullable<IMemberPaymentOrder>
  readonly updatedAt: string
}

export interface MemberAccessGuardResult {
  readonly allowed: boolean
  readonly requiredBenefit: MemberBenefitType
  readonly message: string
}

export interface MemberCenterState {
  readonly packagePlans: ReadonlyArray<IMemberPackagePlan>
  readonly selectedPackageType: MemberPackageType
  readonly currentOrder: Nullable<IMemberPaymentOrder>
  readonly latestMessage: string
  readonly processingPayment: boolean
}

export interface MemberCheckoutPayload {
  readonly packageType: MemberPackageType
  readonly channel: MemberPaymentChannel
}
