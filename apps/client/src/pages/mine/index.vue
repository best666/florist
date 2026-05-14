<script setup lang="ts">
import type { IImageAsset } from '@florist/contracts'
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { useLocationWeatherReminder } from '@/hooks/useLocationWeatherReminder'
import { DEFAULT_LOCAL_REMINDER_CONFIG, type MineFeedbackItem, type MineStatisticsCard } from '@/interfaces'
import { useAppStore, useFlowerStore, useMemberStore, useRecordStore } from '@/store'
import {
  buildLocalBackupPayload,
  cacheImageForOffline,
  clearMineStorage,
  clearPlantDoctorStorage,
  compressImageSafely,
  createMineEntityId,
  decodeLocalBackup,
  encodeLocalBackup,
  formatDateTime,
  getTimeAgo,
  openPlatformPermissionSetting,
  readMineFeedbackHistory,
  readPlantDoctorHistoryFromStorage,
  readReminderConfigFromStorage,
  removeCachedImage,
  showGentleConfirm,
  showGentleSuccess,
  showGentleToast,
  writeMineFeedbackHistory,
  writePlantDoctorHistoryToStorage,
  writeReminderConfigToStorage,
} from '@/utils'

const appStore = useAppStore()
const flowerStore = useFlowerStore()
const memberStore = useMemberStore()
const recordStore = useRecordStore()
const { activeFlowers, recycleBinFlowers } = storeToRefs(flowerStore)
const { sortedRecords, recentUndoLogs } = storeToRefs(recordStore)

const {
  state: weatherReminderState,
  updateReminderConfig,
  requestLocationPermissionAgain,
} = useLocationWeatherReminder()

const latestBackupString = ref('')
const restoreBackupString = ref('')
const feedbackHistory = ref<ReadonlyArray<MineFeedbackItem>>([])
const plantDoctorHistoryCount = ref(0)
const isGeneratingBackup = ref(false)
const isRestoringBackup = ref(false)
const isClearingData = ref(false)
const isChoosingFeedbackImages = ref(false)
const isSubmittingFeedback = ref(false)

const feedbackDraft = reactive({
  content: '',
  images: [] as IImageAsset[],
})

onShow(async () => {
  memberStore.syncMembershipStatus()
  await flowerStore.initializeGarden()
  await recordStore.initializeRecordCenter()
  refreshLocalSnapshots()
})

const totalPlantCount = computed(() => activeFlowers.value.length + recycleBinFlowers.value.length)
const survivalPlantCount = computed(() => activeFlowers.value.length)

const careDays = computed(() => {
  const allFlowers = [...activeFlowers.value, ...recycleBinFlowers.value]

  if (allFlowers.length === 0) {
    return 0
  }

  const createdTimestamps = allFlowers
    .map(flower => new Date(flower.createdAt).getTime())
    .filter(timestamp => Number.isFinite(timestamp))
    .sort((left, right) => left - right)

  const earliestCreatedAt = createdTimestamps[0]

  if (earliestCreatedAt === undefined || !Number.isFinite(earliestCreatedAt)) {
    return 0
  }

  return Math.max(1, Math.ceil((Date.now() - earliestCreatedAt) / (24 * 60 * 60 * 1000)))
})

const statisticsCards = computed<ReadonlyArray<MineStatisticsCard>>(() => ([
  {
    key: 'plants',
    label: '植株总数',
    value: String(totalPlantCount.value),
    hint: '包含仍在照护中的植物和回收站临时保留项。',
    accentClass: 'from-[#CDEEDC] to-[#FFF0D9]',
  },
  {
    key: 'records',
    label: '打卡次数',
    value: String(sortedRecords.value.length),
    hint: '每一次浇水、施肥、修剪都会被温柔记下。',
    accentClass: 'from-[#FBD4E3] to-[#FFF4E7]',
  },
  {
    key: 'survival',
    label: '存活数量',
    value: String(survivalPlantCount.value),
    hint: '当前仍在花园里继续陪伴你的植物数量。',
    accentClass: 'from-[#D7E9FF] to-[#FFF9DD]',
  },
  {
    key: 'days',
    label: '养护天数',
    value: String(careDays.value),
    hint: '从第一盆植物入住开始累计的陪伴时间。',
    accentClass: 'from-[#FFE8C5] to-[#F8D7CE]',
  },
]))

const visualizedStats = computed(() => {
  const entries = [
    {
      key: 'plants',
      label: '花园规模',
      value: totalPlantCount.value,
      colorClass: 'bg-[#8FD3A8]',
    },
    {
      key: 'records',
      label: '打卡活跃度',
      value: sortedRecords.value.length,
      colorClass: 'bg-[#F7B4C8]',
    },
    {
      key: 'recycle',
      label: '待恢复植株',
      value: recycleBinFlowers.value.length,
      colorClass: 'bg-[#F4C46A]',
    },
  ]
  const maxValue = Math.max(...entries.map(item => item.value), 1)

  return entries.map(item => ({
    ...item,
    width: `${Math.max(18, Math.round((item.value / maxValue) * 100))}%`,
  }))
})

const reminderTimeText = computed(() => {
  const config = weatherReminderState.reminderConfig
  return `${String(config.reminderHour).padStart(2, '0')}:${String(config.reminderMinute).padStart(2, '0')}`
})

const quietHoursText = computed(() => {
  const quietHours = weatherReminderState.reminderConfig.quietHours

  if (quietHours.startHour === quietHours.endHour && quietHours.startMinute === quietHours.endMinute) {
    return '未开启'
  }

  return `${String(quietHours.startHour).padStart(2, '0')}:${String(quietHours.startMinute).padStart(2, '0')} - ${String(quietHours.endHour).padStart(2, '0')}:${String(quietHours.endMinute).padStart(2, '0')}`
})

const quietHoursEnabled = computed(() => quietHoursText.value !== '未开启')

const recycleBinSummary = computed(() => {
  if (recycleBinFlowers.value.length === 0) {
    return '回收站现在是空的，误删的植物会在这里保留 7 天。'
  }

  return `当前有 ${recycleBinFlowers.value.length} 株植物在回收站，随时可以手动恢复。`
})

function refreshLocalSnapshots(): void {
  feedbackHistory.value = readMineFeedbackHistory()
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
  plantDoctorHistoryCount.value = readPlantDoctorHistoryFromStorage().length
  weatherReminderState.reminderConfig = readReminderConfigFromStorage()
}

function copyText(value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.setClipboardData({
      data: value,
      success: () => resolve(),
      fail: () => reject(new Error('复制失败')),
    })
  })
}

function showConfirm(options: { title: string, content: string, confirmText?: string }): Promise<boolean> {
  return showGentleConfirm({
    title: options.title,
    content: options.content,
    ...(options.confirmText ? { confirmText: options.confirmText } : {}),
  })
}

async function handleGenerateBackup(): Promise<void> {
  isGeneratingBackup.value = true

  try {
    const backupPayload = buildLocalBackupPayload({
      appState: {
        runtimePlatform: appStore.runtimePlatform,
        lastSyncAt: appStore.lastSyncAt,
        isOffline: appStore.isOffline,
        networkType: appStore.networkType,
        syncStatus: appStore.syncStatus,
        syncMessage: appStore.syncMessage,
      },
      flowers: activeFlowers.value,
      recycleBin: recycleBinFlowers.value,
      records: sortedRecords.value,
      undoLogs: recentUndoLogs.value,
      reminderConfig: weatherReminderState.reminderConfig,
      plantDoctorHistory: readPlantDoctorHistoryFromStorage(),
      mineFeedbacks: feedbackHistory.value,
    })

    latestBackupString.value = encodeLocalBackup(backupPayload)
    await copyText(latestBackupString.value)

    showGentleSuccess('备份串已经复制好啦。')
  }
  catch (error) {
    showGentleToast(error instanceof Error ? error.message : '备份生成时刚好卡了一下。')
  }
  finally {
    isGeneratingBackup.value = false
  }
}

async function handleRestoreBackup(): Promise<void> {
  if (!restoreBackupString.value.trim()) {
    showGentleToast('先把备份串贴进来，我们再继续恢复。')
    return
  }

  let parsedBackup

  try {
    parsedBackup = decodeLocalBackup(restoreBackupString.value)
  }
  catch (error) {
    showGentleToast(error instanceof Error ? error.message : '备份解析时有一点不完整。')
    return
  }

  const confirmed = await showConfirm({
    title: '导入恢复',
    content: '恢复会覆盖当前本地花园、记录、提醒配置和反馈草稿，请确认这就是你要恢复的那份数据。',
    confirmText: '覆盖恢复',
  })

  if (!confirmed) {
    return
  }

  isRestoringBackup.value = true

  try {
    flowerStore.replaceLocalCenter({
      flowers: parsedBackup.flowers,
      recycleBin: parsedBackup.recycleBin,
    })
    recordStore.replaceLocalCenter({
      records: parsedBackup.records,
      undoLogs: parsedBackup.undoLogs,
    })
    appStore.$patch({
      ...parsedBackup.appState,
    })
    weatherReminderState.reminderConfig = parsedBackup.reminderConfig
    writeReminderConfigToStorage(parsedBackup.reminderConfig)
    writePlantDoctorHistoryToStorage(parsedBackup.plantDoctorHistory)
    writeMineFeedbackHistory(parsedBackup.mineFeedbacks)
    feedbackDraft.content = ''
    feedbackDraft.images = []
    refreshLocalSnapshots()

    showGentleSuccess('本地数据已经恢复好了。')
  }
  finally {
    isRestoringBackup.value = false
  }
}

async function handleClearAllLocalData(): Promise<void> {
  const confirmed = await showConfirm({
    title: '清空本地数据',
    content: '这会清空植株、打卡、植物医生历史、反馈记录和提醒配置，且无法撤回。',
    confirmText: '确认清空',
  })

  if (!confirmed) {
    return
  }

  isClearingData.value = true

  try {
    await flowerStore.clearLocalGarden()
    await recordStore.clearLocalRecords()
    await Promise.all(feedbackDraft.images.map(async image => removeCachedImage(image.url)))
    clearPlantDoctorStorage()
    clearMineStorage()
    weatherReminderState.reminderConfig = { ...DEFAULT_LOCAL_REMINDER_CONFIG }
    writeReminderConfigToStorage(weatherReminderState.reminderConfig)
    appStore.$patch({
      lastSyncAt: null,
    })
    latestBackupString.value = ''
    restoreBackupString.value = ''
    feedbackDraft.content = ''
    feedbackDraft.images = []
    feedbackHistory.value = []
    plantDoctorHistoryCount.value = 0

    showGentleSuccess('本地数据已经清理完成。')
  }
  finally {
    isClearingData.value = false
  }
}

function handleToggleReminder(event: { detail: { value: boolean } }): void {
  updateReminderConfig({ enabled: event.detail.value })
}

function handleToggleQuietHours(event: { detail: { value: boolean } }): void {
  updateReminderConfig({
    quietHours: event.detail.value
      ? {
        startHour: 22,
        startMinute: 0,
        endHour: 8,
        endMinute: 0,
      }
      : {
        startHour: 22,
        startMinute: 0,
        endHour: 22,
        endMinute: 0,
      },
  })
}

async function handleOpenPermissionSetting(): Promise<void> {
  const opened = await openPlatformPermissionSetting()

  if (!opened) {
    showGentleToast('当前平台还不能直接打开权限设置。')
  }
}

async function handleRestoreLocationPermission(): Promise<void> {
  const succeeded = await requestLocationPermissionAgain()

  if (succeeded) {
    showGentleSuccess('已经重新帮你尝试定位权限啦。')
  }
}

async function handleChooseFeedbackImages(): Promise<void> {
  const remaining = 3 - feedbackDraft.images.length

  if (remaining <= 0) {
    showGentleToast('反馈图片先保留 3 张以内，会更好整理。')
    return
  }

  isChoosingFeedbackImages.value = true

  try {
    const result = await uni.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })

    for (const filePath of result.tempFilePaths) {
      const compressed = await compressImageSafely(filePath, {
        maxSizeInBytes: 1024 * 1024,
      })
      const offlinePath = await cacheImageForOffline(compressed.filePath)

      feedbackDraft.images.push({
        id: createMineEntityId('feedback-image'),
        url: offlinePath,
        ...(compressed.filePath !== offlinePath ? { compressedUrl: compressed.filePath } : {}),
        createdAt: new Date().toISOString(),
      })
    }
  }
  catch {
    // 用户取消选择图片时不提示。
  }
  finally {
    isChoosingFeedbackImages.value = false
  }
}

async function handleRemoveFeedbackImage(imageId: string): Promise<void> {
  const targetImage = feedbackDraft.images.find(image => image.id === imageId)

  if (!targetImage) {
    return
  }

  await removeCachedImage(targetImage.url)
  feedbackDraft.images = feedbackDraft.images.filter(image => image.id !== imageId)
}

async function handleSubmitFeedback(): Promise<void> {
  if (feedbackDraft.content.trim().length < 5) {
    showGentleToast('反馈内容写满 5 个字，我们会更容易看懂你的想法。')
    return
  }

  isSubmittingFeedback.value = true

  try {
    const nextFeedback: MineFeedbackItem = {
      id: createMineEntityId('feedback'),
      content: feedbackDraft.content.trim(),
      images: feedbackDraft.images.map(image => ({ ...image })),
      createdAt: new Date().toISOString(),
    }

    const nextHistory = [nextFeedback, ...feedbackHistory.value].slice(0, 10)
    writeMineFeedbackHistory(nextHistory)
    feedbackHistory.value = nextHistory
    feedbackDraft.content = ''
    feedbackDraft.images = []

    showGentleSuccess('反馈草稿已经本地保存好啦。')
  }
  finally {
    isSubmittingFeedback.value = false
  }
}

async function handleRestoreFlower(flowerId: string): Promise<void> {
  const restored = await flowerStore.restoreFlowerFromRecycleBin(flowerId)

  if (!restored) {
    showGentleToast('这株植物可能已经先一步回到花园了。')
    return
  }

  showGentleSuccess('植物已经回到花园啦。')
}

function handleOpenPage(url: string): void {
  uni.navigateTo({ url })
}

function handleOpenMemberCenter(): void {
  uni.navigateTo({
    url: '/pages/member/index',
  })
}

function handleOpenShop(): void {
  uni.navigateTo({
    url: '/pages/shop/index',
  })
}
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-[#FFF8F1] via-[#F9F5EC] to-[#FFFDF8]">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-8">
      <view
        class="overflow-hidden rounded-[36rpx] bg-linear-to-br from-[#F6D8DF] via-[#FFF4E6] to-[#DDF2E8] px-5 py-5 shadow-[0_18rpx_54rpx_rgba(244,200,194,0.22)]">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-white/80 text-slate-600">
              我的花园
            </view>
            <view class="mt-3 text-[42rpx] font-900 leading-tight text-slate-800">
              把照护数据、提醒和备份，都安静收在这里
            </view>
            <view class="mt-2 text-sm leading-6 text-slate-600">
              个人中心以本地加密数据为主，适合整理习惯、恢复误删、手动备份和查看最近的照护沉淀。
            </view>
          </view>
          <view
            class="flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-white/60 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.38)]">
            🪴
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800">
              会员与皮肤主题
            </text>
            <text class="mt-1 block text-sm text-slate-500">
              {{ memberStore.currentStatusLabel }} · 当前主题 {{ memberStore.currentTheme.label }}
            </text>
          </view>
          <TagLabel :text="memberStore.isMemberActive ? '权益生效中' : '免费版'"
            :tone="memberStore.isMemberActive ? 'mint' : 'slate'" />
        </view>

        <view class="mt-4 rounded-[24rpx] bg-linear-to-r from-[#FBF1DE] via-[#FFF8EC] to-[#EAF6EF] px-4 py-4">
          <text class="block text-sm font-800 text-slate-800">
            AI 无限次、无水印、全部皮肤、云备份、全局去广告
          </text>
          <text class="mt-2 block text-sm leading-6 text-slate-600">
            会员状态会本地加密缓存，到期后自动降级，会员专属皮肤和能力会立即按权益枚举重新拦截。
          </text>
          <button class="mt-3 h-[84rpx] rounded-[22rpx] border-none bg-[#EFD69E] text-sm font-800 text-slate-700"
            hover-class="opacity-92" @tap="handleOpenMemberCenter">
            打开会员中心
          </button>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800">
              极简养花商城
            </text>
            <text class="mt-1 block text-sm text-slate-500">
              只看花盆、肥料、药剂、工具和营养土，不做站内交易。
            </text>
          </view>
          <TagLabel :text="memberStore.hasAdFree ? '会员已隐藏广告' : '弱广告静态展示'"
            :tone="memberStore.hasAdFree ? 'mint' : 'cream'" />
        </view>

        <view class="mt-4 rounded-[24rpx] bg-[#F7F4EC] px-4 py-4">
          <text class="block text-sm leading-6 text-slate-600">
            商城只做种草引流，不做满减、弹窗、开屏和诱导式消费。商品卡片会直接跳到外链，小程序端会复制链接到剪贴板。
          </text>
          <button class="mt-3 h-[84rpx] rounded-[22rpx] border-none bg-[#E6F1E8] text-sm font-800 text-slate-700"
            hover-class="opacity-92" @tap="handleOpenShop">
            打开极简商城
          </button>
        </view>
      </view>

      <view class="grid grid-cols-2 gap-3">
        <view v-for="card in statisticsCards" :key="card.key"
          class="overflow-hidden rounded-[30rpx] bg-white p-4 shadow-[0_14rpx_34rpx_rgba(148,163,184,0.12)]">
          <view :class="`mb-3 h-[12rpx] rounded-full bg-linear-to-r ${card.accentClass}`" />
          <text class="block text-xs tracking-[0.22em] text-slate-400">
            {{ card.label }}
          </text>
          <text class="mt-2 block text-[42rpx] font-900 text-slate-800">
            {{ card.value }}
          </text>
          <text class="mt-2 block text-2xs leading-5 text-slate-500">
            {{ card.hint }}
          </text>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800">
              数据可视化
            </text>
            <text class="mt-1 block text-sm text-slate-500">
              用简单的横向条带看当前花园规模、打卡活跃度和待恢复状态。
            </text>
          </view>
          <TagLabel :text="`${plantDoctorHistoryCount} 条植物医生历史`" tone="cream" />
        </view>

        <view class="mt-4 flex flex-col gap-4">
          <view v-for="item in visualizedStats" :key="item.key" class="flex flex-col gap-2">
            <view class="flex items-center justify-between text-sm text-slate-600">
              <text>{{ item.label }}</text>
              <text class="font-700 text-slate-800">{{ item.value }}</text>
            </view>
            <view class="h-[18rpx] overflow-hidden rounded-full bg-[#F4EFE6]">
              <view :class="`${item.colorClass} h-full rounded-full transition-all duration-300`"
                :style="{ width: item.width }" />
            </view>
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800">
              本地备份与恢复
            </text>
            <text class="mt-1 block text-sm text-slate-500">
              生成一段加密备份串，复制后可手动保存；导入时粘贴即可覆盖恢复。
            </text>
          </view>
          <TagLabel :text="memberStore.hasCloudBackup ? '云备份权益已解锁' : 'AES 本地加密'"
            :tone="memberStore.hasCloudBackup ? 'mint' : 'cream'" />
        </view>

        <view class="mt-4 rounded-[24rpx] bg-[#F6F7FB] px-4 py-4 text-sm leading-6 text-slate-600">
          {{ memberStore.hasCloudBackup ? '当前账号已解锁云端备份资格。受限于现阶段尚未接入真实云存储，这里先保留本地加密备份流程。' :
            '当前为免费版，只提供本地加密备份。开通会员后可获得云端备份资格。' }}
        </view>

        <view class="mt-4 grid grid-cols-2 gap-3">
          <button class="h-[92rpx] rounded-[24rpx] border-none bg-[#E7F7EE] text-sm font-700 text-emerald-700"
            hover-class="opacity-92" :loading="isGeneratingBackup" @tap="handleGenerateBackup">
            一键生成备份
          </button>
          <button class="h-[92rpx] rounded-[24rpx] border-none bg-[#FCE7E7] text-sm font-700 text-rose-600"
            hover-class="opacity-92" :loading="isClearingData" @tap="handleClearAllLocalData">
            一键清空本地
          </button>
        </view>

        <view class="mt-4 rounded-[24rpx] bg-[#FBF6EE] px-4 py-4">
          <text class="block text-sm font-700 text-slate-700">
            最近生成的备份串
          </text>
          <textarea
            class="mt-3 min-h-[180rpx] w-full rounded-[20rpx] bg-white px-3 py-3 text-xs leading-6 text-slate-600"
            :value="latestBackupString" :maxlength="-1" disabled auto-height placeholder="点击上方按钮后，这里会生成可复制的加密备份串。" />
        </view>

        <view class="mt-4 rounded-[24rpx] bg-[#F8F7FF] px-4 py-4">
          <text class="block text-sm font-700 text-slate-700">
            导入恢复
          </text>
          <textarea v-model="restoreBackupString"
            class="mt-3 min-h-[180rpx] w-full rounded-[20rpx] bg-white px-3 py-3 text-xs leading-6 text-slate-600"
            :maxlength="-1" auto-height placeholder="把之前保存的备份串完整粘贴到这里。" />
          <button class="mt-3 h-[92rpx] rounded-[24rpx] border-none bg-[#DDE7FF] text-sm font-700 text-[#4162B8]"
            hover-class="opacity-92" :loading="isRestoringBackup" @tap="handleRestoreBackup">
            一键导入恢复
          </button>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800">
              权限与通知
            </text>
            <text class="mt-1 block text-sm text-slate-500">
              这里统一管理提醒开关、夜间免打扰和系统权限入口。
            </text>
          </view>
          <TagLabel :text="weatherReminderState.reminderConfig.enabled ? '提醒已开启' : '提醒未开启'" tone="blush" />
        </view>

        <view class="mt-4 flex flex-col gap-3">
          <view class="rounded-[24rpx] bg-[#FBF7F0] px-4 py-4">
            <view class="flex items-center justify-between gap-3">
              <view>
                <text class="block text-sm font-700 text-slate-800">消息通知</text>
                <text class="mt-1 block text-2xs leading-5 text-slate-500">每日提醒时间 {{ reminderTimeText }}</text>
              </view>
              <switch :checked="weatherReminderState.reminderConfig.enabled" color="#74C69D"
                @change="handleToggleReminder" />
            </view>
          </view>

          <view class="rounded-[24rpx] bg-[#FFF4EB] px-4 py-4">
            <view class="flex items-center justify-between gap-3">
              <view>
                <text class="block text-sm font-700 text-slate-800">夜间免打扰</text>
                <text class="mt-1 block text-2xs leading-5 text-slate-500">默认静默时段 {{ quietHoursText }}</text>
              </view>
              <switch :checked="quietHoursEnabled" color="#E9A857" @change="handleToggleQuietHours" />
            </view>
          </view>

          <view class="grid grid-cols-2 gap-3">
            <button class="h-[88rpx] rounded-[22rpx] border-none bg-[#EAF2FF] text-sm font-700 text-[#4768C1]"
              hover-class="opacity-92" @tap="handleOpenPermissionSetting">
              打开权限设置
            </button>
            <button class="h-[88rpx] rounded-[22rpx] border-none bg-[#E9F7F3] text-sm font-700 text-[#2E8D76]"
              hover-class="opacity-92" @tap="handleRestoreLocationPermission">
              重新申请定位
            </button>
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800">
              意见反馈
            </text>
            <text class="mt-1 block text-sm text-slate-500">
              支持文字和图片，当前先本地留存，方便你整理后续要反馈的问题和建议。
            </text>
          </view>
          <TagLabel :text="`${feedbackHistory.length} 条已保存`" tone="slate" />
        </view>

        <textarea v-model="feedbackDraft.content"
          class="mt-4 min-h-[180rpx] w-full rounded-[24rpx] bg-[#F9F4EE] px-4 py-4 text-sm leading-7 text-slate-700"
          :maxlength="300" auto-height placeholder="比如：某个页面交互不顺手、希望增加什么能力、或者哪一步让你有点卡住。" />

        <view class="mt-4 grid grid-cols-3 gap-3">
          <view v-for="image in feedbackDraft.images" :key="image.id"
            class="relative overflow-hidden rounded-[24rpx] bg-[#F6F1E8]">
            <AppImage class="h-[180rpx] w-full" :src="image.url" mode="aspectFill" error-text="反馈图片先休息一下" />
            <button
              class="absolute right-2 top-2 h-8 min-h-8 w-8 min-w-8 rounded-full border-none bg-black/55 px-0 text-xs text-white"
              hover-class="opacity-92" @tap="handleRemoveFeedbackImage(image.id)">
              ×
            </button>
          </view>

          <button v-if="feedbackDraft.images.length < 3"
            class="flex h-[180rpx] items-center justify-center rounded-[24rpx] border-none bg-[#FBF5EC] text-sm font-700 text-slate-500"
            hover-class="opacity-92" :loading="isChoosingFeedbackImages" @tap="handleChooseFeedbackImages">
            + 添加图片
          </button>
        </view>

        <button
          class="mt-4 h-[92rpx] rounded-[24rpx] border-none bg-linear-to-r from-[#F2C8D7] to-[#E8D39D] text-sm font-800 text-slate-700"
          hover-class="opacity-92" :loading="isSubmittingFeedback" @tap="handleSubmitFeedback">
          保存反馈草稿
        </button>

        <view v-if="feedbackHistory.length > 0" class="mt-4 flex flex-col gap-3">
          <view v-for="item in feedbackHistory.slice(0, 3)" :key="item.id"
            class="rounded-[24rpx] bg-[#F8F3EC] px-4 py-4">
            <view class="flex items-center justify-between gap-3 text-2xs text-slate-400">
              <text>{{ formatDateTime(item.createdAt, { pattern: 'YYYY-MM-DD HH:mm' }) }}</text>
              <text>{{ item.images.length }} 张图片</text>
            </view>
            <text class="mt-2 block text-sm leading-6 text-slate-700">{{ item.content }}</text>
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800">
              回收站管理
            </text>
            <text class="mt-1 block text-sm text-slate-500">
              {{ recycleBinSummary }}
            </text>
          </view>
          <TagLabel :text="`${recycleBinFlowers.length} 株待恢复`" tone="cream" />
        </view>

        <view v-if="recycleBinFlowers.length === 0"
          class="mt-4 rounded-[24rpx] bg-[#FBF7F1] px-4 py-5 text-sm leading-6 text-slate-500">
          最近没有误删内容，后续删除的植物会先在这里静静保留。
        </view>

        <view v-else class="mt-4 flex flex-col gap-3">
          <view v-for="flower in recycleBinFlowers" :key="flower.id" class="rounded-[24rpx] bg-[#FBF6EE] px-4 py-4">
            <view class="flex items-center justify-between gap-3">
              <view class="min-w-0 flex-1">
                <text class="block truncate text-sm font-800 text-slate-800">{{ flower.name }}</text>
                <text class="mt-1 block text-2xs leading-5 text-slate-500">
                  删除于 {{ flower.deletedAt ? getTimeAgo(flower.deletedAt) : '刚刚' }}
                </text>
                <text v-if="flower.pendingPurgeAt" class="mt-1 block text-2xs leading-5 text-slate-400">
                  预计清理：{{ formatDateTime(flower.pendingPurgeAt, { pattern: 'YYYY-MM-DD HH:mm' }) }}
                </text>
              </view>
              <button class="h-[76rpx] rounded-full border-none bg-[#DDF0E5] px-4 text-2xs font-800 text-emerald-700"
                hover-class="opacity-92" @tap="handleRestoreFlower(flower.id)">
                恢复
              </button>
            </view>
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view>
          <text class="block text-base font-800 text-slate-800">
            关于与协议
          </text>
          <text class="mt-1 block text-sm text-slate-500">
            包括产品说明、隐私协议和用户协议，双端都可直接查看。
          </text>
        </view>

        <view class="mt-4 flex flex-col gap-3">
          <button
            class="flex h-[88rpx] items-center justify-between rounded-[24rpx] border-none bg-[#F9F4EE] px-4 text-left text-sm font-700 text-slate-700"
            hover-class="opacity-92" @tap="handleOpenPage('/pages/about/index')">
            <text>关于我们</text>
            <text class="text-slate-400">查看</text>
          </button>
          <button
            class="flex h-[88rpx] items-center justify-between rounded-[24rpx] border-none bg-[#F7F0FA] px-4 text-left text-sm font-700 text-slate-700"
            hover-class="opacity-92" @tap="handleOpenPage('/pages/privacy/index')">
            <text>隐私协议</text>
            <text class="text-slate-400">查看</text>
          </button>
          <button
            class="flex h-[88rpx] items-center justify-between rounded-[24rpx] border-none bg-[#F4F7FF] px-4 text-left text-sm font-700 text-slate-700"
            hover-class="opacity-92" @tap="handleOpenPage('/pages/user-agreement/index')">
            <text>用户协议</text>
            <text class="text-slate-400">查看</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>
