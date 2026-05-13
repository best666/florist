export interface DebouncedFunction<TArgs extends ReadonlyArray<unknown>> {
  (...args: TArgs): void
  cancel: () => void
}

export interface ThrottledFunction<TArgs extends ReadonlyArray<unknown>> {
  (...args: TArgs): void
  cancel: () => void
}

export interface SubmitGuardOptions {
  /**
   * 已有请求执行中时的处理模式。
   */
  readonly mode?: 'drop' | 'reuse'
}

export function debounce<TArgs extends ReadonlyArray<unknown>>(
  handler: (...args: TArgs) => void,
  delay = 300,
): DebouncedFunction<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null

  const wrapped = (...args: TArgs): void => {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      handler(...args)
      timer = null
    }, delay)
  }

  wrapped.cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return wrapped
}

export function throttle<TArgs extends ReadonlyArray<unknown>>(
  handler: (...args: TArgs) => void,
  wait = 300,
): ThrottledFunction<TArgs> {
  let lastInvokeTime = 0
  let trailingTimer: ReturnType<typeof setTimeout> | null = null

  const wrapped = (...args: TArgs): void => {
    const now = Date.now()
    const remaining = wait - (now - lastInvokeTime)

    if (remaining <= 0) {
      if (trailingTimer) {
        clearTimeout(trailingTimer)
        trailingTimer = null
      }

      lastInvokeTime = now
      handler(...args)
      return
    }

    if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        lastInvokeTime = Date.now()
        trailingTimer = null
        handler(...args)
      }, remaining)
    }
  }

  wrapped.cancel = (): void => {
    if (trailingTimer) {
      clearTimeout(trailingTimer)
      trailingTimer = null
    }
  }

  return wrapped
}

export function createSubmitGuard<TArgs extends ReadonlyArray<unknown>, TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
  options?: SubmitGuardOptions,
): (...args: TArgs) => Promise<TResult | null> {
  let pendingPromise: Promise<TResult> | null = null

  return async (...args: TArgs): Promise<TResult | null> => {
    if (pendingPromise) {
      return options?.mode === 'reuse' ? pendingPromise : null
    }

    pendingPromise = handler(...args)

    try {
      return await pendingPromise
    }
    finally {
      pendingPromise = null
    }
  }
}
