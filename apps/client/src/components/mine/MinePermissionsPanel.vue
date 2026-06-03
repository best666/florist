<script setup lang="ts">
import { computed } from 'vue'
import { useLocationWeatherReminder } from '@/hooks/useLocationWeatherReminder'
import { openPlatformPermissionSetting, showGentleSuccess, showGentleToast } from '@/utils'

const {
  state: weatherReminderState,
  updateReminderConfig,
  requestLocationPermissionAgain,
} = useLocationWeatherReminder()

const config = computed(() => weatherReminderState.reminderConfig)

const reminderTimeText = computed(() =>
  `${String(config.value.reminderHour).padStart(2, '0')}:${String(config.value.reminderMinute).padStart(2, '0')}`
)

const quietHoursEnabled = computed(() => {
  const q = config.value.quietHours
  return !(q.startHour === q.endHour && q.startMinute === q.endMinute)
})

const quietHoursText = computed(() => {
  const q = config.value.quietHours
  if (!quietHoursEnabled.value) return '未开启'
  return `${String(q.startHour).padStart(2, '0')}:${String(q.startMinute).padStart(2, '0')} - ${String(q.endHour).padStart(2, '0')}:${String(q.endMinute).padStart(2, '0')}`
})

function handleToggleReminder(event: { detail: { value: boolean } }): void {
  updateReminderConfig({ enabled: event.detail.value })
}

function handleToggleQuietHours(event: { detail: { value: boolean } }): void {
  updateReminderConfig({
    quietHours: event.detail.value
      ? { startHour: 22, startMinute: 0, endHour: 8, endMinute: 0 }
      : { startHour: 22, startMinute: 0, endHour: 22, endMinute: 0 },
  })
}

async function handleOpenPermissionSetting(): Promise<void> {
  const opened = await openPlatformPermissionSetting()
  if (!opened) showGentleToast('当前平台还不能直接打开权限设置。')
}

async function handleRestoreLocationPermission(): Promise<void> {
  const succeeded = await requestLocationPermissionAgain()
  if (succeeded) showGentleSuccess('已经重新帮你尝试定位权限啦。')
}
</script>

<template>
  <view class="mt-4 flex flex-col gap-3">
    <view class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4">
      <view class="flex items-center justify-between gap-3">
        <view>
          <text class="block text-sm font-700 text-app-ink">消息通知</text>
          <text class="mt-1 block text-2xs leading-5 text-app-muted">
            每日提醒时间 {{ reminderTimeText }}
          </text>
        </view>
        <switch
          :checked="config.enabled"
          color="#74C69D"
          @change="handleToggleReminder"
        />
      </view>
    </view>

    <view class="rounded-[24rpx] bg-[var(--color-cream)]/40 px-4 py-4">
      <view class="flex items-center justify-between gap-3">
        <view>
          <text class="block text-sm font-700 text-app-ink">夜间免打扰</text>
          <text class="mt-1 block text-2xs leading-5 text-app-muted">
            默认静默时段 {{ quietHoursText }}
          </text>
        </view>
        <switch
          :checked="quietHoursEnabled"
          color="#E9A857"
          @change="handleToggleQuietHours"
        />
      </view>
    </view>

    <view class="flex gap-12rpx">
      <button
        class="btn-panel flex-1 gap-2 bg-[var(--color-cream)]/40 text-[var(--color-ink)]"
        hover-class="opacity-92"
        @tap="handleOpenPermissionSetting"
      >
        <view class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)]/70 text-[22rpx]">
          ⚙
        </view>
        <text>打开权限设置</text>
      </button>
      <button
        class="btn-panel flex-1 gap-2 bg-[var(--color-mint)]/20 text-[var(--color-sage)]"
        hover-class="opacity-92"
        @tap="handleRestoreLocationPermission"
      >
        <view class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)]/72 text-[22rpx] text-[var(--color-sage)]">
          ⌖
        </view>
        <text>重新申请定位</text>
      </button>
    </view>
  </view>
</template>
