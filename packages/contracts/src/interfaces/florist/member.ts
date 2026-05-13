import type { IsoDateTimeString } from './common'
import type {
  MemberBenefitType,
  MemberPackageType,
  MemberPaymentChannel,
  MemberPaymentStatus,
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

/**
 * 会员套餐定义，用于前端展示和后端支付下单统一消费。
 */
export interface IMemberPackagePlan {
  /** 套餐类型。 */
  readonly packageType: MemberPackageType
  /** 展示名称。 */
  readonly title: string
  /** 副标题。 */
  readonly subtitle: string
  /** 实付金额，单位分。 */
  readonly priceInCents: number
  /** 划线金额，单位分。 */
  readonly originPriceInCents?: number
  /** 套餐时长，终身会员可为空。 */
  readonly durationDays?: number
  /** 套餐权益。 */
  readonly benefitTypes: ReadonlyArray<MemberBenefitType>
  /** 套餐强调标签。 */
  readonly highlightLabel?: string
  /** 风险说明，强调不自动续费。 */
  readonly disclaimer: string
}

/**
 * 小程序原生支付参数。
 */
export interface IMemberWechatPaymentPayload {
  readonly timeStamp: string
  readonly nonceStr: string
  readonly packageValue: string
  readonly signType: 'MD5' | 'RSA'
  readonly paySign: string
}

/**
 * 会员支付订单定义。
 */
export interface IMemberPaymentOrder {
  /** 订单 id。 */
  readonly id: string
  /** 套餐类型。 */
  readonly packageType: MemberPackageType
  /** 支付渠道。 */
  readonly channel: MemberPaymentChannel
  /** 支付金额，单位分。 */
  readonly amountInCents: number
  /** 订单状态。 */
  readonly status: MemberPaymentStatus
  /** 创建时间。 */
  readonly createdAt: IsoDateTimeString
  /** 支付截止时间。 */
  readonly expiredAt: IsoDateTimeString
  /** H5 展示二维码时使用的订单文本。 */
  readonly qrCodeText?: string
  /** 已接入真实商户后可直接传入原生支付参数。 */
  readonly wechatPayload?: IMemberWechatPaymentPayload
}
