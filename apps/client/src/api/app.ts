import { http } from '@/utils/request'

export interface ServerHealthResponse {
  status: 'ok'
  service: string
}

export function fetchServerHealth(): Promise<ServerHealthResponse> {
  return http.get<ServerHealthResponse>('/health', undefined, {
    showLoading: false,
  })
}
