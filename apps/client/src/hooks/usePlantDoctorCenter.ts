import { reactive } from 'vue'
import type {
  PlantDoctorCenterState,
  PlantDoctorHistoryItem,
  PlantDoctorUsageQuota,
} from '@/interfaces'
import {
  DAILY_FREE_AI_WEATHER_ADVICE_LIMIT,
  MAX_PLANT_DOCTOR_HISTORY_COUNT,
} from '@/interfaces'
import { useFreeTierLimits } from '@/hooks/useFreeTierLimits'
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

function createQuotaStatus(cache: PlantDoctorUsageCache | null): PlantDoctorUsageQuota {
  const dateKey = createDateKey()
  const usedCount = cache && cache.dateKey === dateKey ? cache.usedCount : 0

  return {
    dateKey,
    usedCount,
    freeLimit: DAILY_FREE_AI_WEATHER_ADVICE_LIMIT,
    remainingCount: Math.max(DAILY_FREE_AI_WEATHER_ADVICE_LIMIT - usedCount, 0),
    isMemberUnlimited: false,
    exceeded: usedCount >= DAILY_FREE_AI_WEATHER_ADVICE_LIMIT,
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

/**
 * 植物医生中心 — 免费层限额管理
 *
 * AI 天气建议（诊断 + 出差方案）：2 次/天
 */
export function usePlantDoctorCenter() {
  const freeTier = useFreeTierLimits()

  const state = reactive<PlantDoctorCenterState>({
    history: readHistory(),
    quota: createQuotaStatus(readUsageCache()),
    latestLimitMessage: '',
  })

  function refreshQuota(): PlantDoctorUsageQuota {
    freeTier.refreshFromStorage()
    state.quota = createQuotaStatus(readUsageCache())
    return state.quota
  }

  function canUseDiagnosis(): boolean {
    const quota = refreshQuota()

    if (!quota.exceeded) {
      state.latestLimitMessage = ''
      return true
    }

    state.latestLimitMessage = `今天的 ${DAILY_FREE_AI_WEATHER_ADVICE_LIMIT} 次免费 AI 识别已经用完啦，明天再来试试吧。`
    return false
  }

  function markDiagnosisUsed(): PlantDoctorUsageQuota {
    const quota = refreshQuota()

    const nextCache: PlantDoctorUsageCache = {
      dateKey: quota.dateKey,
      usedCount: quota.usedCount + 1,
    }

    writeUsageCache(nextCache)
    freeTier.recordWeatherAdviceUse()
    state.quota = createQuotaStatus(nextCache)
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
