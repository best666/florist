<script setup lang="ts">
import type { GrowthAlbumPhotoItem } from '@/interfaces'
import { formatDateTime, showGentleToast } from '@/utils'

interface GrowthAlbumGalleryProps {
  albumItems: ReadonlyArray<GrowthAlbumPhotoItem>
  timelineCount: number
  latestUpdatedText: string
  canAccessAlbum: boolean
}

defineProps<GrowthAlbumGalleryProps>()

function handlePreviewAlbum(albumItems: ReadonlyArray<GrowthAlbumPhotoItem>, imageUrl: string, canAccessAlbum: boolean): void {
  if (!canAccessAlbum) {
    showGentleToast('成长相册仅对会员开放，开通后才能查看和管理植物图片。')
    return
  }

  uni.previewImage({
    urls: albumItems.map(item => item.image.url),
    current: imageUrl,
  })
}
</script>

<template>
  <view class="grid grid-cols-3 gap-3">
    <view class="rounded-[28rpx] bg-white/88 px-4 py-4 shadow-[0_14rpx_32rpx_rgba(148,163,184,0.12)] dark:bg-slate-900">
      <text class="block text-2xs text-slate-400 dark:text-slate-500">照片数量</text>
      <text class="mt-1 block text-xl font-800 text-slate-800 dark:text-slate-100">{{ albumItems.length }}</text>
    </view>
    <view class="rounded-[28rpx] bg-white/88 px-4 py-4 shadow-[0_14rpx_32rpx_rgba(148,163,184,0.12)] dark:bg-slate-900">
      <text class="block text-2xs text-slate-400 dark:text-slate-500">关键节点</text>
      <text class="mt-1 block text-xl font-800 text-slate-800 dark:text-slate-100">{{ timelineCount }}</text>
    </view>
    <view class="rounded-[28rpx] bg-white/88 px-4 py-4 shadow-[0_14rpx_32rpx_rgba(148,163,184,0.12)] dark:bg-slate-900">
      <text class="block text-2xs text-slate-400 dark:text-slate-500">最近更新</text>
      <text class="mt-1 block text-sm font-800 leading-6 text-slate-800 dark:text-slate-100">{{ latestUpdatedText
        }}</text>
    </view>
  </view>

  <view class="card-soft rounded-[32rpx] transition-all duration-300 dark:bg-slate-900">
    <view class="flex items-start justify-between gap-3">
      <view>
        <text class="block text-base font-800 text-slate-800 dark:text-slate-100">成长相册</text>
        <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
          已按时间从早到晚自动整理，点开就能直接查看大图。
        </text>
      </view>
      <TagLabel :text="`${albumItems.length} 张`" tone="slate" icon="▣" />
    </view>

    <view v-if="albumItems.length > 0" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <view v-for="item in albumItems" :key="item.id"
        class="rounded-[28rpx] bg-app-ivory/90 p-3 shadow-[0_12rpx_28rpx_rgba(148,163,184,0.08)] transition-all duration-300 active:scale-[0.98] dark:bg-slate-800">
        <AppImage class="h-[220rpx] w-full rounded-[22rpx] bg-white object-cover dark:bg-slate-900"
          :src="item.image.url" mode="aspectFill" error-text="相册图片先休息一下"
          @tap="handlePreviewAlbum(albumItems, item.image.url, canAccessAlbum)" />
        <text class="mt-3 block text-sm font-700 text-slate-800 dark:text-slate-100">{{ item.title }}</text>
        <text class="mt-1 block text-2xs leading-5 text-slate-500 dark:text-slate-300">{{
          formatDateTime(item.createdAt, { pattern: 'YYYY-MM-DD HH:mm' }) }}</text>
        <text class="mt-2 block text-sm leading-6 text-slate-500 dark:text-slate-300">{{ item.subtitle }}</text>
        <view class="mt-3 flex flex-wrap gap-2">
          <TagLabel v-for="tag in item.tags" :key="tag" :text="tag" tone="slate" />
        </view>
      </view>
    </view>

    <view v-else
      class="mt-4 rounded-[24rpx] bg-app-ivory/90 px-4 py-4 text-sm leading-6 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
      这盆植物还没有配图记录，先去植株档案或打卡页补几张图吧。
    </view>
  </view>
</template>
