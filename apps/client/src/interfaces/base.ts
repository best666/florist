export type Nil = null | undefined

export type Nullable<TValue> = TValue | null

export type Maybe<TValue> = TValue | Nil

export interface PaginationParams {
  pageNumber: number
  pageSize: number
}

export interface PaginationResult<TItem> {
  list: TItem[]
  total: number
  pageNumber: number
  pageSize: number
  hasMore: boolean
}

export interface ApiResponse<TData> {
  code: number
  message: string
  data: TData
  requestId?: string
  timestamp?: string
}

export interface KeyValueOption<TValue extends string | number = string> {
  label: string
  value: TValue
  disabled?: boolean
}
