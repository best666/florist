import { onBeforeUnmount, reactive } from 'vue'
import { fetchSingleFlowerAiCareAdvice } from '@/api'
import type {
  SingleFlowerAiAdviceContext,
  SingleFlowerAiAdviceState,
} from '@/interfaces'
import { debounce, throttle } from '@/utils'

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

  onBeforeUnmount(() => {
    debouncedFetch.cancel()
    throttledRefresh.cancel()
  })

  return {
    state,
    scheduleFetch,
    refreshNow,
  }
}
