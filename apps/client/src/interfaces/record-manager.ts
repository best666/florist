import type { IImageAsset, IRecord, IsoDateTimeString } from '@florist/contracts'
import { RecordActionType } from '@florist/contracts'
import type { KeyValueOption } from './base'
import type { SoftTone } from './components'

export interface RecordFormValues {
  flowerId: string
  actionType: RecordActionType
  note: string
  images: IImageAsset[]
  cooldownMinutes: number
}

export const DEFAULT_RECORD_ACTION_TYPE = RecordActionType.Watering

export interface LocalRecord extends IRecord {
  cooldownMinutes: number
}

export interface RecordUndoLog {
  readonly id: string
  readonly recordId: string
  readonly flowerId: string
  readonly actionType: RecordActionType
  readonly revertedAt: IsoDateTimeString
  readonly originalCreatedAt: IsoDateTimeString
  readonly note?: string
}

export interface RecordActionOption {
  readonly value: RecordActionType
  readonly label: string
  readonly emoji: string
  readonly tone: SoftTone
  readonly description: string
}

export const RECORD_ACTION_OPTIONS: ReadonlyArray<RecordActionOption> = [
  {
    value: RecordActionType.Watering,
    label: '浇水',
    emoji: '💧',
    tone: 'mint',
    description: '给叶片和土壤一点柔软补水。',
  },
  {
    value: RecordActionType.Fertilizing,
    label: '施肥',
    emoji: '🌾',
    tone: 'cream',
    description: '补一点养分，让小植物慢慢长。',
  },
  {
    value: RecordActionType.Pruning,
    label: '修剪',
    emoji: '✂️',
    tone: 'blush',
    description: '轻轻修一修，帮助它更精神。',
  },
  {
    value: RecordActionType.Repotting,
    label: '换盆',
    emoji: '🪴',
    tone: 'cream',
    description: '换个舒展的新家，让根系透透气。',
  },
  {
    value: RecordActionType.PestControl,
    label: '除虫',
    emoji: '🐞',
    tone: 'slate',
    description: '把小麻烦赶走，叶片更安心。',
  },
  {
    value: RecordActionType.LeafCleaning,
    label: '擦叶',
    emoji: '🍃',
    tone: 'mint',
    description: '擦掉灰尘，让叶子重新发亮。',
  },
] as const

export const RECORD_COOLDOWN_PRESET_OPTIONS: ReadonlyArray<KeyValueOption<number>> = [
  { label: '30 分钟', value: 30 },
  { label: '1 小时', value: 60 },
  { label: '3 小时', value: 180 },
  { label: '6 小时', value: 360 },
  { label: '12 小时', value: 720 },
] as const

const RECORD_ACTION_LABEL_MAP: Record<RecordActionType, string> = {
  [RecordActionType.Watering]: '浇水',
  [RecordActionType.Fertilizing]: '施肥',
  [RecordActionType.Pruning]: '修剪',
  [RecordActionType.Repotting]: '换盆',
  [RecordActionType.PestControl]: '除虫',
  [RecordActionType.LeafCleaning]: '擦叶',
  [RecordActionType.LightAdjustment]: '调光',
}

export function createDefaultRecordFormValues(): RecordFormValues {
  return {
    flowerId: '',
    actionType: DEFAULT_RECORD_ACTION_TYPE,
    note: '',
    images: [],
    cooldownMinutes: 10,
  }
}

export function getRecordActionLabel(actionType: RecordActionType): string {
  return RECORD_ACTION_LABEL_MAP[actionType]
}

export function getRecordActionMeta(actionType: RecordActionType): RecordActionOption {
  return RECORD_ACTION_OPTIONS.find(option => option.value === actionType)
    ?? {
      value: DEFAULT_RECORD_ACTION_TYPE,
      label: '浇水',
      emoji: '💧',
      tone: 'mint',
      description: '给叶片和土壤一点柔软补水。',
    }
}
