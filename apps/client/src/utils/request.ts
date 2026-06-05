import type {
  ErrorInterceptor,
  MaybeApiResponse,
  RequestBody,
  RequestError,
  RequestInterceptor,
  RequestOptions,
  RequestQuery,
  RequestQueryValue,
  RequestRetryOptions,
  ResolvedRequestOptions,
  ResponseInterceptor,
} from '@/interfaces'
import { RequestErrorCode, RequestMethod } from '@/interfaces'
import { readAuthUserIdFromStorage } from './auth-session'
import { normalizeGentleMessage, showGentleConfirm, showGentleToast } from './feedback'
import { getApiBaseUrl, shouldUseProxy } from './env'
import { getRuntimePlatform } from './platform'

const DEFAULT_TIMEOUT = 15000
const DEFAULT_LOADING_TEXT = '加载中'
const DEFAULT_RETRY_DELAY_MS = 1200

const pendingTaskMap = new Map<string, UniApp.RequestTask>()
const requestInterceptors: RequestInterceptor[] = []
const responseInterceptors: ResponseInterceptor[] = []
const errorInterceptors: ErrorInterceptor[] = []

let initialized = false
let loadingCount = 0

function isSuccessfulApiCode(code: MaybeApiResponse<unknown>['code']): boolean {
  return code === 0 || code === 200 || code === 'OK'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(key => `"${key}":${stableStringify(value[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value) ?? 'null'
}

function encodeQueryValue(value: Exclude<RequestQueryValue, undefined>): string {
  if (Array.isArray(value)) {
    return value.map(item => encodeURIComponent(String(item ?? ''))).join(',')
  }

  return encodeURIComponent(String(value ?? ''))
}

function buildQueryString(params?: RequestQuery): string {
  if (!params) {
    return ''
  }

  const search = Object.entries(params)
    .filter(
      (
        entry,
      ): entry is [string, Exclude<RequestQueryValue, undefined | null>] =>
        entry[1] !== undefined && entry[1] !== null,
    )
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeQueryValue(value)}`)
    .join('&')

  return search
}

function normalizeUrl(url: string, params?: RequestQuery): string {
  const queryString = buildQueryString(params)
  const requestPath = url.startsWith('http')
    ? url
    : shouldUseProxy() && getRuntimePlatform() === 'h5'
      ? `${import.meta.env.VITE_APP_PROXY_PREFIX}${url}`
      : `${getApiBaseUrl()}${url}`

  if (queryString.length === 0) {
    return requestPath
  }

  return `${requestPath}${requestPath.includes('?') ? '&' : '?'}${queryString}`
}

function buildRequestKey(options: ResolvedRequestOptions): string {
  return [
    options.method,
    options.url,
    stableStringify(options.data),
  ].join('::')
}

function showGlobalLoading(loadingText: string): void {
  loadingCount += 1

  if (loadingCount === 1) {
    uni.showLoading({
      title: loadingText,
      mask: true,
    })
  }
}

function hideGlobalLoading(): void {
  loadingCount = Math.max(loadingCount - 1, 0)

  if (loadingCount === 0) {
    uni.hideLoading()
  }
}

function createRequestError(
  message: string,
  code: RequestErrorCode | string | number,
  options?: {
    canceled?: boolean
    statusCode?: number
    raw?: unknown
  },
): RequestError {
  const error = new Error(message) as RequestError
  error.name = 'RequestError'
  error.code = code
  error.canceled = options?.canceled ?? false
  error.statusCode = options?.statusCode
  error.raw = options?.raw

  return error
}

function resolveMessageByStatus(statusCode: number): string {
  if (statusCode >= 500) {
    return '服务刚刚有点忙，我们稍后再试一次。'
  }

  if (statusCode === 404) {
    return '想找的内容暂时没有找到。'
  }

  if (statusCode === 401) {
    return '登录状态轻轻过期了，重新进入就好。'
  }

  if (statusCode === 403) {
    return '这一步暂时还没有开放权限。'
  }

  return '请求刚刚没接稳，我们等一下再试。'
}

function normalizeRetryOptions(retry?: number | RequestRetryOptions): Required<RequestRetryOptions> {
  if (typeof retry === 'number') {
    return {
      count: Math.max(retry, 0),
      delayMs: DEFAULT_RETRY_DELAY_MS,
      retryOn: [RequestErrorCode.Network, RequestErrorCode.Timeout, RequestErrorCode.Http],
    }
  }

  return {
    count: Math.max(retry?.count ?? 0, 0),
    delayMs: retry?.delayMs ?? DEFAULT_RETRY_DELAY_MS,
    retryOn: retry?.retryOn ?? [RequestErrorCode.Network, RequestErrorCode.Timeout, RequestErrorCode.Http],
  }
}

function normalizeResolvedOptions(options: RequestOptions): ResolvedRequestOptions {
  const method = options.method ?? RequestMethod.Get
  const currentUserId = readAuthUserIdFromStorage()

  return {
    rawUrl: options.url,
    url: normalizeUrl(options.url, options.params),
    method,
    data: options.data,
    params: options.params,
    header: {
      'Content-Type': 'application/json',
      'X-Client-Platform': getRuntimePlatform(),
      ...(currentUserId ? { 'x-user-id': currentUserId } : {}),
      ...options.header,
    },
    timeout: options.timeout ?? DEFAULT_TIMEOUT,
    showLoading: options.showLoading ?? true,
    loadingText: options.loadingText ?? DEFAULT_LOADING_TEXT,
    skipErrorToast: options.skipErrorToast ?? false,
    cancelDuplicate: options.cancelDuplicate ?? true,
    responseType: options.responseType,
    retry: normalizeRetryOptions(options.retry),
    showRetryDialog: options.showRetryDialog ?? method === RequestMethod.Get,
  }
}

async function applyRequestInterceptors(
  options: ResolvedRequestOptions,
): Promise<ResolvedRequestOptions> {
  let currentOptions = options

  for (const interceptor of requestInterceptors) {
    currentOptions = await interceptor(currentOptions)
  }

  return currentOptions
}

async function applyResponseInterceptors<TResponse>(
  response: UniApp.RequestSuccessCallbackResult,
  options: ResolvedRequestOptions,
): Promise<TResponse> {
  let currentValue: unknown = response

  for (const interceptor of responseInterceptors) {
    currentValue = await interceptor(response, options)
  }

  return currentValue as TResponse
}

async function applyErrorInterceptors(
  error: RequestError,
  options: ResolvedRequestOptions,
): Promise<RequestError> {
  let currentError = error

  for (const interceptor of errorInterceptors) {
    currentError = await interceptor(currentError, options)
  }

  return currentError
}

function abortDuplicateRequest(requestKey: string): void {
  const pendingTask = pendingTaskMap.get(requestKey)

  if (pendingTask) {
    pendingTask.abort()
    pendingTaskMap.delete(requestKey)
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function shouldRetry(error: RequestError, options: ResolvedRequestOptions, attempt: number): boolean {
  if (error.canceled) {
    return false
  }

  return attempt < options.retry.count && options.retry.retryOn.includes(error.code as RequestErrorCode)
}

function canPromptManualRetry(error: RequestError, options: ResolvedRequestOptions): boolean {
  if (!options.showRetryDialog || options.method !== RequestMethod.Get || error.canceled) {
    return false
  }

  return error.code === RequestErrorCode.Network
    || error.code === RequestErrorCode.Timeout
    || error.code === RequestErrorCode.Http
}

async function executeRequest<TResponse>(
  options: ResolvedRequestOptions,
  requestKey: string,
): Promise<TResponse> {
  return new Promise<TResponse>((resolve, reject) => {
    const uniRequestOptions: UniApp.RequestOptions = {
      url: options.url,
      method: options.method as 'GET' | 'POST',
      header: options.header,
      timeout: options.timeout,
      success: response => {
        void (async () => {
          try {
            const responseData = await applyResponseInterceptors<TResponse>(response, options)
            resolve(responseData)
          }
          catch (error) {
            reject(
              error instanceof Error
                ? createRequestError(error.message, RequestErrorCode.Unknown, { raw: error })
                : createRequestError('请求处理失败', RequestErrorCode.Unknown, { raw: error }),
            )
          }
        })()
      },
      fail: requestError => {
        const canceled = requestError.errMsg.includes('abort')
        const timedOut = requestError.errMsg.includes('timeout')

        reject(createRequestError(
          canceled
            ? '重复请求已取消'
            : timedOut
              ? '请求稍微超时了，我们可以再试一次。'
              : '网络暂时不太稳，本地记录会先替你留好。',
          canceled
            ? RequestErrorCode.Canceled
            : timedOut
              ? RequestErrorCode.Timeout
              : RequestErrorCode.Network,
          {
            canceled,
            raw: requestError,
          },
        ))
      },
      complete: () => {
        pendingTaskMap.delete(requestKey)
      },
    }

    if (options.data !== undefined) {
      uniRequestOptions.data = options.data as Exclude<RequestBody, undefined>
    }

    if (options.responseType !== undefined) {
      uniRequestOptions.responseType = options.responseType
    }

    const requestTask = uni.request(uniRequestOptions) as unknown as UniApp.RequestTask

    if (options.cancelDuplicate) {
      pendingTaskMap.set(requestKey, requestTask)
    }
  })
}

function isApiEnvelope<TResponse>(payload: unknown): payload is MaybeApiResponse<TResponse> {
  return isRecord(payload) && 'code' in payload && 'message' in payload
}

function registerDefaultInterceptors(): void {
  requestInterceptors.push(async options => options)

  responseInterceptors.push(async response => {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      // 优先使用后端返回的错误消息，没有则根据状态码生成友好提示
      const backendMessage = isRecord(response.data) && typeof response.data.message === 'string'
        ? response.data.message
        : null
      throw createRequestError(
        backendMessage || resolveMessageByStatus(response.statusCode),
        RequestErrorCode.Http,
        {
          statusCode: response.statusCode,
          raw: response,
        },
      )
    }

    if (isApiEnvelope(response.data)) {
      if (response.data.success === false || !isSuccessfulApiCode(response.data.code)) {
        throw createRequestError(
          response.data.message ?? '业务处理失败',
          RequestErrorCode.Business,
          {
            statusCode: response.statusCode,
            raw: response.data,
          },
        )
      }

      return response.data.data
    }

    return response.data
  })

  errorInterceptors.push(async (error, options) => {
    if (!error.canceled && !options.skipErrorToast) {
      showGentleToast({
        title: normalizeGentleMessage(error.message),
      })
    }

    return error
  })
}

export function initializeRequestClient(): void {
  if (initialized) {
    return
  }

  registerDefaultInterceptors()
  initialized = true
}

export function addRequestInterceptor(interceptor: RequestInterceptor): void {
  requestInterceptors.push(interceptor)
}

export function addResponseInterceptor(interceptor: ResponseInterceptor): void {
  responseInterceptors.push(interceptor)
}

export function addErrorInterceptor(interceptor: ErrorInterceptor): void {
  errorInterceptors.push(interceptor)
}

export async function request<TResponse>(
  options: RequestOptions,
): Promise<TResponse> {
  const resolvedOptions = await applyRequestInterceptors(
    normalizeResolvedOptions(options),
  )

  const requestKey = buildRequestKey(resolvedOptions)

  if (resolvedOptions.cancelDuplicate) {
    abortDuplicateRequest(requestKey)
  }

  if (resolvedOptions.showLoading) {
    showGlobalLoading(resolvedOptions.loadingText)
  }

  let attempt = 0

  try {
    while (true) {
      try {
        return await executeRequest<TResponse>(resolvedOptions, requestKey)
      }
      catch (error) {
        const normalizedError = error instanceof Error
          ? error as RequestError
          : createRequestError('请求处理失败', RequestErrorCode.Unknown, {
              raw: error,
            })

        if (shouldRetry(normalizedError, resolvedOptions, attempt)) {
          attempt += 1
          await wait(resolvedOptions.retry.delayMs)
          continue
        }

        if (canPromptManualRetry(normalizedError, resolvedOptions)) {
          const confirmed = await showGentleConfirm({
            title: '网络刚刚晃了一下',
            content: '要不要现在重新连一次？已经写下的本地内容会继续安全保留。',
            confirmText: '重新试试',
            cancelText: '先等等',
          })

          if (confirmed) {
            attempt = 0
            continue
          }
        }

        throw await applyErrorInterceptors(normalizedError, resolvedOptions)
      }
    }
  }
  finally {
    if (resolvedOptions.showLoading) {
      hideGlobalLoading()
    }
  }
}

export const http = {
  get<TResponse, TQuery extends RequestQuery = RequestQuery>(
    url: string,
    params?: TQuery,
    options?: Omit<RequestOptions<undefined, TQuery>, 'url' | 'method' | 'params'>,
  ): Promise<TResponse> {
    return request<TResponse>({
      ...options,
      url,
      method: RequestMethod.Get,
      retry: options?.retry ?? 1,
      ...(params ? { params } : {}),
    })
  },
  post<TResponse, TBody = RequestBody>(
    url: string,
    data?: TBody,
    options?: Omit<RequestOptions<TBody>, 'url' | 'method' | 'data'>,
  ): Promise<TResponse> {
    return request<TResponse>({
      ...options,
      url,
      method: RequestMethod.Post,
      data: data as RequestBody,
    })
  },
  put<TResponse, TBody = RequestBody>(
    url: string,
    data?: TBody,
    options?: Omit<RequestOptions<TBody>, 'url' | 'method' | 'data'>,
  ): Promise<TResponse> {
    return request<TResponse>({
      ...options,
      url,
      method: RequestMethod.Put,
      data: data as RequestBody,
    })
  },
  patch<TResponse, TBody = RequestBody>(
    url: string,
    data?: TBody,
    options?: Omit<RequestOptions<TBody>, 'url' | 'method' | 'data'>,
  ): Promise<TResponse> {
    return request<TResponse>({
      ...options,
      url,
      method: RequestMethod.Patch,
      data: data as RequestBody,
    })
  },
  delete<TResponse = void>(
    url: string,
    options?: Omit<RequestOptions<undefined>, 'url' | 'method'>,
  ): Promise<TResponse> {
    return request<TResponse>({
      ...options,
      url,
      method: RequestMethod.Delete,
    })
  },
}
