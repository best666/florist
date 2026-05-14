import type { IMemberPaymentOrder, IMemberPackagePlan } from '@florist/contracts'
import { MemberPaymentChannel, MemberPaymentStatus } from '@florist/contracts'
import type { MemberCheckoutPayload } from '@/interfaces'
import { MEMBER_PACKAGE_PLANS, createLocalMemberPaymentOrder, resolveMemberPlan, showGentleConfirm } from '@/utils'

export function fetchMemberPackagePlans(): Promise<ReadonlyArray<IMemberPackagePlan>> {
  return Promise.resolve(MEMBER_PACKAGE_PLANS)
}

export function createMemberPaymentOrder(payload: MemberCheckoutPayload): Promise<IMemberPaymentOrder> {
  return Promise.resolve(createLocalMemberPaymentOrder(payload.packageType, payload.channel))
}

export async function requestMiniProgramMemberPayment(order: IMemberPaymentOrder): Promise<IMemberPaymentOrder> {
  // #ifdef MP-WEIXIN
  if (order.wechatPayload) {
    await uni.requestPayment({
      provider: 'wxpay',
      timeStamp: order.wechatPayload.timeStamp,
      nonceStr: order.wechatPayload.nonceStr,
      package: order.wechatPayload.packageValue,
      signType: order.wechatPayload.signType,
      paySign: order.wechatPayload.paySign,
    })

    return {
      ...order,
      status: MemberPaymentStatus.Paid,
    }
  }

  const plan = resolveMemberPlan(order.packageType)
  const confirmed = await showGentleConfirm({
    title: '确认支付',
    content: `当前为演示环境，会模拟微信支付成功回调。开通 ${plan.title} 需要一次性支付 ${(plan.priceInCents / 100).toFixed(0)} 元，不会自动续费。`,
    confirmText: '确认支付',
    cancelText: '先看看',
  })

  return {
    ...order,
    channel: MemberPaymentChannel.MpWeixin,
    status: confirmed ? MemberPaymentStatus.Paid : MemberPaymentStatus.Closed,
  }
  // #endif

  return order
}
