<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import AuthLoginPopup from '@/components/AuthLoginPopup.vue'
import MineAboutLinks from '@/components/MineAboutLinks.vue'
import MineAuthCard from '@/components/MineAuthCard.vue'
import MineBackupPanel from '@/components/MineBackupPanel.vue'
import MineExtensionPanel from '@/components/MineExtensionPanel.vue'
import MineFeedbackPanel from '@/components/MineFeedbackPanel.vue'
import MinePermissionsPanel from '@/components/MinePermissionsPanel.vue'
import MineRecycleBinPanel from '@/components/MineRecycleBinPanel.vue'
import MineStatisticsGrid from '@/components/MineStatisticsGrid.vue'
import MineThemeSelector from '@/components/MineThemeSelector.vue'
import UserProfilePopup from '@/components/UserProfilePopup.vue'
import AppBottomNav from '@/components/AppBottomNav.vue'
import CollapsibleSection from '@/components/CollapsibleSection.vue'
import { updateCurrentUser } from '@/api'
import { useAuthSessionActions } from '@/hooks/useAuthSessionActions'
import { useLocationWeatherReminder } from '@/hooks/useLocationWeatherReminder'
import { usePageTheme } from '@/hooks/usePageTheme'
import { ClientPlatform, DEFAULT_LOCAL_REMINDER_CONFIG, type MineStatisticsCard } from '@/interfaces'
import { useAppStore, useAuthStore, useFlowerStore, useMemberStore, useRecordStore } from '@/store'
import {
  readMineFeedbackHistory,
  readPlantDoctorHistoryFromStorage,
  readReminderConfigFromStorage,
  showGentleConfirm,
  showGentleSuccess,
  showGentleToast,
  writeReminderConfigToStorage,
} from '@/utils'

const themeClass = usePageTheme()

const appStore = useAppStore()
const authStore = useAuthStore()
const flowerStore = useFlowerStore()
const memberStore = useMemberStore()
const recordStore = useRecordStore()
const { currentUser, isAuthenticated, switchingSession } = storeToRefs(authStore)
const { activeFlowers, recycleBinFlowers } = storeToRefs(flowerStore)
const { sortedRecords } = storeToRefs(recordStore)

const { state: weatherReminderState } = useLocationWeatherReminder()

const feedbackCount = ref(0)
const feedbackPanelRefreshToken = ref(0)
const plantDoctorHistoryCount = ref(0)
const loginPopupVisible = ref(false)
const profilePopupVisible = ref(false)
const isSavingProfile = ref(false)

const runtimePlatform = computed(() => appStore.runtimePlatform ?? ClientPlatform.H5)
const totalPlantCount = computed(() => activeFlowers.value.length + recycleBinFlowers.value.length)
const survivalPlantCount = computed(() => activeFlowers.value.length)

const careDays = computed(() => {
  const allFlowers = [...activeFlowers.value, ...recycleBinFlowers.value]
  if (allFlowers.length === 0) return 0
  const createdTimestamps = allFlowers
    .map((flower) => new Date(flower.createdAt).getTime())
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((left, right) => left - right)
  const earliestCreatedAt = createdTimestamps[0]
  if (earliestCreatedAt === undefined || !Number.isFinite(earliestCreatedAt)) return 0
  return Math.max(1, Math.ceil((Date.now() - earliestCreatedAt) / (24 * 60 * 60 * 1000)))
})

const statisticsCards = computed<ReadonlyArray<MineStatisticsCard>>(() => [
  {
    key: 'plants', label: '植株总数', value: String(totalPlantCount.value),
    hint: '包含仍在照护中的植物和回收站临时保留项。',
    accentClass: 'from-[#CDEEDC] to-[#FFF0D9]',
  },
  {
    key: 'records', label: '打卡次数', value: String(sortedRecords.value.length),
    hint: '每一次浇水、施肥、修剪都会被温柔记下。',
    accentClass: 'from-[#FBD4E3] to-[#FFF4E7]',
  },
  {
    key: 'survival', label: '存活数量', value: String(survivalPlantCount.value),
    hint: '当前仍在花园里继续陪伴你的植物数量。',
    accentClass: 'from-[#D7E9FF] to-[#FFF9DD]',
  },
  {
    key: 'days', label: '养护天数', value: String(careDays.value),
    hint: '从第一盆植物入住开始累计的陪伴时间。',
    accentClass: 'from-[#FFE8C5] to-[#F8D7CE]',
  },
])

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

// ── 备份面板事件 ──

function onBackupRestored(): void {
  weatherReminderState.reminderConfig = readReminderConfigFromStorage()
  refreshLocalSnapshots()
}

function onBackupCleared(): void {
  weatherReminderState.reminderConfig = { ...DEFAULT_LOCAL_REMINDER_CONFIG }
  writeReminderConfigToStorage(weatherReminderState.reminderConfig)
  feedbackCount.value = 0
  plantDoctorHistoryCount.value = 0
  bumpFeedbackRefreshToken()
}

// ── 生命周期 ──

onShow(async () => {
  await memberStore.initializeMembership(true)
  await flowerStore.initializeGarden()
  await recordStore.initializeRecordCenter()
  refreshLocalSnapshots()
  // #ifdef MP-WEIXIN
  if (!isAuthenticated.value && !switchingSession.value) handleWechatLogin()
  // #endif
})

// ── 登录 / 资料 ──

function openLoginPopup(): void { loginPopupVisible.value = true }
function openProfilePopup(): void { profilePopupVisible.value = true }

const { handleH5Login, handleWechatLogin } = useAuthSessionActions({
  onCloseLoginPopup: () => { loginPopupVisible.value = false },
  onLoginSuccess: async () => { refreshLocalSnapshots() },
})

async function handleLogoutToLocalMode(): Promise<void> {
  const confirmed = await showGentleConfirm({
    title: '切换到本地花园',
    content: '切换后会回到当前设备的本地花园继续记录，本次登录账号的数据会保留，下次登录还能继续使用。',
    confirmText: '切换到本地花园',
  })
  if (!confirmed) return
  await authStore.logoutToLocalMode()
  refreshLocalSnapshots()
  showGentleSuccess('已切换到本地花园。')
}

async function handleSubmitProfile(payload: {
  nickname: string; avatarUrl: string; profileSignature: string
}): Promise<void> {
  isSavingProfile.value = true
  try {
    const updatedUser = await updateCurrentUser(payload)
    authStore.patchCurrentUser(updatedUser)
    profilePopupVisible.value = false
    showGentleSuccess('个人资料已经更新。')
  } catch (error) {
    showGentleToast(error instanceof Error ? error.message : '资料保存失败，请稍后再试。')
  } finally {
    isSavingProfile.value = false
  }
}

function handleFeedbackCountChange(count: number): void {
  feedbackCount.value = count
}
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-app-ivory via-[var(--color-cream)] to-app-ivory" :class="themeClass">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-5 pb-[140rpx]">
      <view class="hero-shell app-fade-up bg-linear-to-br from-[var(--color-blush)] via-[var(--color-cream)] to-[var(--color-mint)]">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-[var(--color-surface)]/80 text-app-muted"> 我的花园 </view>
            <view class="mt-3 text-[50rpx] font-900 leading-[1.18] text-app-ink">
              把照护数据、提醒和备份，都安静收在这里
            </view>
            <view class="mt-3 text-[28rpx] leading-7 text-app-muted">
              整理养护记录、管理备份、设置提醒和查看花园数据。
            </view>
          </view>
          <view
            class="app-float-soft flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-[var(--color-surface)]/60 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.38)]"
          >
            🪴
          </view>
        </view>
      </view>

      <MineAuthCard
        :current-user="currentUser"
        :is-authenticated="isAuthenticated"
        :loading="switchingSession"
        :runtime-platform="runtimePlatform"
        @login="openLoginPopup"
        @edit-profile="openProfilePopup"
        @logout="handleLogoutToLocalMode"
      />

      <CollapsibleSection
        title="皮肤主题"
        :description="`当前 ${memberStore.currentTheme.label} · 莫兰迪色系，柔和护眼`"
        :default-expanded="false"
      >
        <MineThemeSelector />
      </CollapsibleSection>

      <MineStatisticsGrid :cards="statisticsCards" />

      <CollapsibleSection
        title="扩展服务与沉淀"
        :tag-text="`${plantDoctorHistoryCount} 条植物医生历史`"
        tag-tone="cream"
        tag-icon="✦"
      >
        <MineExtensionPanel :plant-doctor-history-count="plantDoctorHistoryCount" />
      </CollapsibleSection>

      <CollapsibleSection
        title="本地备份与恢复"
        :tag-text="memberStore.hasCloudBackup ? '云备份权益已解锁' : 'AES 本地加密'"
        :tag-tone="memberStore.hasCloudBackup ? 'mint' : 'cream'"
        :tag-icon="memberStore.hasCloudBackup ? '☁' : '⌁'"
      >
        <MineBackupPanel
          :reminder-config="weatherReminderState.reminderConfig"
          @restored="onBackupRestored"
          @cleared="onBackupCleared"
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="权限与通知"
        :tag-text="weatherReminderState.reminderConfig.enabled ? '提醒已开启' : '提醒未开启'"
        :tag-tone="weatherReminderState.reminderConfig.enabled ? 'mint' : 'slate'"
        :tag-icon="weatherReminderState.reminderConfig.enabled ? '✓' : '⏸'"
      >
        <MinePermissionsPanel />
      </CollapsibleSection>

      <CollapsibleSection
        title="意见反馈"
        :tag-text="`${feedbackCount} 条已保存`"
        tag-tone="slate"
        tag-icon="✎"
      >
        <MineFeedbackPanel
          :refresh-token="feedbackPanelRefreshToken"
          @count-change="handleFeedbackCountChange"
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="回收站管理"
        :description="recycleBinSummary"
        :tag-text="`${recycleBinFlowers.length} 株待恢复`"
        tag-tone="cream"
        tag-icon="↺"
      >
        <MineRecycleBinPanel :recycle-bin-summary="recycleBinSummary" />
      </CollapsibleSection>

      <CollapsibleSection
        title="关于与协议"
        tag-text="基础信息"
        tag-tone="slate"
        tag-icon="i"
      >
        <MineAboutLinks />
      </CollapsibleSection>
    </view>

    <AppBottomNav active-key="mine" />
    <AuthLoginPopup
      v-model="loginPopupVisible"
      :platform="runtimePlatform"
      :loading="switchingSession"
      @submit-h5="handleH5Login"
      @login-wechat="handleWechatLogin"
    />
    <UserProfilePopup
      v-model="profilePopupVisible"
      :current-user="currentUser"
      :loading="isSavingProfile"
      @submit="handleSubmitProfile"
    />
  </view>
</template>
