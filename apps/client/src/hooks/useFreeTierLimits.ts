import { computed, reactive, ref } from 'vue'
import { useEncryptedStorage } from '@/hooks/useEncryptedStorage'
import { DAILY_FREE_AI_CONSULTATION_LIMIT, DAILY_FREE_AI_WEATHER_ADVICE_LIMIT, MAX_FREE_PHOTO_UPLOADS } from '@/interfaces'

interface DailyUsage {
  dateKey: string // YYYY-MM-DD
  usedCount: number
}

interface FreeTierUsage {
  aiWeatherAdvice: DailyUsage
  aiConsultation: DailyUsage
  photoUploads: number // total, not daily
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function createInitialUsage(): FreeTierUsage {
  return {
    aiWeatherAdvice: { dateKey: todayKey(), usedCount: 0 },
    aiConsultation: { dateKey: todayKey(), usedCount: 0 },
    photoUploads: 0,
  }
}

/**
 * 统一使用限额追踪（所有用户均适用）
 *
 * - AI 天气建议（诊断 + 出差方案）：2 次/天
 * - AI 养护咨询（花园建议 + 单株咨询）：1 次/天
 * - 照片上传：共 5 张
 */
export function useFreeTierLimits() {
  const usageStorage = useEncryptedStorage<FreeTierUsage>('free-tier-usage')

  const usage = reactive<FreeTierUsage>(usageStorage.getValue() ?? createInitialUsage())

  function persist(): void {
    usageStorage.setValue({ ...usage })
  }

  /** 重置过期日期的计数器 */
  function resetDailyIfNeeded(daily: DailyUsage): void {
    const key = todayKey()
    if (daily.dateKey !== key) {
      daily.dateKey = key
      daily.usedCount = 0
    }
  }

  // ── AI 天气建议 ──

  const weatherAdviceRemaining = computed(() => {
    resetDailyIfNeeded(usage.aiWeatherAdvice)
    return Math.max(0, DAILY_FREE_AI_WEATHER_ADVICE_LIMIT - usage.aiWeatherAdvice.usedCount)
  })

  const weatherAdviceExceeded = computed(() => weatherAdviceRemaining.value <= 0)

  function recordWeatherAdviceUse(): void {
    resetDailyIfNeeded(usage.aiWeatherAdvice)
    usage.aiWeatherAdvice.usedCount += 1
    persist()
  }

  // ── AI 养护咨询 ──

  const consultationRemaining = computed(() => {
    resetDailyIfNeeded(usage.aiConsultation)
    return Math.max(0, DAILY_FREE_AI_CONSULTATION_LIMIT - usage.aiConsultation.usedCount)
  })

  const consultationExceeded = computed(() => consultationRemaining.value <= 0)

  function recordConsultationUse(): void {
    resetDailyIfNeeded(usage.aiConsultation)
    usage.aiConsultation.usedCount += 1
    persist()
  }

  // ── 照片上传 ──

  const photoUploadsRemaining = computed(() => Math.max(0, MAX_FREE_PHOTO_UPLOADS - usage.photoUploads))

  const photoUploadsExceeded = computed(() => photoUploadsRemaining.value <= 0)

  function recordPhotoUpload(): void {
    usage.photoUploads += 1
    persist()
  }

  // ── 统一查询 ──

  function refreshFromStorage(): void {
    const stored = usageStorage.getValue()
    if (stored) {
      Object.assign(usage, stored)
    }
  }

  return {
    usage,
    weatherAdviceRemaining,
    weatherAdviceExceeded,
    recordWeatherAdviceUse,
    consultationRemaining,
    consultationExceeded,
    recordConsultationUse,
    photoUploadsRemaining,
    photoUploadsExceeded,
    recordPhotoUpload,
    refreshFromStorage,
  }
}
