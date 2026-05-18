import type { IImageAsset } from '@florist/contracts'
import { uploadPreparedImage } from '@/api'
import {
  cacheImageForOffline,
  compressImageSafely,
  readImageAsDataUrl,
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

async function chooseImagePaths(options: ChooseBaseOptions): Promise<string[]> {
  const result = await uni.chooseImage({
    count: options.count,
    sizeType: options.sizeType ?? ['compressed'],
    sourceType: options.sourceType ?? ['album', 'camera'],
  })

  return Array.isArray(result.tempFilePaths) ? result.tempFilePaths : []
}

export async function removePreparedImageAsset(asset: IImageAsset): Promise<void> {
  await removeCachedImage(asset.url)

  if (asset.compressedUrl && asset.compressedUrl !== asset.url) {
    await removeCachedImage(asset.compressedUrl)
  }
}

export function usePreparedImageAssets() {
  async function chooseUploadedImageAssets(options: ChooseUploadedAssetOptions): Promise<IImageAsset[]> {
    const tempFilePaths = await chooseImagePaths(options)
    const assets: IImageAsset[] = []

    for (const tempFilePath of tempFilePaths) {
      const compressedResult = await compressImageSafely(tempFilePath, compactObject({
        maxSizeInBytes: options.maxSizeInBytes,
        initialQuality: options.initialQuality,
        minQuality: options.minQuality,
      }))

      try {
        const dataUrl = await readImageAsDataUrl(compressedResult.filePath)
        const uploadedImage = await uploadPreparedImage({
          dataUrl,
          scope: options.scope,
          ...compactObject({
            cropMode: options.cropMode,
            maxWidth: options.maxWidth,
            quality: options.quality,
          }),
        })

        assets.push(createImageAsset(options.assetPrefix, uploadedImage.url))
      }
      finally {
        if (compressedResult.filePath !== tempFilePath) {
          revokeCompressedImageUrl(compressedResult.filePath)
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
    const tempFilePaths = await chooseImagePaths(options)
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
