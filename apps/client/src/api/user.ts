import type { IUser } from '@florist/contracts'
import { http } from '@/utils/request'

export interface UpdateCurrentUserPayload {
  nickname?: string
  avatarUrl?: string
  profileSignature?: string
  city?: string
  phoneMasked?: string
}

export function fetchCurrentUser(): Promise<IUser> {
  return http.get<IUser>('/users/current', undefined, {
    showLoading: false,
    skipErrorToast: true,
  })
}

export function updateCurrentUser(payload: UpdateCurrentUserPayload): Promise<IUser> {
  return http.put<IUser, UpdateCurrentUserPayload>('/users/current', payload, {
    loadingText: '正在保存资料',
    skipErrorToast: true,
  })
}
