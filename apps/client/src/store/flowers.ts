import type { IImageAsset } from '@florist/contracts'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { createFlower, fetchFlowerCenter, recycleFlower, updateFlower } from '@/api'
import type { FlowerFormValues, LocalFlower } from '@/interfaces'
import {
  cloneImages,
  createEntityId,
  normalizeOptionalString,
  readAuthUserIdFromStorage,
  removeCachedImage,
} from '@/utils'
import { resolvePlantEmoji } from '@/utils/plant-emoji'
import { useFlowerTaxonomyStore } from './flower-taxonomy'
import { useMemberStore } from './member'

interface FlowerState {
  flowers: LocalFlower[]
  recycleBin: LocalFlower[]
  initialized: boolean
}

const FLOWER_RECYCLE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
// 8 秒内跳过重复拉取，避免快速切换页面时重复请求
const FLOWER_CENTER_FRESHNESS_MS = 8000

// 单例请求 + 最后加载时间戳，保证同一时刻只有一个中心数据请求
let flowerCenterRequest: Promise<void> | null = null
let flowerCenterLastLoadedAt = 0

function sortFlowers(flowers: ReadonlyArray<LocalFlower>): LocalFlower[] {
  return [...flowers].sort((leftFlower, rightFlower) =>
    rightFlower.updatedAt.localeCompare(leftFlower.updatedAt),
  )
}

function buildFlowerEntity(values: FlowerFormValues, existingFlower?: LocalFlower): LocalFlower {
  const now = new Date().toISOString()
  const nickname = normalizeOptionalString(values.nickname)
  const note = normalizeOptionalString(values.note)
  const lastWateredAt = normalizeOptionalString(values.lastWateredAt)
  const lastFertilizedAt = normalizeOptionalString(values.lastFertilizedAt)

  return {
    id: existingFlower?.id ?? createEntityId('flower'),
    name: values.name.trim(),
    ...(nickname ? { nickname } : {}),
    category: values.category,
    placement: values.placement,
    careDifficulty: values.careDifficulty,
    careStatus: values.careStatus,
    ...(note ? { note } : {}),
    ...(values.coverImageId ? { coverImageId: values.coverImageId } : {}),
    emoji: existingFlower?.emoji ?? resolvePlantEmoji(values.name.trim(), values.category),
    images: cloneImages(values.images),
    ...(lastWateredAt ? { lastWateredAt } : {}),
    ...(lastFertilizedAt ? { lastFertilizedAt } : {}),
    createdAt: existingFlower?.createdAt ?? now,
    updatedAt: now,
    isDeleted: false,
    ...(values.customCategoryId ? { customCategoryId: values.customCategoryId } : {}),
    ...(values.customPlacementId ? { customPlacementId: values.customPlacementId } : {}),
    ...(values.customCareDifficultyId ? { customCareDifficultyId: values.customCareDifficultyId } : {}),
    ...(values.customCareStatusId ? { customCareStatusId: values.customCareStatusId } : {}),
  }
}

async function releaseFlowerImages(images: ReadonlyArray<IImageAsset>): Promise<void> {
  await Promise.all(
    images.map(async (image) => {
      await removeCachedImage(image.url)

      if (image.compressedUrl) {
        await removeCachedImage(image.compressedUrl)
      }
    }),
  )
}

function hydrateFlowerCenter(state: FlowerState, center: FlowerState): void {
  state.flowers = sortFlowers(center.flowers)
  state.recycleBin = sortFlowers(center.recycleBin)
}

// 离线优先架构入口：未登录或非会员时走纯本地加密缓存，不调服务端
function canUseCloudGarden(): boolean {
  const memberStore = useMemberStore()

  return Boolean(readAuthUserIdFromStorage()) && memberStore.hasCloudGardenAccess
}

export const useFlowerStore = defineStore('flowers', {
  state: (): FlowerState => ({
    flowers: [],
    recycleBin: [],
    initialized: false,
  }),
  getters: {
    activeFlowers: (state) => sortFlowers(state.flowers),
    recycleBinFlowers: (state) => sortFlowers(state.recycleBin),
  },
  actions: {
    async initializeGarden(options?: { force?: boolean }): Promise<void> {
      const forceRefresh = options?.force ?? false

      if (!canUseCloudGarden()) {
        this.initialized = true
        return
      }

      if (!forceRefresh && flowerCenterRequest) {
        return flowerCenterRequest
      }

      if (
        !forceRefresh &&
        this.initialized &&
        Date.now() - flowerCenterLastLoadedAt < FLOWER_CENTER_FRESHNESS_MS
      ) {
        return
      }

      flowerCenterRequest = (async () => {
        try {
          const center = await fetchFlowerCenter()
          hydrateFlowerCenter(this, {
            flowers: center.flowers,
            recycleBin: center.recycleBin,
            initialized: true,
          })
          flowerCenterLastLoadedAt = Date.now()
        } catch {
          await this.cleanupRecycleBin()
        }

        this.initialized = true
      })()

      try {
        await flowerCenterRequest
      } finally {
        flowerCenterRequest = null
      }
    },

    getFlowerById(flowerId: string): LocalFlower | null {
      return this.flowers.find((flower) => flower.id === flowerId) ?? null
    },

    async upsertFlower(values: FlowerFormValues, flowerId?: string): Promise<LocalFlower> {
      const taxonomyStore = useFlowerTaxonomyStore()

      if (!canUseCloudGarden()) {
        const existingFlower = flowerId
          ? this.flowers.find((flower) => flower.id === flowerId)
          : undefined
        const nextFlower = buildFlowerEntity(values, existingFlower)

        taxonomyStore.syncFlowerSelection(nextFlower.id, values)

        if (existingFlower) {
          this.flowers = sortFlowers(
            this.flowers.map((flower) => (flower.id === existingFlower.id ? nextFlower : flower)),
          )
          flowerCenterLastLoadedAt = Date.now()
          return nextFlower
        }

        this.flowers = sortFlowers([...this.flowers, nextFlower])
        flowerCenterLastLoadedAt = Date.now()
        return nextFlower
      }

      try {
        const nextFlower = flowerId
          ? await updateFlower(flowerId, values)
          : await createFlower(values)

        taxonomyStore.syncFlowerSelection(nextFlower.id, values)

        const existingFlower = this.flowers.find((flower) => flower.id === nextFlower.id)

        if (existingFlower) {
          this.flowers = sortFlowers(
            this.flowers.map((flower) => (flower.id === existingFlower.id ? nextFlower : flower)),
          )
          flowerCenterLastLoadedAt = Date.now()
          return nextFlower
        }

        this.flowers = sortFlowers([...this.flowers, nextFlower])
        flowerCenterLastLoadedAt = Date.now()
        return nextFlower
      } catch {
        await this.cleanupRecycleBin()

        const existingFlower = flowerId
          ? this.flowers.find((flower) => flower.id === flowerId)
          : undefined

        const nextFlower = buildFlowerEntity(values, existingFlower)

        taxonomyStore.syncFlowerSelection(nextFlower.id, values)

        if (existingFlower) {
          this.flowers = sortFlowers(
            this.flowers.map((flower) => (flower.id === existingFlower.id ? nextFlower : flower)),
          )
          flowerCenterLastLoadedAt = Date.now()
          return nextFlower
        }

        this.flowers = sortFlowers([...this.flowers, nextFlower])
        flowerCenterLastLoadedAt = Date.now()
        return nextFlower
      }
    },

    async moveFlowerToRecycleBin(flowerId: string): Promise<boolean> {
      if (!canUseCloudGarden()) {
        const targetFlower = this.flowers.find((flower) => flower.id === flowerId)

        if (!targetFlower) {
          return false
        }

        const deletedAt = new Date().toISOString()
        const trashedFlower: LocalFlower = {
          ...targetFlower,
          isDeleted: true,
          deletedAt,
          pendingPurgeAt: new Date(Date.now() + FLOWER_RECYCLE_RETENTION_MS).toISOString(),
          updatedAt: deletedAt,
        }

        this.flowers = this.flowers.filter((flower) => flower.id !== flowerId)
        this.recycleBin = sortFlowers([...this.recycleBin, trashedFlower])
        flowerCenterLastLoadedAt = Date.now()
        return true
      }

      try {
        const trashedFlower = await recycleFlower(flowerId)
        this.flowers = this.flowers.filter((flower) => flower.id !== flowerId)
        this.recycleBin = sortFlowers([...this.recycleBin, trashedFlower])
        flowerCenterLastLoadedAt = Date.now()
        return true
      } catch {
        await this.cleanupRecycleBin()

        const targetFlower = this.flowers.find((flower) => flower.id === flowerId)

        if (!targetFlower) {
          return false
        }

        const deletedAt = new Date().toISOString()
        const trashedFlower: LocalFlower = {
          ...targetFlower,
          isDeleted: true,
          deletedAt,
          pendingPurgeAt: new Date(Date.now() + FLOWER_RECYCLE_RETENTION_MS).toISOString(),
          updatedAt: deletedAt,
        }

        this.flowers = this.flowers.filter((flower) => flower.id !== flowerId)
        this.recycleBin = sortFlowers([...this.recycleBin, trashedFlower])
        flowerCenterLastLoadedAt = Date.now()

        return true
      }
    },

    async restoreFlowerFromRecycleBin(flowerId: string): Promise<boolean> {
      const targetFlower = this.recycleBin.find((flower) => flower.id === flowerId)

      if (!targetFlower) {
        return false
      }

      const {
        deletedAt: _deletedAt,
        pendingPurgeAt: _pendingPurgeAt,
        ...flowerSnapshot
      } = targetFlower
      const restoredFlower: LocalFlower = {
        ...flowerSnapshot,
        isDeleted: false,
        updatedAt: new Date().toISOString(),
      }

      this.recycleBin = this.recycleBin.filter((flower) => flower.id !== flowerId)
      this.flowers = sortFlowers([...this.flowers, restoredFlower])
      flowerCenterLastLoadedAt = Date.now()
      return true
    },

    replaceLocalCenter(center: {
      flowers: ReadonlyArray<LocalFlower>
      recycleBin: ReadonlyArray<LocalFlower>
    }): void {
      hydrateFlowerCenter(this, {
        flowers: [...center.flowers],
        recycleBin: [...center.recycleBin],
        initialized: true,
      })
      this.initialized = true
      flowerCenterLastLoadedAt = Date.now()
    },

    async clearLocalGarden(): Promise<void> {
      const taxonomyStore = useFlowerTaxonomyStore()

      await Promise.all([
        ...this.flowers.map(async (flower) => releaseFlowerImages(flower.images)),
        ...this.recycleBin.map(async (flower) => releaseFlowerImages(flower.images)),
      ])

      this.flowers.forEach((flower) => taxonomyStore.removeFlowerSelection(flower.id))
      this.recycleBin.forEach((flower) => taxonomyStore.removeFlowerSelection(flower.id))

      this.flowers = []
      this.recycleBin = []
      this.initialized = true
      flowerCenterLastLoadedAt = Date.now()
    },

    async cleanupRecycleBin(): Promise<void> {
      const now = Date.now()
      const expiredFlowers = this.recycleBin.filter((flower) => {
        if (!flower.pendingPurgeAt) {
          return false
        }

        return new Date(flower.pendingPurgeAt).getTime() <= now
      })

      if (expiredFlowers.length === 0) {
        return
      }

      await Promise.all(expiredFlowers.map(async (flower) => releaseFlowerImages(flower.images)))
      this.recycleBin = this.recycleBin.filter(
        (flower) => !expiredFlowers.some((expiredFlower) => expiredFlower.id === flower.id),
      )
    },
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFlowerStore, import.meta.hot))
}
