import type { IFlower } from '@florist/contracts'
import { http } from '@/utils/request'
import type { FlowerFormValues, LocalFlower } from '@/interfaces'

type FlowerServerPayload = Omit<
  FlowerFormValues,
  'customCategoryId' | 'customPlacementId' | 'customCareDifficultyId' | 'customCareStatusId'
>

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

function buildFlowerServerPayload(payload: FlowerFormValues): FlowerServerPayload {
  return {
    name: payload.name,
    nickname: payload.nickname,
    category: payload.category,
    placement: payload.placement,
    careDifficulty: payload.careDifficulty,
    careStatus: payload.careStatus,
    note: payload.note,
    images: payload.images,
    lastWateredAt: payload.lastWateredAt,
    lastFertilizedAt: payload.lastFertilizedAt,
  }
}

export function createFlower(payload: FlowerFormValues): Promise<LocalFlower> {
  return http.post<LocalFlower, FlowerServerPayload>('/flowers', buildFlowerServerPayload(payload), {
    loadingText: '正在创建植株',
    skipErrorToast: true,
  })
}

export function updateFlower(flowerId: string, payload: FlowerFormValues): Promise<LocalFlower> {
  return http.put<LocalFlower, FlowerServerPayload>(`/flowers/${flowerId}`, buildFlowerServerPayload(payload), {
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
