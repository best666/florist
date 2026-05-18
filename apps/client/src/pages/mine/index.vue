<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import AuthLoginPopup from '@/components/AuthLoginPopup.vue'
import MineAuthCard from '@/components/MineAuthCard.vue'
import MineFeedbackPanel from '@/components/MineFeedbackPanel.vue'
import MineStatisticsGrid from '@/components/MineStatisticsGrid.vue'
import UserProfilePopup from '@/components/UserProfilePopup.vue'
import { updateCurrentUser } from '@/api'
import { useAuthSessionActions } from '@/hooks/useAuthSessionActions'
import { useLocationWeatherReminder } from '@/hooks/useLocationWeatherReminder'
import { ClientPlatform, DEFAULT_LOCAL_REMINDER_CONFIG, type MineStatisticsCard } from '@/interfaces'
import { useAppStore, useAuthStore, useFlowerStore, useMemberStore, useRecordStore } from '@/store'
import {
  buildLocalBackupPayload,
  clearMineStorage,
  clearPlantDoctorStorage,
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
const authStore = useAuthStore()
const flowerStore = useFlowerStore()
const memberStore = useMemberStore()
const recordStore = useRecordStore()
const { currentUser, isAuthenticated, switchingSession } = storeToRefs(authStore)
const { activeFlowers, recycleBinFlowers } = storeToRefs(flowerStore)
const { sortedRecords, recentUndoLogs } = storeToRefs(recordStore)

const {
  state: weatherReminderState,
  updateReminderConfig,
  requestLocationPermissionAgain,
} = useLocationWeatherReminder()

const latestBackupString = ref('')
const restoreBackupString = ref('')
const feedbackCount = ref(0)
const feedbackPanelRefreshToken = ref(0)
const plantDoctorHistoryCount = ref(0)
const isGeneratingBackup = ref(false)
const isRestoringBackup = ref(false)
const isClearingData = ref(false)
const loginPopupVisible = ref(false)
const profilePopupVisible = ref(false)
const isSavingProfile = ref(false)

const runtimePlatform = computed(() => appStore.runtimePlatform ?? ClientPlatform.H5)
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

function bumpFeedbackRefreshToken(): void {
  feedbackPanelRefreshToken.value += 1
}

function refreshLocalSnapshots(): void {
  feedbackCount.value = readMineFeedbackHistory().length
  plantDoctorHistoryCount.value = readPlantDoctorHistoryFromStorage().length
  weatherReminderState.reminderConfig = readReminderConfigFromStorage()
  bumpFeedbackRefreshToken()
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

onShow(async () => {
  await memberStore.initializeMembership(true)
  await flowerStore.initializeGarden()
  await recordStore.initializeRecordCenter()
  refreshLocalSnapshots()
})

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
      mineFeedbacks: readMineFeedbackHistory(),
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
    const feedbackImages = readMineFeedbackHistory().flatMap(item => item.images)
    await Promise.all(feedbackImages.map(async image => {
      await removeCachedImage(image.url)

      if (image.compressedUrl) {
        await removeCachedImage(image.compressedUrl)
      }
    }))
    await flowerStore.clearLocalGarden()
    await recordStore.clearLocalRecords()
    clearPlantDoctorStorage()
    clearMineStorage()
    weatherReminderState.reminderConfig = { ...DEFAULT_LOCAL_REMINDER_CONFIG }
    writeReminderConfigToStorage(weatherReminderState.reminderConfig)
    appStore.$patch({
      lastSyncAt: null,
    })
    latestBackupString.value = ''
    restoreBackupString.value = ''
    feedbackCount.value = 0
    plantDoctorHistoryCount.value = 0
    bumpFeedbackRefreshToken()
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

async function handleRestoreFlower(flowerId: string): Promise<void> {
  const restored = await flowerStore.restoreFlowerFromRecycleBin(flowerId)

  if (!restored) {
    showGentleToast('这株植物可能已经先一步回到花园了。')
    return
  }

  showGentleSuccess('植物已经回到花园啦。')
}

function openLoginPopup(): void {
  loginPopupVisible.value = true
}

function openProfilePopup(): void {
  profilePopupVisible.value = true
}

const { handleH5Login, handleWechatLogin } = useAuthSessionActions({
  onCloseLoginPopup: () => {
    loginPopupVisible.value = false
  },
  onLoginSuccess: async () => {
    refreshLocalSnapshots()
  },
})

async function handleLogoutToLocalMode(): Promise<void> {
  const confirmed = await showConfirm({
    title: '切换到本地花园',
    content: '切换后会回到当前设备的本地花园继续记录，本次登录账号的数据会保留，下次登录还能继续使用。',
    confirmText: '切换到本地花园',
  })

  if (!confirmed) {
    return
  }

  await authStore.logoutToLocalMode()
  refreshLocalSnapshots()
  showGentleSuccess('已切换到本地花园。')
}

async function handleSubmitProfile(payload: { nickname: string, avatarUrl: string, profileSignature: string }): Promise<void> {
  isSavingProfile.value = true

  try {
    const updatedUser = await updateCurrentUser(payload)
    authStore.patchCurrentUser(updatedUser)
    profilePopupVisible.value = false
    showGentleSuccess('个人资料已经更新。')
  }
  catch (error) {
    showGentleToast(error instanceof Error ? error.message : '资料保存失败，请稍后再试。')
  }
  finally {
    isSavingProfile.value = false
  }
}

function handleFeedbackCountChange(count: number): void {
  feedbackCount.value = count
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
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-5 pb-[220rpx]">
      <view class="hero-shell app-fade-up bg-linear-to-br from-[#f5d7df] via-[#fff5e7] to-[#def2e8]">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-white/80 text-slate-600">
              我的花园
            </view>
            <view class="mt-3 text-[50rpx] font-900 leading-[1.18] text-app-ink">
              把照护数据、提醒和备份，都安静收在这里
            </view>
            <view class="mt-3 text-[28rpx] leading-7 text-app-muted">
              个人中心以本地加密数据为主，适合整理习惯、恢复误删、手动备份和查看最近的照护沉淀。
            </view>
          </view>
          <view
            class="app-float-soft flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-white/60 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.38)]">
            🪴
          </view>
        </view>
      </view>

      <MineAuthCard :current-user="currentUser" :is-authenticated="isAuthenticated" :loading="switchingSession"
        :runtime-platform="runtimePlatform" @login="openLoginPopup" @edit-profile="openProfilePopup"
        @logout="handleLogoutToLocalMode" />

      <view class="card-soft app-fade-up rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-app-ink">
              会员与皮肤主题
            </text>
            <text class="mt-1 block text-sm text-app-muted">
              {{ memberStore.currentStatusLabel }} · 当前主题 {{ memberStore.currentTheme.label }}
            </text>
          </view>
          <TagLabel :text="memberStore.isMemberActive ? '权益生效中' : '免费版'"
            :tone="memberStore.isMemberActive ? 'mint' : 'slate'" :icon="memberStore.isMemberActive ? '✓' : '○'"
            size="md" />
        </view>

        <view
          class="surface-soft mt-4 rounded-[24rpx] bg-linear-to-r from-[#fbf1de] via-[#fff8ec] to-[#eaf6ef] px-4 py-4">
          <text class="block text-sm font-800 text-app-ink">
            AI 无限次、无水印、全部皮肤、云备份、全局去广告
          </text>
          <text class="mt-2 block text-sm leading-6 text-app-muted">
            会员状态会本地加密缓存，到期后自动降级，会员专属皮肤和能力会立即按权益枚举重新拦截。
          </text>
          <button class="btn-panel surface-soft mt-3 bg-[#efd69e] text-app-ink" hover-class="opacity-92"
            @tap="handleOpenMemberCenter">
            打开会员中心
          </button>
        </view>
      </view>

      <MineStatisticsGrid :cards="statisticsCards" />

      <CollapsibleSection title="扩展服务与沉淀" description="把商城和次级统计收进一层，个人中心先突出数据和设置。"
        :tag-text="`${plantDoctorHistoryCount} 条植物医生历史`" tag-tone="cream" tag-icon="✦">
        <view class="grid gap-3">
          <ActionHintButton title="打开极简商城" hint="外链种草入口，不做站内交易和营销干扰。" icon="↗" @click="handleOpenShop" />

          <view class="surface-soft rounded-[24rpx] bg-[#f7f4ec] px-4 py-4 text-sm leading-6 text-app-muted">
            商城只做种草引流，不做满减、弹窗、开屏和诱导式消费。商品卡片会直接跳到外链，小程序端会复制链接到剪贴板。
          </view>

          <view class="mt-1 flex flex-col gap-4">
            <view v-for="item in visualizedStats" :key="item.key" class="flex flex-col gap-2">
              <view class="flex items-center justify-between text-sm text-app-muted">
                <text>{{ item.label }}</text>
                <text class="font-700 text-app-ink">{{ item.value }}</text>
              </view>
              <view class="h-[18rpx] overflow-hidden rounded-full bg-[#f4efe6]">
                <view :class="`${item.colorClass} h-full rounded-full transition-all duration-300`"
                  :style="{ width: item.width }" />
              </view>
            </view>
          </view>
        </view>
      </CollapsibleSection>

      <CollapsibleSection title="本地备份与恢复" description="备份、恢复和清空操作改为折叠区，避免长期占满页面。"
        :tag-text="memberStore.hasCloudBackup ? '云备份权益已解锁' : 'AES 本地加密'"
        :tag-tone="memberStore.hasCloudBackup ? 'mint' : 'cream'" :tag-icon="memberStore.hasCloudBackup ? '☁' : '⌁'">
        <view class="surface-soft mt-4 rounded-[24rpx] bg-[#f6f7fb] px-4 py-4 text-sm leading-6 text-app-muted">
          {{ memberStore.hasCloudBackup ? '当前账号已解锁云端备份资格。受限于现阶段尚未接入真实云存储，这里先保留本地加密备份流程。' :
            '当前为免费版，只提供本地加密备份。开通会员后可获得云端备份资格。' }}
        </view>

        <view class="mt-4 grid grid-cols-2 gap-3">
          <button class="btn-panel surface-soft bg-[#e7f7ee] text-[#2f7a64]" hover-class="opacity-92"
            :loading="isGeneratingBackup" @tap="handleGenerateBackup">
            一键生成备份
          </button>
          <button class="btn-panel surface-soft bg-[#fce7e7] text-[#b25663]" hover-class="opacity-92"
            :loading="isClearingData" @tap="handleClearAllLocalData">
            一键清空本地
          </button>
        </view>

        <view class="surface-soft mt-4 rounded-[24rpx] bg-[#fbf6ee] px-4 py-4">
          <text class="block text-sm font-700 text-app-ink">
            最近生成的备份串
          </text>
          <textarea class="field-textarea surface-soft mt-3 min-h-[180rpx] rounded-[20rpx] bg-white px-3 text-app-muted"
            :value="latestBackupString" :maxlength="-1" disabled auto-height placeholder="点击上方按钮后，这里会生成可复制的加密备份串。" />
        </view>

        <view class="surface-soft mt-4 rounded-[24rpx] bg-[#f8f7ff] px-4 py-4">
          <text class="block text-sm font-700 text-app-ink">
            导入恢复
          </text>
          <textarea v-model="restoreBackupString"
            class="field-textarea surface-soft mt-3 min-h-[180rpx] rounded-[20rpx] bg-white px-3 text-app-muted"
            :maxlength="-1" auto-height placeholder="把之前保存的备份串完整粘贴到这里。" />
          <button class="btn-panel surface-soft mt-3 bg-[#dde7ff] text-[#4162b8]" hover-class="opacity-92"
            :loading="isRestoringBackup" @tap="handleRestoreBackup">
            一键导入恢复
          </button>
        </view>
      </CollapsibleSection>

      <CollapsibleSection title="权限与通知" description="提醒、免打扰和系统权限入口统一折叠管理。"
        :tag-text="weatherReminderState.reminderConfig.enabled ? '提醒已开启' : '提醒未开启'"
        :tag-tone="weatherReminderState.reminderConfig.enabled ? 'mint' : 'slate'"
        :tag-icon="weatherReminderState.reminderConfig.enabled ? '✓' : '⏸'">
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
            <button class="btn-panel gap-2 bg-[#EAF2FF] text-[#4768C1]" hover-class="opacity-92"
              @tap="handleOpenPermissionSetting">
              <view
                class="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-[22rpx] text-[#4768C1]">
                ⚙
              </view>
              <text>打开权限设置</text>
            </button>
            <button class="btn-panel gap-2 bg-[#E9F7F3] text-[#2E8D76]" hover-class="opacity-92"
              @tap="handleRestoreLocationPermission">
              <view
                class="flex h-6 w-6 items-center justify-center rounded-full bg-white/72 text-[22rpx] text-[#2E8D76]">
                ⌖
              </view>
              <text>重新申请定位</text>
            </button>
          </view>
        </view>
      </CollapsibleSection>

      <CollapsibleSection title="意见反馈" description="反馈草稿和历史记录改为折叠展示，只在需要时展开编辑。" :tag-text="`${feedbackCount} 条已保存`"
        tag-tone="slate" tag-icon="✎">
        <MineFeedbackPanel :refresh-token="feedbackPanelRefreshToken" @count-change="handleFeedbackCountChange" />
      </CollapsibleSection>

      <CollapsibleSection title="回收站管理" :description="recycleBinSummary" :tag-text="`${recycleBinFlowers.length} 株待恢复`"
        tag-tone="cream" tag-icon="↺">
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
      </CollapsibleSection>

      <CollapsibleSection title="关于与协议" description="产品说明、隐私协议和用户协议收进统一入口。" tag-text="基础信息" tag-tone="slate"
        tag-icon="i">
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
      </CollapsibleSection>
    </view>

    <AppBottomNav active-key="mine" />
    <AuthLoginPopup v-model="loginPopupVisible" :platform="runtimePlatform" :loading="switchingSession"
      @submit-h5="handleH5Login" @login-wechat="handleWechatLogin" />
    <UserProfilePopup v-model="profilePopupVisible" :current-user="currentUser" :loading="isSavingProfile"
      @submit="handleSubmitProfile" />
  </view>
</template>
