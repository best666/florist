import type { IImageAsset } from '@florist/contracts'
import { defineStore } from 'pinia'
import { createFlower, fetchFlowerCenter, recycleFlower, updateFlower } from '@/api'
import type { FlowerFormValues, LocalFlower } from '@/interfaces'
import { removeCachedImage } from '@/utils'

interface FlowerState {
  flowers: LocalFlower[]
  recycleBin: LocalFlower[]
  initialized: boolean
}

const FLOWER_RECYCLE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

function createEntityId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sortFlowers(flowers: ReadonlyArray<LocalFlower>): LocalFlower[] {
  return [...flowers].sort((leftFlower, rightFlower) => (
    rightFlower.updatedAt.localeCompare(leftFlower.updatedAt)
  ))
}

function normalizeOptionalString(value: string): string | undefined {
  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : undefined
}

function cloneImages(images: ReadonlyArray<IImageAsset>): IImageAsset[] {
  return images.map(image => ({ ...image }))
}

function buildFlowerEntity(
  values: FlowerFormValues,
  existingFlower?: LocalFlower,
): LocalFlower {
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
    images: cloneImages(values.images),
    ...(lastWateredAt ? { lastWateredAt } : {}),
    ...(lastFertilizedAt ? { lastFertilizedAt } : {}),
    createdAt: existingFlower?.createdAt ?? now,
    updatedAt: now,
    isDeleted: false,
  }
}

async function releaseFlowerImages(images: ReadonlyArray<IImageAsset>): Promise<void> {
  await Promise.all(images.map(async image => {
    await removeCachedImage(image.url)

    if (image.compressedUrl) {
      await removeCachedImage(image.compressedUrl)
    }
  }))
}

function hydrateFlowerCenter(state: FlowerState, center: FlowerState): void {
  state.flowers = sortFlowers(center.flowers)
  state.recycleBin = sortFlowers(center.recycleBin)
}

export const useFlowerStore = defineStore(
  'flowers',
  {
    state: (): FlowerState => ({
      flowers: [],
      recycleBin: [],
      initialized: false,
    }),
    getters: {
      activeFlowers: state => sortFlowers(state.flowers),
      recycleBinFlowers: state => sortFlowers(state.recycleBin),
    },
    actions: {
      async initializeGarden(): Promise<void> {
        try {
          const center = await fetchFlowerCenter()
          hydrateFlowerCenter(this, {
            flowers: center.flowers,
            recycleBin: center.recycleBin,
            initialized: true,
          })
        }
        catch {
          await this.cleanupRecycleBin()
        }

        this.initialized = true
      },

      getFlowerById(flowerId: string): LocalFlower | null {
        return this.flowers.find(flower => flower.id === flowerId) ?? null
      },

      async upsertFlower(values: FlowerFormValues, flowerId?: string): Promise<LocalFlower> {
        try {
          const nextFlower = flowerId
            ? await updateFlower(flowerId, values)
            : await createFlower(values)

          const existingFlower = this.flowers.find(flower => flower.id === nextFlower.id)

          if (existingFlower) {
            this.flowers = sortFlowers(
              this.flowers.map(flower => (flower.id === existingFlower.id ? nextFlower : flower)),
            )
            return nextFlower
          }

          this.flowers = sortFlowers([...this.flowers, nextFlower])
          return nextFlower
        }
        catch {
          await this.cleanupRecycleBin()

          const existingFlower = flowerId
            ? this.flowers.find(flower => flower.id === flowerId)
            : undefined

          const nextFlower = buildFlowerEntity(values, existingFlower)

          if (existingFlower) {
            this.flowers = sortFlowers(
              this.flowers.map(flower => (flower.id === existingFlower.id ? nextFlower : flower)),
            )
            return nextFlower
          }

          this.flowers = sortFlowers([...this.flowers, nextFlower])
          return nextFlower
        }
      },

      async moveFlowerToRecycleBin(flowerId: string): Promise<boolean> {
        try {
          const trashedFlower = await recycleFlower(flowerId)
          this.flowers = this.flowers.filter(flower => flower.id !== flowerId)
          this.recycleBin = sortFlowers([...this.recycleBin, trashedFlower])
          return true
        }
        catch {
          await this.cleanupRecycleBin()

          const targetFlower = this.flowers.find(flower => flower.id === flowerId)

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

          this.flowers = this.flowers.filter(flower => flower.id !== flowerId)
          this.recycleBin = sortFlowers([...this.recycleBin, trashedFlower])

          return true
        }
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

        await Promise.all(expiredFlowers.map(async flower => releaseFlowerImages(flower.images)))
        this.recycleBin = this.recycleBin.filter(
          flower => !expiredFlowers.some(expiredFlower => expiredFlower.id === flower.id),
        )
      },
    },
    persist: true,
  },
)
