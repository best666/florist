<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { LocalFlower, LocalRecord, LocalReminderConfig, RecordUndoLog } from '@/interfaces'
import { useAppStore, useFlowerStore, useRecordStore } from '@/store'
import {
  buildLocalBackupPayload,
  clearMineStorage,
  clearPlantDoctorStorage,
  decodeLocalBackup,
  encodeLocalBackup,
  readMineFeedbackHistory,
  readPlantDoctorHistoryFromStorage,
  removeCachedImage,
  handleCatchAndToast,
  showGentleConfirm,
  showGentleSuccess,
  writeMineFeedbackHistory,
  writePlantDoctorHistoryToStorage,
  writeReminderConfigToStorage,
} from '@/utils'

const props = defineProps<{
  reminderConfig: LocalReminderConfig
}>()

const emit = defineEmits<{
  restored: []
  cleared: []
}>()

const appStore = useAppStore()
const flowerStore = useFlowerStore()
const recordStore = useRecordStore()
const { activeFlowers, recycleBinFlowers } = storeToRefs(flowerStore)
const { sortedRecords, recentUndoLogs } = storeToRefs(recordStore)

const latestBackupString = ref('')
const restoreBackupString = ref('')
const isGeneratingBackup = ref(false)
const isRestoringBackup = ref(false)
const isClearingData = ref(false)

function copyText(value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.setClipboardData({
      data: value,
      success: () => resolve(),
      fail: () => reject(new Error('复制失败')),
    })
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
      reminderConfig: props.reminderConfig,
      plantDoctorHistory: readPlantDoctorHistoryFromStorage(),
      mineFeedbacks: readMineFeedbackHistory(),
    })
    latestBackupString.value = encodeLocalBackup(backupPayload)
    await copyText(latestBackupString.value)
    showGentleSuccess('备份串已经复制好啦。')
  } catch (error) {
    handleCatchAndToast(error, '备份生成时刚好卡了一下。')
  } finally {
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
  } catch (error) {
    handleCatchAndToast(error, '备份解析时有一点不完整。')
    return
  }

  const confirmed = await showGentleConfirm({
    title: '导入恢复',
    content: '恢复会覆盖当前本地花园、记录、提醒配置和反馈草稿，请确认这就是你要恢复的那份数据。',
    confirmText: '覆盖恢复',
  })
  if (!confirmed) return

  isRestoringBackup.value = true
  try {
    flowerStore.replaceLocalCenter({
      flowers: parsedBackup.flowers as LocalFlower[],
      recycleBin: parsedBackup.recycleBin as LocalFlower[],
    })
    recordStore.replaceLocalCenter({
      records: parsedBackup.records as LocalRecord[],
      undoLogs: (parsedBackup.undoLogs ?? []) as RecordUndoLog[],
    })
    appStore.$patch({ ...parsedBackup.appState })
    writeReminderConfigToStorage(parsedBackup.reminderConfig)
    writePlantDoctorHistoryToStorage(parsedBackup.plantDoctorHistory)
    writeMineFeedbackHistory(parsedBackup.mineFeedbacks)
    emit('restored')
    showGentleSuccess('本地数据已经恢复好了。')
  } finally {
    isRestoringBackup.value = false
  }
}

async function handleClearAllLocalData(): Promise<void> {
  const confirmed = await showGentleConfirm({
    title: '清空本地数据',
    content: '这会清空植株、打卡、植物医生历史、反馈记录和提醒配置，且无法撤回。',
    confirmText: '确认清空',
  })
  if (!confirmed) return

  isClearingData.value = true
  try {
    const feedbackImages = readMineFeedbackHistory().flatMap((item) => item.images)
    await Promise.all(feedbackImages.map(async (image) => {
      await removeCachedImage(image.url)
    }))
    await clearMineStorage()
    await clearPlantDoctorStorage()
    flowerStore.clearLocalGarden()
    recordStore.clearLocalRecords()
    appStore.$patch({ lastSyncAt: null })
    latestBackupString.value = ''
    restoreBackupString.value = ''
    emit('cleared')
    showGentleSuccess('本地数据已经清理完成。')
  } finally {
    isClearingData.value = false
  }
}
</script>

<template>
  <view class="surface-soft mt-4 rounded-[24rpx] bg-[var(--color-cream)]/40 px-4 py-4 text-sm leading-6 text-app-muted">
    本地备份会用 AES 加密保存在设备中，恢复时需要粘贴备份串。请妥善保管备份内容。
  </view>

  <view class="mt-4 flex gap-12rpx">
    <button
      class="btn-panel flex-1 surface-soft bg-[var(--color-mint)]/20 text-[var(--color-sage)]"
      hover-class="opacity-92"
      :loading="isGeneratingBackup"
      @tap="handleGenerateBackup"
    >
      一键生成备份
    </button>
    <button
      class="btn-panel flex-1 surface-soft bg-[var(--color-blush)]/20 text-[var(--color-ink)]"
      hover-class="opacity-92"
      :loading="isClearingData"
      @tap="handleClearAllLocalData"
    >
      一键清空本地
    </button>
  </view>

  <view class="surface-soft mt-4 rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4">
    <text class="block text-sm font-700 text-app-ink">最近生成的备份串</text>
    <textarea
      class="field-textarea surface-soft mt-3 min-h-[180rpx] rounded-[20rpx] bg-[var(--color-surface)] px-3 text-app-muted"
      :value="latestBackupString"
      :maxlength="-1"
      disabled
      auto-height
      placeholder="点击上方按钮后，这里会生成可复制的加密备份串。"
    />
  </view>

  <view class="surface-soft mt-4 rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4">
    <text class="block text-sm font-700 text-app-ink">导入恢复</text>
    <textarea
      v-model="restoreBackupString"
      class="field-textarea surface-soft mt-3 min-h-[180rpx] rounded-[20rpx] bg-[var(--color-surface)] px-3 text-app-muted"
      :maxlength="-1"
      auto-height
      placeholder="把之前保存的备份串完整粘贴到这里。"
    />
    <button
      class="btn-panel surface-soft mt-3 bg-[var(--color-cream)]/40 text-[var(--color-ink)]"
      hover-class="opacity-92"
      :loading="isRestoringBackup"
      @tap="handleRestoreBackup"
    >
      一键导入恢复
    </button>
  </view>
</template>
