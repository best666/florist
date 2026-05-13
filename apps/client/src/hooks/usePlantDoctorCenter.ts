import { reactive } from 'vue'
import type {
  PlantDoctorCenterState,
  PlantDoctorHistoryItem,
  PlantDoctorUsageQuota,
} from '@/interfaces'
import {
  DAILY_FREE_PLANT_DIAGNOSIS_LIMIT,
  MAX_PLANT_DOCTOR_HISTORY_COUNT,
} from '@/interfaces'
import { getEncryptedStorage, setEncryptedStorage } from '@/utils/storage'

interface PlantDoctorUsageCache {
  readonly dateKey: string
  readonly usedCount: number
}

const PLANT_DOCTOR_HISTORY_KEY = 'plant-doctor-history'
const PLANT_DOCTOR_USAGE_KEY = 'plant-doctor-usage'
const PLANT_DOCTOR_NAMESPACE = 'plant-doctor'

function createDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function createQuotaStatus(cache: PlantDoctorUsageCache | null, isMemberUnlimited: boolean): PlantDoctorUsageQuota {
  const dateKey = createDateKey()
  const usedCount = cache && cache.dateKey === dateKey ? cache.usedCount : 0
  const remainingCount = isMemberUnlimited
    ? DAILY_FREE_PLANT_DIAGNOSIS_LIMIT
    : Math.max(DAILY_FREE_PLANT_DIAGNOSIS_LIMIT - usedCount, 0)

  return {
    dateKey,
    usedCount,
    freeLimit: DAILY_FREE_PLANT_DIAGNOSIS_LIMIT,
    remainingCount,
    isMemberUnlimited,
    exceeded: !isMemberUnlimited && usedCount >= DAILY_FREE_PLANT_DIAGNOSIS_LIMIT,
  }
}

function readHistory(): ReadonlyArray<PlantDoctorHistoryItem> {
  return getEncryptedStorage<ReadonlyArray<PlantDoctorHistoryItem>>(PLANT_DOCTOR_HISTORY_KEY, {
    namespace: PLANT_DOCTOR_NAMESPACE,
  }) ?? []
}

function writeHistory(history: ReadonlyArray<PlantDoctorHistoryItem>): void {
  setEncryptedStorage(PLANT_DOCTOR_HISTORY_KEY, history, {
    namespace: PLANT_DOCTOR_NAMESPACE,
  })
}

function readUsageCache(): PlantDoctorUsageCache | null {
  return getEncryptedStorage<PlantDoctorUsageCache>(PLANT_DOCTOR_USAGE_KEY, {
    namespace: PLANT_DOCTOR_NAMESPACE,
  })
}

function writeUsageCache(cache: PlantDoctorUsageCache): void {
  setEncryptedStorage(PLANT_DOCTOR_USAGE_KEY, cache, {
    namespace: PLANT_DOCTOR_NAMESPACE,
  })
}

export function usePlantDoctorCenter() {
  const state = reactive<PlantDoctorCenterState>({
    history: readHistory(),
    quota: createQuotaStatus(readUsageCache(), false),
    latestLimitMessage: '',
  })

  function refreshQuota(): PlantDoctorUsageQuota {
    state.quota = createQuotaStatus(readUsageCache(), state.quota.isMemberUnlimited)
    return state.quota
  }

  function canUseDiagnosis(): boolean {
    const quota = refreshQuota()

    if (!quota.exceeded) {
      state.latestLimitMessage = ''
      return true
    }

    state.latestLimitMessage = '今天免费的 3 次识别已经用完啦。会员可继续使用更多 AI 识别次数，也能把更完整的托管建议一起带走。'
    return false
  }

  function markDiagnosisUsed(): PlantDoctorUsageQuota {
    const quota = refreshQuota()

    if (quota.isMemberUnlimited) {
      return quota
    }

    const nextCache: PlantDoctorUsageCache = {
      dateKey: quota.dateKey,
      usedCount: quota.usedCount + 1,
    }

    writeUsageCache(nextCache)
    state.quota = createQuotaStatus(nextCache, quota.isMemberUnlimited)
    return state.quota
  }

  function appendHistory(item: PlantDoctorHistoryItem): void {
    const nextHistory = [item, ...state.history].slice(0, MAX_PLANT_DOCTOR_HISTORY_COUNT)
    state.history = nextHistory
    writeHistory(nextHistory)
  }

  function clearHistory(): void {
    state.history = []
    writeHistory([])
  }

  return {
    state,
    refreshQuota,
    canUseDiagnosis,
    markDiagnosisUsed,
    appendHistory,
    clearHistory,
  }
}
