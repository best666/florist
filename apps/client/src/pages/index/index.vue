<script setup lang="ts">
import type { IAiAdvice } from '@florist/contracts'
import { FlowerCareDifficulty, FlowerCategory, FlowerPlacement } from '@florist/contracts'
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { fetchGardenAiCareAdvice } from '@/api'
import FlowerFormPopup from '@/components/FlowerFormPopup.vue'
import HomeWeatherReminderPanel from '@/components/HomeWeatherReminderPanel.vue'
import SingleFlowerAiAdvicePanel from '@/components/SingleFlowerAiAdvicePanel.vue'
import { useLocationWeatherReminder } from '@/hooks/useLocationWeatherReminder'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSingleFlowerAiAdvice } from '@/hooks/useSingleFlowerAiAdvice'
import {
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_PLACEMENT_OPTIONS,
  type FlowerCardCareItem,
  type FlowerFilterState,
  type FlowerFormValues,
  type LocalFlower,
  type TimelineItem,
  createCurrentFlowerCareTime,
  createDefaultFlowerFormValues,
  getFlowerCareDifficultyLabel,
  getFlowerPlacementLabel,
} from '@/interfaces'
import { useFlowerStore, useFlowerTaxonomyStore, useMemberStore, useRecordStore } from '@/store'
import { formatDateTime, getFlowerDisplayName, getTimeAgo, showGentleSuccess, showGentleToast } from '@/utils'

const flowerStore = useFlowerStore()
const flowerTaxonomyStore = useFlowerTaxonomyStore()
const memberStore = useMemberStore()
const recordStore = useRecordStore()
const { activeFlowers, recycleBinFlowers } = storeToRefs(flowerStore)
const { sortedRecords } = storeToRefs(recordStore)
const { isOffline } = useNetworkStatus()
const {
  state: weatherReminderState,
  locateCity,
  requestLocationPermissionAgain,
  searchCities,
  setManualCity,
  refreshWeather,
  updateReminderConfig,
} = useLocationWeatherReminder()

const viewportWidth = ref(uni.getSystemInfoSync().windowWidth)
const isFormVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingFlowerId = ref<string | null>(null)
const deletingFlower = ref<LocalFlower | null>(null)
const isSaving = ref(false)
const aiAdvice = ref<IAiAdvice | null>(null)
const loadingAiAdvice = ref(false)
const aiAdviceMessage = ref('')
const selectedAdviceFlowerId = ref<string | null>(null)
const isQuickDrawerVisible = ref(false)

const {
  state: singleFlowerAiState,
  scheduleFetch: scheduleSingleFlowerAiFetch,
  refreshNow: refreshSingleFlowerAiNow,
} = useSingleFlowerAiAdvice()

const filterState = reactive<FlowerFilterState>({
  category: 'all',
  placement: 'all',
  careStatus: 'all',
})

onShow(async () => {
  await flowerStore.initializeGarden()
  await recordStore.initializeRecordCenter()

  if (weatherReminderState.city) {
    await refreshWeather(weatherReminderState.city)
    return
  }

  await locateCity()
})

watch(
  [
    () => weatherReminderState.weather?.fetchedAt ?? '',
    () => activeFlowers.value.map(flower => `${flower.id}:${flower.updatedAt}`).join('|'),
    () => sortedRecords.value[0]?.createdAt ?? '',
    () => isOffline.value,
  ],
  async ([weatherKey]) => {
    if (!weatherKey || !weatherReminderState.weather || activeFlowers.value.length === 0) {
      aiAdvice.value = null
      aiAdviceMessage.value = ''
      return
    }

    if (isOffline.value) {
      aiAdvice.value = null
      aiAdviceMessage.value = '当前是离线模式，AI 建议先暂停一下，先按天气和盆土状态照顾花园也很稳。'
      return
    }

    loadingAiAdvice.value = true

    try {
      aiAdvice.value = await fetchGardenAiCareAdvice({
        weather: weatherReminderState.weather,
        flowers: activeFlowers.value,
        records: sortedRecords.value,
      })
      aiAdviceMessage.value = ''
    }
    catch (error) {
      aiAdvice.value = null
      aiAdviceMessage.value = error instanceof Error
        ? error.message
        : 'AI 建议刚刚没有接上，先用天气卡片安排今天的照顾节奏。'
    }
    finally {
      loadingAiAdvice.value = false
    }
  },
  {
    immediate: true,
  },
)

const formInitialValue = computed<FlowerFormValues>(() => {
  if (!editingFlowerId.value) {
    return createDefaultFlowerFormValues()
  }

  const targetFlower = flowerStore.getFlowerById(editingFlowerId.value)

  if (!targetFlower) {
    return createDefaultFlowerFormValues()
  }

  return {
    name: targetFlower.name,
    nickname: targetFlower.nickname ?? '',
    category: targetFlower.category,
    customCategoryId: flowerTaxonomyStore.flowerSelections[targetFlower.id]?.customCategoryId,
    placement: targetFlower.placement,
    careDifficulty: targetFlower.careDifficulty,
    careStatus: targetFlower.careStatus,
    customCareStatusId: flowerTaxonomyStore.flowerSelections[targetFlower.id]?.customCareStatusId,
    note: targetFlower.note ?? '',
    images: [...targetFlower.images],
    lastWateredAt: targetFlower.lastWateredAt ?? createCurrentFlowerCareTime(),
    lastFertilizedAt: targetFlower.lastFertilizedAt ?? createCurrentFlowerCareTime(),
  }
})

const flowerCategoryOptions = computed(() => flowerTaxonomyStore.categoryOptions)
const flowerCareStatusOptions = computed(() => flowerTaxonomyStore.careStatusOptions)

const filteredFlowers = computed(() => activeFlowers.value.filter((flower) => {
  if (filterState.category !== 'all' && flowerTaxonomyStore.resolveFlowerCategoryFilterKey(flower) !== filterState.category) {
    return false
  }

  if (filterState.placement !== 'all' && flower.placement !== filterState.placement) {
    return false
  }

  if (filterState.careStatus !== 'all' && flowerTaxonomyStore.resolveFlowerCareStatusFilterKey(flower) !== filterState.careStatus) {
    return false
  }

  return true
}))

const selectedAdviceFlower = computed<LocalFlower | null>(() => {
  if (selectedAdviceFlowerId.value) {
    const targetFlower = activeFlowers.value.find(flower => flower.id === selectedAdviceFlowerId.value)

    if (targetFlower) {
      return targetFlower
    }
  }

  return filteredFlowers.value[0] ?? activeFlowers.value[0] ?? null
})

watch(
  [
    () => weatherReminderState.weather?.fetchedAt ?? '',
    () => selectedAdviceFlower.value?.id ?? '',
    () => sortedRecords.value.map(record => `${record.id}:${record.createdAt}`).join('|'),
    () => isOffline.value,
  ],
  ([weatherKey, flowerId]) => {
    if (!weatherKey || !flowerId || !selectedAdviceFlower.value || !weatherReminderState.weather) {
      scheduleSingleFlowerAiFetch(null)
      return
    }

    scheduleSingleFlowerAiFetch({
      flower: selectedAdviceFlower.value,
      weather: weatherReminderState.weather,
      records: sortedRecords.value,
      isOffline: isOffline.value,
    })
  },
  {
    immediate: true,
  },
)

const flowerGridClass = computed(() => (
  viewportWidth.value >= 680 ? 'grid-cols-2' : 'grid-cols-1'
))

const summaryCards = computed(() => ([
  {
    key: 'all',
    label: '植株总数',
    value: String(activeFlowers.value.length),
    accentClass: 'from-[#92E5D5] to-[#FFF2D1]',
  },
  {
    key: 'healthy',
    label: '状态稳定',
    value: String(activeFlowers.value.filter(flower => flower.careStatus === 'healthy').length),
    accentClass: 'from-[#F8CADB] to-[#FFF0D8]',
  },
  {
    key: 'trash',
    label: '回收站',
    value: String(recycleBinFlowers.value.length),
    accentClass: 'from-[#FFF0C7] to-[#FCE7D7]',
  },
]))

const quickDrawerActions = computed(() => ([
  {
    key: 'album',
    title: '成长相册',
    hint: '查看最近照片、成长节点，并生成海报。',
    icon: '▣',
  },
  {
    key: 'doctor',
    title: 'AI 看病与出差方案',
    hint: '把问诊、诊断和临时出差照护集中到这里。',
    icon: '✦',
  },
  {
    key: 'mine',
    title: '个人中心',
    hint: '会员、备份、权限和反馈都放在这里。',
    icon: '◌',
  },
  {
    key: 'shop',
    title: '极简商城',
    hint: '外链种草入口，不打断首页主流程。',
    icon: '↗',
  },
]))

const recycleTimelineItems = computed<ReadonlyArray<TimelineItem>>(() => (
  recycleBinFlowers.value.slice(0, 5).map(flower => ({
    id: flower.id,
    title: `${flower.name} 已移入回收站`,
    timestamp: flower.pendingPurgeAt
      ? `预计 ${formatDateTime(flower.pendingPurgeAt, { pattern: 'YYYY-MM-DD HH:mm' })} 清除`
      : '等待清理',
    description: flower.deletedAt
      ? `删除于 ${getTimeAgo(flower.deletedAt)}，7 天内会自动完成清理。`
      : '已进入待清理队列。',
    status: 'dormant',
    tone: 'slate',
    tags: [flowerTaxonomyStore.resolveFlowerCategoryLabel(flower), getFlowerPlacementLabel(flower.placement)],
  }))
))

function buildFlowerCardItems(flower: LocalFlower): ReadonlyArray<FlowerCardCareItem> {
  return [
    {
      label: '位置',
      value: getFlowerPlacementLabel(flower.placement),
    },
    {
      label: '难度',
      value: getFlowerCareDifficultyLabel(flower.careDifficulty),
    },
    {
      label: '浇水',
      value: flower.lastWateredAt ? getTimeAgo(flower.lastWateredAt) : '待记录',
    },
  ]
}

function handleOpenCreate(): void {
  formMode.value = 'create'
  editingFlowerId.value = null
  isFormVisible.value = true
}

function handleEditFlower(flower: LocalFlower): void {
  formMode.value = 'edit'
  editingFlowerId.value = flower.id
  isFormVisible.value = true
}

function handlePreviewFlower(flower: LocalFlower): void {
  const firstImage = flower.images[0]

  if (!firstImage) {
    showGentleToast('这盆植物还没有配图，等你拍一张好看的再来看。')
    return
  }

  uni.previewImage({
    urls: flower.images.map(image => image.url),
    current: firstImage.url,
  })
}

function handleDeleteFlower(flower: LocalFlower): void {
  deletingFlower.value = flower
}

function handleCardAction(flower: LocalFlower, actionKey: string): void {
  if (actionKey === 'preview') {
    handlePreviewFlower(flower)
    return
  }

  if (actionKey === 'album') {
    uni.navigateTo({
      url: `/pages/album/index?flowerId=${flower.id}`,
    })
    return
  }

  if (actionKey === 'ai-advice') {
    selectedAdviceFlowerId.value = flower.id
    return
  }

  if (actionKey === 'record') {
    uni.navigateTo({
      url: `/pages/record/index?flowerId=${flower.id}`,
    })
    return
  }

  if (actionKey === 'delete') {
    handleDeleteFlower(flower)
  }
}

function handleCloseForm(): void {
  isFormVisible.value = false
}

async function handleSubmitFlower(values: FlowerFormValues): Promise<void> {
  isSaving.value = true

  try {
    await flowerStore.upsertFlower(values, editingFlowerId.value ?? undefined)
    isFormVisible.value = false
    editingFlowerId.value = null
    showGentleSuccess(formMode.value === 'edit' ? '植株档案已经更新好啦。' : '新的植物档案已经安稳住进花园。')
  }
  finally {
    isSaving.value = false
  }
}

async function handleConfirmDelete(): Promise<void> {
  if (!deletingFlower.value) {
    return
  }

  const deletedFlowerName = deletingFlower.value.name
  await flowerStore.moveFlowerToRecycleBin(deletingFlower.value.id)
  deletingFlower.value = null
  showGentleToast(`${deletedFlowerName} 已移到回收站，7 天内都还能轻轻找回来。`)
}

function resetFilters(): void {
  filterState.category = 'all'
  filterState.placement = 'all'
  filterState.careStatus = 'all'
}

function handleToggleReminderEnabled(): void {
  updateReminderConfig({
    enabled: !weatherReminderState.reminderConfig.enabled,
  })
}

function normalizeBoundedNumber(value: number, maxValue: number): number {
  return Math.min(Math.max(value, 0), maxValue)
}

function updateQuietHour(key: 'startHour' | 'endHour', value: number): void {
  updateReminderConfig({
    quietHours: {
      ...weatherReminderState.reminderConfig.quietHours,
      [key]: normalizeBoundedNumber(value, 23),
    },
  })
}

function handleReminderHourInput(nextHour: number): void {
  updateReminderConfig({
    reminderHour: normalizeBoundedNumber(nextHour, 23),
  })
}

function handleReminderMinuteInput(nextMinute: number): void {
  updateReminderConfig({
    reminderMinute: normalizeBoundedNumber(nextMinute, 59),
  })
}

function handleQuietStartHourInput(nextHour: number): void {
  updateQuietHour('startHour', nextHour)
}

function handleQuietEndHourInput(nextHour: number): void {
  updateQuietHour('endHour', nextHour)
}

function handleReminderTextInput(reminderText: string): void {
  updateReminderConfig({
    reminderText,
  })
}

function handleRefreshSingleFlowerAiAdvice(): void {
  if (!selectedAdviceFlower.value || !weatherReminderState.weather) {
    return
  }

  refreshSingleFlowerAiNow({
    flower: selectedAdviceFlower.value,
    weather: weatherReminderState.weather,
    records: sortedRecords.value,
    isOffline: isOffline.value,
  })
}

function handleOpenGrowthAlbum(): void {
  if (!memberStore.hasCloudGardenAccess) {
    showGentleToast('成长相册仅对会员开放，开通后才能查看和管理植物图片。')
    uni.navigateTo({
      url: '/pages/member/index',
    })
    return
  }

  const flowerId = selectedAdviceFlower.value?.id ?? ''
  const suffix = flowerId ? `?flowerId=${flowerId}` : ''

  uni.navigateTo({
    url: `/pages/album/index${suffix}`,
  })
}

function handleOpenRecord(): void {
  const flowerId = selectedAdviceFlower.value?.id ?? ''
  const suffix = flowerId ? `?flowerId=${flowerId}` : ''

  uni.navigateTo({
    url: `/pages/record/index${suffix}`,
  })
}

function handleOpenPlantDoctor(): void {
  const flowerId = selectedAdviceFlower.value?.id ?? ''
  const suffix = flowerId ? `?flowerId=${flowerId}` : ''

  uni.navigateTo({
    url: `/pages/doctor/index${suffix}`,
  })
}

function handleOpenMine(): void {
  uni.navigateTo({
    url: '/pages/mine/index',
  })
}

function handleOpenShop(): void {
  uni.navigateTo({
    url: '/pages/shop/index',
  })
}

function handleSelectQuickDrawerAction(actionKey: string): void {
  if (actionKey === 'album') {
    handleOpenGrowthAlbum()
    return
  }

  if (actionKey === 'doctor') {
    handleOpenPlantDoctor()
    return
  }

  if (actionKey === 'mine') {
    handleOpenMine()
    return
  }

  if (actionKey === 'shop') {
    handleOpenShop()
  }
}
</script>

<template>
  <view class="page-shell safe-pb dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-[220rpx]">
      <view
        class="hero-shell app-fade-up bg-linear-to-br from-[#8edcca] via-[#ecfbf2] to-[#fff1d5] dark:from-slate-900 dark:via-emerald-950 dark:to-amber-950">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-white/78 text-slate-600 dark:bg-white/10 dark:text-slate-100">
              {{ isOffline ? '离线小花园模式' : '在线加密缓存模式' }}
            </view>
            <view class="mt-3 text-title font-900 leading-tight text-app-ink dark:text-slate-50">
              今天也把花园照顾得软乎乎的
            </view>
            <view class="mt-2 text-body text-app-muted dark:text-slate-200">
              首页会优先读取本地加密缓存。断网也能继续新增、编辑、查看植株和相册，不会丢记录。
            </view>
          </view>

          <view
            class="app-float-soft flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-white/58 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.35)] dark:bg-white/8">
            🌷
          </view>
        </view>

        <view class="mt-5 flex flex-wrap gap-3 app-fade-up app-fade-up-delay-1">
          <SubmitBtn text="新增植株" variant="sunrise" :block="false" @click="handleOpenCreate" />
          <SubmitBtn text="今天去打卡" variant="mint" :block="false" @click="handleOpenRecord" />
          <SubmitBtn text="更多工具" variant="blush" :block="false" @click="isQuickDrawerVisible = true" />
        </view>
      </view>

      <view v-if="isOffline"
        class="info-soft app-fade-up bg-[#fff4e0]/92 text-[#8a633e] dark:bg-amber-500/14 dark:text-amber-100">
        当前网络不可用，已自动切到本地离线使用。你现在的新增、编辑、图片缓存和删除操作都会保存在设备加密存储里。
      </view>

      <view class="grid grid-cols-3 gap-3">
        <view v-for="card in summaryCards" :key="card.key" class="surface-soft app-fade-up px-4 py-4 dark:bg-slate-900">
          <view class="h-2 w-14 rounded-full bg-linear-to-r" :class="card.accentClass" />
          <text class="mt-3 block text-2xs tracking-[0.08em] text-app-muted/80 dark:text-slate-500">
            {{ card.label }}
          </text>
          <text class="mt-1 block text-xl font-800 text-app-ink dark:text-slate-100">
            {{ card.value }}
          </text>
        </view>
      </view>

      <CollapsibleSection title="天气提醒与花园节奏" description="天气、定位、提醒和 AI 园艺建议归到同一块，避免首页继续摊开。" tag-text="今日照护"
        tag-tone="mint" tag-icon="✓" :default-expanded="true">
        <HomeWeatherReminderPanel :state="weatherReminderState" :flowers="activeFlowers" :ai-advice="aiAdvice"
          :loading-ai-advice="loadingAiAdvice" :ai-advice-message="aiAdviceMessage" @locate="locateCity"
          @open-permission="requestLocationPermissionAgain" @search-city="searchCities" @select-city="setManualCity"
          @toggle-reminder="handleToggleReminderEnabled" @update-reminder-hour="handleReminderHourInput"
          @update-reminder-minute="handleReminderMinuteInput" @update-quiet-start-hour="handleQuietStartHourInput"
          @update-quiet-end-hour="handleQuietEndHourInput" @update-reminder-text="handleReminderTextInput" />
      </CollapsibleSection>
      <CollapsibleSection title="筛选植物卡片" description="筛选作为整理工具，不再常驻抢占首页主视觉。" :tag-text="`${filteredFlowers.length} 株`"
        tag-tone="blush" tag-icon="⌕">
        <view class="flex items-center justify-between gap-3">
          <view class="text-sm leading-6 text-app-muted dark:text-slate-300">
            按品类、位置和养护状态快速整理植物卡片。
          </view>
          <button class="btn-chip surface-soft bg-white/74 text-app-muted dark:bg-slate-800 dark:text-slate-200"
            hover-class="opacity-92" @tap="resetFilters">
            重置
          </button>
        </view>

        <scroll-view scroll-x class="mt-4 whitespace-nowrap">
          <view class="flex items-center gap-2 pb-1">
            <button class="btn-chip-wide"
              :class="filterState.category === 'all' ? 'bg-app-mint text-slate-700' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="filterState.category = 'all'">
              全部品类
            </button>
            <button v-for="option in flowerCategoryOptions" :key="option.value" class="btn-chip"
              :class="filterState.category === option.value ? 'bg-app-mint text-slate-700' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="filterState.category = option.value">
              {{ option.label }}
            </button>
          </view>
        </scroll-view>

        <scroll-view scroll-x class="mt-3 whitespace-nowrap">
          <view class="flex items-center gap-2 pb-1">
            <button class="btn-chip-wide"
              :class="filterState.placement === 'all' ? 'bg-app-blush text-slate-700' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="filterState.placement = 'all'">
              全部位置
            </button>
            <button v-for="option in FLOWER_PLACEMENT_OPTIONS" :key="option.value" class="btn-chip"
              :class="filterState.placement === option.value ? 'bg-app-blush text-slate-700' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="filterState.placement = option.value">
              {{ option.label }}
            </button>
          </view>
        </scroll-view>

        <scroll-view scroll-x class="mt-3 whitespace-nowrap">
          <view class="flex items-center gap-2 pb-1">
            <button class="btn-chip-wide"
              :class="filterState.careStatus === 'all' ? 'bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="filterState.careStatus = 'all'">
              全部状态
            </button>
            <button v-for="option in flowerCareStatusOptions" :key="option.value" class="btn-chip"
              :class="filterState.careStatus === option.value ? 'bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="filterState.careStatus = option.value">
              {{ option.label }}
            </button>
          </view>
        </scroll-view>
      </CollapsibleSection>

      <view v-if="filteredFlowers.length > 0" class="grid gap-4" :class="flowerGridClass">
        <FlowerCard v-for="flower in filteredFlowers" :key="flower.id" :title="flower.name"
          :subtitle="`${flowerTaxonomyStore.resolveFlowerCategoryLabel(flower)} · ${getFlowerPlacementLabel(flower.placement)}`"
          :image-src="flower.images[0]?.url ?? ''" :status="flower.careStatus"
          :status-text="flowerTaxonomyStore.resolveFlowerCareStatusLabel(flower)"
          :care-items="buildFlowerCardItems(flower)" :quick-actions="[
            { key: 'album', label: '成长相册' },
            { key: 'ai-advice', label: selectedAdviceFlower?.id === flower.id ? '正在查看建议' : 'AI建议' },
            { key: 'record', label: '去打卡' },
            { key: 'preview', label: '预览图片', disabled: flower.images.length === 0 },
            { key: 'delete', label: '移入回收站' },
          ]" primary-action-text="编辑植株" @action="handleCardAction(flower, $event)"
          @primary="handleEditFlower(flower)" />
      </view>

      <EmptyEmpty v-else scene="flower" :title="activeFlowers.length === 0 ? '还没有植株入住' : '筛选后暂时没有结果'" :description="activeFlowers.length === 0
        ? '先添加第一盆植物吧，后续的图片、状态、养护信息都会自动收进本地花园。'
        : '可以换个筛选条件看看，或者新增一盆不同状态的小植物。'" action-text="去新增植株" @action="handleOpenCreate" />

      <CollapsibleSection title="单株 AI 建议" description="专属建议不再直接铺满首页，按需展开查看。"
        :tag-text="selectedAdviceFlower ? getFlowerDisplayName(selectedAdviceFlower) : '未选择'" tag-tone="cream"
        tag-icon="✦">
        <SingleFlowerAiAdvicePanel :flower="selectedAdviceFlower" :advice="singleFlowerAiState.advice"
          :loading="singleFlowerAiState.loading"
          :message="singleFlowerAiState.latestMessage || (selectedAdviceFlower ? `${getFlowerDisplayName(selectedAdviceFlower)} 的专属建议会结合天气、摆放位置和历史养护记录来写。` : '')"
          :disabled="singleFlowerAiState.disabled" @refresh="handleRefreshSingleFlowerAiAdvice" />
      </CollapsibleSection>

      <CollapsibleSection title="回收站倒计时" description="删除后的内容先温柔保留，避免首页长期展示低频信息。"
        :tag-text="`${recycleBinFlowers.length} 条待清理`" tag-tone="slate" tag-icon="↺">
        <TimeLine :items="recycleTimelineItems" empty-text="回收站现在是空的，花园状态很整洁。" />
      </CollapsibleSection>

      <FlowerFormPopup v-model="isFormVisible" :mode="formMode" :initial-value="formInitialValue" :submitting="isSaving"
        @submit="handleSubmitFlower" />

      <ConfirmPopup :model-value="Boolean(deletingFlower)" title="真的要先送去回收站吗" :description="deletingFlower
        ? `${deletingFlower.name} 会先留在回收站 7 天，期间仍会保留本地加密缓存，之后自动清除。`
        : '这次删除会先进回收站，不会立刻彻底消失。'" confirm-text="确认删除" cancel-text="我再看看" @update:model-value="deletingFlower = null"
        @cancel="deletingFlower = null" @confirm="handleConfirmDelete" />

      <HomeQuickDrawer v-model="isQuickDrawerVisible" :actions="quickDrawerActions"
        @select="handleSelectQuickDrawerAction" />
    </view>

    <AppBottomNav active-key="home" />
  </view>
</template>
