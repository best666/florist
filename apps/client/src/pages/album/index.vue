<script setup lang="ts">
import { MemberBenefitType } from '@florist/contracts'
import type { IImageAsset } from '@florist/contracts'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref } from 'vue'
import { useFlowerStore, useMemberStore, useRecordStore } from '@/store'
import type {
  GrowthAlbumPhotoItem,
  GrowthPosterTemplateDefinition,
  GrowthPosterTemplateId,
  LocalFlower,
  TimelineItem,
} from '@/interfaces'
import { getRecordActionLabel } from '@/interfaces'
import {
  compressImageSafely,
  formatDateTime,
  getFlowerDisplayName,
  getTimeAgo,
  removeCachedImage,
  revokeCompressedImageUrl,
  resolvePosterImageSource,
  savePosterImageToAlbum,
  buildPosterWatermarkText,
  FREE_GROWTH_POSTER_TEMPLATES,
  MEMBER_GROWTH_POSTER_TEMPLATES,
  resolveGrowthPosterTemplate,
  getGrowthPosterOutputSize,
  resolvePosterFileName,
} from '@/utils'

type CanvasContext2D = UniApp.CanvasContext

const flowerStore = useFlowerStore()
const memberStore = useMemberStore()
const recordStore = useRecordStore()
const { activeFlowers } = storeToRefs(flowerStore)
const { sortedRecords } = storeToRefs(recordStore)

const componentInstance = getCurrentInstance()
const canvasId = 'growthPosterCanvas'
const selectedFlowerId = ref('')
const selectedTemplateId = ref<GrowthPosterTemplateId>('soft-bloom')
const posterImagePath = ref('')
const isGeneratingPoster = ref(false)
const isSavingPoster = ref(false)
const pageMessage = ref('')
const isMemberUnlocked = computed(() => (
  memberStore.hasBenefit(MemberBenefitType.NoWatermark)
  || memberStore.hasBenefit(MemberBenefitType.GrowthPoster)
))

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

function getCanvasContext(): CanvasContext2D {
  return uni.createCanvasContext(canvasId, componentInstance?.proxy)
}

async function canvasToTempFilePath(width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId,
      width,
      height,
      destWidth: width,
      destHeight: height,
      fileType: 'png',
      quality: isMemberUnlocked.value ? 1 : 0.88,
      success: result => resolve(result.tempFilePath),
      fail: () => reject(new Error('海报导出失败，请稍后再试。')),
    }, componentInstance?.proxy)
  })
}

function drawRoundRect(
  context: CanvasContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor: string,
): void {
  context.save()
  context.beginPath()
  context.setFillStyle(fillColor)
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.arcTo(x + width, y, x + width, y + radius, radius)
  context.lineTo(x + width, y + height - radius)
  context.arcTo(x + width, y + height, x + width - radius, y + height, radius)
  context.lineTo(x + radius, y + height)
  context.arcTo(x, y + height, x, y + height - radius, radius)
  context.lineTo(x, y + radius)
  context.arcTo(x, y, x + radius, y, radius)
  context.closePath()
  context.fill()
  context.restore()
}

function drawWrappedText(
  context: CanvasContext2D,
  text: string,
  x: number,
  y: number,
  lineHeight: number,
  maxCharsPerLine: number,
  color: string,
  fontSize: number,
  fontWeight: 'normal' | 'bold' = 'normal',
): void {
  context.save()
  context.setFillStyle(color)
  context.setFontSize(fontSize)
  if (fontWeight === 'bold') {
    context.font = `${fontWeight} ${fontSize}px sans-serif`
  }

  splitTextByLength(text, maxCharsPerLine).forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight)
  })
  context.restore()
}

function drawPosterLayout(
  context: CanvasContext2D,
  template: GrowthPosterTemplateDefinition,
  flowerName: string,
  careDays: number,
  imagePaths: ReadonlyArray<string>,
  width: number,
  height: number,
): void {
  context.clearRect(0, 0, width, height)
  const backgroundGradient = context.createLinearGradient(0, 0, 0, height)
  backgroundGradient.addColorStop(0, template.backgroundTopColor)
  backgroundGradient.addColorStop(1, template.backgroundBottomColor)
  context.setFillStyle(backgroundGradient)
  context.fillRect(0, 0, width, height)

  context.save()
  context.setFillStyle(`${template.accentColor}22`)
  context.beginPath()
  context.arc(width - 140, 120, 120, 0, 2 * Math.PI)
  context.fill()
  context.beginPath()
  context.arc(120, height - 180, 160, 0, 2 * Math.PI)
  context.fill()
  context.restore()

  drawRoundRect(context, 54, 54, width - 108, height - 108, 42, template.panelColor)

  context.save()
  context.setFillStyle(template.accentColor)
  context.fillRect(96, 106, 140, 14)
  context.restore()

  drawWrappedText(context, flowerName, 96, 178, 48, 10, '#25313A', 34, 'bold')
  drawWrappedText(context, `已经一起照顾了 ${careDays} 天`, 96, 238, 36, 16, '#64707A', 22)
  drawWrappedText(context, '成长相册海报', 96, 274, 34, 12, '#64707A', 20)
  drawWrappedText(context, template.stickerEmoji, width - 160, 170, 48, 2, '#25313A', 44)

  const imageCount = Math.max(Math.min(imagePaths.length, 4), 1)
  const imageTop = 344
  const imageLeft = 96
  const imageWidth = width - 192
  const singleImageHeight = 650

  if (imageCount === 1) {
    drawRoundRect(context, imageLeft, imageTop, imageWidth, singleImageHeight, 34, '#F6F0EA')
    context.drawImage(imagePaths[0]!, imageLeft, imageTop, imageWidth, singleImageHeight)
  }
  else {
    const gap = 20
    const cardWidth = (imageWidth - gap) / 2
    const cardHeight = imageCount <= 2 ? 320 : 280

    imagePaths.slice(0, 4).forEach((imagePath, index) => {
      const row = Math.floor(index / 2)
      const column = index % 2
      const cardX = imageLeft + column * (cardWidth + gap)
      const cardY = imageTop + row * (cardHeight + gap)
      drawRoundRect(context, cardX, cardY, cardWidth, cardHeight, 26, '#F6F0EA')
      context.drawImage(imagePath, cardX, cardY, cardWidth, cardHeight)
    })
  }

  drawRoundRect(context, 96, height - 284, width - 192, 130, 28, '#FFF8F0')
  drawWrappedText(context, '把每一次浇水、长叶和悄悄恢复精神的时刻，都温柔地留在今天。', 122, height - 226, 32, 20, '#53616B', 18)

  if (!isMemberUnlocked.value) {
    drawWrappedText(context, buildPosterWatermarkText(flowerName), width - 350, height - 68, 24, 20, '#A9A2A0', 16)
  }
}

const selectedFlower = computed<LocalFlower | null>(() => {
  if (selectedFlowerId.value) {
    return activeFlowers.value.find(flower => flower.id === selectedFlowerId.value) ?? null
  }

  return activeFlowers.value[0] ?? null
})

const careDays = computed(() => createCareDayCount(selectedFlower.value))

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

const freeTemplates = computed(() => FREE_GROWTH_POSTER_TEMPLATES)
const memberTemplates = computed(() => MEMBER_GROWTH_POSTER_TEMPLATES)
const selectedTemplate = computed(() => resolveGrowthPosterTemplate(selectedTemplateId.value))
const posterSourceImagePaths = computed<ReadonlyArray<string>>(() => (
  [...albumItems.value]
    .reverse()
    .slice(0, 4)
    .map(item => resolvePosterImageSource(item.image))
))
const latestAlbumItem = computed<GrowthAlbumPhotoItem | null>(() => (
  albumItems.value.length > 0 ? albumItems.value[albumItems.value.length - 1] ?? null : null
))

function handleOpenGrowthAlbum(flowerId: string): void {
  selectedFlowerId.value = flowerId
}

function handleSelectTemplate(templateId: GrowthPosterTemplateId): void {
  const nextTemplate = resolveGrowthPosterTemplate(templateId)

  if (nextTemplate.memberOnly && !isMemberUnlocked.value) {
    pageMessage.value = '这套海报是会员专属模板，开通后可以解锁无水印和高清导出。'
    return
  }

  selectedTemplateId.value = templateId
  pageMessage.value = ''
}

function handlePreviewAlbumImage(imageUrl: string): void {
  uni.previewImage({
    urls: albumItems.value.map(item => item.image.url),
    current: imageUrl,
  })
}

function handleGoCreateFlower(): void {
  uni.navigateTo({
    url: '/pages/index/index',
  })
}

async function releasePosterImage(): Promise<void> {
  if (!posterImagePath.value) {
    return
  }

  const previousPosterPath = posterImagePath.value
  posterImagePath.value = ''
  await removeCachedImage(previousPosterPath)
  revokeCompressedImageUrl(previousPosterPath)
}

async function generatePoster(): Promise<void> {
  if (!selectedFlower.value) {
    pageMessage.value = '先选一盆植物，海报才能围绕它来整理。'
    return
  }

  if (posterSourceImagePaths.value.length === 0) {
    pageMessage.value = '这盆植物还没有可用图片，先去档案或打卡里补几张照片吧。'
    return
  }

  if (selectedTemplate.value.memberOnly && !isMemberUnlocked.value) {
    pageMessage.value = '会员专属模板还没解锁，先试试上面的免费模板也很可爱。'
    return
  }

  isGeneratingPoster.value = true

  try {
    await nextTick()
    await releasePosterImage()

    const outputSize = getGrowthPosterOutputSize(isMemberUnlocked.value)
    const context = getCanvasContext()
    drawPosterLayout(
      context,
      selectedTemplate.value,
      getFlowerDisplayName(selectedFlower.value),
      careDays.value,
      posterSourceImagePaths.value,
      outputSize.width,
      outputSize.height,
    )

    await new Promise<void>((resolve) => {
      context.draw(false, () => resolve())
    })

    const rawPosterPath = await canvasToTempFilePath(outputSize.width, outputSize.height)
    const compressedPoster = await compressImageSafely(rawPosterPath, {
      maxSizeInBytes: isMemberUnlocked.value ? 2.4 * 1024 * 1024 : 1.2 * 1024 * 1024,
      initialQuality: isMemberUnlocked.value ? 0.94 : 0.84,
      minQuality: 0.52,
    })

    posterImagePath.value = compressedPoster.filePath
    pageMessage.value = isMemberUnlocked.value
      ? '高清海报已经准备好了，可以直接保存。'
      : '海报已经生成好啦，免费版会带轻水印并做普通清晰度导出。'
  }
  catch (error) {
    pageMessage.value = error instanceof Error
      ? error.message
      : '海报这次没有顺利拼出来，换几张清晰一点的图片再试试。'
  }
  finally {
    isGeneratingPoster.value = false
  }
}

async function handleSavePoster(): Promise<void> {
  if (!posterImagePath.value || !selectedFlower.value) {
    await generatePoster()

    if (!posterImagePath.value || !selectedFlower.value) {
      return
    }
  }

  isSavingPoster.value = true

  try {
    const savedMessage = await savePosterImageToAlbum(
      posterImagePath.value,
      resolvePosterFileName(getFlowerDisplayName(selectedFlower.value)),
    )
    pageMessage.value = savedMessage
  }
  catch (error) {
    pageMessage.value = error instanceof Error
      ? error.message
      : '保存海报时出了点小岔子，稍后再试试。'
  }
  finally {
    isSavingPoster.value = false
  }
}

function handleOpenMemberPosterBenefits(): void {
  uni.navigateTo({
    url: '/pages/member/index',
  })
}

onLoad((query) => {
  if (query && typeof query.flowerId === 'string') {
    selectedFlowerId.value = query.flowerId
  }
})

onShow(async () => {
  memberStore.syncMembershipStatus()
  await flowerStore.initializeGarden()
  await recordStore.initializeRecordCenter()

  if (!selectedFlowerId.value && activeFlowers.value[0]) {
    selectedFlowerId.value = activeFlowers.value[0].id
  }
})

onBeforeUnmount(() => {
  void releasePosterImage()
})
</script>

<template>
  <view
    class="page-shell safe-pb bg-linear-to-b from-[#FFFDF7] via-app-ivory to-[#F7FFF8] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-6">
      <view
        class="overflow-hidden rounded-[36rpx] bg-linear-to-br from-[#FFE9D9] via-[#FFF8EA] to-[#E3FFF4] px-5 py-5 shadow-[0_18rpx_54rpx_rgba(255,219,194,0.26)] transition-all duration-300 dark:from-slate-900 dark:via-amber-950 dark:to-emerald-950">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-white/78 text-slate-600 dark:bg-white/10 dark:text-slate-100">
              成长相册 + 海报生成保存
            </view>
            <view class="mt-3 text-[42rpx] font-900 leading-tight text-slate-800 dark:text-slate-50">
              把它从第一张照片到现在的模样，轻轻串成一条成长线
            </view>
            <view class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-200">
              自动汇总单植株照片、标出养护关键节点，并把最近的变化拼成一张柔和海报。
            </view>
          </view>
          <view
            class="flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-white/58 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.35)] dark:bg-white/8">
            📸
          </view>
        </view>
      </view>

      <view v-if="pageMessage"
        class="rounded-[28rpx] bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 shadow-[0_12rpx_28rpx_rgba(251,191,36,0.12)] dark:bg-amber-500/14 dark:text-amber-100">
        {{ pageMessage }}
      </view>

      <view class="card-soft rounded-[32rpx] transition-all duration-300 dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">选择植物</text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              相册会自动按时间汇总这盆植物的档案照片和打卡配图。
            </text>
          </view>
          <TagLabel :text="selectedFlower ? `${careDays} 天陪伴` : '待选择'" tone="mint" />
        </view>

        <scroll-view scroll-x class="mt-4 whitespace-nowrap">
          <view class="flex gap-2 pb-1">
            <button v-for="flower in activeFlowers" :key="flower.id"
              class="h-10 rounded-full border-none px-4 text-2xs font-700 transition-all duration-300"
              :class="selectedFlower?.id === flower.id ? 'bg-app-mint text-slate-700 shadow-[0_10rpx_24rpx_rgba(134,214,193,0.18)]' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="handleOpenGrowthAlbum(flower.id)">
              {{ getFlowerDisplayName(flower) }}
            </button>
          </view>
        </scroll-view>
      </view>

      <EmptyEmpty v-if="!selectedFlower" scene="flower" title="还没有可用的成长相册" description="先新增一盆植物，后续的档案照片和打卡配图就会自动汇总到这里。"
        action-text="回首页新增植株" @action="handleGoCreateFlower" />

      <template v-else>
        <view class="grid grid-cols-3 gap-3">
          <view
            class="rounded-[28rpx] bg-white/88 px-4 py-4 shadow-[0_14rpx_32rpx_rgba(148,163,184,0.12)] dark:bg-slate-900">
            <text class="block text-2xs text-slate-400 dark:text-slate-500">照片数量</text>
            <text class="mt-1 block text-xl font-800 text-slate-800 dark:text-slate-100">{{ albumItems.length }}</text>
          </view>
          <view
            class="rounded-[28rpx] bg-white/88 px-4 py-4 shadow-[0_14rpx_32rpx_rgba(148,163,184,0.12)] dark:bg-slate-900">
            <text class="block text-2xs text-slate-400 dark:text-slate-500">关键节点</text>
            <text class="mt-1 block text-xl font-800 text-slate-800 dark:text-slate-100">{{ timelineItems.length
              }}</text>
          </view>
          <view
            class="rounded-[28rpx] bg-white/88 px-4 py-4 shadow-[0_14rpx_32rpx_rgba(148,163,184,0.12)] dark:bg-slate-900">
            <text class="block text-2xs text-slate-400 dark:text-slate-500">最近更新</text>
            <text class="mt-1 block text-sm font-800 leading-6 text-slate-800 dark:text-slate-100">{{ latestAlbumItem ?
              getTimeAgo(latestAlbumItem.createdAt) : '暂无' }}</text>
          </view>
        </view>

        <view class="card-soft rounded-[32rpx] transition-all duration-300 dark:bg-slate-900">
          <view class="flex items-start justify-between gap-3">
            <view>
              <text class="block text-base font-800 text-slate-800 dark:text-slate-100">成长时间轴</text>
              <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
                从入住花园开始，到每次打卡和配图，变化会按时间自动排好。
              </text>
            </view>
            <TagLabel :text="selectedFlower.name" tone="blush" />
          </view>

          <view class="mt-4">
            <TimeLine :items="timelineItems" empty-text="这盆植物暂时还没有可展示的成长节点。" />
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
            <TagLabel :text="`${albumItems.length} 张`" tone="slate" />
          </view>

          <view v-if="albumItems.length > 0" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <view v-for="item in albumItems" :key="item.id"
              class="rounded-[28rpx] bg-app-ivory/90 p-3 shadow-[0_12rpx_28rpx_rgba(148,163,184,0.08)] transition-all duration-300 active:scale-[0.98] dark:bg-slate-800">
              <AppImage class="h-[220rpx] w-full rounded-[22rpx] bg-white object-cover dark:bg-slate-900"
                :src="item.image.url" mode="aspectFill" error-text="相册图片先休息一下"
                @tap="handlePreviewAlbumImage(item.image.url)" />
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

        <view class="card-soft rounded-[32rpx] transition-all duration-300 dark:bg-slate-900">
          <view class="flex items-start justify-between gap-3">
            <view>
              <text class="block text-base font-800 text-slate-800 dark:text-slate-100">海报模板</text>
              <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
                免费模板 2 套可直接用，会员模板支持无水印和高清导出。
              </text>
            </view>
            <button class="h-9 rounded-full border-none bg-app-blush px-4 text-2xs font-700 text-slate-700"
              hover-class="opacity-92" @tap="handleOpenMemberPosterBenefits">
              会员权益
            </button>
          </view>

          <view class="mt-4 grid gap-3">
            <view class="grid gap-3 md:grid-cols-2">
              <view v-for="template in freeTemplates" :key="template.id"
                class="rounded-[28rpx] px-4 py-4 shadow-[0_14rpx_32rpx_rgba(148,163,184,0.1)] transition-all duration-300"
                :class="selectedTemplate.id === template.id ? 'ring-2 ring-[#86D6C1] bg-white dark:bg-slate-800' : 'bg-app-ivory/90 dark:bg-slate-800'"
                @tap="handleSelectTemplate(template.id)">
                <view class="flex items-start justify-between gap-3">
                  <view>
                    <text class="block text-sm font-800 text-slate-800 dark:text-slate-100">{{ template.name }}</text>
                    <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">{{ template.subtitle
                      }}</text>
                  </view>
                  <TagLabel :text="template.badgeText" tone="mint" />
                </view>
              </view>
            </view>

            <view class="grid gap-3 md:grid-cols-2">
              <view v-for="template in memberTemplates" :key="template.id"
                class="rounded-[28rpx] px-4 py-4 shadow-[0_14rpx_32rpx_rgba(148,163,184,0.1)] transition-all duration-300"
                :class="selectedTemplate.id === template.id ? 'ring-2 ring-[#E88AB5] bg-white dark:bg-slate-800' : 'bg-app-ivory/90 dark:bg-slate-800'"
                @tap="handleSelectTemplate(template.id)">
                <view class="flex items-start justify-between gap-3">
                  <view>
                    <text class="block text-sm font-800 text-slate-800 dark:text-slate-100">{{ template.name }}</text>
                    <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">{{ template.subtitle
                      }}</text>
                  </view>
                  <TagLabel :text="template.badgeText" tone="cream" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="card-soft rounded-[32rpx] transition-all duration-300 dark:bg-slate-900">
          <view class="flex items-start justify-between gap-3">
            <view>
              <text class="block text-base font-800 text-slate-800 dark:text-slate-100">海报预览</text>
              <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
                海报会自动拼接最近图片，并排入植株名称和养护天数。
              </text>
            </view>
            <TagLabel :text="isMemberUnlocked ? '高清无水印' : '普通清晰度 + 水印'" :tone="isMemberUnlocked ? 'mint' : 'slate'" />
          </view>

          <view v-if="posterImagePath"
            class="mt-4 rounded-[32rpx] bg-linear-to-b from-[#FFF8F2] to-[#F5FFF9] p-4 dark:from-slate-800 dark:to-slate-900">
            <AppImage
              class="mx-auto w-full max-w-[560rpx] rounded-[28rpx] bg-white object-cover shadow-[0_16rpx_40rpx_rgba(148,163,184,0.16)] dark:bg-slate-900"
              :src="posterImagePath" mode="widthFix" error-text="海报预览正在整理" />
          </view>
          <view v-else
            class="mt-4 rounded-[28rpx] border border-dashed border-[#D9E8E1] bg-app-ivory/70 px-4 py-8 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            生成后会在这里看到海报预览。
          </view>

          <view class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <SubmitBtn text="生成成长海报" loading-text="海报生成中..." :loading="isGeneratingPoster"
              :disabled="albumItems.length === 0" @click="generatePoster" />
            <SubmitBtn text="保存到本地相册" loading-text="保存中..." variant="blush" :loading="isSavingPoster"
              :disabled="albumItems.length === 0" @click="handleSavePoster" />
          </view>
        </view>
      </template>

      <canvas canvas-id="growthPosterCanvas" id="growthPosterCanvas"
        class="pointer-events-none fixed left-[-9999px] top-[-9999px] h-[720px] w-[480px] opacity-0" />
    </view>
  </view>
</template>
