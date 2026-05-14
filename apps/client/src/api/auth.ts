import type { IUserAuthSession } from '@florist/contracts'
import { http } from '@/utils/request'

export interface H5PhoneLoginPayload {
  phoneNumber: string
  verificationCode: string
  nickname?: string
}

export interface WechatMiniProgramLoginPayload {
  code: string
  nickname?: string
  avatarUrl?: string
}

export function fetchAuthSession(userId?: string): Promise<IUserAuthSession> {
  return http.get<IUserAuthSession>('/auth/session', undefined, {
    showLoading: false,
    skipErrorToast: true,
    ...(userId
      ? {
          header: {
            'x-user-id': userId,
          },
        }
      : {}),
  })
}

export function loginWithH5PhoneCode(payload: H5PhoneLoginPayload): Promise<IUserAuthSession> {
  return http.post<IUserAuthSession, H5PhoneLoginPayload>('/auth/h5/phone/login', payload, {
    loadingText: '正在验证手机号',
    skipErrorToast: true,
  })
}

export function loginWithWechatMiniProgram(payload: WechatMiniProgramLoginPayload): Promise<IUserAuthSession> {
  return http.post<IUserAuthSession, WechatMiniProgramLoginPayload>('/auth/wechat/login', payload, {
    loadingText: '正在连接微信登录',
    skipErrorToast: true,
  })
}
