import {
  FlowerCareDifficulty,
  FlowerCategory,
  FlowerPlacement,
  type IImageAsset,
  type IsoDateTimeString,
} from '@florist/contracts'
import type { KeyValueOption } from './base'
import type { TagLabelStatus } from './components'

export type FlowerHealthStatus = Exclude<TagLabelStatus, 'custom'>

export type FlowerFilterValue<TValue extends string> = TValue | 'all'

export interface FlowerCustomOption<TBaseValue extends string> {
  readonly id: string
  readonly label: string
  readonly baseValue: TBaseValue
  readonly createdAt: string
  readonly updatedAt: string
}

export interface FlowerCustomSelectionMeta {
  readonly customCategoryId?: string
  readonly customPlacementId?: string
  readonly customCareDifficultyId?: string
  readonly customCareStatusId?: string
}

export interface FlowerFormValues {
  name: string
  nickname: string
  category: FlowerCategory
  customCategoryId: string | undefined
  placement: FlowerPlacement
  customPlacementId: string | undefined
  careDifficulty: FlowerCareDifficulty
  customCareDifficultyId: string | undefined
  careStatus: FlowerHealthStatus
  customCareStatusId: string | undefined
  coverImageId: string | undefined
  note: string
  images: IImageAsset[]
  lastWateredAt: string
  lastFertilizedAt: string
}

export interface LocalFlower {
  readonly id: string
  readonly name: string
  readonly nickname?: string
  readonly category: FlowerCategory
  readonly placement: FlowerPlacement
  readonly careDifficulty: FlowerCareDifficulty
  readonly careStatus: FlowerHealthStatus
  readonly coverImageId?: string
  readonly note?: string
  readonly images: ReadonlyArray<IImageAsset>
  readonly lastWateredAt?: IsoDateTimeString
  readonly lastFertilizedAt?: IsoDateTimeString
  readonly createdAt: IsoDateTimeString
  readonly updatedAt: IsoDateTimeString
  readonly isDeleted: boolean
  readonly deletedAt?: IsoDateTimeString
  readonly pendingPurgeAt?: IsoDateTimeString
}

export interface FlowerFilterState {
  category: FlowerFilterValue<string>
  placement: FlowerFilterValue<FlowerPlacement>
  careStatus: FlowerFilterValue<string>
}

export const FLOWER_CATEGORY_OPTIONS: ReadonlyArray<KeyValueOption<FlowerCategory>> = [
  { label: '多肉', value: FlowerCategory.Succulent },
  { label: '草本', value: FlowerCategory.Herbaceous },
  { label: '木本', value: FlowerCategory.Woody },
  { label: '水培', value: FlowerCategory.Hydroponic },
  { label: '藤蔓', value: FlowerCategory.Vine },
] as const

export const FLOWER_PLACEMENT_OPTIONS: ReadonlyArray<KeyValueOption<FlowerPlacement>> = [
  { label: '阳台', value: FlowerPlacement.IndoorBalcony },
  { label: '户外', value: FlowerPlacement.OutdoorOpenAir },
  { label: '室内散光', value: FlowerPlacement.IndoorShade },
] as const

export const FLOWER_DIFFICULTY_OPTIONS: ReadonlyArray<KeyValueOption<FlowerCareDifficulty>> = [
  { label: '轻松', value: FlowerCareDifficulty.Easy },
  { label: '适中', value: FlowerCareDifficulty.Medium },
  { label: '进阶', value: FlowerCareDifficulty.Hard },
] as const

export const FLOWER_STATUS_OPTIONS: ReadonlyArray<KeyValueOption<FlowerHealthStatus>> = [
  { label: '缺水', value: 'watering-needed' },
  { label: '正常', value: 'healthy' },
  { label: '休眠', value: 'dormant' },
  { label: '需施肥', value: 'fertilizing-needed' },
] as const

const FLOWER_CATEGORY_LABEL_MAP: Record<FlowerCategory, string> = {
  [FlowerCategory.Succulent]: '多肉',
  [FlowerCategory.Herbaceous]: '草本',
  [FlowerCategory.Woody]: '木本',
  [FlowerCategory.Hydroponic]: '水培',
  [FlowerCategory.Vine]: '藤蔓',
}

const FLOWER_PLACEMENT_LABEL_MAP: Record<FlowerPlacement, string> = {
  [FlowerPlacement.IndoorBalcony]: '阳台',
  [FlowerPlacement.OutdoorOpenAir]: '户外',
  [FlowerPlacement.IndoorShade]: '室内散光',
}

const FLOWER_DIFFICULTY_LABEL_MAP: Record<FlowerCareDifficulty, string> = {
  [FlowerCareDifficulty.Easy]: '轻松',
  [FlowerCareDifficulty.Medium]: '适中',
  [FlowerCareDifficulty.Hard]: '进阶',
}

const FLOWER_STATUS_LABEL_MAP: Record<FlowerHealthStatus, string> = {
  'watering-needed': '缺水',
  healthy: '正常',
  dormant: '休眠',
  'fertilizing-needed': '需施肥',
}

export function getFlowerCategoryLabel(category: FlowerCategory): string {
  return FLOWER_CATEGORY_LABEL_MAP[category]
}

export function getFlowerPlacementLabel(placement: FlowerPlacement): string {
  return FLOWER_PLACEMENT_LABEL_MAP[placement]
}

export function getFlowerCareDifficultyLabel(difficulty: FlowerCareDifficulty): string {
  return FLOWER_DIFFICULTY_LABEL_MAP[difficulty]
}

export function getFlowerHealthStatusLabel(status: FlowerHealthStatus): string {
  return FLOWER_STATUS_LABEL_MAP[status]
}

export function createCurrentFlowerCareTime(): string {
  const currentDate = new Date()
  const year = String(currentDate.getFullYear())
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  const day = String(currentDate.getDate()).padStart(2, '0')
  const hours = String(currentDate.getHours()).padStart(2, '0')
  const minutes = String(currentDate.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export function createDefaultFlowerFormValues(): FlowerFormValues {
  return {
    name: '',
    nickname: '',
    category: FlowerCategory.Herbaceous,
    customCategoryId: undefined,
    placement: FlowerPlacement.IndoorBalcony,
    customPlacementId: undefined,
    careDifficulty: FlowerCareDifficulty.Easy,
    customCareDifficultyId: undefined,
    careStatus: 'healthy',
    customCareStatusId: undefined,
    coverImageId: undefined,
    note: '',
    images: [],
    lastWateredAt: '',
    lastFertilizedAt: '',
  }
}
