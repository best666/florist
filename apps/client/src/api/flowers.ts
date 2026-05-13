import type { IFlower } from '@florist/contracts'
import { http } from '@/utils/request'
import type { FlowerFormValues, LocalFlower } from '@/interfaces'

export interface FlowerCenterResponse {
  flowers: LocalFlower[]
  recycleBin: LocalFlower[]
}

export function fetchFlowerCenter(): Promise<FlowerCenterResponse> {
  return http.get<FlowerCenterResponse>('/flowers', undefined, {
    showLoading: false,
    skipErrorToast: true,
  })
}

export function createFlower(payload: FlowerFormValues): Promise<LocalFlower> {
  return http.post<LocalFlower, FlowerFormValues>('/flowers', payload, {
    loadingText: '正在创建植株',
    skipErrorToast: true,
  })
}

export function updateFlower(flowerId: string, payload: FlowerFormValues): Promise<LocalFlower> {
  return http.put<LocalFlower, FlowerFormValues>(`/flowers/${flowerId}`, payload, {
    loadingText: '正在更新植株',
    skipErrorToast: true,
  })
}

export function recycleFlower(flowerId: string): Promise<IFlower> {
  return http.post<IFlower>(`/flowers/${flowerId}/recycle`, undefined, {
    loadingText: '正在移入回收站',
    skipErrorToast: true,
  })
}
