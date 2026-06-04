import { getApiBaseUrl, getRuntimePlatform, readAuthUserIdFromStorage, shouldUseProxy } from '@/utils'

export interface UploadImageParams {
  filePath: string
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

interface UploadResponseEnvelope {
  success: boolean
  code: string
  message?: string
  data: UploadImageResponse
  timestamp?: string
}

/**
 * 安全解析 uni.uploadFile 的响应数据。
 */
function parseResponse(rawData: unknown): UploadResponseEnvelope {
  if (typeof rawData === 'string') {
    const trimmed = rawData.trim()
    if (!trimmed) {
      throw new Error('服务器返回空响应')
    }
    return JSON.parse(trimmed) as UploadResponseEnvelope
  }

  if (typeof rawData === 'object' && rawData !== null) {
    return rawData as UploadResponseEnvelope
  }

  throw new Error(`异常响应类型: ${typeof rawData}`)
}

/** 构建与 request.ts 一致的请求 URL，H5 开发模式下走 Vite 代理 */
function buildUploadUrl(): string {
  const path = '/image/upload'

  if (shouldUseProxy() && getRuntimePlatform() === 'h5') {
    return `${import.meta.env.VITE_APP_PROXY_PREFIX || ''}${path}`
  }

  return `${getApiBaseUrl()}${path}`
}

export function uploadPreparedImage(params: UploadImageParams): Promise<UploadImageResponse> {
  return new Promise((resolve, reject) => {
    const formData: Record<string, string> = {
      scope: params.scope,
    }

    if (params.cropMode !== undefined) {
      formData.cropMode = params.cropMode
    }

    if (params.maxWidth !== undefined) {
      formData.maxWidth = String(params.maxWidth)
    }

    if (params.quality !== undefined) {
      formData.quality = String(params.quality)
    }

    const url = buildUploadUrl()

    // eslint-disable-next-line no-console
    console.log('[uploadPreparedImage] 发起上传', { url, filePath: params.filePath.slice(0, 60), formData })

    uni.uploadFile({
      url,
      filePath: params.filePath,
      name: 'file',
      formData,
      header: {
        'x-user-id': readAuthUserIdFromStorage() ?? '',
        'X-Client-Platform': getRuntimePlatform(),
      },
      success: (res) => {
        // eslint-disable-next-line no-console
        console.log('[uploadPreparedImage] ✅ success', {
          statusCode: res.statusCode,
          dataType: typeof res.data,
          dataPreview: typeof res.data === 'string' ? res.data.slice(0, 300) : JSON.stringify(res.data).slice(0, 300),
        })

        try {
          const envelope = parseResponse(res.data)

          if (res.statusCode >= 200 && res.statusCode < 300 && envelope.success !== false && envelope.data?.url) {
            // eslint-disable-next-line no-console
            console.log('[uploadPreparedImage] ✅ 解析成功，URL:', envelope.data.url)
            resolve(envelope.data)
          } else {
            // eslint-disable-next-line no-console
            console.error('[uploadPreparedImage] ❌ 业务失败', {
              statusCode: res.statusCode,
              success: envelope.success,
              hasUrl: !!envelope.data?.url,
              message: envelope.message,
            })
            reject(new Error(envelope.data?.url ? (envelope.message || '上传失败') : '服务器返回的图片地址为空'))
          }
        } catch (parseError) {
          // eslint-disable-next-line no-console
          console.error('[uploadPreparedImage] ❌ 解析异常', {
            dataType: typeof res.data,
            rawPreview: typeof res.data === 'string' ? res.data.slice(0, 500) : JSON.stringify(res.data).slice(0, 500),
            error: parseError instanceof Error ? parseError.message : String(parseError),
          })
          reject(new Error('上传响应解析失败，请重试'))
        }
      },
      fail: (err) => {
        // eslint-disable-next-line no-console
        console.error('[uploadPreparedImage] ❌ fail 回调', {
          errMsg: err.errMsg,
          errMsgType: typeof err.errMsg,
        })

        // UniApp H5 在某些版本中可能对成功响应也走 fail，做兜底检查
        const msg = err.errMsg || '上传请求失败'
        if (msg.includes('ok') || msg.includes('success')) {
          // eslint-disable-next-line no-console
          console.warn('[uploadPreparedImage] ⚠️ fail 但 msg 含 ok/success，当作成功但数据丢失处理')
          reject(new Error('上传完成但响应读取失败，请检查控制台'))
          return
        }

        reject(new Error(msg))
      },
      complete: (res) => {
        // complete 在 success/fail 之后必定触发，用于兜底诊断
        // eslint-disable-next-line no-console
        console.log('[uploadPreparedImage] complete', {
          statusCode: (res as { statusCode?: number }).statusCode,
          errMsg: (res as { errMsg?: string }).errMsg,
        })
      },
    })
  })
}
