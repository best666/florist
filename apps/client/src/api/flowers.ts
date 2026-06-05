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

function buildFlowerServerPayload(payload: FlowerFormValues): FlowerFormValues {
  return {
    name: payload.name,
    nickname: payload.nickname,
    category: payload.category,
    placement: payload.placement,
    careDifficulty: payload.careDifficulty,
    careStatus: payload.careStatus,
    coverImageId: payload.coverImageId,
    note: payload.note,
    images: payload.images,
    lastWateredAt: payload.lastWateredAt,
    lastFertilizedAt: payload.lastFertilizedAt,
    customCategoryId: payload.customCategoryId,
    customPlacementId: payload.customPlacementId,
    customCareDifficultyId: payload.customCareDifficultyId,
    customCareStatusId: payload.customCareStatusId,
  }
}

export function createFlower(payload: FlowerFormValues): Promise<LocalFlower> {
  return http.post<LocalFlower, FlowerFormValues>('/flowers', buildFlowerServerPayload(payload), {
    loadingText: '正在创建植株',
    skipErrorToast: true,
  })
}

export function updateFlower(flowerId: string, payload: FlowerFormValues): Promise<LocalFlower> {
  return http.put<LocalFlower, FlowerFormValues>(`/flowers/${flowerId}`, buildFlowerServerPayload(payload), {
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

/** 批量同步本地植株到服务器（登录后首次同步） */
export function syncFlowersBatch(items: ReadonlyArray<LocalFlower>): Promise<FlowerCenterResponse> {
  // 剔除仅本地使用的字段，避免服务端校验报错或字段冲突
  const cleanItems = items.map(({ emoji: _, isDeleted: _d, deletedAt: _da, pendingPurgeAt: _pp, ...rest }) => rest)
  return http.post<FlowerCenterResponse>('/flowers/sync/batch', { items: cleanItems }, {
    showLoading: false,
    skipErrorToast: true,
  })
}
