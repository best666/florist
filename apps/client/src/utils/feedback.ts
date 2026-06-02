export interface GentleToastOptions {
  title: string
  icon?: 'none' | 'success'
  duration?: number
}

export interface GentleConfirmOptions {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

const DEFAULT_GENTLE_MESSAGE = '先稍等一下，我们再轻轻试一次。'

export function normalizeGentleMessage(message: string, fallback = DEFAULT_GENTLE_MESSAGE): string {
  const normalizedMessage = message.trim()

  if (!normalizedMessage) {
    return fallback
  }

  return normalizedMessage.slice(0, 60)
}

export function showGentleToast(options: GentleToastOptions | string): void {
  const normalizedOptions = typeof options === 'string'
    ? {
        title: options,
      }
    : options

  uni.showToast({
    title: normalizeGentleMessage(normalizedOptions.title),
    icon: normalizedOptions.icon ?? 'none',
    duration: normalizedOptions.duration ?? 2400,
  })
}

export function showGentleSuccess(message: string): void {
  showGentleToast({
    title: message,
    icon: 'success',
  })
}

export function showGentleConfirm(options: GentleConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: options.title ?? '再确认一下下',
      content: normalizeGentleMessage(options.content, '这一步还需要你点一下确认。'),
      confirmText: options.confirmText ?? '继续试试',
      cancelText: options.cancelText ?? '先等等',
      showCancel: options.showCancel ?? true,
      success: result => resolve(Boolean(result.confirm)),
      fail: () => resolve(false),
    })
  })
}

/** 从 unknown error 中提取可读消息 */
export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** catch 块统一处理：提取错误消息 + toast */
export function handleCatchAndToast(error: unknown, fallback: string): void {
  showGentleToast(toErrorMessage(error, fallback))
}
