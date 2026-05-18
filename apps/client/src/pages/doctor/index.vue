<script setup lang="ts">
import type { IAiPlantDiagnosis, IAiTripCarePlan, IImageAsset } from '@florist/contracts'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import AuthLoginPopup from '@/components/AuthLoginPopup.vue'
import { fetchPlantDiagnosis, fetchTripCarePlan } from '@/api'
import { useAuthSessionActions } from '@/hooks/useAuthSessionActions'
import { useLocationWeatherReminder } from '@/hooks/useLocationWeatherReminder'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePlantDoctorCenter } from '@/hooks/usePlantDoctorCenter'
import { removePreparedImageAsset, usePreparedImageAssets } from '@/hooks/usePreparedImageAssets'
import { ClientPlatform, formatCityDisplayName, type CityOption, type LocalFlower, type PlantDoctorHistoryItem } from '@/interfaces'
import { useAppStore, useAuthStore, useFlowerStore, useFlowerTaxonomyStore } from '@/store'
import {
  formatDateTime,
  getFlowerDisplayName,
  readImageAsDataUrl,
} from '@/utils'

const appStore = useAppStore()
const authStore = useAuthStore()
const flowerStore = useFlowerStore()
const flowerTaxonomyStore = useFlowerTaxonomyStore()
const { activeFlowers } = storeToRefs(flowerStore)
const { isAuthenticated, switchingSession } = storeToRefs(authStore)
const { isOffline } = useNetworkStatus()
const {
  state: weatherState,
  locateCity,
  requestLocationPermissionAgain,
  searchCities,
  setManualCity,
  refreshWeather,
} = useLocationWeatherReminder()
const {
  state: plantDoctorState,
  canUseDiagnosis,
  markDiagnosisUsed,
  appendHistory,
  clearHistory,
  refreshQuota,
} = usePlantDoctorCenter()
const { chooseCachedImageAssets } = usePreparedImageAssets()
const runtimePlatform = computed(() => appStore.runtimePlatform ?? ClientPlatform.H5)
const loginPopupVisible = ref(false)
const hasPromptedLoginOnShow = ref(false)

const selectedFlowerId = ref('')
const selectedImage = ref<IImageAsset | null>(null)
const diagnosisResult = ref<IAiPlantDiagnosis | null>(null)
const tripCarePlan = ref<IAiTripCarePlan | null>(null)
const isDiagnosing = ref(false)
const isGeneratingTripPlan = ref(false)
const travelDays = ref(3)
const pageMessage = ref('')

const { handleH5Login, handleWechatLogin } = useAuthSessionActions({
  onCloseLoginPopup: () => {
    loginPopupVisible.value = false
  },
  onLoginSuccess: async () => {
    await flowerStore.initializeGarden({ force: true })
    refreshQuota()
  },
})

function requireLogin(actionLabel: string): boolean {
  if (isAuthenticated.value) {
    return true
  }

  pageMessage.value = `${actionLabel}需要先登录。登录后会自动切换到你的个人花园数据。`
  loginPopupVisible.value = true
  return false
}

function handleOpenLoginEntry(): void {
  requireLogin('使用植物医生能力')
}

const selectedFlower = computed<LocalFlower | null>(() => {
  if (selectedFlowerId.value) {
    return activeFlowers.value.find(flower => flower.id === selectedFlowerId.value) ?? null
  }

  return activeFlowers.value[0] ?? null
})

const quotaText = computed(() => {
  const quota = plantDoctorState.quota
  return quota.exceeded
    ? `今日免费次数已用完（${quota.freeLimit}/${quota.freeLimit}）`
    : `今日还可免费识别 ${quota.remainingCount} 次`
})
const selectedFlowerCategoryLabel = computed(() => (
  selectedFlower.value ? flowerTaxonomyStore.resolveFlowerCategoryLabel(selectedFlower.value) : '未绑定类别'
))
const selectedFlowerStatusLabel = computed(() => (
  selectedFlower.value ? flowerTaxonomyStore.resolveFlowerCareStatusLabel(selectedFlower.value) : '未绑定状态'
))
const cityDisplayName = computed(() => formatCityDisplayName(weatherState.city))

function formatCandidateCity(city: CityOption): string {
  return formatCityDisplayName(city)
}

onLoad((query) => {
  if (query && typeof query.flowerId === 'string') {
    selectedFlowerId.value = query.flowerId
  }
})

onShow(async () => {
  if (!isAuthenticated.value) {
    pageMessage.value = '植物医生会结合你的花园档案生成建议，先登录后再继续会更准确。'

    if (!hasPromptedLoginOnShow.value) {
      loginPopupVisible.value = true
      hasPromptedLoginOnShow.value = true
    }

    return
  }

  hasPromptedLoginOnShow.value = false
  await flowerStore.initializeGarden()
  refreshQuota()

  if (!selectedFlowerId.value && activeFlowers.value[0]) {
    selectedFlowerId.value = activeFlowers.value[0].id
  }

  if (weatherState.city) {
    await refreshWeather(weatherState.city)
    return
  }

  if (!weatherState.loadingLocation) {
    await locateCity()
  }
})

async function cleanupSelectedImage(): Promise<void> {
  const image = selectedImage.value

  if (!image) {
    return
  }

  selectedImage.value = null
  await removePreparedImageAsset(image)
}

async function handleChooseImage(): Promise<void> {
  if (!requireLogin('上传识别图片')) {
    return
  }

  try {
    const imageAssets = await chooseCachedImageAssets({
      assetPrefix: 'doctor-image',
      count: 1,
      initialQuality: 0.9,
      maxSizeInBytes: 1.5 * 1024 * 1024,
      minQuality: 0.5,
    })
    const nextImage = imageAssets[0]

    if (!nextImage) {
      pageMessage.value = '这次没有拿到可用图片，换一张再试试。'
      return
    }

    await cleanupSelectedImage()

    selectedImage.value = nextImage
    pageMessage.value = nextImage.compressedUrl
      ? '图片已经帮你压小并尽量保住清晰度啦，可以直接开始识别。'
      : '图片已经准备好，可以开始识别啦。'
  }
  catch {
    pageMessage.value = '这张图暂时没有处理好，换一张更清晰、光线更稳的照片会更容易识别。'
  }
}

function handlePreviewSelectedImage(): void {
  if (!selectedImage.value) {
    return
  }

  uni.previewImage({
    urls: [selectedImage.value.url],
    current: selectedImage.value.url,
  })
}

async function handleDiagnose(): Promise<void> {
  if (!requireLogin('开始病虫害识别')) {
    return
  }

  if (!selectedImage.value) {
    pageMessage.value = '先拍一张叶片、虫点或病斑更清楚的图片，我再帮你细看。'
    return
  }

  if (isOffline.value) {
    pageMessage.value = '当前网络不可用，AI 识别先暂停一下，等连上网后我再帮你看图。'
    return
  }

  if (!canUseDiagnosis()) {
    pageMessage.value = plantDoctorState.latestLimitMessage
    return
  }

  isDiagnosing.value = true

  try {
    const imageDataUrl = await readImageAsDataUrl(selectedImage.value.url)
    const diagnosis = await fetchPlantDiagnosis({
      image: selectedImage.value,
      flower: selectedFlower.value,
      weather: weatherState.weather,
    }, imageDataUrl)

    diagnosisResult.value = diagnosis
    markDiagnosisUsed()
    pageMessage.value = diagnosis.gentleFallbackMessage ?? '识别结果已经准备好了，先从最温和的一步开始处理就行。'

    const historyItem: PlantDoctorHistoryItem = {
      id: `doctor-history-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...(selectedFlower.value
        ? {
          flowerId: selectedFlower.value.id,
          flowerName: getFlowerDisplayName(selectedFlower.value),
        }
        : {}),
      ...(weatherState.weather
        ? {
          cityName: weatherState.weather.city.name,
          weatherText: weatherState.weather.weatherText,
        }
        : {}),
      image: selectedImage.value,
      diagnosis,
    }
    appendHistory(historyItem)
  }
  catch (error) {
    pageMessage.value = error instanceof Error
      ? error.message
      : '这次识别没有顺利完成，先换一张更清楚的局部图再试试也可以。'
  }
  finally {
    isDiagnosing.value = false
  }
}

async function handleGenerateTripPlan(): Promise<void> {
  if (!requireLogin('生成出差托管方案')) {
    return
  }

  if (!selectedFlower.value) {
    pageMessage.value = '先选一盆植物，我才能按它的状态来安排出差照顾方案。'
    return
  }

  if (!weatherState.weather) {
    pageMessage.value = '先拿到当地天气，再生成无人托管方案会更稳。'
    return
  }

  if (isOffline.value) {
    pageMessage.value = '现在网络不太稳，出差方案先等等，连上网后我再结合天气帮你安排。'
    return
  }

  isGeneratingTripPlan.value = true

  try {
    const nextTripPlan = await fetchTripCarePlan({
      flower: selectedFlower.value,
      weather: weatherState.weather,
      travelDays: travelDays.value,
    })

    tripCarePlan.value = nextTripPlan
    pageMessage.value = nextTripPlan.gentleFallbackMessage ?? '出差前要做的几步已经整理好了，按顺序来会更安心。'
    appendHistory({
      id: `doctor-trip-${Date.now()}`,
      createdAt: new Date().toISOString(),
      flowerId: selectedFlower.value.id,
      flowerName: getFlowerDisplayName(selectedFlower.value),
      cityName: weatherState.weather.city.name,
      weatherText: weatherState.weather.weatherText,
      travelDays: travelDays.value,
      tripCarePlan: nextTripPlan,
    })
  }
  catch (error) {
    pageMessage.value = error instanceof Error
      ? error.message
      : '出差方案暂时没有生成出来，先把植物挪到更稳的环境里也很有帮助。'
  }
  finally {
    isGeneratingTripPlan.value = false
  }
}

function handleTravelDaysInput(event: { detail: { value: string } }): void {
  const parsedValue = Number(event.detail.value || 0)
  travelDays.value = Math.min(Math.max(Number.isFinite(parsedValue) ? parsedValue : 1, 1), 30)
}

function handleCitySearchInput(event: { detail: { value: string } }): void {
  searchCities(event.detail.value)
}

function handleOpenMemberBenefits(): void {
  if (!requireLogin('查看会员权益')) {
    return
  }

  uni.navigateTo({
    url: '/pages/member/index',
  })
}

function handleOpenHistoryImage(imageUrl: string): void {
  uni.previewImage({
    urls: [imageUrl],
    current: imageUrl,
  })
}
</script>

<template>
  <view
    class="page-shell safe-pb bg-linear-to-b from-[#FFFDF7] via-app-ivory to-[#F7FFF8] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-6">
      <view
        class="overflow-hidden rounded-[36rpx] bg-linear-to-br from-[#BEEBDA] via-[#FFF4DC] to-[#F6D9E7] px-5 py-5 shadow-[0_18rpx_54rpx_rgba(190,235,218,0.22)] dark:from-slate-900 dark:via-emerald-950 dark:to-rose-950">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-white/78 text-slate-600 dark:bg-white/10 dark:text-slate-100">
              AI 病虫害识别 + 出差养护方案
            </view>
            <view class="mt-3 text-[42rpx] font-900 leading-tight text-slate-800 dark:text-slate-50">
              先帮你看图，再把它出差这几天安顿好
            </view>
            <view class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-200">
              支持拍照、相册、压缩优化、识别留档和无人托管方案。免费用户每天可识别 3 次，超过后会轻轻提醒你会员权益。
            </view>
          </view>
          <view
            class="flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-white/58 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.35)] dark:bg-white/8">
            🔎
          </view>
        </view>
      </view>

      <view v-if="pageMessage"
        class="rounded-[28rpx] bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 shadow-[0_12rpx_28rpx_rgba(251,191,36,0.12)] dark:bg-amber-500/14 dark:text-amber-100">
        {{ pageMessage }}
      </view>

      <view v-if="!isAuthenticated" class="card-soft rounded-[32rpx] border border-[#EADBC8] bg-[#FFF9F2] dark:border-slate-700 dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">先登录后使用植物医生</text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              小程序默认使用微信登录，H5 默认使用手机号验证码登录，登录后会自动关联你的个人花园数据。
            </text>
          </view>
          <TagLabel :text="runtimePlatform === ClientPlatform.MpWeixin ? '微信登录' : '手机号登录'" tone="mint" />
        </view>

        <view class="mt-4">
          <SubmitBtn :text="runtimePlatform === ClientPlatform.MpWeixin ? '使用微信登录继续' : '手机号登录继续'" variant="mint"
            @click="handleOpenLoginEntry" />
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">当地天气</text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              出差方案会结合当前城市天气来收紧风险，识别时也会顺手参考环境信息。
            </text>
          </view>
          <TagLabel :text="weatherState.weather?.weatherText ?? '等待天气'" tone="mint" />
        </view>

        <view class="mt-4 rounded-[26rpx] bg-app-ivory/90 px-4 py-4 dark:bg-slate-800">
          <view class="flex items-center justify-between gap-3">
            <view class="min-w-0 flex-1 pr-2">
              <text class="block text-sm font-700 leading-6 text-slate-800 dark:text-slate-100">
                {{ cityDisplayName }}
              </text>
              <text class="mt-1 block text-2xs leading-5 text-slate-500 dark:text-slate-300">
                {{ weatherState.weather
                  ? `${weatherState.weather.weatherText} · ${Math.round(weatherState.weather.temperature)}°C · 湿度
                ${weatherState.weather.humidity}%`
                  : '还没有拉到天气，定位或手动选城市后就能生成更稳的出差方案。' }}
              </text>
            </view>
            <view class="flex flex-wrap justify-end gap-2">
              <button class="btn-pill-sm flex-none shrink-0 gap-1.5 px-3 text-2xs bg-app-mint text-slate-700"
                hover-class="opacity-92" @tap="locateCity">
                <view
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[20rpx] text-slate-700">
                  ⌖
                </view>
                <text class="whitespace-nowrap">重新定位</text>
              </button>
              <button v-if="weatherState.locationDenied"
                class="btn-pill-sm flex-none shrink-0 gap-1.5 px-3 text-2xs bg-app-blush text-slate-700"
                hover-class="opacity-92" @tap="requestLocationPermissionAgain">
                <view
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[20rpx] text-slate-700">
                  ⚙
                </view>
                <text class="whitespace-nowrap">去开权限</text>
              </button>
            </view>
          </view>

          <input
            class="mt-4 h-11 rounded-[22rpx] bg-white px-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-100"
            :value="weatherState.citySearchKeyword" placeholder="搜城市，如杭州、广州" @input="handleCitySearchInput" />

          <scroll-view scroll-x class="mt-3 whitespace-nowrap">
            <view class="flex gap-2 pb-1">
              <button v-for="city in weatherState.citySearchResults.slice(0, 8)" :key="city.id"
                class="btn-chip h-[68rpx] min-h-[68rpx] bg-white px-4 text-2xs font-700 text-slate-600 dark:bg-slate-900 dark:text-slate-100"
                hover-class="opacity-92" @tap="setManualCity(city)">
                {{ formatCandidateCity(city) }}
              </button>
            </view>
          </scroll-view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">识别对象</text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              选一盆植物能让建议更贴合；不选也可以先单纯识别图片。
            </text>
          </view>
          <TagLabel :text="quotaText" :tone="plantDoctorState.quota.exceeded ? 'cream' : 'blush'" />
        </view>

        <scroll-view scroll-x class="mt-4 whitespace-nowrap">
          <view class="flex gap-2 pb-1">
            <button class="btn-chip-wide"
              :class="!selectedFlowerId ? 'bg-app-mint text-slate-700' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="selectedFlowerId = ''">
              暂不绑定植株
            </button>
            <button v-for="flower in activeFlowers" :key="flower.id" class="btn-chip"
              :class="selectedFlower?.id === flower.id ? 'bg-app-blush text-slate-700' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="selectedFlowerId = flower.id">
              {{ getFlowerDisplayName(flower) }}
            </button>
          </view>
        </scroll-view>

        <view v-if="selectedFlower" class="mt-3 flex flex-wrap gap-2">
          <TagLabel :text="selectedFlowerCategoryLabel" tone="blush" icon="✿" />
          <TagLabel :text="selectedFlowerStatusLabel" :status="selectedFlower.careStatus" />
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">识别图片</text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              建议拍叶背、病斑、虫点或受损局部，光线稳定一点，识别会更准。
            </text>
          </view>
          <TagLabel :text="selectedImage ? '已准备好' : '待上传'" :tone="selectedImage ? 'mint' : 'slate'"
            :icon="selectedImage ? '✓' : '↑'" size="md" />
        </view>

        <view v-if="selectedImage" class="mt-4 rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
          <AppImage class="h-[320rpx] w-full rounded-[24rpx] bg-white object-cover dark:bg-slate-900"
            :src="selectedImage.url" mode="aspectFill" error-text="识别图片先休息一下" @tap="handlePreviewSelectedImage" />
          <view class="mt-3 flex gap-2">
            <button class="btn-pill-md flex-1 bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-100"
              hover-class="opacity-92" @tap="handleChooseImage">
              重新拍 / 重新选
            </button>
            <button class="btn-pill-md flex-1 bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-100"
              hover-class="opacity-92" @tap="cleanupSelectedImage">
              移除图片
            </button>
          </view>
        </view>

        <view v-else
          class="mt-4 rounded-[28rpx] border border-dashed border-[#D9E8E1] bg-linear-to-br from-white to-[#FFF8EF] px-4 py-6 text-center dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
          <text class="block text-[56rpx]">📷</text>
          <text class="mt-2 block text-sm font-700 text-slate-700 dark:text-slate-100">拍照或从相册选择一张图</text>
          <text class="mt-1 block text-2xs leading-5 text-slate-500 dark:text-slate-300">系统会先自动压缩和做画质容错，再把图送去识别。</text>
          <view class="mt-4">
            <SubmitBtn text="选择图片" variant="sunrise" :block="false" @click="handleChooseImage" />
          </view>
        </view>

        <view class="mt-4">
          <SubmitBtn text="开始病虫害识别" loading-text="识别中..." :loading="isDiagnosing"
            :disabled="!selectedImage || isOffline" @click="handleDiagnose" />
        </view>

        <view v-if="plantDoctorState.quota.exceeded"
          class="mt-4 rounded-[24rpx] bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 dark:bg-amber-500/14 dark:text-amber-100">
          免费识别次数今天已经用完啦。会员可继续使用更多 AI 识别次数，并优先解锁更完整的出差托管建议。
          <text class="ml-2 font-700" @tap="handleOpenMemberBenefits">看看会员权益</text>
        </view>
      </view>

      <view v-if="diagnosisResult" class="card-soft rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">识别结果</text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              先按最轻的一步处理，再观察半天到一天，会比一下子上很多动作更稳。
            </text>
          </view>
          <TagLabel :text="diagnosisResult.confidenceLabel"
            :tone="diagnosisResult.severity === 'high' ? 'cream' : 'mint'" />
        </view>

        <view
          class="mt-4 rounded-[28rpx] bg-linear-to-br from-[#FFF8F0] via-white to-[#F3FCF7] p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
          <text class="block text-lg font-800 text-slate-800 dark:text-slate-100">{{ diagnosisResult.diagnosisTitle
          }}</text>
          <text class="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-300">{{ diagnosisResult.summary
          }}</text>
        </view>

        <view class="mt-4 grid gap-3">
          <view class="rounded-[24rpx] bg-app-ivory/90 px-4 py-4 dark:bg-slate-800">
            <text class="block text-2xs text-slate-400 dark:text-slate-500">症状表现</text>
            <text v-for="item in diagnosisResult.symptomHighlights" :key="item"
              class="mt-2 block text-sm leading-6 text-slate-700 dark:text-slate-200">{{ item }}</text>
          </view>
          <view class="rounded-[24rpx] bg-app-ivory/90 px-4 py-4 dark:bg-slate-800">
            <text class="block text-2xs text-slate-400 dark:text-slate-500">可能成因</text>
            <text v-for="item in diagnosisResult.possibleCauses" :key="item"
              class="mt-2 block text-sm leading-6 text-slate-700 dark:text-slate-200">{{ item }}</text>
          </view>
          <view class="rounded-[24rpx] bg-app-ivory/90 px-4 py-4 dark:bg-slate-800">
            <text class="block text-2xs text-slate-400 dark:text-slate-500">救治步骤</text>
            <text v-for="item in diagnosisResult.treatmentSteps" :key="item"
              class="mt-2 block text-sm leading-6 text-slate-700 dark:text-slate-200">{{ item }}</text>
          </view>
          <view class="rounded-[24rpx] bg-app-ivory/90 px-4 py-4 dark:bg-slate-800">
            <text class="block text-2xs text-slate-400 dark:text-slate-500">预防方式</text>
            <text v-for="item in diagnosisResult.preventionTips" :key="item"
              class="mt-2 block text-sm leading-6 text-slate-700 dark:text-slate-200">{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">出差养护方案</text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              结合天气、摆放位置和出差天数，帮你生成无人托管时的照顾节奏。
            </text>
          </view>
          <TagLabel :text="selectedFlower ? selectedFlowerStatusLabel : '请先选植株'"
            :tone="selectedFlower ? 'mint' : 'slate'" />
        </view>

        <view class="mt-4 rounded-[28rpx] bg-app-ivory/90 px-4 py-4 dark:bg-slate-800">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">出差天数</text>
          <input
            class="mt-2 h-11 rounded-[22rpx] bg-white px-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-100"
            type="number" :value="String(travelDays)" placeholder="输入 1-30 天" @input="handleTravelDaysInput" />
        </view>

        <view class="mt-4">
          <SubmitBtn text="生成无人托管方案" loading-text="生成中..." variant="blush" :loading="isGeneratingTripPlan"
            :disabled="!selectedFlower || !weatherState.weather || isOffline" @click="handleGenerateTripPlan" />
        </view>

        <view v-if="tripCarePlan"
          class="mt-4 rounded-[28rpx] bg-linear-to-br from-[#F8FBFF] via-white to-[#FFF6EC] p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
          <text class="block text-lg font-800 text-slate-800 dark:text-slate-100">{{ tripCarePlan.summary }}</text>
          <text class="mt-1 block text-2xs text-slate-400 dark:text-slate-500">{{ tripCarePlan.cityName }} · {{
            tripCarePlan.travelDays }} 天 · 更新于 {{ formatDateTime(tripCarePlan.generatedAt, {
              pattern: 'YYYY-MM-DD HH:mm'
            }) }}</text>

          <view class="mt-4 grid gap-3">
            <view class="rounded-[24rpx] bg-white/88 px-4 py-4 dark:bg-slate-900">
              <text class="block text-2xs text-slate-400 dark:text-slate-500">出发前</text>
              <text v-for="item in tripCarePlan.beforeTripActions" :key="item"
                class="mt-2 block text-sm leading-6 text-slate-700 dark:text-slate-200">{{ item }}</text>
            </view>
            <view class="rounded-[24rpx] bg-white/88 px-4 py-4 dark:bg-slate-900">
              <text class="block text-2xs text-slate-400 dark:text-slate-500">无人托管期间</text>
              <text v-for="item in tripCarePlan.duringTripAdvice" :key="item"
                class="mt-2 block text-sm leading-6 text-slate-700 dark:text-slate-200">{{ item }}</text>
            </view>
            <view class="rounded-[24rpx] bg-white/88 px-4 py-4 dark:bg-slate-900">
              <text class="block text-2xs text-slate-400 dark:text-slate-500">回家后检查</text>
              <text v-for="item in tripCarePlan.returnHomeChecklist" :key="item"
                class="mt-2 block text-sm leading-6 text-slate-700 dark:text-slate-200">{{ item }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">本地识别记录</text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              记录只保存在本地加密存储里，断网时也还在。
            </text>
          </view>
          <button
            class="h-9 rounded-full border-none bg-slate-100 px-4 text-2xs font-700 text-slate-500 dark:bg-slate-800 dark:text-slate-200"
            hover-class="opacity-92" @tap="clearHistory">
            清空记录
          </button>
        </view>

        <view v-if="plantDoctorState.history.length > 0" class="mt-4 flex flex-col gap-3">
          <view v-for="item in plantDoctorState.history" :key="item.id"
            class="rounded-[26rpx] bg-app-ivory/90 px-4 py-4 dark:bg-slate-800">
            <view class="flex items-start justify-between gap-3">
              <view>
                <text class="block text-sm font-700 text-slate-800 dark:text-slate-100">
                  {{ item.diagnosis?.diagnosisTitle ?? item.tripCarePlan?.summary ?? '本地记录' }}
                </text>
                <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
                  {{ formatDateTime(item.createdAt, { pattern: 'YYYY-MM-DD HH:mm' }) }}{{ item.flowerName ? ` ·
                  ${item.flowerName}` : '' }}{{ item.cityName ? ` · ${item.cityName}` : '' }}
                </text>
              </view>
              <AppImage v-if="item.image" class="h-[96rpx] w-[96rpx] rounded-[20rpx] bg-white dark:bg-slate-900"
                :src="item.image.url" mode="aspectFill" error-text="图片暂时不可用"
                @tap="handleOpenHistoryImage(item.image.url)" />
            </view>

            <text v-if="item.diagnosis" class="mt-3 block text-sm leading-6 text-slate-600 dark:text-slate-300">
              {{ item.diagnosis.summary }}
            </text>
            <text v-if="item.tripCarePlan" class="mt-3 block text-sm leading-6 text-slate-600 dark:text-slate-300">
              {{ item.tripCarePlan.summary }}
            </text>
          </view>
        </view>

        <view v-else
          class="mt-4 rounded-[24rpx] bg-app-ivory/90 px-4 py-4 text-sm leading-6 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          这里会留下最近的识别结果和出差方案，方便你回头再看。
        </view>
      </view>
    </view>

    <AuthLoginPopup v-model="loginPopupVisible" :platform="runtimePlatform" :loading="switchingSession"
      @submit-h5="handleH5Login" @login-wechat="handleWechatLogin" />
  </view>
</template>
