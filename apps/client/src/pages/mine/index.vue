<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import AuthLoginPopup from '@/components/AuthLoginPopup.vue'
import MineAboutLinks from '@/components/mine/MineAboutLinks.vue'
import MineAuthCard from '@/components/mine/MineAuthCard.vue'
import MineBackupPanel from '@/components/mine/MineBackupPanel.vue'
import MineExtensionPanel from '@/components/mine/MineExtensionPanel.vue'
import MinePermissionsPanel from '@/components/mine/MinePermissionsPanel.vue'
import MineRecycleBinPanel from '@/components/mine/MineRecycleBinPanel.vue'
import MineStatisticsGrid from '@/components/mine/MineStatisticsGrid.vue'
import MineThemeSelector from '@/components/mine/MineThemeSelector.vue'
import TaxonomySettingsPanel from '@/components/mine/TaxonomySettingsPanel.vue'
import UserProfilePopup from '@/components/UserProfilePopup.vue'
import AppBottomNav from '@/components/app/AppBottomNav.vue'
import CollapsibleSection from '@/components/app/CollapsibleSection.vue'
import PageHero from '@/components/app/PageHero.vue'
import SubmitBtn from '@/components/app/SubmitBtn.vue'
import { bindPhoneToAccount, requestBindPhoneCode, updateCurrentUser } from '@/api'
import { useAuthSessionActions } from '@/hooks/useAuthSessionActions'
import { useLocationWeatherReminder } from '@/hooks/useLocationWeatherReminder'
import { usePageTheme } from '@/hooks/usePageTheme'
import { usePageTip } from '@/hooks/usePageTip'
import { MINE_TIPS } from '@/interfaces/page-tips'
import { ClientPlatform, DEFAULT_LOCAL_REMINDER_CONFIG, type MineStatisticsCard } from '@/interfaces'
import { useAppStore, useAuthStore, useFlowerStore, useMemberStore, useRecordStore } from '@/store'
import {
  readPlantDoctorHistoryFromStorage,
  readReminderConfigFromStorage,
  handleCatchAndToast,
  showGentleConfirm,
  showGentleSuccess,
  writeReminderConfigToStorage,
} from '@/utils'

const themeClass = usePageTheme()
const { currentTip: mineTip } = usePageTip(MINE_TIPS)

const appStore = useAppStore()
const authStore = useAuthStore()
const flowerStore = useFlowerStore()
const memberStore = useMemberStore()
const recordStore = useRecordStore()
const { currentUser, isAuthenticated, switchingSession } = storeToRefs(authStore)
const { activeFlowers, recycleBinFlowers } = storeToRefs(flowerStore)
const { sortedRecords } = storeToRefs(recordStore)

const { state: weatherReminderState } = useLocationWeatherReminder()

const plantDoctorHistoryCount = ref(0)
const loginPopupVisible = ref(false)
const profilePopupVisible = ref(false)
const isSavingProfile = ref(false)

// ── 手机号绑定（跨端账号统一） ──
const bindPhoneVisible = ref(false)
const bindPhoneNumber = ref('')
const bindPhoneCode = ref('')
const bindPhoneRequestingCode = ref(false)
const bindPhoneSubmitting = ref(false)
const bindPhoneCountdown = ref(0)
const isSyncingData = ref(false)
const canSubmitBindPhone = computed(
  () => /^1\d{10}$/.test(bindPhoneNumber.value.trim()) && bindPhoneCode.value.trim().length > 0,
)
let bindPhoneTimer: ReturnType<typeof setInterval> | null = null

const showBindPhoneEntry = computed(() => isAuthenticated.value)
const isPhoneBound = computed(() => Boolean(currentUser.value?.phoneMasked))

async function handleRequestBindPhoneCode(): Promise<void> {
  if (!/^1\d{10}$/.test(bindPhoneNumber.value.trim())) {
    showGentleSuccess('请先输入正确的 11 位手机号。')
    return
  }
  bindPhoneRequestingCode.value = true
  try {
    const result = await requestBindPhoneCode({ phoneNumber: bindPhoneNumber.value.trim() })
    if (result.verificationCode) bindPhoneCode.value = result.verificationCode
    let seconds = result.cooldownSeconds
    bindPhoneCountdown.value = seconds
    bindPhoneTimer = setInterval(() => {
      seconds -= 1
      bindPhoneCountdown.value = Math.max(seconds, 0)
      if (seconds <= 0 && bindPhoneTimer) { clearInterval(bindPhoneTimer); bindPhoneTimer = null }
    }, 1000)
    showGentleSuccess(result.verificationCode ? '开发环境已自动填入验证码' : '验证码已发送')
  } catch (error) {
    handleCatchAndToast(error, '验证码发送失败')
  } finally {
    bindPhoneRequestingCode.value = false
  }
}

async function handleSubmitBindPhone(): Promise<void> {
  if (!bindPhoneNumber.value.trim() || !bindPhoneCode.value.trim()) {
    showGentleSuccess('请填写手机号和验证码')
    return
  }
  bindPhoneSubmitting.value = true
  try {
    const user = await bindPhoneToAccount(bindPhoneNumber.value.trim(), bindPhoneCode.value.trim())
    authStore.patchCurrentUser(user)
    // 绑定后可能触发数据迁移（跨端合并），需要同步最新数据
    await authStore.refreshGardenContext()
    bindPhoneVisible.value = false
    bindPhoneNumber.value = ''
    bindPhoneCode.value = ''
    showGentleSuccess('手机号已绑定，数据已同步。')
  } catch (error) {
    handleCatchAndToast(error, '手机号绑定失败')
  } finally {
    bindPhoneSubmitting.value = false
  }
}

async function handleManualSync(): Promise<void> {
  isSyncingData.value = true
  try {
    await authStore.refreshGardenContext()
    showGentleSuccess('数据同步完成，H5 与小程序端花园数据已对齐。')
  } catch (error) {
    handleCatchAndToast(error, '同步失败，请检查网络后重试')
  } finally {
    isSyncingData.value = false
  }
}

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
    key: 'plants',
    label: '植株总数',
    value: String(totalPlantCount.value),
    hint: '包含仍在照护中的植物和回收站临时保留项。',
    accentClass: 'from-[#CDEEDC] to-[#FFF0D9]',
    navigateTo: '/pages/index/index',
  },
  {
    key: 'records',
    label: '打卡次数',
    value: String(sortedRecords.value.length),
    hint: '每一次浇水、施肥、修剪都会被温柔记下。',
    accentClass: 'from-[#FBD4E3] to-[#FFF4E7]',
    navigateTo: '/pages/record/index',
  },
  {
    key: 'survival',
    label: '存活数量',
    value: String(survivalPlantCount.value),
    hint: '当前仍在花园里继续陪伴你的植物数量。',
    accentClass: 'from-[#D7E9FF] to-[#FFF9DD]',
    navigateTo: '/pages/index/index',
  },
  {
    key: 'days',
    label: '养护天数',
    value: String(careDays.value),
    hint: '从第一盆植物入住开始累计的陪伴时间。',
    accentClass: 'from-[#FFE8C5] to-[#F8D7CE]',
    navigateTo: '/pages/record/index',
  },
])

const recycleBinSummary = computed(() => {
  if (recycleBinFlowers.value.length === 0) {
    return '回收站现在是空的，误删的植物会在这里保留 7 天。'
  }
  return `当前有 ${recycleBinFlowers.value.length} 株植物在回收站，随时可以手动恢复。`
})

function refreshLocalSnapshots(): void {
  plantDoctorHistoryCount.value = readPlantDoctorHistoryFromStorage().length
  weatherReminderState.reminderConfig = readReminderConfigFromStorage()
}

// ── 备份面板事件 ──

function onBackupRestored(): void {
  weatherReminderState.reminderConfig = readReminderConfigFromStorage()
  refreshLocalSnapshots()
}

function onBackupCleared(): void {
  weatherReminderState.reminderConfig = { ...DEFAULT_LOCAL_REMINDER_CONFIG }
  writeReminderConfigToStorage(weatherReminderState.reminderConfig)
  plantDoctorHistoryCount.value = 0
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

function openLoginPopup(): void {
  loginPopupVisible.value = true
}
function openProfilePopup(): void {
  profilePopupVisible.value = true
}

const { handleH5Login, handleH5OneClickLogin, handleWechatLogin } = useAuthSessionActions({
  onCloseLoginPopup: () => {
    loginPopupVisible.value = false
  },
  onLoginSuccess: async () => {
    refreshLocalSnapshots()
    // 小程序端微信登录后检测：未绑定手机号则提示绑定，以同步多端数据
    if (runtimePlatform.value === ClientPlatform.MpWeixin && !currentUser.value?.phoneMasked) {
      const confirmed = await showGentleConfirm({
        title: '同步多端数据',
        content: '检测到你还没有绑定手机号。绑定后 H5 端和小程序端的数据会合并为一个账号，所有植株和养护记录都会互通，换设备登录也能看到全部数据。',
        confirmText: '立即绑定',
      })
      if (confirmed) bindPhoneVisible.value = true
    }
  },
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
  nickname: string
  avatarUrl: string
  profileSignature: string
}): Promise<void> {
  isSavingProfile.value = true
  try {
    const updatedUser = await updateCurrentUser(payload)
    authStore.patchCurrentUser(updatedUser)
    profilePopupVisible.value = false
    showGentleSuccess('个人资料已经更新。')
  } catch (error) {
    handleCatchAndToast(error, '资料保存失败，请稍后再试。')
  } finally {
    isSavingProfile.value = false
  }
}

function goToCommunity(): void {
  uni.navigateTo({ url: '/pages/community/index' })
}
</script>

<template>
  <view
    class="page-shell safe-pb min-h-screen bg-linear-to-b from-app-ivory via-[var(--color-cream)] to-app-ivory"
    :class="themeClass"
  >
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-5 pb-[172rpx]">
      <PageHero
        badge="我的花园"
        title="把照护数据、提醒和备份，都安静收在这里"
        :tip="mineTip"
        tip-icon="help"
        emoji="🪴"
      />

      <MineAuthCard
        :current-user="currentUser"
        :is-authenticated="isAuthenticated"
        :loading="switchingSession"
        :syncing-data="isSyncingData"
        :runtime-platform="runtimePlatform"
        @login="openLoginPopup"
        @edit-profile="openProfilePopup"
        @logout="handleLogoutToLocalMode"
        @bind-phone="bindPhoneVisible = true"
        @sync="handleManualSync"
      />

      <!-- 手机号绑定表单（点击 MineAuthCard 中的入口打开） -->
      <view
        v-if="showBindPhoneEntry && bindPhoneVisible"
        class="card-soft rounded-[28rpx] bg-[var(--color-surface)] px-5 py-4 dark:bg-slate-900"
      >
        <view class="flex flex-col gap-3">
          <text class="block text-sm font-700 text-app-ink dark:text-slate-100">
            {{ isPhoneBound ? '更换绑定' : '绑定手机号' }}
          </text>
          <input
            v-model="bindPhoneNumber"
            class="h-[80rpx] rounded-[24rpx] bg-[var(--color-cream)]/60 px-4 text-sm text-app-ink dark:bg-slate-800 dark:text-slate-100"
            type="number"
            :maxlength="11"
            placeholder="请输入手机号"
          />
          <view class="flex items-stretch gap-3">
            <input
              v-model="bindPhoneCode"
              class="h-[80rpx] min-w-0 flex-1 rounded-[24rpx] bg-[var(--color-cream)]/40 px-4 text-sm text-app-ink dark:bg-slate-800 dark:text-slate-100"
              type="number"
              :maxlength="12"
              placeholder="请输入验证码"
            />
            <button
              class="btn-base h-[80rpx] min-h-[80rpx] min-w-[220rpx] flex-none justify-center rounded-[24rpx] border-none px-4 text-center text-sm font-700 leading-none"
              :class="bindPhoneCountdown > 0 ? 'bg-slate-100 text-app-muted/70 dark:bg-slate-800 dark:text-slate-300' : 'bg-[#D4EFEA] text-[#4A8C7E] dark:bg-[#3D6B5E] dark:text-[#B5E0D4]'"
              :disabled="bindPhoneCountdown > 0 || bindPhoneRequestingCode"
              hover-class="opacity-92"
              @tap="handleRequestBindPhoneCode"
            >
              {{ bindPhoneRequestingCode ? '发送中...' : bindPhoneCountdown > 0 ? `${bindPhoneCountdown}s 后重试` : '获取验证码' }}
            </button>
          </view>
          <view class="flex gap-3">
            <button
              class="btn-pill-md flex-1 bg-slate-100 text-app-muted dark:bg-slate-800 dark:text-slate-200"
              hover-class="opacity-92"
              @tap="bindPhoneVisible = false"
            >
              取消
            </button>
            <view class="flex-1">
              <SubmitBtn
                :text="isPhoneBound ? '确认更换' : '确认绑定'"
                :loading="bindPhoneSubmitting"
                :disabled="!canSubmitBindPhone"
                variant="mint"
                size="md"
                @click="handleSubmitBindPhone"
              />
            </view>
          </view>
        </view>
      </view>

      <MineStatisticsGrid :cards="statisticsCards" />

      <!-- #ifndef MP-WEIXIN -->
      <view
        class="card-soft rounded-[28rpx] dark:bg-slate-900 app-pressable"
        hover-class="opacity-92"
        @tap="goToCommunity"
      >
        <view class="flex items-center justify-between gap-3">
          <view class="flex items-center gap-3">
            <text class="text-xl">💬</text>
            <view>
              <text class="block text-base font-800 text-app-ink dark:text-slate-100">花友社区</text>
              <text class="mt-1 block text-sm text-app-muted">提出建议、参与讨论、投票推动开发进度</text>
            </view>
          </view>
          <text class="text-app-muted">→</text>
        </view>
      </view>
      <!-- #endif -->

      <CollapsibleSection
        title="皮肤主题"
        :description="`当前 ${memberStore.currentTheme.label} · 莫兰迪色系，柔和护眼`"
        :default-expanded="false"
      >
        <MineThemeSelector />
      </CollapsibleSection>

      <CollapsibleSection
        title="养护分类管理"
        description="点击可隐藏不需要的默认选项，或新增自定义分类。修改后新建植株和筛选都会自动更新。"
        :default-expanded="false"
      >
        <TaxonomySettingsPanel />
      </CollapsibleSection>

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
        :tag-text="memberStore.hasCloudBackup ? '云备份已开启' : '本地安全存储'"
        :tag-tone="memberStore.hasCloudBackup ? 'mint' : 'cream'"
        :tag-icon="memberStore.hasCloudBackup ? '☁' : '🔒'"
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
      @one-click-login="handleH5OneClickLogin"
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
