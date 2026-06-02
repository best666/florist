<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import GrowthAlbumGallery from '@/components/GrowthAlbumGallery.vue'
import GrowthPosterWorkbench from '@/components/GrowthPosterWorkbench.vue'
import AppBottomNav from '@/components/AppBottomNav.vue'
import CollapsibleSection from '@/components/CollapsibleSection.vue'
import EmptyEmpty from '@/components/EmptyEmpty.vue'
import InfoPopover from '@/components/InfoPopover.vue'
import PageHero from '@/components/PageHero.vue'
import TagLabel from '@/components/TagLabel.vue'
import TimeLine from '@/components/TimeLine.vue'
import { useFlowerStore, useFlowerTaxonomyStore, useMemberStore, useRecordStore } from '@/store'
import type {
  GrowthAlbumPhotoItem,
  LocalFlower,
  TimelineItem,
} from '@/interfaces'
import { getRecordActionLabel } from '@/interfaces'
import { usePageTheme } from '@/hooks/usePageTheme'
import {
  formatDateTime,
  getFlowerDisplayName,
  getTimeAgo,
} from '@/utils'

const themeClass = usePageTheme()

const flowerStore = useFlowerStore()
const flowerTaxonomyStore = useFlowerTaxonomyStore()
const memberStore = useMemberStore()
const recordStore = useRecordStore()
const { activeFlowers } = storeToRefs(flowerStore)
const { sortedRecords } = storeToRefs(recordStore)
const selectedFlowerId = ref('')
const pageMessage = ref('')
const canAccessAlbum = computed(() => true)
const isMemberUnlocked = computed(() => true)

function createCareDayCount(flower: LocalFlower | null): number {
  if (!flower) {
    return 0
  }

  const diffInMs = Date.now() - new Date(flower.createdAt).getTime()
  return Math.max(Math.floor(diffInMs / (24 * 60 * 60 * 1000)) + 1, 1)
}

function sortAlbumItems(items: ReadonlyArray<GrowthAlbumPhotoItem>): GrowthAlbumPhotoItem[] {
  return [...items].sort((leftItem, rightItem) => (
    leftItem.createdAt.localeCompare(rightItem.createdAt)
  ))
}

function splitTextByLength(text: string, maxChars: number): string[] {
  const normalizedText = text.trim()

  if (normalizedText.length <= maxChars) {
    return [normalizedText]
  }

  const result: string[] = []

  for (let startIndex = 0; startIndex < normalizedText.length; startIndex += maxChars) {
    result.push(normalizedText.slice(startIndex, startIndex + maxChars))
  }

  return result
}

const selectedFlower = computed<LocalFlower | null>(() => {
  if (selectedFlowerId.value) {
    return activeFlowers.value.find(flower => flower.id === selectedFlowerId.value) ?? null
  }

  return activeFlowers.value[0] ?? null
})

const careDays = computed(() => createCareDayCount(selectedFlower.value))
const selectedFlowerCategoryLabel = computed(() => (
  selectedFlower.value ? flowerTaxonomyStore.resolveFlowerCategoryLabel(selectedFlower.value) : ''
))
const selectedFlowerStatusLabel = computed(() => (
  selectedFlower.value ? flowerTaxonomyStore.resolveFlowerCareStatusLabel(selectedFlower.value) : ''
))

const albumItems = computed<ReadonlyArray<GrowthAlbumPhotoItem>>(() => {
  const flower = selectedFlower.value

  if (!flower) {
    return []
  }

  const flowerArchiveItems = flower.images.map((image, index) => ({
    id: `flower-${flower.id}-${image.id}`,
    flowerId: flower.id,
    createdAt: image.createdAt || flower.createdAt,
    image,
    sourceType: 'flower-archive' as const,
    title: index === 0 ? '初始植株档案' : '补充成长照片',
    subtitle: index === 0 ? '第一次留下的样子被轻轻收进相册里。' : '这一张被收进植株档案，方便以后回看变化。',
    tags: ['植株档案', getTimeAgo(image.createdAt || flower.createdAt)],
  }))

  const recordItems = recordStore.getRecordsByFlowerId(flower.id)
    .flatMap(record => record.images.map((image) => ({
      id: `record-${record.id}-${image.id}`,
      flowerId: flower.id,
      createdAt: image.createdAt || record.createdAt,
      image,
      sourceType: 'record-checkin' as const,
      title: `${getRecordActionLabel(record.actionType)}记录`,
      subtitle: record.note || '这次养护时顺手留下了一张近况照片。',
      tags: [getRecordActionLabel(record.actionType), getTimeAgo(record.createdAt)],
    })))

  return sortAlbumItems([...flowerArchiveItems, ...recordItems])
})

const timelineItems = computed<ReadonlyArray<TimelineItem>>(() => {
  const flower = selectedFlower.value

  if (!flower) {
    return []
  }

  const baseTimeline: TimelineItem[] = [
    {
      id: `flower-born-${flower.id}`,
      title: `${getFlowerDisplayName(flower)} 入住花园`,
      timestamp: formatDateTime(flower.createdAt, { pattern: 'YYYY-MM-DD HH:mm' }),
      description: '这是它来到花园后被记录下来的起点。',
      tags: ['成长起点', `${careDays.value} 天陪伴`],
      status: 'healthy',
      tone: 'mint',
    },
  ]

  recordStore.getRecordsByFlowerId(flower.id).forEach((record) => {
    baseTimeline.push({
      id: `record-node-${record.id}`,
      title: `${getRecordActionLabel(record.actionType)} 关键节点`,
      timestamp: formatDateTime(record.createdAt, { pattern: 'YYYY-MM-DD HH:mm' }),
      description: record.note || '这次照顾已经成为它成长时间轴里的一枚关键脚印。',
      tags: [
        `${record.images.length} 张配图`,
        `${record.cooldownMinutes} 分钟冷却`,
      ],
      status: record.actionType === 'watering' ? 'watering-needed' : 'healthy',
      tone: record.images.length > 0 ? 'blush' : 'cream',
    })
  })

  return [...baseTimeline].sort((leftItem, rightItem) => leftItem.timestamp.localeCompare(rightItem.timestamp))
})

const latestAlbumItem = computed<GrowthAlbumPhotoItem | null>(() => (
  albumItems.value.length > 0 ? albumItems.value[albumItems.value.length - 1] ?? null : null
))
const latestUpdatedText = computed(() => (latestAlbumItem.value ? getTimeAgo(latestAlbumItem.value.createdAt) : '暂无'))

function handleOpenGrowthAlbum(flowerId: string): void {
  selectedFlowerId.value = flowerId
}

function handleGoCreateFlower(): void {
  uni.navigateTo({
    url: '/pages/index/index',
  })
}

onLoad((query) => {
  if (query && typeof query.flowerId === 'string') {
    selectedFlowerId.value = query.flowerId
  }
})

onShow(async () => {
  await memberStore.initializeMembership(true)
  await flowerStore.initializeGarden()
  await recordStore.initializeRecordCenter()

  if (!canAccessAlbum.value) {
    pageMessage.value = '成长相册仅对会员开放。开通会员后，植物档案图片和打卡配图才会同步到这里。'
  }

  if (!selectedFlowerId.value && activeFlowers.value[0]) {
    selectedFlowerId.value = activeFlowers.value[0].id
  }
})
</script>

<template>
  <view
    class="page-shell safe-pb bg-linear-to-b from-[var(--color-ivory)] via-[var(--color-cream)] to-[var(--color-ivory)]" :class="themeClass">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-[140rpx]">
      <PageHero
        badge="成长相册 + 海报生成保存"
        title="把它从第一张照片到现在的模样，轻轻串成一条成长线"
        tip="选择一盆植物，相册会自动收集它的档案照片和打卡配图按时间排列。还能把最近的变化拼成一张柔和的海报保存分享。"
        emoji="📸"
      />

      <view v-if="pageMessage"
        class="rounded-[28rpx] bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 shadow-[0_12rpx_28rpx_rgba(251,191,36,0.12)] dark:bg-amber-500/14 dark:text-amber-100">
        {{ pageMessage }}
      </view>

      <view class="card-soft rounded-[32rpx] transition-all duration-300 dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <view class="flex items-center gap-1">
              <text class="block text-base font-800 text-app-ink dark:text-slate-100">选择植物</text>
              <InfoPopover content="相册会自动按时间汇总这盆植物的档案照片和打卡配图，滑动即可浏览它的成长历程。" />
            </view>
          </view>
          <TagLabel :text="selectedFlower ? `${careDays} 天陪伴` : '待选择'" :tone="selectedFlower ? 'mint' : 'slate'"
            :icon="selectedFlower ? '✓' : '○'" size="md" />
        </view>

        <scroll-view scroll-x class="mt-4 whitespace-nowrap">
          <view class="flex gap-2 pb-1">
            <button v-for="flower in activeFlowers" :key="flower.id" class="btn-chip transition-all duration-300"
              :class="selectedFlower?.id === flower.id ? 'bg-app-mint text-app-ink shadow-[0_10rpx_24rpx_rgba(134,214,193,0.18)]' : 'bg-app-ivory text-app-muted dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="handleOpenGrowthAlbum(flower.id)">
              {{ getFlowerDisplayName(flower) }}
            </button>
          </view>
        </scroll-view>

        <view v-if="selectedFlower" class="mt-3 flex flex-wrap gap-2">
          <TagLabel :text="selectedFlowerCategoryLabel" tone="blush" icon="✿" />
          <TagLabel :text="selectedFlowerStatusLabel" :status="selectedFlower.careStatus" />
        </view>
      </view>

      <EmptyEmpty v-if="!selectedFlower" scene="flower" title="还没有可用的成长相册" description="先新增一盆植物，后续的档案照片和打卡配图就会自动汇总到这里。"
        action-text="回首页新增植株" @action="handleGoCreateFlower" />

      <template v-else>
        <GrowthAlbumGallery :album-items="albumItems" :timeline-count="timelineItems.length"
          :latest-updated-text="latestUpdatedText" :can-access-album="canAccessAlbum" />

        <CollapsibleSection title="成长时间轴" description="关键节点折叠收纳，默认先看相册和海报操作。" :tag-text="selectedFlowerCategoryLabel"
          tag-tone="blush" tag-icon="✿">
          <TimeLine :items="timelineItems" empty-text="这盆植物暂时还没有可展示的成长节点。" />
        </CollapsibleSection>

        <GrowthPosterWorkbench :selected-flower="selectedFlower" :care-days="careDays" :album-items="albumItems"
          :is-member-unlocked="isMemberUnlocked" />
      </template>
    </view>

    <AppBottomNav active-key="album" />
  </view>
</template>
