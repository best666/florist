<script setup lang="ts">
import type {
  GrowthAlbumPhotoItem,
  GrowthPosterTemplateDefinition,
  GrowthPosterTemplateId,
  LocalFlower,
} from '@/interfaces'
import {
  compressImageSafely,
  FREE_GROWTH_POSTER_TEMPLATES,
  getFlowerDisplayName,
  getGrowthPosterOutputSize,
  MEMBER_GROWTH_POSTER_TEMPLATES,
  removeCachedImage,
  resolveGrowthPosterTemplate,
  resolvePosterFileName,
  resolvePosterImageSource,
  revokeCompressedImageUrl,
  savePosterImageToAlbum,
} from '@/utils'
import TagLabel from './app/TagLabel.vue'
import SubmitBtn from './app/SubmitBtn.vue'
import AppImage from './app/AppImage.vue'
import CollapsibleSection from './app/CollapsibleSection.vue'
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue'

type CanvasContext2D = UniApp.CanvasContext

interface GrowthPosterWorkbenchProps {
  selectedFlower: LocalFlower | null
  careDays: number
  albumItems: ReadonlyArray<GrowthAlbumPhotoItem>
}

const props = defineProps<GrowthPosterWorkbenchProps>()

const componentInstance = getCurrentInstance()
const canvasId = 'growthPosterCanvas'
const selectedTemplateId = ref<GrowthPosterTemplateId>('soft-bloom')
const posterImagePath = ref('')
const isGeneratingPoster = ref(false)
const isSavingPoster = ref(false)
const pageMessage = ref('')

const allTemplates = computed(() => [...FREE_GROWTH_POSTER_TEMPLATES, ...MEMBER_GROWTH_POSTER_TEMPLATES])
const selectedTemplate = computed(() => resolveGrowthPosterTemplate(selectedTemplateId.value))
const posterSourceImagePaths = computed<ReadonlyArray<string>>(() =>
  [...props.albumItems]
    .reverse()
    .slice(0, 4)
    .map((item) => resolvePosterImageSource(item.image)),
)

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
    uni.canvasToTempFilePath(
      {
        canvasId,
        width,
        height,
        destWidth: width,
        destHeight: height,
        fileType: 'png',
        quality: 1,
        success: (result) => resolve(result.tempFilePath),
        fail: () => reject(new Error('海报导出失败，请稍后再试。')),
      },
      componentInstance?.proxy,
    )
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
  } else {
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
  drawWrappedText(
    context,
    '把每一次浇水、长叶和悄悄恢复精神的时刻，都温柔地留在今天。',
    122,
    height - 226,
    32,
    20,
    '#53616B',
    18,
  )

}

function handleSelectTemplate(templateId: GrowthPosterTemplateId): void {
  selectedTemplateId.value = templateId
  pageMessage.value = ''
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
  if (!props.selectedFlower) {
    pageMessage.value = '先选一盆植物，海报才能围绕它来整理。'
    return
  }

  if (posterSourceImagePaths.value.length === 0) {
    pageMessage.value = '这盆植物还没有可用图片，先去档案或打卡里补几张照片吧。'
    return
  }

  isGeneratingPoster.value = true

  try {
    await nextTick()
    await releasePosterImage()

    const outputSize = getGrowthPosterOutputSize(true)
    const context = getCanvasContext()
    drawPosterLayout(
      context,
      selectedTemplate.value,
      getFlowerDisplayName(props.selectedFlower),
      props.careDays,
      posterSourceImagePaths.value,
      outputSize.width,
      outputSize.height,
    )

    await new Promise<void>((resolve) => {
      context.draw(false, () => resolve())
    })

    const rawPosterPath = await canvasToTempFilePath(outputSize.width, outputSize.height)
    const compressedPoster = await compressImageSafely(rawPosterPath, {
      maxSizeInBytes: 2.4 * 1024 * 1024,
      initialQuality: 0.94,
      minQuality: 0.52,
    })

    posterImagePath.value = compressedPoster.filePath
    pageMessage.value = '高清海报已经准备好了，可以直接保存。'
  } catch (error) {
    pageMessage.value =
      error instanceof Error ? error.message : '海报这次没有顺利拼出来，换几张清晰一点的图片再试试。'
  } finally {
    isGeneratingPoster.value = false
  }
}

async function handleSavePoster(): Promise<void> {
  if (!posterImagePath.value || !props.selectedFlower) {
    await generatePoster()

    if (!posterImagePath.value || !props.selectedFlower) {
      return
    }
  }

  isSavingPoster.value = true

  try {
    const savedMessage = await savePosterImageToAlbum(
      posterImagePath.value,
      resolvePosterFileName(getFlowerDisplayName(props.selectedFlower)),
    )
    pageMessage.value = savedMessage
  } catch (error) {
    pageMessage.value = error instanceof Error ? error.message : '保存海报时出了点小岔子，稍后再试试。'
  } finally {
    isSavingPoster.value = false
  }
}

watch(
  () => [props.selectedFlower?.id, props.albumItems.length] as const,
  () => {
    pageMessage.value = ''
    void releasePosterImage()
  },
)

onBeforeUnmount(() => {
  void releasePosterImage()
})
</script>

<template>
  <view
    v-if="pageMessage"
    class="rounded-[28rpx] bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 shadow-[0_12rpx_28rpx_rgba(251,191,36,0.12)] dark:bg-amber-500/14 dark:text-amber-100"
  >
    {{ pageMessage }}
  </view>

  <CollapsibleSection
    title="海报模板"
    description="模板选择收起后，相册主线会更清楚。"
    :tag-text="selectedTemplate.name"
    tag-tone="cream"
    tag-icon="★"
  >
    <view class="mt-4 flex flex-col gap-12rpx">
      <view
        v-for="template in allTemplates"
        :key="template.id"
        class="rounded-[28rpx] px-4 py-4 shadow-[0_14rpx_32rpx_rgba(148,163,184,0.1)] transition-all duration-300"
        :class="
          selectedTemplate.id === template.id
            ? 'ring-2 ring-[#86D6C1] bg-[var(--color-surface)] dark:bg-slate-800'
            : 'bg-app-ivory/90 dark:bg-slate-800'
        "
        @tap="handleSelectTemplate(template.id)"
      >
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-sm font-800 text-app-ink dark:text-slate-100">{{ template.name }}</text>
            <text class="mt-1 block text-sm leading-6 text-app-muted dark:text-slate-300">{{
              template.subtitle
            }}</text>
          </view>
          <TagLabel
            :text="template.badgeText"
            tone="mint"
            icon="✓"
          />
        </view>
      </view>
    </view>
  </CollapsibleSection>

  <CollapsibleSection
    title="海报预览"
    description="海报会自动选取最近的 4 张照片拼接排版，并标注植株名称和累计养护天数。"
    tag-text="高清无水印"
    tag-tone="mint"
    tag-icon="✓"
    default-expanded
  >
    <view
      v-if="posterImagePath"
      class="rounded-[32rpx] bg-linear-to-b from-[#FFF8F2] to-[#F5FFF9] p-4 dark:from-slate-800 dark:to-slate-900"
    >
      <AppImage
        class="mx-auto w-full max-w-[560rpx] rounded-[28rpx] bg-[var(--color-surface)] object-cover shadow-[0_16rpx_40rpx_rgba(148,163,184,0.16)] dark:bg-slate-900"
        :src="posterImagePath"
        mode="widthFix"
        error-text="海报预览正在整理"
      />
    </view>
    <view
      v-else
      class="rounded-[28rpx] border border-dashed border-[#D9E8E1] bg-app-ivory/70 px-4 py-8 text-center text-sm leading-6 text-app-muted dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
    >
      生成后会在这里看到海报预览。
    </view>

    <view class="mt-4 flex flex-col gap-12rpx">
      <SubmitBtn
        text="生成成长海报"
        loading-text="海报生成中..."
        :loading="isGeneratingPoster"
        :disabled="albumItems.length === 0"
        @click="generatePoster"
      />
      <SubmitBtn
        text="保存到本地相册"
        loading-text="保存中..."
        variant="blush"
        :loading="isSavingPoster"
        :disabled="albumItems.length === 0"
        @click="handleSavePoster"
      />
    </view>
  </CollapsibleSection>

  <canvas
    canvas-id="growthPosterCanvas"
    id="growthPosterCanvas"
    class="pointer-events-none fixed left-[-9999px] top-[-9999px] h-[720px] w-[480px] opacity-0"
  />
</template>
