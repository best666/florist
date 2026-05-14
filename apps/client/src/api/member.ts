import type { IMember, IMemberPaymentOrder, IMemberPackagePlan } from '@florist/contracts'
import type { MemberCheckoutPayload } from '@/interfaces'
import { http } from '@/utils/request'
import { MEMBER_PACKAGE_PLANS } from '@/utils'

export function fetchMemberPackagePlans(): Promise<ReadonlyArray<IMemberPackagePlan>> {
  return http.get<ReadonlyArray<IMemberPackagePlan>>('/members/plans', undefined, {
    showLoading: false,
    skipErrorToast: true,
  }).catch(() => MEMBER_PACKAGE_PLANS)
}

export function fetchCurrentMember(): Promise<IMember> {
  return http.get<IMember>('/members/current', undefined, {
    showLoading: false,
    skipErrorToast: true,
  })
}

export function rechargeCurrentMember(payload: MemberCheckoutPayload): Promise<{ order: IMemberPaymentOrder, member: IMember }> {
  return http.post<{ order: IMemberPaymentOrder, member: IMember }, MemberCheckoutPayload>('/members/recharge', payload, {
    loadingText: '正在确认会员开通',
    skipErrorToast: true,
  })
}
