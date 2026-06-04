import type { IImageAsset } from '@florist/contracts'
import { uploadPreparedImage } from '@/api'
import {
  cacheImageForOffline,
  compressImageSafely,
  removeCachedImage,
  revokeCompressedImageUrl,
} from '@/utils'

interface ChooseBaseOptions {
  readonly count: number
  readonly sizeType?: Array<'original' | 'compressed'>
  readonly sourceType?: Array<'album' | 'camera'>
  readonly maxSizeInBytes?: number
  readonly initialQuality?: number
  readonly minQuality?: number
}

interface ChooseUploadedAssetOptions extends ChooseBaseOptions {
  readonly scope: 'avatar' | 'flower' | 'record'
  readonly cropMode?: 'none' | 'square' | 'card'
  readonly maxWidth?: number
  readonly quality?: number
  readonly assetPrefix: string
}

interface ChooseCachedAssetOptions extends ChooseBaseOptions {
  readonly assetPrefix: string
}

function compactObject<TValue>(value: Record<string, TValue | undefined>): Record<string, TValue> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, TValue] => entry[1] !== undefined),
  )
}

function createImageAsset(assetPrefix: string, imageUrl: string, compressedUrl?: string): IImageAsset {
  return {
    id: `${assetPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: imageUrl,
    ...(compressedUrl ? { compressedUrl } : {}),
    createdAt: new Date().toISOString(),
  }
}

async function chooseImagePaths(count: number, options?: ChooseBaseOptions): Promise<string[]> {
  const result = await uni.chooseImage({
    count,
    sizeType: options?.sizeType ?? ['compressed'],
    sourceType: options?.sourceType ?? ['album', 'camera'],
  })

  return Array.isArray(result.tempFilePaths) ? result.tempFilePaths : []
}

export async function removePreparedImageAsset(asset: IImageAsset): Promise<void> {
  await removeCachedImage(asset.url)

  if (asset.compressedUrl && asset.compressedUrl !== asset.url) {
    await removeCachedImage(asset.compressedUrl)
  }
}

export interface PrepareAndUploadResult {
  asset: IImageAsset
  compressedFilePath: string
}

/**
 * 处理单张图片：压缩 → 上传 → 返回最终的 IImageAsset。
 * ImagePicker 用此函数逐张处理，以便在上传过程中即时更新 UI。
 */
export async function prepareAndUploadImage(
  tempFilePath: string,
  options: ChooseUploadedAssetOptions,
): Promise<PrepareAndUploadResult> {
  const compressedResult = await compressImageSafely(tempFilePath, compactObject({
    maxSizeInBytes: options.maxSizeInBytes,
    initialQuality: options.initialQuality,
    minQuality: options.minQuality,
  }))

  const uploadedImage = await uploadPreparedImage({
    filePath: compressedResult.filePath,
    scope: options.scope,
    ...compactObject({
      cropMode: options.cropMode,
      maxWidth: options.maxWidth,
      quality: options.quality,
    }),
  })

  return {
    asset: createImageAsset(options.assetPrefix, uploadedImage.url),
    compressedFilePath: compressedResult.filePath,
  }
}

export function usePreparedImageAssets() {
  async function chooseUploadedImageAssets(options: ChooseUploadedAssetOptions): Promise<IImageAsset[]> {
    const tempFilePaths = await chooseImagePaths(options.count, options)
    const assets: IImageAsset[] = []

    for (const tempFilePath of tempFilePaths) {
      try {
        const result = await prepareAndUploadImage(tempFilePath, options)
        assets.push(result.asset)
      } finally {
        // 清理压缩产生的临时文件
        if (tempFilePath !== options.assetPrefix) {
          revokeCompressedImageUrl(tempFilePath)
        }
      }
    }

    return assets
  }

  async function chooseUploadedSingleImageUrl(options: Omit<ChooseUploadedAssetOptions, 'count'>): Promise<string | null> {
    const assets = await chooseUploadedImageAssets({
      ...options,
      count: 1,
    })

    return assets[0]?.url ?? null
  }

  async function chooseCachedImageAssets(options: ChooseCachedAssetOptions): Promise<IImageAsset[]> {
    const tempFilePaths = await chooseImagePaths(options.count, options)
    const assets: IImageAsset[] = []

    for (const tempFilePath of tempFilePaths) {
      const compressedResult = await compressImageSafely(tempFilePath, compactObject({
        maxSizeInBytes: options.maxSizeInBytes,
        initialQuality: options.initialQuality,
        minQuality: options.minQuality,
      }))
      const cachedImagePath = await cacheImageForOffline(compressedResult.filePath)

      assets.push(createImageAsset(
        options.assetPrefix,
        cachedImagePath,
        compressedResult.filePath !== cachedImagePath ? compressedResult.filePath : undefined,
      ))
    }

    return assets
  }

  return {
    chooseCachedImageAssets,
    chooseUploadedImageAssets,
    chooseUploadedSingleImageUrl,
  }
}
