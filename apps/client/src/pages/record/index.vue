<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import RecordCheckinPopup from '@/components/RecordCheckinPopup.vue'
import { useFlowerStore, useRecordStore } from '@/store'
import {
  DEFAULT_RECORD_ACTION_TYPE,
  RECORD_ACTION_OPTIONS,
  getRecordActionLabel,
  type LocalFlower,
  type LocalRecord,
  type RecordFormValues,
  type TimelineItem,
} from '@/interfaces'
import { createFlowerDisplayNameMap, formatDateTime, getTimeAgo } from '@/utils'

interface RecordTimelineGroup {
  readonly dateLabel: string
  readonly items: ReadonlyArray<TimelineItem>
}

const flowerStore = useFlowerStore()
const recordStore = useRecordStore()

const { activeFlowers } = storeToRefs(flowerStore)
const { sortedRecords, recentUndoLogs, latestUndoableRecord } = storeToRefs(recordStore)

const selectedFlowerId = ref('')
const activeTab = ref<'single' | 'all'>('all')
const isCheckinVisible = ref(false)
const currentActionType = ref(DEFAULT_RECORD_ACTION_TYPE)
const isSubmitting = ref(false)
const duplicateMessage = ref('')

onLoad((query) => {
  const targetFlowerId = query && typeof query.flowerId === 'string' ? query.flowerId : ''
  selectedFlowerId.value = targetFlowerId
  activeTab.value = targetFlowerId ? 'single' : 'all'
})

onShow(async () => {
  await flowerStore.initializeGarden()
  await recordStore.initializeRecordCenter()
})

const selectedFlower = computed<LocalFlower | null>(() => (
  selectedFlowerId.value ? flowerStore.getFlowerById(selectedFlowerId.value) : null
))

const flowerDisplayNameMap = computed(() => createFlowerDisplayNameMap(activeFlowers.value))

const recordTabs = computed(() => ([
  {
    key: 'single' as const,
    label: selectedFlower.value ? `${flowerDisplayNameMap.value[selectedFlower.value.id] ?? selectedFlower.value.name} 的记录` : '单植株记录',
  },
  {
    key: 'all' as const,
    label: '全部记录',
  },
]))

const displayedRecords = computed<ReadonlyArray<LocalRecord>>(() => {
  if (activeTab.value === 'single' && selectedFlowerId.value) {
    return recordStore.getRecordsByFlowerId(selectedFlowerId.value)
  }

  return sortedRecords.value
})

const groupedTimeline = computed<ReadonlyArray<RecordTimelineGroup>>(() => {
  const groupMap = new Map<string, TimelineItem[]>()

  displayedRecords.value.forEach((record) => {
    const dateLabel = formatDateTime(record.createdAt, { pattern: 'YYYY-MM-DD' })
    const nextItem: TimelineItem = {
      id: record.id,
      title: getRecordActionLabel(record.actionType),
      timestamp: formatDateTime(record.createdAt, { pattern: 'HH:mm' }),
      description: record.note || '这次照顾已经被轻轻收进本地记录里。',
      status: 'healthy',
      tone: 'mint',
      tags: [
        `${record.cooldownMinutes} 分钟冷却`,
        flowerDisplayNameMap.value[record.flowerId] ?? '未命名植株',
      ],
    }

    const currentGroup = groupMap.get(dateLabel) ?? []
    currentGroup.push(nextItem)
    groupMap.set(dateLabel, currentGroup)
  })

  return Array.from(groupMap.entries()).map(([dateLabel, items]) => ({
    dateLabel,
    items,
  }))
})

const undoTimelineItems = computed<ReadonlyArray<TimelineItem>>(() => (
  recentUndoLogs.value.slice(0, 5).map(log => ({
    id: log.id,
    title: `${getRecordActionLabel(log.actionType)} 已撤回`,
    timestamp: formatDateTime(log.revertedAt, { pattern: 'YYYY-MM-DD HH:mm' }),
    description: log.note || '这次记录已在 5 分钟内撤回，日志会继续留在本地。',
    status: 'dormant',
    tone: 'slate',
    tags: [getTimeAgo(log.originalCreatedAt), '撤回日志'],
  }))
))

const latestUndoText = computed(() => {
  if (!latestUndoableRecord.value) {
    return ''
  }

  const flowerName = flowerDisplayNameMap.value[latestUndoableRecord.value.flowerId] ?? '这盆植物'

  return `${flowerName} 的${getRecordActionLabel(latestUndoableRecord.value.actionType)}刚刚记录成功，5 分钟内都可以温柔撤回。`
})

function handleSwitchFlower(flowerId: string): void {
  selectedFlowerId.value = flowerId
  activeTab.value = 'single'
}

function openCheckin(actionType = DEFAULT_RECORD_ACTION_TYPE): void {
  currentActionType.value = actionType
  duplicateMessage.value = ''
  isCheckinVisible.value = true
}

async function handleSubmitRecord(values: RecordFormValues): Promise<void> {
  const cooldownResult = recordStore.isActionCoolingDown(values.flowerId, values.actionType)

  if (cooldownResult.cooling) {
    duplicateMessage.value = `刚刚已经替它${getRecordActionLabel(values.actionType)}过啦，先休息 ${cooldownResult.remainingMinutes} 分钟再记录会更准确。`
    uni.showToast({
      title: duplicateMessage.value,
      icon: 'none',
    })
    return
  }

  isSubmitting.value = true

  try {
    await recordStore.addRecord(values)
    isCheckinVisible.value = false
    duplicateMessage.value = ''
    uni.showToast({
      title: '打卡已轻轻记下',
      icon: 'success',
    })
  }
  finally {
    isSubmitting.value = false
  }
}

async function handleUndoLatestRecord(): Promise<void> {
  if (!latestUndoableRecord.value) {
    return
  }

  const succeeded = await recordStore.undoRecord(latestUndoableRecord.value.id)

  if (!succeeded) {
    uni.showToast({
      title: '这条记录已经超过撤回时间啦',
      icon: 'none',
    })
    return
  }

  uni.showToast({
    title: '这次记录已经温柔撤回',
    icon: 'none',
  })
}
</script>

<template>
  <view class="page-shell safe-pb bg-linear-to-b from-[#FFFDF7] via-app-ivory to-[#FFF6EC] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-6">
      <view class="overflow-hidden rounded-[36rpx] bg-linear-to-br from-[#F8CADB] via-[#FFF5E4] to-[#D7F7EF] px-5 py-5 shadow-[0_18rpx_54rpx_rgba(248,200,220,0.22)] dark:from-slate-900 dark:via-rose-950 dark:to-emerald-950">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-white/78 text-slate-600 dark:bg-white/10 dark:text-slate-100">
              养护记录打卡簿
            </view>
            <view class="mt-3 text-[42rpx] font-900 leading-tight text-slate-800 dark:text-slate-50">
              每一次照顾，都给它留一个轻轻的脚印
            </view>
            <view class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-200">
              快捷打卡、备注、配图、撤回和时间轴都只保存在本地加密数据里，断网也能继续使用。
            </view>
          </view>
          <view class="flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-white/58 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.35)] dark:bg-white/8">
            🌼
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">
              快捷打卡
            </text>
            <text class="mt-1 block text-sm text-slate-500 dark:text-slate-300">
              轻点一下，就把今天的照顾和心情一起收好。
            </text>
          </view>
          <TagLabel :text="`${sortedRecords.length} 条记录`" tone="mint" />
        </view>

        <view class="mt-4 grid grid-cols-3 gap-3">
          <button
            v-for="option in RECORD_ACTION_OPTIONS"
            :key="option.value"
            class="min-h-[122rpx] rounded-[26rpx] border-none bg-app-ivory px-3 py-3 text-left shadow-[0_12rpx_28rpx_rgba(148,163,184,0.08)] dark:bg-slate-800"
            hover-class="opacity-92"
            @tap="openCheckin(option.value)"
          >
            <view class="text-2xl">
              {{ option.emoji }}
            </view>
            <text class="mt-2 block text-sm font-700 text-slate-700 dark:text-slate-100">
              {{ option.label }}
            </text>
            <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
              {{ option.description }}
            </text>
          </button>
        </view>
      </view>

      <view
        v-if="latestUndoableRecord"
        class="rounded-[28rpx] bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-700 shadow-[0_12rpx_28rpx_rgba(16,185,129,0.12)] dark:bg-emerald-500/14 dark:text-emerald-100"
      >
        <view class="flex items-start justify-between gap-3">
          <text class="flex-1">
            {{ latestUndoText }}
          </text>
          <button
            class="h-9 rounded-full border-none bg-white px-4 text-2xs font-700 text-emerald-700 dark:bg-slate-900 dark:text-emerald-200"
            hover-class="opacity-92"
            @tap="handleUndoLatestRecord"
          >
            一键撤回
          </button>
        </view>
      </view>

      <view
        v-if="duplicateMessage"
        class="rounded-[28rpx] bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 shadow-[0_12rpx_28rpx_rgba(251,191,36,0.12)] dark:bg-amber-500/14 dark:text-amber-100"
      >
        {{ duplicateMessage }}
      </view>

      <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-center gap-2 rounded-full bg-app-ivory p-1 dark:bg-slate-800">
          <button
            v-for="tab in recordTabs"
            :key="tab.key"
            class="h-10 flex-1 rounded-full border-none px-4 text-2xs font-700"
            :class="activeTab === tab.key ? 'bg-white text-slate-700 shadow-[0_10rpx_22rpx_rgba(148,163,184,0.14)] dark:bg-slate-900 dark:text-slate-100' : 'bg-transparent text-slate-400 dark:text-slate-400'"
            hover-class="opacity-92"
            @tap="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </view>

        <scroll-view scroll-x class="mt-4 whitespace-nowrap">
          <view class="flex items-center gap-2 pb-1">
            <button
              v-for="flower in activeFlowers"
              :key="flower.id"
              class="h-10 rounded-full border-none px-4 text-2xs font-700"
              :class="selectedFlowerId === flower.id ? 'bg-app-mint text-slate-700' : 'bg-app-ivory text-slate-500 dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92"
              @tap="handleSwitchFlower(flower.id)"
            >
              {{ flowerDisplayNameMap[flower.id] ?? flower.name }}
            </button>
          </view>
        </scroll-view>
      </view>

      <EmptyEmpty
        v-if="displayedRecords.length === 0"
        scene="record"
        :title="activeTab === 'single' ? '这盆植物还没有专属记录' : '还没有任何养护记录'"
        :description="activeTab === 'single'
          ? '先为它记下一次浇水、施肥或擦叶吧，时间轴会慢慢长出来。'
          : '从今天开始留痕，后面的照顾节奏就会越来越清楚。'"
        action-text="去打卡"
        @action="openCheckin()"
      />

      <view
        v-for="group in groupedTimeline"
        v-else
        :key="group.dateLabel"
        class="card-soft rounded-[32rpx] dark:bg-slate-900"
      >
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">
              {{ group.dateLabel }}
            </text>
            <text class="mt-1 block text-sm text-slate-500 dark:text-slate-300">
              倒序时间轴，今天的照顾会排在最前面。
            </text>
          </view>
          <TagLabel :text="`${group.items.length} 条`" tone="blush" />
        </view>

        <view class="mt-4">
          <TimeLine :items="group.items" />
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800 dark:text-slate-100">
              撤回留存日志
            </text>
            <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
              撤回不会抹掉痕迹，只是把那条记录从时间轴里温柔地收回去。
            </text>
          </view>
          <TagLabel :text="`${recentUndoLogs.length} 条`" tone="slate" />
        </view>

        <view class="mt-4">
          <TimeLine
            :items="undoTimelineItems"
            empty-text="最近还没有撤回记录，时间轴保持得很完整。"
          />
        </view>
      </view>

      <RecordCheckinPopup
        v-model="isCheckinVisible"
        :flower-options="activeFlowers"
        :initial-flower-id="selectedFlowerId"
        :initial-action-type="currentActionType"
        :submitting="isSubmitting"
        @submit="handleSubmitRecord"
      />
    </view>
  </view>
</template>
