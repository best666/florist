import { FlowerCareDifficulty, FlowerCategory, FlowerPlacement } from '@florist/contracts'
import { acceptHMRUpdate, defineStore } from 'pinia'
import type {
  FlowerCustomOption,
  FlowerCustomSelectionMeta,
  FlowerFormValues,
  FlowerHealthStatus,
  LocalFlower,
} from '@/interfaces'
import {
  FLOWER_DIFFICULTY_OPTIONS,
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_PLACEMENT_OPTIONS,
  FLOWER_STATUS_OPTIONS,
  getFlowerCareDifficultyLabel,
  getFlowerCategoryLabel,
  getFlowerPlacementLabel,
  getFlowerHealthStatusLabel,
} from '@/interfaces'

interface FlowerTaxonomyState {
  customCategories: FlowerCustomOption<FlowerCategory>[]
  customPlacements: FlowerCustomOption<FlowerPlacement>[]
  customCareDifficulties: FlowerCustomOption<FlowerCareDifficulty>[]
  customCareStatuses: FlowerCustomOption<FlowerHealthStatus>[]
  flowerSelections: Record<string, FlowerCustomSelectionMeta>
}

function createOptionId(prefix: 'category' | 'placement' | 'difficulty' | 'status'): string {
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
  const currentIndex = options.findIndex((option) => option.id === targetId)

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

  const nextIndex =
    direction === 'up'
      ? Math.max(currentIndex - 1, 0)
      : Math.min(currentIndex + 1, nextOptions.length)

  nextOptions.splice(nextIndex, 0, targetOption)
  return nextOptions
}

function createCustomOption<TBaseValue extends string>(
  baseValue: TBaseValue,
  label: string,
  prefix: 'category' | 'placement' | 'difficulty' | 'status',
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

export const useFlowerTaxonomyStore = defineStore('flower-taxonomy', {
  state: (): FlowerTaxonomyState => ({
    customCategories: [],
    customPlacements: [],
    customCareDifficulties: [],
    customCareStatuses: [],
    flowerSelections: {},
  }),
  getters: {
    categoryOptions(state) {
      return [
        ...FLOWER_CATEGORY_OPTIONS,
        ...state.customCategories.map((option) => ({
          label: option.label,
          value: option.id,
        })),
      ]
    },
    placementOptions(state) {
      return [
        ...FLOWER_PLACEMENT_OPTIONS,
        ...state.customPlacements.map((option) => ({
          label: option.label,
          value: option.id,
        })),
      ]
    },
    careDifficultyOptions(state) {
      return [
        ...FLOWER_DIFFICULTY_OPTIONS,
        ...state.customCareDifficulties.map((option) => ({
          label: option.label,
          value: option.id,
        })),
      ]
    },
    careStatusOptions(state) {
      return [
        ...FLOWER_STATUS_OPTIONS,
        ...state.customCareStatuses.map((option) => ({
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

      return this.customCategories.find((option) => option.id === customCategoryId) ?? null
    },

    getCustomPlacementById(customPlacementId?: string): FlowerCustomOption<FlowerPlacement> | null {
      if (!customPlacementId) {
        return null
      }

      return this.customPlacements.find((option) => option.id === customPlacementId) ?? null
    },

    getCustomCareDifficultyById(
      customCareDifficultyId?: string,
    ): FlowerCustomOption<FlowerCareDifficulty> | null {
      if (!customCareDifficultyId) {
        return null
      }

      return (
        this.customCareDifficulties.find((option) => option.id === customCareDifficultyId) ?? null
      )
    },

    getCustomCareStatusById(
      customCareStatusId?: string,
    ): FlowerCustomOption<FlowerHealthStatus> | null {
      if (!customCareStatusId) {
        return null
      }

      return this.customCareStatuses.find((option) => option.id === customCareStatusId) ?? null
    },

    addCustomCategory(
      baseValue: FlowerCategory,
      label: string,
    ): FlowerCustomOption<FlowerCategory> {
      const nextOption = createCustomOption(baseValue, label, 'category')
      this.customCategories = [...this.customCategories, nextOption]
      return nextOption
    },

    updateCustomCategory(
      customCategoryId: string,
      payload: { baseValue: FlowerCategory; label: string },
    ): void {
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
      this.customCategories = moveOptionByDirection(
        this.customCategories,
        customCategoryId,
        direction,
      )
    },

    removeCustomCategory(customCategoryId: string): void {
      this.customCategories = this.customCategories.filter(
        (option) => option.id !== customCategoryId,
      )

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

    addCustomPlacement(
      baseValue: FlowerPlacement,
      label: string,
    ): FlowerCustomOption<FlowerPlacement> {
      const nextOption = createCustomOption(baseValue, label, 'placement')
      this.customPlacements = [...this.customPlacements, nextOption]
      return nextOption
    },

    updateCustomPlacement(
      customPlacementId: string,
      payload: { baseValue: FlowerPlacement; label: string },
    ): void {
      this.customPlacements = this.customPlacements.map((option) => {
        if (option.id !== customPlacementId) {
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

    moveCustomPlacement(customPlacementId: string, direction: 'top' | 'up' | 'down'): void {
      this.customPlacements = moveOptionByDirection(
        this.customPlacements,
        customPlacementId,
        direction,
      )
    },

    removeCustomPlacement(customPlacementId: string): void {
      this.customPlacements = this.customPlacements.filter(
        (option) => option.id !== customPlacementId,
      )

      this.flowerSelections = Object.fromEntries(
        Object.entries(this.flowerSelections).map(([flowerId, selection]) => {
          if (selection.customPlacementId !== customPlacementId) {
            return [flowerId, selection]
          }

          const { customPlacementId: _customPlacementId, ...restSelection } = selection
          return [flowerId, restSelection]
        }),
      )
    },

    addCustomCareDifficulty(
      baseValue: FlowerCareDifficulty,
      label: string,
    ): FlowerCustomOption<FlowerCareDifficulty> {
      const nextOption = createCustomOption(baseValue, label, 'difficulty')
      this.customCareDifficulties = [...this.customCareDifficulties, nextOption]
      return nextOption
    },

    updateCustomCareDifficulty(
      customCareDifficultyId: string,
      payload: { baseValue: FlowerCareDifficulty; label: string },
    ): void {
      this.customCareDifficulties = this.customCareDifficulties.map((option) => {
        if (option.id !== customCareDifficultyId) {
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

    moveCustomCareDifficulty(
      customCareDifficultyId: string,
      direction: 'top' | 'up' | 'down',
    ): void {
      this.customCareDifficulties = moveOptionByDirection(
        this.customCareDifficulties,
        customCareDifficultyId,
        direction,
      )
    },

    removeCustomCareDifficulty(customCareDifficultyId: string): void {
      this.customCareDifficulties = this.customCareDifficulties.filter(
        (option) => option.id !== customCareDifficultyId,
      )

      this.flowerSelections = Object.fromEntries(
        Object.entries(this.flowerSelections).map(([flowerId, selection]) => {
          if (selection.customCareDifficultyId !== customCareDifficultyId) {
            return [flowerId, selection]
          }

          const { customCareDifficultyId: _customCareDifficultyId, ...restSelection } = selection
          return [flowerId, restSelection]
        }),
      )
    },

    addCustomCareStatus(
      baseValue: FlowerHealthStatus,
      label: string,
    ): FlowerCustomOption<FlowerHealthStatus> {
      const nextOption = createCustomOption(baseValue, label, 'status')
      this.customCareStatuses = [...this.customCareStatuses, nextOption]
      return nextOption
    },

    updateCustomCareStatus(
      customCareStatusId: string,
      payload: { baseValue: FlowerHealthStatus; label: string },
    ): void {
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
      this.customCareStatuses = moveOptionByDirection(
        this.customCareStatuses,
        customCareStatusId,
        direction,
      )
    },

    removeCustomCareStatus(customCareStatusId: string): void {
      this.customCareStatuses = this.customCareStatuses.filter(
        (option) => option.id !== customCareStatusId,
      )

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
        ...(values.customPlacementId ? { customPlacementId: values.customPlacementId } : {}),
        ...(values.customCareDifficultyId
          ? { customCareDifficultyId: values.customCareDifficultyId }
          : {}),
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

    resolveFlowerPlacementFilterKey(flower: LocalFlower): string {
      return this.flowerSelections[flower.id]?.customPlacementId ?? flower.placement
    },

    resolveFlowerCareDifficultyFilterKey(flower: LocalFlower): string {
      return this.flowerSelections[flower.id]?.customCareDifficultyId ?? flower.careDifficulty
    },

    resolveFlowerCareStatusFilterKey(flower: LocalFlower): string {
      return this.flowerSelections[flower.id]?.customCareStatusId ?? flower.careStatus
    },

    resolveFlowerCategoryLabel(flower: LocalFlower): string {
      const customOption = this.getCustomCategoryById(
        this.flowerSelections[flower.id]?.customCategoryId,
      )
      return customOption?.label ?? getFlowerCategoryLabel(flower.category)
    },

    resolveFlowerPlacementLabel(flower: LocalFlower): string {
      const customOption = this.getCustomPlacementById(
        this.flowerSelections[flower.id]?.customPlacementId,
      )
      return customOption?.label ?? getFlowerPlacementLabel(flower.placement)
    },

    resolveFlowerCareDifficultyLabel(flower: LocalFlower): string {
      const customOption = this.getCustomCareDifficultyById(
        this.flowerSelections[flower.id]?.customCareDifficultyId,
      )
      return customOption?.label ?? getFlowerCareDifficultyLabel(flower.careDifficulty)
    },

    resolveFlowerCareStatusLabel(flower: LocalFlower): string {
      const customOption = this.getCustomCareStatusById(
        this.flowerSelections[flower.id]?.customCareStatusId,
      )
      return customOption?.label ?? getFlowerHealthStatusLabel(flower.careStatus)
    },
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFlowerTaxonomyStore, import.meta.hot))
}
