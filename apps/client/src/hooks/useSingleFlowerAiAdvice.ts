import { onBeforeUnmount, reactive } from 'vue'
import { fetchSingleFlowerAiCareAdvice } from '@/api'
import type {
  SingleFlowerAiAdviceContext,
  SingleFlowerAiAdviceState,
} from '@/interfaces'
import { debounce, throttle } from '@/utils'
import { getEncryptedStorage, setEncryptedStorage } from '@/utils/storage'

const DAILY_USAGE_KEY = 'ai-advice-daily-usage'
const DAILY_LIMIT_FREE = 1

interface DailyUsage {
  date: string
  count: number
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDailyUsage(): DailyUsage {
  const raw = getEncryptedStorage<DailyUsage>(DAILY_USAGE_KEY)
  const today = getTodayStr()

  if (raw && raw.date === today) {
    return raw
  }

  return { date: today, count: 0 }
}

function incrementDailyUsage(): DailyUsage {
  const usage = getDailyUsage()
  usage.count += 1
  setEncryptedStorage(DAILY_USAGE_KEY, usage)
  return usage
}

export function useSingleFlowerAiAdvice() {
  const state = reactive<SingleFlowerAiAdviceState>({
    advice: null,
    loading: false,
    latestMessage: '',
    disabled: false,
  })

  // 递增 token 实现竞态取消：新请求到来时旧请求的结果被自动丢弃
  let requestToken = 0

  async function executeRequest(context: SingleFlowerAiAdviceContext): Promise<void> {
    const currentToken = ++requestToken
    state.loading = true
    state.disabled = context.isOffline

    try {
      const advice = await fetchSingleFlowerAiCareAdvice(context)

      if (currentToken !== requestToken) {
        return
      }

      state.advice = advice
      state.latestMessage = advice.gentleFallbackMessage ?? ''
      state.disabled = false

      // 记录每日使用次数（仅在成功获取非缓存结果时）
      incrementDailyUsage()
    }
    catch (error) {
      if (currentToken !== requestToken) {
        return
      }

      state.advice = null
      state.latestMessage = error instanceof Error
        ? error.message
        : 'AI 建议刚刚没有顺利生成，先按今天的天气和盆土状态照顾它也完全可以。'
      state.disabled = context.isOffline
    }
    finally {
      if (currentToken === requestToken) {
        state.loading = false
      }
    }
  }

  const debouncedFetch = debounce((context: SingleFlowerAiAdviceContext) => {
    void executeRequest(context)
  }, 3000)

  const throttledRefresh = throttle((context: SingleFlowerAiAdviceContext) => {
    void executeRequest(context)
  }, 3000)

  function scheduleFetch(context: SingleFlowerAiAdviceContext | null): void {
    if (!context) {
      debouncedFetch.cancel()
      state.advice = null
      state.loading = false
      state.latestMessage = ''
      state.disabled = false
      return
    }

    debouncedFetch(context)
  }

  function refreshNow(context: SingleFlowerAiAdviceContext | null): void {
    if (!context) {
      return
    }

    throttledRefresh(context)
  }

  /** 检查今日是否还有使用次数 */
  function canUseToday(): boolean {
    return getDailyUsage().count < DAILY_LIMIT_FREE
  }

  /** 获取今日已使用次数 */
  function todayUsedCount(): number {
    return getDailyUsage().count
  }

  onBeforeUnmount(() => {
    debouncedFetch.cancel()
    throttledRefresh.cancel()
  })

  return {
    state,
    scheduleFetch,
    refreshNow,
    canUseToday,
    todayUsedCount,
  }
}
