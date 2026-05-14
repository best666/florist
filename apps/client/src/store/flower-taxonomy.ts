import { FlowerCategory } from '@florist/contracts'
import { defineStore } from 'pinia'
import type {
  FlowerCustomOption,
  FlowerCustomSelectionMeta,
  FlowerFormValues,
  FlowerHealthStatus,
  LocalFlower,
} from '@/interfaces'
import {
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_STATUS_OPTIONS,
  getFlowerCategoryLabel,
  getFlowerHealthStatusLabel,
} from '@/interfaces'

interface FlowerTaxonomyState {
  customCategories: FlowerCustomOption<FlowerCategory>[]
  customCareStatuses: FlowerCustomOption<FlowerHealthStatus>[]
  flowerSelections: Record<string, FlowerCustomSelectionMeta>
}

function createOptionId(prefix: 'category' | 'status'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeLabel(label: string): string {
  return label.trim()
}

function moveOptionByDirection<TOption extends { id: string }>(
  options: ReadonlyArray<TOption>,
  targetId: string,
  direction: 'top' | 'up' | 'down',
): TOption[] {
  const currentIndex = options.findIndex(option => option.id === targetId)

  if (currentIndex < 0) {
    return [...options]
  }

  const nextOptions = [...options]
  const [targetOption] = nextOptions.splice(currentIndex, 1)

  if (!targetOption) {
    return [...options]
  }

  if (direction === 'top') {
    nextOptions.unshift(targetOption)
    return nextOptions
  }

  const nextIndex = direction === 'up'
    ? Math.max(currentIndex - 1, 0)
    : Math.min(currentIndex + 1, nextOptions.length)

  nextOptions.splice(nextIndex, 0, targetOption)
  return nextOptions
}

function createCustomOption<TBaseValue extends string>(
  baseValue: TBaseValue,
  label: string,
  prefix: 'category' | 'status',
): FlowerCustomOption<TBaseValue> {
  const now = new Date().toISOString()

  return {
    id: createOptionId(prefix),
    label: normalizeLabel(label),
    baseValue,
    createdAt: now,
    updatedAt: now,
  }
}

export const useFlowerTaxonomyStore = defineStore(
  'flower-taxonomy',
  {
    state: (): FlowerTaxonomyState => ({
      customCategories: [],
      customCareStatuses: [],
      flowerSelections: {},
    }),
    getters: {
      categoryOptions(state) {
        return [
          ...FLOWER_CATEGORY_OPTIONS,
          ...state.customCategories.map(option => ({
            label: option.label,
            value: option.id,
          })),
        ]
      },
      careStatusOptions(state) {
        return [
          ...FLOWER_STATUS_OPTIONS,
          ...state.customCareStatuses.map(option => ({
            label: option.label,
            value: option.id,
          })),
        ]
      },
    },
    actions: {
      getCustomCategoryById(customCategoryId?: string): FlowerCustomOption<FlowerCategory> | null {
        if (!customCategoryId) {
          return null
        }

        return this.customCategories.find(option => option.id === customCategoryId) ?? null
      },

      getCustomCareStatusById(customCareStatusId?: string): FlowerCustomOption<FlowerHealthStatus> | null {
        if (!customCareStatusId) {
          return null
        }

        return this.customCareStatuses.find(option => option.id === customCareStatusId) ?? null
      },

      addCustomCategory(baseValue: FlowerCategory, label: string): FlowerCustomOption<FlowerCategory> {
        const nextOption = createCustomOption(baseValue, label, 'category')
        this.customCategories = [...this.customCategories, nextOption]
        return nextOption
      },

      updateCustomCategory(customCategoryId: string, payload: { baseValue: FlowerCategory, label: string }): void {
        this.customCategories = this.customCategories.map((option) => {
          if (option.id !== customCategoryId) {
            return option
          }

          return {
            ...option,
            baseValue: payload.baseValue,
            label: normalizeLabel(payload.label),
            updatedAt: new Date().toISOString(),
          }
        })
      },

      moveCustomCategory(customCategoryId: string, direction: 'top' | 'up' | 'down'): void {
        this.customCategories = moveOptionByDirection(this.customCategories, customCategoryId, direction)
      },

      removeCustomCategory(customCategoryId: string): void {
        this.customCategories = this.customCategories.filter(option => option.id !== customCategoryId)

        this.flowerSelections = Object.fromEntries(
          Object.entries(this.flowerSelections).map(([flowerId, selection]) => {
            if (selection.customCategoryId !== customCategoryId) {
              return [flowerId, selection]
            }

            const { customCategoryId: _customCategoryId, ...restSelection } = selection
            return [flowerId, restSelection]
          }),
        )
      },

      addCustomCareStatus(baseValue: FlowerHealthStatus, label: string): FlowerCustomOption<FlowerHealthStatus> {
        const nextOption = createCustomOption(baseValue, label, 'status')
        this.customCareStatuses = [...this.customCareStatuses, nextOption]
        return nextOption
      },

      updateCustomCareStatus(customCareStatusId: string, payload: { baseValue: FlowerHealthStatus, label: string }): void {
        this.customCareStatuses = this.customCareStatuses.map((option) => {
          if (option.id !== customCareStatusId) {
            return option
          }

          return {
            ...option,
            baseValue: payload.baseValue,
            label: normalizeLabel(payload.label),
            updatedAt: new Date().toISOString(),
          }
        })
      },

      moveCustomCareStatus(customCareStatusId: string, direction: 'top' | 'up' | 'down'): void {
        this.customCareStatuses = moveOptionByDirection(this.customCareStatuses, customCareStatusId, direction)
      },

      removeCustomCareStatus(customCareStatusId: string): void {
        this.customCareStatuses = this.customCareStatuses.filter(option => option.id !== customCareStatusId)

        this.flowerSelections = Object.fromEntries(
          Object.entries(this.flowerSelections).map(([flowerId, selection]) => {
            if (selection.customCareStatusId !== customCareStatusId) {
              return [flowerId, selection]
            }

            const { customCareStatusId: _customCareStatusId, ...restSelection } = selection
            return [flowerId, restSelection]
          }),
        )
      },

      syncFlowerSelection(flowerId: string, values: FlowerFormValues): void {
        const nextSelection: FlowerCustomSelectionMeta = {
          ...(values.customCategoryId ? { customCategoryId: values.customCategoryId } : {}),
          ...(values.customCareStatusId ? { customCareStatusId: values.customCareStatusId } : {}),
        }

        this.flowerSelections = {
          ...this.flowerSelections,
          [flowerId]: nextSelection,
        }
      },

      removeFlowerSelection(flowerId: string): void {
        const nextSelections = { ...this.flowerSelections }
        delete nextSelections[flowerId]
        this.flowerSelections = nextSelections
      },

      resolveFlowerCategoryFilterKey(flower: LocalFlower): string {
        return this.flowerSelections[flower.id]?.customCategoryId ?? flower.category
      },

      resolveFlowerCareStatusFilterKey(flower: LocalFlower): string {
        return this.flowerSelections[flower.id]?.customCareStatusId ?? flower.careStatus
      },

      resolveFlowerCategoryLabel(flower: LocalFlower): string {
        const customOption = this.getCustomCategoryById(this.flowerSelections[flower.id]?.customCategoryId)
        return customOption?.label ?? getFlowerCategoryLabel(flower.category)
      },

      resolveFlowerCareStatusLabel(flower: LocalFlower): string {
        const customOption = this.getCustomCareStatusById(this.flowerSelections[flower.id]?.customCareStatusId)
        return customOption?.label ?? getFlowerHealthStatusLabel(flower.careStatus)
      },
    },
    persist: true,
  },
)
