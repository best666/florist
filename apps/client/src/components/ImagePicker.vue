<script setup lang="ts">
import type { IImageAsset } from '@florist/contracts'
import { computed, ref } from 'vue'
import AppImage from './AppImage.vue'
import { useAppStore, useAuthStore, useMemberStore } from '@/store'
import { usePreparedImageAssets, removePreparedImageAsset } from '@/hooks/usePreparedImageAssets'
import { showGentleToast } from '@/utils'

type UploadMode = 'cloud' | 'local'
type CropMode = 'none' | 'square' | 'card'
type UploadScope = 'avatar' | 'flower' | 'record'

interface ImagePickerProps {
  modelValue: ReadonlyArray<IImageAsset>
  maxCount: number
  /** 上传模式：cloud 需要登录+会员，local 纯本地缓存 */
  uploadMode: UploadMode
  /** 图片 id 前缀，用于生成唯一标识 */
  assetPrefix: string
  /** cloud 模式下的上传域 */
  scope?: UploadScope
  /** 裁剪模式 */
  cropMode?: CropMode
  /** 压缩最大宽度 */
  maxWidth?: number
  /** 压缩质量 0-100 */
  quality?: number
  /** 单张最大字节数 */
  maxSizeInBytes?: number
  /** 添加按钮文字 */
  addText?: string
  /** 图片加载失败占位文字 */
  errorText?: string
  /** 是否支持设置封面图 */
  supportCover?: boolean
  /** 当前封面图 id */
  coverImageId?: string | undefined
}

const props = withDefaults(defineProps<ImagePickerProps>(), {
  scope: 'flower',
  cropMode: 'card',
  addText: '添加图片',
  errorText: '图片加载中',
  supportCover: false,
  maxWidth: 1440,
  quality: 82,
  maxSizeInBytes: 1.8 * 1024 * 1024,
})

const emit = defineEmits<{
  'update:modelValue': [value: IImageAsset[]]
  'update:coverImageId': [value: string | undefined]
}>()

const appStore = useAppStore()
const authStore = useAuthStore()
const memberStore = useMemberStore()
const { chooseUploadedImageAssets, chooseCachedImageAssets } = usePreparedImageAssets()
const isUploading = ref(false)

const imageList = computed<IImageAsset[]>(() => [...props.modelValue])
const remainingCount = computed(() => Math.max(0, props.maxCount - imageList.value.length))
const canAdd = computed(() => remainingCount.value > 0 && !isUploading.value)

function checkGate(): boolean {
  if (props.uploadMode === 'local') return true

  // 离线时云端上传不可用，但不应阻断 — 提示用户当前是离线模式
  if (appStore.isOffline) {
    showGentleToast('当前处于离线模式，云端图片上传暂不可用。图片会先保存在本地，联网后可以重新添加。')
    return false
  }

  if (!authStore.isAuthenticated) {
    showGentleToast('请先登录后再使用云端图片上传。')
    return false
  }

  if (!memberStore.hasCloudGardenAccess) {
    showGentleToast('云端图片上传仅对会员开放，开通后即可使用。')
    return false
  }

  return true
}

async function handleChooseImages(): Promise<void> {
  if (!canAdd.value) return
  if (!checkGate()) return

  isUploading.value = true

  try {
    const baseOptions = {
      count: remainingCount.value,
      maxSizeInBytes: props.maxSizeInBytes,
    }

    let assets: IImageAsset[]

    if (props.uploadMode === 'cloud') {
      assets = await chooseUploadedImageAssets({
        ...baseOptions,
        assetPrefix: props.assetPrefix,
        scope: props.scope!,
        cropMode: props.cropMode,
        maxWidth: props.maxWidth,
        quality: props.quality,
      })
    } else {
      assets = await chooseCachedImageAssets({
        ...baseOptions,
        assetPrefix: props.assetPrefix,
      })
    }

    emit('update:modelValue', [...imageList.value, ...assets])
  } catch {
    // 用户取消选择时不提示
  } finally {
    isUploading.value = false
  }
}

function handlePreviewImage(currentUrl: string): void {
  uni.previewImage({
    urls: imageList.value.map(img => img.url),
    current: currentUrl,
  })
}

async function handleRemoveImage(imageId: string): Promise<void> {
  const target = imageList.value.find(img => img.id === imageId)
  if (!target) return

  if (props.supportCover && props.coverImageId === imageId) {
    emit('update:coverImageId', undefined)
  }

  emit('update:modelValue', imageList.value.filter(img => img.id !== imageId))
  await removePreparedImageAsset(target)
}

function handleSetCover(imageId: string): void {
  if (!props.supportCover) return
  emit('update:coverImageId', imageId)
}
</script>

<template>
  <view class="mt-3 grid grid-cols-3 gap-3">
    <!-- 已上传图片卡片 -->
    <view
      v-for="image in imageList"
      :key="image.id"
      class="group relative overflow-hidden rounded-[24rpx] bg-[var(--color-surface)] dark:bg-slate-900"
      :class="supportCover && coverImageId === image.id ? 'ring-2 ring-[var(--color-mint)] ring-offset-1' : ''"
    >
      <AppImage
        :src="image.url"
        mode="aspectFill"
        class="h-[180rpx] w-full"
        :error-text="errorText"
        @tap="handlePreviewImage(image.url)"
      />

      <!-- 封面标识 -->
      <view
        v-if="supportCover && coverImageId === image.id"
        class="absolute left-2 top-2 rounded-full bg-[var(--color-mint)] px-2 py-0.5 text-2xs font-700 text-app-ink"
      >
        封面
      </view>

      <!-- 操作按钮组 -->
      <view class="absolute right-1 top-1 flex flex-col gap-1">
        <button
          v-if="supportCover && coverImageId !== image.id"
          class="btn-pill-sm h-6 min-h-6 rounded-full bg-slate-900/50 px-1.5 text-2xs text-white"
          hover-class="opacity-90"
          @tap.stop="handleSetCover(image.id)"
        >
          封面
        </button>
        <button
          class="btn-pill-sm h-6 min-h-6 w-6 min-w-6 rounded-full bg-slate-900/45 px-0 text-xs text-white"
          hover-class="opacity-90"
          @tap.stop="handleRemoveImage(image.id)"
        >
          ×
        </button>
      </view>
    </view>

    <!-- 添加按钮 -->
    <button
      v-if="canAdd"
      class="btn-base h-[180rpx] w-full rounded-[24rpx] border-2 border-dashed border-[var(--color-cream)]/70 bg-[var(--color-surface)]/70 px-0 text-app-muted transition-all duration-200 hover:border-[var(--color-mint)]/60 hover:text-[var(--color-sage)] active:scale-[0.97] dark:bg-slate-900 dark:text-slate-200"
      hover-class="opacity-92"
      :loading="isUploading"
      @tap="handleChooseImages"
    >
      <view class="flex h-full flex-col items-center justify-center gap-1.5">
        <text class="text-2xl font-400 leading-none">+</text>
        <text class="text-2xs">{{ addText }}</text>
      </view>
    </button>
  </view>
</template>
