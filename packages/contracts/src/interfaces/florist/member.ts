import type { IsoDateTimeString } from './common'
import type {
  MemberBenefitType,
  MemberPackageType,
  MemberStatus,
} from '../enums'

/**
 * 会员权益实体，用于权益判断、支付回调落库和前端会员中心展示。
 */
export interface IMember {
  /** 会员唯一标识。 */
  readonly id: string
  /** 关联用户 id。 */
  readonly userId: string
  /** 当前会员套餐。 */
  readonly packageType: MemberPackageType
  /** 当前会员状态。 */
  readonly status: MemberStatus
  /** 已生效的权益清单。 */
  readonly benefitTypes: ReadonlyArray<MemberBenefitType>
  /** 开通时间。 */
  readonly startedAt?: IsoDateTimeString
  /** 到期时间，终身会员可为空。 */
  readonly expiredAt?: IsoDateTimeString
}
