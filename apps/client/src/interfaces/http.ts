import type { ApiResponse, Nullable } from './base'
import type { RequestErrorCode, RequestMethod } from './enums'

export type RequestPrimitive = string | number | boolean | null

export type RequestQueryValue =
  | RequestPrimitive
  | RequestPrimitive[]
  | undefined

export type RequestQuery = Record<string, RequestQueryValue>

export type RequestBody =
  | ArrayBuffer
  | Record<string, unknown>
  | string
  | undefined

export interface RequestRetryOptions {
  count?: number
  delayMs?: number
  retryOn?: RequestErrorCode[]
}

export interface RequestOptions<TBody = RequestBody, TQuery extends RequestQuery = RequestQuery> {
  url: string
  method?: RequestMethod
  data?: TBody
  params?: TQuery
  header?: Record<string, string>
  timeout?: number
  showLoading?: boolean
  loadingText?: string
  skipErrorToast?: boolean
  cancelDuplicate?: boolean
  responseType?: UniApp.RequestOptions['responseType']
  retry?: number | RequestRetryOptions
  showRetryDialog?: boolean
}

export interface ResolvedRequestOptions {
  rawUrl: string
  url: string
  method: RequestMethod
  data: RequestBody
  params: RequestQuery | undefined
  header: Record<string, string>
  timeout: number
  showLoading: boolean
  loadingText: string
  skipErrorToast: boolean
  cancelDuplicate: boolean
  responseType: UniApp.RequestOptions['responseType'] | undefined
  retry: Required<RequestRetryOptions>
  showRetryDialog: boolean
}

export interface RequestError extends Error {
  code: RequestErrorCode | string | number
  canceled: boolean
  statusCode: number | undefined
  raw: unknown
}

export interface RequestInterceptor {
  (options: ResolvedRequestOptions): Promise<ResolvedRequestOptions> | ResolvedRequestOptions
}

export interface ResponseInterceptor<TResponse = unknown> {
  (
    response: UniApp.RequestSuccessCallbackResult,
    options: ResolvedRequestOptions,
  ): Promise<TResponse> | TResponse
}

export interface ErrorInterceptor {
  (
    error: RequestError,
    options: ResolvedRequestOptions,
  ): Promise<RequestError> | RequestError
}

export interface MaybeApiResponse<TData> extends Partial<ApiResponse<TData>> {
  data?: TData
  code?: number
  message?: string
}

export interface PendingRequestRecord {
  requestKey: string
  task: UniApp.RequestTask
}

export interface StoragePayload<TValue> {
  value: TValue
  expiredAt: Nullable<number>
}
