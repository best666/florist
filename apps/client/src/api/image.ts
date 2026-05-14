import { http } from '@/utils/request'

export interface UploadImagePayload {
  dataUrl: string
  scope: 'avatar' | 'flower' | 'record'
  cropMode?: 'none' | 'square' | 'card'
  maxWidth?: number
  quality?: number
}

export interface UploadImageResponse {
  url: string
  width: number
  height: number
  originalBytes: number
  compressedBytes: number
}

export function uploadPreparedImage(payload: UploadImagePayload): Promise<UploadImageResponse> {
  return http.post<UploadImageResponse, UploadImagePayload>('/image/upload', payload, {
    loadingText: '正在处理图片',
    skipErrorToast: true,
  })
}
