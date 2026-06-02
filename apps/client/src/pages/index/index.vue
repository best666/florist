<script setup lang="ts">
import { FlowerCareDifficulty, FlowerCategory, FlowerPlacement, MemberBenefitType } from '@florist/contracts'
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import AppBottomNav from '@/components/app/AppBottomNav.vue'
import CarePromptDrawer from '@/components/CarePromptDrawer.vue'
import CollapsibleSection from '@/components/app/CollapsibleSection.vue'
import ConfirmPopup from '@/components/app/ConfirmPopup.vue'
import EmptyEmpty from '@/components/app/EmptyEmpty.vue'
import FlowerCard from '@/components/flower/FlowerCard.vue'
import FlowerDetailPopup from '@/components/flower/FlowerDetailPopup.vue'
import FlowerCreatePopup from '@/components/flower/FlowerCreatePopup.vue'
import FlowerFormPopup from '@/components/flower/FlowerFormPopup.vue'
import HomeQuickDrawer from '@/components/HomeQuickDrawer.vue'
import HomeWeatherReminderPanel from '@/components/HomeWeatherReminderPanel.vue'
import SingleFlowerAiAdvicePanel from '@/components/flower/SingleFlowerAiAdvicePanel.vue'
import SubmitBtn from '@/components/app/SubmitBtn.vue'
import TaxonomyEditDrawer from '@/components/TaxonomyEditDrawer.vue'
import TimeLine from '@/components/TimeLine.vue'
import { useGardenAiAdvice } from '@/hooks/useGardenAiAdvice'
import { useLocationWeatherReminder } from '@/hooks/useLocationWeatherReminder'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSingleFlowerAiAdvice } from '@/hooks/useSingleFlowerAiAdvice'
import {
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_PLACEMENT_OPTIONS,
  type FlowerFilterState,
  type FlowerFormValues,
  type LocalFlower,
  type TimelineItem,
  createDefaultFlowerFormValues,
} from '@/interfaces'
import { useAuthStore, useFlowerStore, useFlowerTaxonomyStore, useMemberStore, useRecordStore } from '@/store'
import { usePageTheme } from '@/hooks/usePageTheme'
import { usePageTip } from '@/hooks/usePageTip'
import { HOME_TIPS } from '@/interfaces/page-tips'
import { DEFAULT_CITY_OPTIONS, formatCityDisplayName } from '@/interfaces'
import { formatDateTime, getFlowerDisplayName, getTimeAgo, showGentleSuccess, showGentleToast } from '@/utils'

const themeClass = usePageTheme()

const authStore = useAuthStore()
const flowerStore = useFlowerStore()
const flowerTaxonomyStore = useFlowerTaxonomyStore()
const memberStore = useMemberStore()
const recordStore = useRecordStore()
const { activeFlowers, recycleBinFlowers } = storeToRefs(flowerStore)
const { sortedRecords } = storeToRefs(recordStore)
const { isOffline } = useNetworkStatus()
const { currentTip: homeTip } = usePageTip(HOME_TIPS)
const {
  state: weatherReminderState,
  locateCity,
  requestLocationPermissionAgain,
  searchCities,
  setManualCity,
  refreshWeather,
  updateReminderConfig,
} = useLocationWeatherReminder()

const heroCityName = computed(() => {
  const raw = formatCityDisplayName(
    weatherReminderState.city ?? weatherReminderState.weather?.city ?? DEFAULT_CITY_OPTIONS[0] ?? null,
  )
  // 有区名时只展示区，例如 "杭州市西湖区" → "西湖区"
  const districtMatch = raw.match(/(\S+区)/)
  return districtMatch ? districtMatch[1] : raw
})

const heroWeatherText = computed(() => weatherReminderState.weather?.weatherText ?? '')

const heroWeatherEmoji = computed(() => {
  const text = heroWeatherText.value
  if (text.includes('雨')) return '🌧️'
  if (text.includes('雪')) return '🌨️'
  if (text.includes('雷')) return '⛈️'
  if (text.includes('雾') || text.includes('霾')) return '🌫️'
  if (text.includes('多云')) return '⛅'
  if (text.includes('阴')) return '☁️'
  if (text.includes('晴')) return '☀️'
  return ''
})

const heroTemperature = computed(() => {
  const t = weatherReminderState.weather?.temperature
  return t != null ? `${Math.round(t)}°` : ''
})

const viewportWidth = ref(uni.getSystemInfoSync().windowWidth)
const isFormVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingFlowerId = ref<string | null>(null)
const deletingFlower = ref<LocalFlower | null>(null)
const isSaving = ref(false)
const {
  advice: aiAdvice,
  loading: loadingAiAdvice,
  message: aiAdviceMessage,
  fetchAdvice: fetchGardenAdvice,
} = useGardenAiAdvice()
const selectedAdviceFlowerId = ref<string | null>(null)
const isQuickDrawerVisible = ref(false)
const isFilterExpanded = ref(false)
const isTaxonomyDrawerVisible = ref(false)
const isCarePromptVisible = ref(false)
const selectedDetailFlower = ref<LocalFlower | null>(null)
const isDetailPopupVisible = ref(false)
const isAiAdviceExpanded = ref(false)
const isWeatherPanelExpanded = ref(true)

const {
  state: singleFlowerAiState,
  refreshNow: refreshSingleFlowerAiNow,
  canUseToday: canUseSingleFlowerAiToday,
  todayUsedCount: singleFlowerAiTodayCount,
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

  if (!weatherReminderState.loadingLocation) {
    await locateCity()
  }
})

// 天气 / 城市 / 植株数量变化时尝试获取当日 AI 建议（每天仅调用一次 AI，后续走缓存）
watch(
  [
    () => weatherReminderState.weather?.city?.id ?? '',
    () => activeFlowers.value.length,
    () => isOffline.value,
  ],
  async ([cityId, flowerCount]) => {
    if (!cityId || !weatherReminderState.weather || flowerCount === 0) {
      aiAdvice.value = null
      return
    }

    if (isOffline.value) {
      aiAdvice.value = null
      aiAdviceMessage.value = '当前是离线模式，AI 建议先暂停一下，先按天气和盆土状态照顾花园也很稳。'
      return
    }

    await fetchGardenAdvice(weatherReminderState.weather, activeFlowers.value, sortedRecords.value)
  },
  { immediate: true },
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
    customPlacementId: flowerTaxonomyStore.flowerSelections[targetFlower.id]?.customPlacementId,
    careDifficulty: targetFlower.careDifficulty,
    customCareDifficultyId: flowerTaxonomyStore.flowerSelections[targetFlower.id]?.customCareDifficultyId,
    careStatus: targetFlower.careStatus,
    customCareStatusId: flowerTaxonomyStore.flowerSelections[targetFlower.id]?.customCareStatusId,
    coverImageId: targetFlower.coverImageId,
    note: targetFlower.note ?? '',
    images: [...targetFlower.images],
    lastWateredAt: targetFlower.lastWateredAt ?? '',
    lastFertilizedAt: targetFlower.lastFertilizedAt ?? '',
  }
})

const flowerCategoryOptions = computed(() => flowerTaxonomyStore.categoryOptions)
const flowerCareStatusOptions = computed(() => flowerTaxonomyStore.careStatusOptions)

const filteredFlowers = computed(() =>
  activeFlowers.value.filter((flower) => {
    if (
      filterState.category !== 'all' &&
      flowerTaxonomyStore.resolveFlowerCategoryFilterKey(flower) !== filterState.category
    ) {
      return false
    }

    if (filterState.placement !== 'all' && flower.placement !== filterState.placement) {
      return false
    }

    if (filterState.careStatus !== 'all') {
      if (
        filterState.careStatus === 'needs-attention'
          ? flower.careStatus !== 'watering-needed' && flower.careStatus !== 'fertilizing-needed'
          : flowerTaxonomyStore.resolveFlowerCareStatusFilterKey(flower) !== filterState.careStatus
      ) {
        return false
      }
    }

    return true
  }),
)

const selectedAdviceFlower = computed<LocalFlower | null>(() => {
  if (!selectedAdviceFlowerId.value) return null
  return activeFlowers.value.find((flower) => flower.id === selectedAdviceFlowerId.value) ?? null
})

const singleFlowerAiTodayUsedCount = computed(() => singleFlowerAiTodayCount())


const flowerGridClass = computed(() => 'grid-cols-3')

const attentionCount = computed(
  () =>
    activeFlowers.value.filter(
      (flower) => flower.careStatus === 'watering-needed' || flower.careStatus === 'fertilizing-needed',
    ).length,
)

const summaryCards = computed(() => [
  {
    key: 'all',
    label: '植株总数',
    value: String(activeFlowers.value.length),
    accentClass: 'from-[#92E5D5] to-[#FFF2D1]',
  },
  {
    key: 'healthy',
    label: '状态稳定',
    value: String(activeFlowers.value.filter((flower) => flower.careStatus === 'healthy').length),
    accentClass: 'from-[#F8CADB] to-[#FFF0D8]',
  },
  {
    key: 'attention',
    label: '需注意',
    value: String(attentionCount.value),
    accentClass: 'from-[#FFD7B8] to-[#FFE8D6]',
  },
])

const quickDrawerActions = computed(() => [
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
])

const recycleTimelineItems = computed<ReadonlyArray<TimelineItem>>(() =>
  recycleBinFlowers.value.slice(0, 5).map((flower) => ({
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
    tags: [
      flowerTaxonomyStore.resolveFlowerCategoryLabel(flower),
      flowerTaxonomyStore.resolveFlowerPlacementLabel(flower),
    ],
  })),
)

function getFlowerCoverImage(flower: LocalFlower): string {
  if (flower.coverImageId) {
    const found = flower.images.find((img) => img.id === flower.coverImageId)
    if (found) return found.url
  }
  return flower.images[0]?.url ?? ''
}

const carePromptActions = computed(() => [
  {
    key: 'record',
    label: '去打卡养护',
    description: '记录一次浇水、施肥或其他照护动作，保持养护节奏。',
    icon: '✓',
    accentClass: 'from-[#92E5D5] to-[#BCEFE6] text-app-ink',
  },
  {
    key: 'add',
    label: '新增植株',
    description: '添加一盆新植物，设置养护信息和状态标签。',
    icon: '+',
    accentClass: 'from-[#FFD7B8] to-[#FFF1D6] text-app-ink',
  },
  {
    key: 'album',
    label: '查看成长相册',
    description: '浏览植株的成长记录和照片，回顾养护时光。',
    icon: '▣',
    accentClass: 'from-[#CFE5FF] to-[#EDF5FF] text-app-ink',
  },
])

function handleSummaryCardTap(cardKey: string): void {
  if (cardKey === 'attention') {
    if (attentionCount.value > 0) {
      filterState.careStatus = 'needs-attention'
      isFilterExpanded.value = true
      uni.pageScrollTo({ selector: '#flower-grid', duration: 300 })
    } else {
      isCarePromptVisible.value = true
    }
  } else if (cardKey === 'all') {
    filterState.careStatus = 'all'
    filterState.category = 'all'
    filterState.placement = 'all'
    isFilterExpanded.value = true
    uni.pageScrollTo({ selector: '#flower-grid', duration: 300 })
  } else if (cardKey === 'healthy') {
    filterState.careStatus = 'healthy'
    isFilterExpanded.value = true
    uni.pageScrollTo({ selector: '#flower-grid', duration: 300 })
  }
}

function handleCarePromptSelect(key: string): void {
  if (key === 'add') {
    handleOpenCreate()
  } else if (key === 'record') {
    handleOpenRecord()
  } else if (key === 'album') {
    handleOpenGrowthAlbum()
  }
}

function handleHeroWeatherTap(): void {
  // 先展开面板，等渲染完成再滚动
  isWeatherPanelExpanded.value = true
  setTimeout(() => {
    uni.pageScrollTo({ selector: '#weather-panel', duration: 300 })
  }, 100)
}

function handleOpenCreate(): void {
  formMode.value = 'create'
  editingFlowerId.value = null
  isFormVisible.value = true
}

function handleEditFlower(flower: LocalFlower): void {
  isDetailPopupVisible.value = false
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
    urls: flower.images.map((image) => image.url),
    current: firstImage.url,
  })
}

function handleDeleteFlower(flower: LocalFlower): void {
  isDetailPopupVisible.value = false
  deletingFlower.value = flower
}

function handleDetailNavigate(flower: LocalFlower, page: string): void {
  uni.navigateTo({
    url: `/pages/${page}/index?flowerId=${flower.id}`,
  })
}

function handleDetailAiAdvice(flower: LocalFlower): void {
  isDetailPopupVisible.value = false
  selectedAdviceFlowerId.value = flower.id
  isAiAdviceExpanded.value = true

  // 稍等一帧让面板展开，然后触发生成
  uni.showLoading({ title: '正在生成 AI 建议...', mask: true })

  const isVip = memberStore.hasBenefit(MemberBenefitType.UnlimitedAiAdvice)

  if (!canUseSingleFlowerAiToday(isVip)) {
    uni.hideLoading()
    showGentleToast('今日 AI 建议次数已用完，明天再来吧。开通会员可享无限次使用。')
    return
  }

  if (!weatherReminderState.weather) {
    uni.hideLoading()
    showGentleToast('获取天气信息后再试，暂时无法生成 AI 建议。')
    return
  }

  refreshSingleFlowerAiNow({
    flower,
    weather: weatherReminderState.weather,
    records: sortedRecords.value,
    isOffline: isOffline.value,
  })

  // loading 状态由 hook 管理，组件会响应
  setTimeout(() => {
    uni.hideLoading()
  }, 600)
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
    showGentleSuccess(formMode.value === 'edit' ? '档案已更新' : '新植株已住进花园')
  } finally {
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

function handleGenerateSingleFlowerAiAdvice(): void {
  if (!selectedAdviceFlower.value || !weatherReminderState.weather) {
    return
  }

  const isVip = memberStore.hasBenefit(MemberBenefitType.UnlimitedAiAdvice)

  if (!canUseSingleFlowerAiToday(isVip)) {
    showGentleToast('今日 AI 建议次数已用完，明天再来吧。开通会员可享无限次使用。')
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
  if (!authStore.isAuthenticated) {
    showGentleToast('请先登录后再查看成长相册，云端图片需要登录后才能访问。')
    uni.navigateTo({ url: '/pages/mine/index' })
    return
  }

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
  <view
    class="page-shell safe-pb dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100"
    :class="themeClass"
  >
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-[172rpx]">
      <view
        class="hero-shell app-fade-up bg-linear-to-br from-[var(--color-mint)] via-[var(--color-cream)] to-[var(--color-gold)]"
      >
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view
              class="flex items-center gap-2 flex-nowrap overflow-hidden"
              @tap="handleHeroWeatherTap"
            >
              <view
                class="badge-soft flex-none bg-[var(--color-surface)]/78 text-app-muted dark:bg-[var(--color-surface)]/10 dark:text-slate-100"
              >
                {{ isOffline ? '离线花园' : '今日花园' }}
              </view>
              <view class="flex min-w-0 items-center gap-1 truncate text-2xs text-app-muted/80 dark:text-slate-300">
                <text class="whitespace-nowrap">📍 {{ heroCityName }}</text>
                <template v-if="heroWeatherText">
                  <text class="flex-none text-app-muted/30 dark:text-slate-500">·</text>
                  <text class="truncate whitespace-nowrap font-700 text-app-ink dark:text-slate-100">{{ heroWeatherEmoji }} {{ heroWeatherText }} {{ heroTemperature }}</text>
                </template>
                <text v-else class="whitespace-nowrap text-app-muted/50 dark:text-slate-500">获取天气</text>
              </view>
            </view>
            <view class="mt-3 text-title font-900 leading-tight text-app-ink dark:text-slate-50">
              今天也把花园照顾得软乎乎的
            </view>
            <view class="mt-2 text-body text-app-muted dark:text-slate-200">
              {{ homeTip }}
            </view>
          </view>

          <view
            class="app-float-soft flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-[var(--color-surface)]/58 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.35)] dark:bg-[var(--color-surface)]/8"
          >
            🌷
          </view>
        </view>

        <view class="mt-5 flex gap-3 app-fade-up app-fade-up-delay-1">
          <SubmitBtn
            text="新增植株"
            variant="sunrise"
            :block="false"
            @click="handleOpenCreate"
          />
          <SubmitBtn
            text="今天去打卡"
            variant="mint"
            :block="false"
            @click="handleOpenRecord"
          />
          <SubmitBtn
            text="更多工具"
            variant="blush"
            :block="false"
            @click="isQuickDrawerVisible = true"
          />
        </view>
      </view>

      <view
        v-if="isOffline"
        class="info-soft app-fade-up bg-[#fff4e0]/92 text-[#8a633e] dark:bg-amber-500/14 dark:text-amber-100"
      >
        网络暂时休息中，你的所有操作都会安全保存在本地，联网后会自动同步。
      </view>

      <view class="grid grid-cols-3 gap-3">
        <view
          v-for="card in summaryCards"
          :key="card.key"
          class="surface-soft app-fade-up px-4 py-4 dark:bg-slate-900"
          hover-class="opacity-92"
          @tap="handleSummaryCardTap(card.key)"
        >
          <view
            class="h-2 w-14 rounded-full bg-linear-to-r"
            :class="card.accentClass"
          />
          <text class="block text-2xs tracking-[0.08em] text-app-muted/80 dark:text-app-muted">
            {{ card.label }}
          </text>
          <text class="mt-1 block text-xl font-800 text-app-ink dark:text-slate-100">
            {{ card.value }}
          </text>
        </view>
      </view>

      <view id="weather-panel">
        <CollapsibleSection
        title="天气提醒与花园节奏"
        tag-text="今日照护"
        tag-tone="mint"
        tag-icon="✓"
        :expanded="isWeatherPanelExpanded"
        @update:expanded="isWeatherPanelExpanded = $event"
      >
        <HomeWeatherReminderPanel
          :state="weatherReminderState"
          :flowers="activeFlowers"
          :ai-advice="aiAdvice"
          :loading-ai-advice="loadingAiAdvice"
          :ai-advice-message="aiAdviceMessage"
          @locate="locateCity"
          @open-permission="requestLocationPermissionAgain"
          @search-city="searchCities"
          @select-city="setManualCity"
          @toggle-reminder="handleToggleReminderEnabled"
          @update-reminder-hour="handleReminderHourInput"
          @update-reminder-minute="handleReminderMinuteInput"
          @update-quiet-start-hour="handleQuietStartHourInput"
          @update-quiet-end-hour="handleQuietEndHourInput"
          @update-reminder-text="handleReminderTextInput"
        />
      </CollapsibleSection>
      </view>
      <CollapsibleSection
        title="筛选植物卡片"
        :tag-text="`${filteredFlowers.length} 株`"
        tag-tone="blush"
        tag-icon="⌕"
        :expanded="isFilterExpanded"
        @update:expanded="isFilterExpanded = $event"
      >
        <template #header-extra>
          <text
            class="cursor-pointer rounded-full bg-[var(--color-mint)]/25 px-3 py-1.5 text-2xs font-700 text-white dark:bg-emerald-500/25 dark:text-emerald-100"
            @tap.stop="isTaxonomyDrawerVisible = true"
            >编辑分类</text
          >
        </template>
        <scroll-view
          scroll-x
          class="mt-4 whitespace-nowrap"
        >
          <view class="flex items-center gap-2 pb-1">
            <button
              class="btn-chip-wide"
              :class="
                filterState.category === 'all'
                  ? 'bg-app-mint text-app-ink'
                  : 'bg-app-ivory text-app-muted dark:bg-slate-800 dark:text-slate-200'
              "
              hover-class="opacity-92"
              @tap="filterState.category = 'all'"
            >
              全部品类
            </button>
            <button
              v-for="option in flowerCategoryOptions"
              :key="option.value"
              class="btn-chip"
              :class="
                filterState.category === option.value
                  ? 'bg-app-mint text-app-ink'
                  : 'bg-app-ivory text-app-muted dark:bg-slate-800 dark:text-slate-200'
              "
              hover-class="opacity-92"
              @tap="filterState.category = option.value"
            >
              {{ option.label }}
            </button>
          </view>
        </scroll-view>

        <scroll-view
          scroll-x
          class="mt-3 whitespace-nowrap"
        >
          <view class="flex items-center gap-2 pb-1">
            <button
              class="btn-chip-wide"
              :class="
                filterState.placement === 'all'
                  ? 'bg-app-blush text-app-ink'
                  : 'bg-app-ivory text-app-muted dark:bg-slate-800 dark:text-slate-200'
              "
              hover-class="opacity-92"
              @tap="filterState.placement = 'all'"
            >
              全部位置
            </button>
            <button
              v-for="option in FLOWER_PLACEMENT_OPTIONS"
              :key="option.value"
              class="btn-chip"
              :class="
                filterState.placement === option.value
                  ? 'bg-app-blush text-app-ink'
                  : 'bg-app-ivory text-app-muted dark:bg-slate-800 dark:text-slate-200'
              "
              hover-class="opacity-92"
              @tap="filterState.placement = option.value"
            >
              {{ option.label }}
            </button>
          </view>
        </scroll-view>

        <scroll-view
          scroll-x
          class="mt-3 whitespace-nowrap"
        >
          <view class="flex items-center gap-2 pb-1">
            <button
              class="btn-chip-wide"
              :class="
                filterState.careStatus === 'all'
                  ? 'bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-app-ivory text-app-muted dark:bg-slate-800 dark:text-slate-200'
              "
              hover-class="opacity-92"
              @tap="filterState.careStatus = 'all'"
            >
              全部状态
            </button>
            <button
              v-for="option in flowerCareStatusOptions"
              :key="option.value"
              class="btn-chip"
              :class="
                filterState.careStatus === option.value
                  ? 'bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-app-ivory text-app-muted dark:bg-slate-800 dark:text-slate-200'
              "
              hover-class="opacity-92"
              @tap="filterState.careStatus = option.value"
            >
              {{ option.label }}
            </button>
          </view>
        </scroll-view>
      </CollapsibleSection>

      <view
        id="flower-grid"
        v-if="filteredFlowers.length > 0"
        class="grid gap-3"
        :class="flowerGridClass"
      >
        <FlowerCard
          v-for="flower in filteredFlowers"
          :key="flower.id"
          :name="getFlowerDisplayName(flower)"
          :nickname="flowerTaxonomyStore.resolveFlowerCategoryLabel(flower)"
          :image-src="getFlowerCoverImage(flower)"
          :emoji="flower.emoji || '🪴'"
          :status="flower.careStatus"
          :status-text="flowerTaxonomyStore.resolveFlowerCareStatusLabel(flower).replace(/^\S+\s*/, '')"
          @tap="
            () => {
              selectedDetailFlower = flower
              isDetailPopupVisible = true
            }
          "
        />
      </view>

      <EmptyEmpty
        v-else
        scene="flower"
        :title="activeFlowers.length === 0 ? '还没有植株入住' : '筛选后暂时没有结果'"
        :description="
          activeFlowers.length === 0
            ? '先添加第一盆植物吧，后续的图片、状态、养护信息都会自动收进本地花园。'
            : '可以换个筛选条件看看，或者新增一盆不同状态的小植物。'
        "
        action-text="去新增植株"
        @action="handleOpenCreate"
      />

      <CollapsibleSection
        title="单株 AI 建议"
        :tag-text="selectedAdviceFlower ? getFlowerDisplayName(selectedAdviceFlower) : '未选择'"
        tag-tone="cream"
        tag-icon="✦"
        :expanded="isAiAdviceExpanded"
        @update:expanded="isAiAdviceExpanded = $event"
      >
        <SingleFlowerAiAdvicePanel
          :flowers="activeFlowers"
          :selected-flower-id="selectedAdviceFlowerId"
          :flower="selectedAdviceFlower"
          :advice="singleFlowerAiState.advice"
          :loading="singleFlowerAiState.loading"
          :message="singleFlowerAiState.latestMessage"
          :disabled="singleFlowerAiState.disabled"
          :is-vip="false"
          :today-used-count="singleFlowerAiTodayUsedCount"
          @update:selected-flower-id="selectedAdviceFlowerId = $event"
          @generate="handleGenerateSingleFlowerAiAdvice"
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="回收站倒计时"
        :tag-text="`${recycleBinFlowers.length} 条待清理`"
        tag-tone="slate"
        tag-icon="↺"
      >
        <TimeLine
          :items="recycleTimelineItems"
          empty-text="回收站现在是空的，花园状态很整洁。"
        />
      </CollapsibleSection>

      <FlowerCreatePopup
        v-if="formMode === 'create'"
        v-model="isFormVisible"
        :submitting="isSaving"
        @submit="handleSubmitFlower"
      />
      <FlowerFormPopup
        v-else
        v-model="isFormVisible"
        mode="edit"
        :initial-value="formInitialValue"
        :submitting="isSaving"
        @submit="handleSubmitFlower"
      />

      <ConfirmPopup
        :model-value="Boolean(deletingFlower)"
        title="真的要先送去回收站吗"
        :description="
          deletingFlower
            ? `${deletingFlower.name} 会先放在回收站保留 7 天，期间随时可以恢复，之后才会彻底清除。`
            : '这次删除会先进回收站，不会立刻彻底消失。'
        "
        confirm-text="确认删除"
        cancel-text="我再看看"
        @update:model-value="deletingFlower = null"
        @cancel="deletingFlower = null"
        @confirm="handleConfirmDelete"
      />

      <FlowerDetailPopup
        v-model="isDetailPopupVisible"
        :flower="selectedDetailFlower"
        @edit="handleEditFlower"
        @cover-tap="handleEditFlower"
        @record="handleDetailNavigate($event, 'record')"
        @album="handleDetailNavigate($event, 'album')"
        @preview="handlePreviewFlower"
        @delete="handleDeleteFlower"
        @ai-advice="handleDetailAiAdvice"
      />

      <TaxonomyEditDrawer v-model="isTaxonomyDrawerVisible" />

      <CarePromptDrawer
        v-model="isCarePromptVisible"
        title="所有植株状态都很好"
        description="当前没有需要特别关注的植株，可以先记录养护动作，或者添加新的小植物。"
        :actions="carePromptActions"
        @select="handleCarePromptSelect"
      />

      <HomeQuickDrawer
        v-model="isQuickDrawerVisible"
        :actions="quickDrawerActions"
        @select="handleSelectQuickDrawerAction"
      />
    </view>

    <AppBottomNav active-key="home" />
  </view>
</template>
