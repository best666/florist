import { RecordActionType, type IImageAsset } from '@florist/contracts'
import { defineStore } from 'pinia'
import type { LocalRecord, RecordFormValues, RecordUndoLog } from '@/interfaces'
import { hasRepeatedActionWithinHours, removeCachedImage } from '@/utils'

interface RecordState {
  records: LocalRecord[]
  undoLogs: RecordUndoLog[]
  initialized: boolean
}

const RECORD_UNDO_WINDOW_MS = 5 * 60 * 1000

function createEntityId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sortRecords(records: ReadonlyArray<LocalRecord>): LocalRecord[] {
  return [...records].sort((leftRecord, rightRecord) => (
    rightRecord.createdAt.localeCompare(leftRecord.createdAt)
  ))
}

function cloneImages(images: ReadonlyArray<IImageAsset>): IImageAsset[] {
  return images.map(image => ({ ...image }))
}

function normalizeOptionalString(value: string): string | undefined {
  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : undefined
}

function buildRecordEntity(values: RecordFormValues): LocalRecord {
  const note = normalizeOptionalString(values.note)

  return {
    id: createEntityId('record'),
    flowerId: values.flowerId,
    actionType: values.actionType,
    ...(note ? { note } : {}),
    images: cloneImages(values.images),
    createdAt: new Date().toISOString(),
    cooldownMinutes: values.cooldownMinutes,
  }
}

async function releaseRecordImages(images: ReadonlyArray<IImageAsset>): Promise<void> {
  await Promise.all(images.map(async image => {
    await removeCachedImage(image.url)

    if (image.compressedUrl) {
      await removeCachedImage(image.compressedUrl)
    }
  }))
}

export const useRecordStore = defineStore(
  'records',
  {
    state: (): RecordState => ({
      records: [],
      undoLogs: [],
      initialized: false,
    }),
    getters: {
      sortedRecords: state => sortRecords(state.records),
      recentUndoLogs: state => [...state.undoLogs].sort((leftLog, rightLog) => (
        rightLog.revertedAt.localeCompare(leftLog.revertedAt)
      )),
      latestUndoableRecord(): LocalRecord | null {
        const latestRecord = this.sortedRecords[0]

        if (!latestRecord) {
          return null
        }

        return Date.now() - new Date(latestRecord.createdAt).getTime() <= RECORD_UNDO_WINDOW_MS
          ? latestRecord
          : null
      },
    },
    actions: {
      async initializeRecordCenter(): Promise<void> {
        this.initialized = true
      },

      getRecordsByFlowerId(flowerId: string): LocalRecord[] {
        return this.sortedRecords.filter(record => record.flowerId === flowerId)
      },

      getLatestActionRecord(flowerId: string, actionType: RecordActionType): LocalRecord | null {
        return this.sortedRecords.find(
          record => record.flowerId === flowerId && record.actionType === actionType,
        ) ?? null
      },

      isActionCoolingDown(
        flowerId: string,
        actionType: RecordActionType,
      ): { cooling: boolean, latestRecord: LocalRecord | null, remainingMinutes: number } {
        const latestRecord = this.getLatestActionRecord(flowerId, actionType)

        if (!latestRecord) {
          return {
            cooling: false,
            latestRecord: null,
            remainingMinutes: 0,
          }
        }

        const cooling = hasRepeatedActionWithinHours(
          this.records.map(record => ({
            targetId: record.flowerId,
            actionType: record.actionType,
            createdAt: record.createdAt,
          })),
          {
            targetId: flowerId,
            actionType,
            withinHours: latestRecord.cooldownMinutes / 60,
          },
        )

        if (!cooling) {
          return {
            cooling: false,
            latestRecord,
            remainingMinutes: 0,
          }
        }

        const elapsedMinutes = (Date.now() - new Date(latestRecord.createdAt).getTime()) / 60000

        return {
          cooling: true,
          latestRecord,
          remainingMinutes: Math.max(Math.ceil(latestRecord.cooldownMinutes - elapsedMinutes), 1),
        }
      },

      async addRecord(values: RecordFormValues): Promise<LocalRecord> {
        const nextRecord = buildRecordEntity(values)
        this.records = sortRecords([nextRecord, ...this.records])
        return nextRecord
      },

      async undoRecord(recordId: string): Promise<boolean> {
        const targetRecord = this.records.find(record => record.id === recordId)

        if (!targetRecord) {
          return false
        }

        if (Date.now() - new Date(targetRecord.createdAt).getTime() > RECORD_UNDO_WINDOW_MS) {
          return false
        }

        this.records = this.records.filter(record => record.id !== recordId)
        this.undoLogs = [
          {
            id: createEntityId('undo'),
            recordId: targetRecord.id,
            flowerId: targetRecord.flowerId,
            actionType: targetRecord.actionType,
            revertedAt: new Date().toISOString(),
            originalCreatedAt: targetRecord.createdAt,
            ...(targetRecord.note ? { note: targetRecord.note } : {}),
          },
          ...this.undoLogs,
        ]

        await releaseRecordImages(targetRecord.images)
        return true
      },
    },
    persist: true,
  },
)
