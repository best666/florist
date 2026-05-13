import type {
  ErrorInterceptor,
  MaybeApiResponse,
  RequestBody,
  RequestError,
  RequestInterceptor,
  RequestOptions,
  RequestQuery,
  RequestQueryValue,
  ResolvedRequestOptions,
  ResponseInterceptor,
} from '@/interfaces'
import { RequestErrorCode, RequestMethod } from '@/interfaces'
import { getApiBaseUrl, shouldUseProxy } from './env'
import { getRuntimePlatform } from './platform'

const DEFAULT_TIMEOUT = 15000
const DEFAULT_LOADING_TEXT = '加载中'

const pendingTaskMap = new Map<string, UniApp.RequestTask>()
const requestInterceptors: RequestInterceptor[] = []
const responseInterceptors: ResponseInterceptor[] = []
const errorInterceptors: ErrorInterceptor[] = []

let initialized = false
let loadingCount = 0

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
    return '服务开小差了，请稍后再试'
  }

  if (statusCode === 404) {
    return '请求资源不存在'
  }

  if (statusCode === 401) {
    return '登录状态已失效，请重新登录'
  }

  if (statusCode === 403) {
    return '当前操作没有权限'
  }

  return '请求失败，请稍后重试'
}

function normalizeResolvedOptions(options: RequestOptions): ResolvedRequestOptions {
  return {
    url: normalizeUrl(options.url, options.params),
    method: options.method ?? RequestMethod.Get,
    data: options.data,
    params: options.params,
    header: {
      'Content-Type': 'application/json',
      'X-Client-Platform': getRuntimePlatform(),
      ...options.header,
    },
    timeout: options.timeout ?? DEFAULT_TIMEOUT,
    showLoading: options.showLoading ?? true,
    loadingText: options.loadingText ?? DEFAULT_LOADING_TEXT,
    skipErrorToast: options.skipErrorToast ?? false,
    cancelDuplicate: options.cancelDuplicate ?? true,
    responseType: options.responseType,
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

function isApiEnvelope<TResponse>(payload: unknown): payload is MaybeApiResponse<TResponse> {
  return isRecord(payload) && 'code' in payload && 'message' in payload
}

function registerDefaultInterceptors(): void {
  requestInterceptors.push(async options => options)

  responseInterceptors.push(async response => {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw createRequestError(
        resolveMessageByStatus(response.statusCode),
        RequestErrorCode.Http,
        {
          statusCode: response.statusCode,
          raw: response,
        },
      )
    }

    if (isApiEnvelope(response.data)) {
      if (response.data.code !== 0 && response.data.code !== 200) {
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
      uni.showToast({
        title: error.message,
        icon: 'none',
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

  return new Promise<TResponse>((resolve, reject) => {
    const uniRequestOptions: UniApp.RequestOptions = {
      url: resolvedOptions.url,
      method: resolvedOptions.method,
      header: resolvedOptions.header,
      timeout: resolvedOptions.timeout,
      success: response => {
        void (async () => {
          try {
            const responseData = await applyResponseInterceptors<TResponse>(
              response,
              resolvedOptions,
            )
            resolve(responseData)
          }
          catch (error) {
            const normalizedError =
              error instanceof Error
                ? createRequestError(error.message, RequestErrorCode.Unknown, {
                    raw: error,
                  })
                : createRequestError('请求处理失败', RequestErrorCode.Unknown, {
                    raw: error,
                  })

            reject(await applyErrorInterceptors(normalizedError, resolvedOptions))
          }
        })()
      },
      fail: requestError => {
        void (async () => {
          const canceled = requestError.errMsg.includes('abort')
          const timedOut = requestError.errMsg.includes('timeout')
          const normalizedError = createRequestError(
            canceled
              ? '重复请求已取消'
              : timedOut
                ? '请求超时，请稍后重试'
                : '网络异常，请检查后重试',
            canceled
              ? RequestErrorCode.Canceled
              : timedOut
                ? RequestErrorCode.Timeout
                : RequestErrorCode.Network,
            {
              canceled,
              raw: requestError,
            },
          )

          reject(await applyErrorInterceptors(normalizedError, resolvedOptions))
        })()
      },
      complete: () => {
        pendingTaskMap.delete(requestKey)

        if (resolvedOptions.showLoading) {
          hideGlobalLoading()
        }
      },
    }

    if (resolvedOptions.data !== undefined) {
      uniRequestOptions.data = resolvedOptions.data as Exclude<RequestBody, undefined>
    }

    if (resolvedOptions.responseType !== undefined) {
      uniRequestOptions.responseType = resolvedOptions.responseType
    }

    const requestTask = uni.request(uniRequestOptions) as unknown as UniApp.RequestTask

    if (resolvedOptions.cancelDuplicate) {
      pendingTaskMap.set(requestKey, requestTask)
    }
  })
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
}
