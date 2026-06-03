import type { IImageAsset } from '@florist/contracts'
import type { AppState } from '@/store/app'
import type { LocalFlower } from './flower-manager'
import type { RecordUndoLog, LocalRecord } from './record-manager'
import type { LocalReminderConfig } from './weather-reminder'
import type { PlantDoctorHistoryItem } from './plant-doctor'

export interface MineFeedbackItem {
  readonly id: string
  readonly content: string
  readonly images: ReadonlyArray<IImageAsset>
  readonly createdAt: string
}

export interface FloristLocalBackupPayload {
  readonly version: 'florist-local-backup-v1'
  readonly createdAt: string
  readonly appState: AppState
  readonly flowers: ReadonlyArray<LocalFlower>
  readonly recycleBin: ReadonlyArray<LocalFlower>
  readonly records: ReadonlyArray<LocalRecord>
  readonly undoLogs: ReadonlyArray<RecordUndoLog>
  readonly reminderConfig: LocalReminderConfig
  readonly plantDoctorHistory: ReadonlyArray<PlantDoctorHistoryItem>
  readonly mineFeedbacks: ReadonlyArray<MineFeedbackItem>
}

export interface MineStatisticsCard {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly hint: string
  readonly accentClass: string
  /** 点击时跳转的 tab 页面路径，不设置则不跳转 */
  readonly navigateTo?: string
}
