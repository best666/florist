import type { Nullable } from '@/interfaces'
import { http } from './request'
import { isValidImageSource } from './validate'

export interface ImageCompressOptions {
  /**
   * 最大图片体积，默认 2MB。
   */
  readonly maxSizeInBytes?: number
  /**
   * 初始压缩质量，范围 0-1。
   */
  readonly initialQuality?: number
  /**
   * 最低压缩质量，范围 0-1。
   */
  readonly minQuality?: number
  /**
   * 每轮递减的压缩质量。
   */
  readonly qualityStep?: number
  /**
   * 每轮缩放比例。
   */
  readonly resizeRatio?: number
}

export interface ImageCompressResult {
  /**
   * 输出图片地址，H5 可能为 blob URL，小程序为临时文件路径。
   */
  readonly filePath: string
  /**
   * 原始图片大小，未知时为 null。
   */
  readonly originalSizeInBytes: Nullable<number>
  /**
   * 压缩后图片大小，未知时为 null。
   */
  readonly compressedSizeInBytes: Nullable<number>
  /**
   * 实际使用的压缩质量。
   */
  readonly qualityUsed: number
  /**
   * 是否发生了清晰度降级。
   */
  readonly degraded: boolean
}

const DEFAULT_MAX_IMAGE_SIZE = 2 * 1024 * 1024

function normalizeImageCompressOptions(
  options?: ImageCompressOptions,
): Required<ImageCompressOptions> {
  return {
    maxSizeInBytes: options?.maxSizeInBytes ?? DEFAULT_MAX_IMAGE_SIZE,
    initialQuality: options?.initialQuality ?? 0.92,
    minQuality: options?.minQuality ?? 0.45,
    qualityStep: options?.qualityStep ?? 0.12,
    resizeRatio: options?.resizeRatio ?? 0.88,
  }
}

function createFallbackImageCompressResult(
  filePath: string,
): ImageCompressResult {
  return {
    filePath,
    originalSizeInBytes: null,
    compressedSizeInBytes: null,
    qualityUsed: 1,
    degraded: false,
  }
}

async function getFileSizeInBytes(filePath: string): Promise<Nullable<number>> {
  try {
    const fileInfo = await uni.getFileInfo({ filePath })
    return fileInfo.size
  }
  catch {
    return null
  }
}

// #ifdef H5
async function blobFromImageSource(filePath: string): Promise<Blob> {
  const response = await fetch(filePath)
  return response.blob()
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.onload = () => {
      if (typeof fileReader.result === 'string') {
        resolve(fileReader.result)
        return
      }

      reject(new Error('blob to data url failed'))
    }

    fileReader.onerror = () => reject(new Error('blob to data url failed'))
    fileReader.readAsDataURL(blob)
  })
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
  mimeType: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('canvas toBlob failed'))
        return
      }

      resolve(blob)
    }, mimeType, quality)
  })
}

async function compressImageByServerForH5(
  originalBlob: Blob,
  options: Required<ImageCompressOptions>,
): Promise<ImageCompressResult | null> {
  try {
    const dataUrl = await blobToDataUrl(originalBlob)
    const response = await http.post<{
      dataUrl: string
      width: number
      height: number
      originalBytes: number
      compressedBytes: number
    }, {
      dataUrl: string
      maxWidth: number
      quality: number
    }>('/image/compress', {
      dataUrl,
      maxWidth: 1280,
      quality: Math.round(options.initialQuality * 100),
    }, {
      showLoading: false,
      skipErrorToast: true,
      cancelDuplicate: true,
    })

    return {
      filePath: response.dataUrl,
      originalSizeInBytes: response.originalBytes,
      compressedSizeInBytes: response.compressedBytes,
      qualityUsed: options.initialQuality,
      degraded: response.compressedBytes < response.originalBytes,
    }
  }
  catch {
    return null
  }
}

async function loadImageElement(filePath: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image load failed'))
    image.src = filePath
  })
}

async function compressImageForH5(
  filePath: string,
  options: Required<ImageCompressOptions>,
): Promise<ImageCompressResult> {
  try {
    const originalBlob = await blobFromImageSource(filePath)

    if (originalBlob.size <= options.maxSizeInBytes) {
      return {
        filePath,
        originalSizeInBytes: originalBlob.size,
        compressedSizeInBytes: originalBlob.size,
        qualityUsed: 1,
        degraded: false,
      }
    }

    const serverCompressedResult = await compressImageByServerForH5(originalBlob, options)

    if (serverCompressedResult) {
      return serverCompressedResult
    }

    const image = await loadImageElement(filePath)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      return createFallbackImageCompressResult(filePath)
    }

    let width = image.width
    let height = image.height
    let quality = options.initialQuality
    let bestBlob: Blob | null = null

    while (quality >= options.minQuality) {
      canvas.width = Math.max(Math.floor(width), 1)
      canvas.height = Math.max(Math.floor(height), 1)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const currentBlob = await canvasToBlob(canvas, quality, originalBlob.type || 'image/jpeg')
      bestBlob = currentBlob

      if (currentBlob.size <= options.maxSizeInBytes) {
        const blobUrl = URL.createObjectURL(currentBlob)
        return {
          filePath: blobUrl,
          originalSizeInBytes: originalBlob.size,
          compressedSizeInBytes: currentBlob.size,
          qualityUsed: quality,
          degraded: true,
        }
      }

      quality -= options.qualityStep
      width *= options.resizeRatio
      height *= options.resizeRatio
    }

    if (bestBlob) {
      const blobUrl = URL.createObjectURL(bestBlob)
      return {
        filePath: blobUrl,
        originalSizeInBytes: originalBlob.size,
        compressedSizeInBytes: bestBlob.size,
        qualityUsed: Math.max(quality, options.minQuality),
        degraded: true,
      }
    }

    return createFallbackImageCompressResult(filePath)
  }
  catch {
    return createFallbackImageCompressResult(filePath)
  }
}
// #endif

// #ifdef MP-WEIXIN
async function compressImageForMiniProgram(
  filePath: string,
  options: Required<ImageCompressOptions>,
): Promise<ImageCompressResult> {
  const originalSize = await getFileSizeInBytes(filePath)

  if (originalSize !== null && originalSize <= options.maxSizeInBytes) {
    return {
      filePath,
      originalSizeInBytes: originalSize,
      compressedSizeInBytes: originalSize,
      qualityUsed: 1,
      degraded: false,
    }
  }

  let quality = Math.round(options.initialQuality * 100)
  let bestResult: ImageCompressResult = createFallbackImageCompressResult(filePath)

  while (quality >= Math.round(options.minQuality * 100)) {
    try {
      const compressResult = await uni.compressImage({
        src: filePath,
        quality,
      })
      const compressedSize = await getFileSizeInBytes(compressResult.tempFilePath)

      bestResult = {
        filePath: compressResult.tempFilePath,
        originalSizeInBytes: originalSize,
        compressedSizeInBytes: compressedSize,
        qualityUsed: quality / 100,
        degraded: true,
      }

      if (compressedSize !== null && compressedSize <= options.maxSizeInBytes) {
        return bestResult
      }
    }
    catch {
      break
    }

    quality -= Math.round(options.qualityStep * 100)
  }

  return bestResult
}
// #endif

/**
 * 双端图片压缩工具。
 *
 * - 默认最大 2MB。
 * - 自动多轮降低清晰度和尺寸，优先避免大图导致内存占用过高或闪退。
 * - 任一平台压缩失败时回退到原图，确保调用方不会因为异常中断流程。
 */
export async function compressImageSafely(
  filePath: string,
  options?: ImageCompressOptions,
): Promise<ImageCompressResult> {
  if (!isValidImageSource(filePath)) {
    return createFallbackImageCompressResult(filePath)
  }

  const normalizedOptions = normalizeImageCompressOptions(options)

  // #ifdef H5
  return compressImageForH5(filePath, normalizedOptions)
  // #endif

  // #ifdef MP-WEIXIN
  return compressImageForMiniProgram(filePath, normalizedOptions)
  // #endif

  return createFallbackImageCompressResult(filePath)
}

export function revokeCompressedImageUrl(filePath: string): void {
  // #ifdef H5
  if (filePath.startsWith('blob:')) {
    URL.revokeObjectURL(filePath)
  }
  // #endif
}

/**
 * 将图片缓存为可离线复用的本地资源。
 * H5 侧转换为 data url，小程序侧保存为本地持久文件。
 */
export async function cacheImageForOffline(filePath: string): Promise<string> {
  if (!isValidImageSource(filePath)) {
    return filePath
  }

  // #ifdef H5
  if (filePath.startsWith('data:image/')) {
    return filePath
  }

  try {
    const imageBlob = await blobFromImageSource(filePath)
    return await blobToDataUrl(imageBlob)
  }
  catch {
    return filePath
  }
  // #endif

  // #ifdef MP-WEIXIN
  try {
    const saveResult = await uni.saveFile({
      tempFilePath: filePath,
    })

    return saveResult.savedFilePath
  }
  catch {
    return filePath
  }
  // #endif

  return filePath
}

export async function removeCachedImage(filePath: string): Promise<void> {
  // #ifdef H5
  revokeCompressedImageUrl(filePath)
  return
  // #endif

  // #ifdef MP-WEIXIN
  if (!filePath.startsWith('wxfile://')) {
    return
  }

  try {
    await uni.removeSavedFile({
      filePath,
    })
  }
  catch {
    // 持久化文件可能已被系统清理，此处忽略即可。
  }
  // #endif
}

function resolveImageMimeType(filePath: string): string {
  const normalizedPath = filePath.toLowerCase()

  if (normalizedPath.includes('data:image/png')) {
    return 'image/png'
  }

  if (normalizedPath.endsWith('.png')) {
    return 'image/png'
  }

  if (normalizedPath.endsWith('.webp')) {
    return 'image/webp'
  }

  if (normalizedPath.endsWith('.gif')) {
    return 'image/gif'
  }

  return 'image/jpeg'
}

export async function readImageAsDataUrl(filePath: string): Promise<string> {
  if (!isValidImageSource(filePath)) {
    throw new Error('图片地址不可用，请重新选择一张清晰图片。')
  }

  // #ifdef H5
  if (filePath.startsWith('data:image/')) {
    return filePath
  }

  const imageBlob = await blobFromImageSource(filePath)
  return blobToDataUrl(imageBlob)
  // #endif

  // #ifdef MP-WEIXIN
  if (filePath.startsWith('data:image/')) {
    return filePath
  }

  const fileSystemManager = uni.getFileSystemManager()

  return new Promise((resolve, reject) => {
    fileSystemManager.readFile({
      filePath,
      encoding: 'base64',
      success: (result) => {
        const base64 = typeof result.data === 'string' ? result.data : ''

        if (!base64) {
          reject(new Error('图片读取失败，请重新选择一张图片。'))
          return
        }

        resolve(`data:${resolveImageMimeType(filePath)};base64,${base64}`)
      },
      fail: () => reject(new Error('图片读取失败，请重新选择一张图片。')),
    })
  })
  // #endif

  throw new Error('当前平台暂不支持读取图片数据。')
}
