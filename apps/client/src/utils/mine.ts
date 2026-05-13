import type { IImageAsset } from '@florist/contracts'
import type { AppState } from '@/store/app'
import type {
  FloristLocalBackupPayload,
  LocalFlower,
  LocalRecord,
  LocalReminderConfig,
  MineFeedbackItem,
  PlantDoctorHistoryItem,
  RecordUndoLog,
} from '@/interfaces'
import { DEFAULT_LOCAL_REMINDER_CONFIG } from '@/interfaces'
import { decryptTextByAes, encryptTextByAes } from './crypto'
import { getStorageAesKey } from './env'
import { clearEncryptedStorage, getEncryptedStorage, removeEncryptedStorage, setEncryptedStorage } from './storage'

const LOCAL_BACKUP_PREFIX = 'FLORIST_BACKUP_V1'
const REMINDER_CACHE_KEY = 'weather-reminder-config'
const PLANT_DOCTOR_HISTORY_KEY = 'plant-doctor-history'
const PLANT_DOCTOR_USAGE_KEY = 'plant-doctor-usage'
const PLANT_DOCTOR_NAMESPACE = 'plant-doctor'
const MINE_FEEDBACK_KEY = 'mine-feedback-history'
const MINE_NAMESPACE = 'mine'

function toSerializableImages(images: ReadonlyArray<IImageAsset>): IImageAsset[] {
  return images.map(image => ({ ...image }))
}

export function createMineEntityId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildLocalBackupPayload(input: {
  appState: AppState
  flowers: ReadonlyArray<LocalFlower>
  recycleBin: ReadonlyArray<LocalFlower>
  records: ReadonlyArray<LocalRecord>
  undoLogs: ReadonlyArray<RecordUndoLog>
  reminderConfig: LocalReminderConfig
  plantDoctorHistory: ReadonlyArray<PlantDoctorHistoryItem>
  mineFeedbacks: ReadonlyArray<MineFeedbackItem>
}): FloristLocalBackupPayload {
  return {
    version: 'florist-local-backup-v1',
    createdAt: new Date().toISOString(),
    appState: { ...input.appState },
    flowers: input.flowers.map(flower => ({
      ...flower,
      images: toSerializableImages(flower.images),
    })),
    recycleBin: input.recycleBin.map(flower => ({
      ...flower,
      images: toSerializableImages(flower.images),
    })),
    records: input.records.map(record => ({
      ...record,
      images: toSerializableImages(record.images),
    })),
    undoLogs: input.undoLogs.map(log => ({ ...log })),
    reminderConfig: {
      ...input.reminderConfig,
      quietHours: {
        ...input.reminderConfig.quietHours,
      },
    },
    plantDoctorHistory: input.plantDoctorHistory.map(item => ({
      ...item,
      ...(item.image ? { image: { ...item.image } } : {}),
    })),
    mineFeedbacks: input.mineFeedbacks.map(item => ({
      ...item,
      images: toSerializableImages(item.images),
    })),
  }
}

export function encodeLocalBackup(payload: FloristLocalBackupPayload): string {
  const cipherText = encryptTextByAes(JSON.stringify(payload), {
    secretKey: getStorageAesKey(),
  })

  if (!cipherText) {
    throw new Error('本地备份加密失败，请稍后再试。')
  }

  return `${LOCAL_BACKUP_PREFIX}:${cipherText}`
}

export function decodeLocalBackup(serializedBackup: string): FloristLocalBackupPayload {
  const normalizedBackup = serializedBackup.trim()

  if (!normalizedBackup.startsWith(`${LOCAL_BACKUP_PREFIX}:`)) {
    throw new Error('这份备份内容格式不对，确认完整复制后再导入。')
  }

  const cipherText = normalizedBackup.slice(`${LOCAL_BACKUP_PREFIX}:`.length)
  const plainText = decryptTextByAes(cipherText, {
    secretKey: getStorageAesKey(),
  })

  if (!plainText) {
    throw new Error('备份内容解密失败，可能已经损坏或不是当前环境生成的。')
  }

  const parsedPayload = JSON.parse(plainText) as FloristLocalBackupPayload

  if (parsedPayload.version !== 'florist-local-backup-v1') {
    throw new Error('暂不支持这份备份版本，请更新应用后再试。')
  }

  return parsedPayload
}

export function readReminderConfigFromStorage(): LocalReminderConfig {
  return getEncryptedStorage<LocalReminderConfig>(REMINDER_CACHE_KEY)
    ?? { ...DEFAULT_LOCAL_REMINDER_CONFIG }
}

export function writeReminderConfigToStorage(config: LocalReminderConfig): void {
  setEncryptedStorage(REMINDER_CACHE_KEY, config)
}

export function readPlantDoctorHistoryFromStorage(): ReadonlyArray<PlantDoctorHistoryItem> {
  return getEncryptedStorage<ReadonlyArray<PlantDoctorHistoryItem>>(PLANT_DOCTOR_HISTORY_KEY, {
    namespace: PLANT_DOCTOR_NAMESPACE,
  }) ?? []
}

export function writePlantDoctorHistoryToStorage(history: ReadonlyArray<PlantDoctorHistoryItem>): void {
  setEncryptedStorage(PLANT_DOCTOR_HISTORY_KEY, history, {
    namespace: PLANT_DOCTOR_NAMESPACE,
  })
}

export function clearPlantDoctorStorage(): void {
  removeEncryptedStorage(PLANT_DOCTOR_HISTORY_KEY, {
    namespace: PLANT_DOCTOR_NAMESPACE,
  })
  removeEncryptedStorage(PLANT_DOCTOR_USAGE_KEY, {
    namespace: PLANT_DOCTOR_NAMESPACE,
  })
}

export function readMineFeedbackHistory(): ReadonlyArray<MineFeedbackItem> {
  return getEncryptedStorage<ReadonlyArray<MineFeedbackItem>>(MINE_FEEDBACK_KEY, {
    namespace: MINE_NAMESPACE,
  }) ?? []
}

export function writeMineFeedbackHistory(history: ReadonlyArray<MineFeedbackItem>): void {
  setEncryptedStorage(MINE_FEEDBACK_KEY, history, {
    namespace: MINE_NAMESPACE,
  })
}

export function clearMineStorage(): void {
  clearEncryptedStorage(MINE_NAMESPACE)
}
