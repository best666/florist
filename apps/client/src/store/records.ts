import { RecordActionType, type IImageAsset } from '@florist/contracts'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { createRecord, fetchRecordCenter, syncRecordsBatch, undoRecord as undoRecordApi } from '@/api/records'
import type { LocalRecord, RecordFormValues, RecordUndoLog } from '@/interfaces'
import {
  cloneImages,
  createEntityId,
  hasRepeatedActionWithinHours,
  normalizeOptionalString,
  readAuthUserIdFromStorage,
  removeCachedImage,
} from '@/utils'
import { useFlowerStore } from './flowers'
import { useMemberStore } from './member'

interface RecordState {
  records: LocalRecord[]
  undoLogs: RecordUndoLog[]
  initialized: boolean
}

const RECORD_UNDO_WINDOW_MS = 5 * 60 * 1000
const RECORD_CENTER_FRESHNESS_MS = 8000

let recordCenterRequest: Promise<void> | null = null
let recordCenterLastLoadedAt = 0

function sortRecords(records: ReadonlyArray<LocalRecord>): LocalRecord[] {
  return [...records].sort((leftRecord, rightRecord) =>
    rightRecord.createdAt.localeCompare(leftRecord.createdAt),
  )
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
  await Promise.all(
    images.map(async (image) => {
      await removeCachedImage(image.url)

      if (image.compressedUrl) {
        await removeCachedImage(image.compressedUrl)
      }
    }),
  )
}

/**
 * 将服务器记录与本地记录合并，而不是直接覆盖。
 * - 两端都有同一 ID 的记录 → 保留服务器版本（记录创建后不可变）
 * - 仅服务器有的 → 添加到本地
 * - 仅本地有的 → 保留在本地
 */
function hydrateRecordCenter(state: RecordState, center: RecordState): void {
  const serverRecordMap = new Map<string, LocalRecord>()
  for (const r of center.records) serverRecordMap.set(r.id, r)

  const mergedMap = new Map<string, LocalRecord>()
  for (const r of state.records) mergedMap.set(r.id, r)

  for (const [id, serverRecord] of serverRecordMap) {
    mergedMap.set(id, serverRecord)
  }

  state.records = sortRecords([...mergedMap.values()])
  state.undoLogs = [...center.undoLogs].sort((leftLog, rightLog) =>
    rightLog.revertedAt.localeCompare(leftLog.revertedAt),
  )
}

function canUseCloudGarden(): boolean {
  const memberStore = useMemberStore()

  return Boolean(readAuthUserIdFromStorage()) && memberStore.hasCloudGardenAccess
}

export const useRecordStore = defineStore('records', {
  state: (): RecordState => ({
    records: [],
    undoLogs: [],
    initialized: false,
  }),
  getters: {
    sortedRecords: (state) => sortRecords(state.records),
    recentUndoLogs: (state) =>
      [...state.undoLogs].sort((leftLog, rightLog) =>
        rightLog.revertedAt.localeCompare(leftLog.revertedAt),
      ),
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
    async initializeRecordCenter(options?: { force?: boolean }): Promise<void> {
      const forceRefresh = options?.force ?? false

      if (!canUseCloudGarden()) {
        this.initialized = true
        return
      }

      if (!forceRefresh && recordCenterRequest) {
        return recordCenterRequest
      }

      if (
        !forceRefresh &&
        this.initialized &&
        Date.now() - recordCenterLastLoadedAt < RECORD_CENTER_FRESHNESS_MS
      ) {
        return
      }

      recordCenterRequest = (async () => {
        try {
          const center = await fetchRecordCenter()

          // 找出本地有但服务器没有的记录，推送到服务器
          const serverIds = new Set(center.records.map((r) => r.id))
          const localOnly = this.records.filter((r) => !serverIds.has(r.id))

          if (localOnly.length > 0) {
            const mergedCenter = await syncRecordsBatch(localOnly)
            hydrateRecordCenter(this, {
              records: mergedCenter.records,
              undoLogs: mergedCenter.undoLogs,
              initialized: true,
            })
          } else {
            hydrateRecordCenter(this, {
              records: center.records,
              undoLogs: center.undoLogs,
              initialized: true,
            })
          }

          recordCenterLastLoadedAt = Date.now()
        } catch {
          // 离线时保持本地加密缓存即可。
        }

        this.initialized = true
      })()

      try {
        await recordCenterRequest
      } finally {
        recordCenterRequest = null
      }
    },

    getRecordsByFlowerId(flowerId: string): LocalRecord[] {
      return this.sortedRecords.filter((record) => record.flowerId === flowerId)
    },

    getLatestActionRecord(flowerId: string, actionType: RecordActionType): LocalRecord | null {
      return (
        this.sortedRecords.find(
          (record) => record.flowerId === flowerId && record.actionType === actionType,
        ) ?? null
      )
    },

    isActionCoolingDown(
      flowerId: string,
      actionType: RecordActionType,
    ): { cooling: boolean; latestRecord: LocalRecord | null; remainingMinutes: number } {
      const latestRecord = this.getLatestActionRecord(flowerId, actionType)

      if (!latestRecord) {
        return {
          cooling: false,
          latestRecord: null,
          remainingMinutes: 0,
        }
      }

      const cooling = hasRepeatedActionWithinHours(
        this.records.map((record) => ({
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
      if (!canUseCloudGarden()) {
        const nextRecord = buildRecordEntity(values)
        this.records = sortRecords([nextRecord, ...this.records])
        recordCenterLastLoadedAt = Date.now()
        return nextRecord
      }

      try {
        const nextRecord = (await createRecord(values)) as LocalRecord
        this.records = sortRecords([nextRecord, ...this.records])
        recordCenterLastLoadedAt = Date.now()
        await useFlowerStore().initializeGarden({ force: true })
        return nextRecord
      } catch {
        const nextRecord = buildRecordEntity(values)
        this.records = sortRecords([nextRecord, ...this.records])
        recordCenterLastLoadedAt = Date.now()
        return nextRecord
      }
    },

    async undoRecord(recordId: string): Promise<boolean> {
      if (!canUseCloudGarden()) {
        const targetRecord = this.records.find((record) => record.id === recordId)

        if (!targetRecord) {
          return false
        }

        if (Date.now() - new Date(targetRecord.createdAt).getTime() > RECORD_UNDO_WINDOW_MS) {
          return false
        }

        this.records = this.records.filter((record) => record.id !== recordId)
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
        recordCenterLastLoadedAt = Date.now()
        return true
      }

      try {
        const response = await undoRecordApi(recordId)
        hydrateRecordCenter(this, {
          records: response.center.records,
          undoLogs: response.center.undoLogs,
          initialized: true,
        })
        recordCenterLastLoadedAt = Date.now()
        await useFlowerStore().initializeGarden({ force: true })
        return response.succeeded
      } catch {
        const targetRecord = this.records.find((record) => record.id === recordId)

        if (!targetRecord) {
          return false
        }

        if (Date.now() - new Date(targetRecord.createdAt).getTime() > RECORD_UNDO_WINDOW_MS) {
          return false
        }

        this.records = this.records.filter((record) => record.id !== recordId)
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
        recordCenterLastLoadedAt = Date.now()
        return true
      }
    },

    replaceLocalCenter(center: {
      records: ReadonlyArray<LocalRecord>
      undoLogs: ReadonlyArray<RecordUndoLog>
    }): void {
      hydrateRecordCenter(this, {
        records: [...center.records],
        undoLogs: [...center.undoLogs],
        initialized: true,
      })
      this.initialized = true
      recordCenterLastLoadedAt = Date.now()
    },

    async clearLocalRecords(): Promise<void> {
      await Promise.all(this.records.map(async (record) => releaseRecordImages(record.images)))
      this.records = []
      this.undoLogs = []
      this.initialized = true
      recordCenterLastLoadedAt = Date.now()
    },
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRecordStore, import.meta.hot))
}
