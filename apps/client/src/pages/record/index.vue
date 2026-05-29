<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import RecordCheckinPopup from '@/components/RecordCheckinPopup.vue'
import AppBottomNav from '@/components/AppBottomNav.vue'
import CollapsibleSection from '@/components/CollapsibleSection.vue'
import EmptyEmpty from '@/components/EmptyEmpty.vue'
import TagLabel from '@/components/TagLabel.vue'
import TimeLine from '@/components/TimeLine.vue'
import { useFlowerStore, useFlowerTaxonomyStore, useRecordStore } from '@/store'
import {
  DEFAULT_RECORD_ACTION_TYPE,
  RECORD_ACTION_OPTIONS,
  getRecordActionLabel,
  type LocalFlower,
  type LocalRecord,
  type RecordFormValues,
  type TimelineItem,
} from '@/interfaces'
import { usePageTheme } from '@/hooks/usePageTheme'
import { createFlowerDisplayNameMap, formatDateTime, getTimeAgo, showGentleSuccess, showGentleToast } from '@/utils'

const themeClass = usePageTheme()

interface RecordTimelineGroup {
  readonly dateLabel: string
  readonly items: ReadonlyArray<TimelineItem>
}

const flowerStore = useFlowerStore()
const flowerTaxonomyStore = useFlowerTaxonomyStore()
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
const selectedFlowerCategoryLabel = computed(() => (
  selectedFlower.value ? flowerTaxonomyStore.resolveFlowerCategoryLabel(selectedFlower.value) : '全部植物'
))
const selectedFlowerStatusLabel = computed(() => (
  selectedFlower.value ? flowerTaxonomyStore.resolveFlowerCareStatusLabel(selectedFlower.value) : '按时间查看'
))

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
    showGentleToast(duplicateMessage.value)
    return
  }

  isSubmitting.value = true

  try {
    await recordStore.addRecord(values)
    isCheckinVisible.value = false
    duplicateMessage.value = ''
    showGentleSuccess('这次打卡已经轻轻记下啦。')
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
    showGentleToast('这条记录已经超过撤回时间啦，我们把后面的记录继续照顾好就行。')
    return
  }

  showGentleToast('这次记录已经被温柔撤回。')
}
</script>

<template>
  <view class="page-shell safe-pb dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100" :class="themeClass">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-[140rpx]">
      <view
        class="hero-shell app-fade-up bg-linear-to-br from-[var(--color-blush)] via-[var(--color-cream)] to-[var(--color-mint)]">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-[var(--color-surface)]/78 text-app-muted dark:bg-[var(--color-surface)]/10 dark:text-slate-100">
              养护记录打卡簿
            </view>
            <view class="mt-3 text-title font-900 leading-tight text-app-ink dark:text-slate-50">
              每一次照顾，都给它留一个轻轻的脚印
            </view>
            <view class="mt-2 text-body text-app-muted dark:text-slate-200">
              快捷打卡、备注、配图、撤回和时间轴都只保存在本地加密数据里，断网也能继续使用。
            </view>
          </view>
          <view
            class="app-float-soft flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-[var(--color-surface)]/58 text-[64rpx] shadow-[inset_0_0_0_2rpx_rgba(255,255,255,0.35)] dark:bg-[var(--color-surface)]/8">
            🌼
          </view>
        </view>
      </view>

      <view class="card-soft app-fade-up rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-app-ink dark:text-slate-100">
              快捷打卡
            </text>
            <text class="mt-1 block text-sm text-app-muted dark:text-slate-300">
              轻点一下，就把今天的照顾和心情一起收好。
            </text>
          </view>
          <TagLabel :text="`${sortedRecords.length} 条记录`" tone="mint" />
        </view>

        <view class="mt-4 grid grid-cols-3 gap-3">
          <button v-for="option in RECORD_ACTION_OPTIONS" :key="option.value"
            class="surface-soft app-pressable min-h-[122rpx] rounded-[26rpx] border-none bg-[var(--color-surface)]/76 px-3 py-3 text-left dark:bg-slate-800"
            hover-class="opacity-92" @tap="openCheckin(option.value)">
            <view class="text-2xl">
              {{ option.emoji }}
            </view>
            <text class="mt-2 block text-sm font-800 text-app-ink dark:text-slate-100">
              {{ option.label }}
            </text>
            <text class="mt-1 block text-2xs leading-5 text-app-muted/80 dark:text-app-muted">
              {{ option.description }}
            </text>
          </button>
        </view>
      </view>

      <view v-if="latestUndoableRecord"
        class="info-soft app-fade-up bg-[var(--color-mint)]/15 text-[var(--color-sage)] dark:bg-emerald-500/14 dark:text-emerald-100">
        <view class="flex items-start justify-between gap-3">
          <text class="flex-1">
            {{ latestUndoText }}
          </text>
          <button
            class="surface-soft app-pressable h-9 rounded-full border-none bg-[var(--color-surface)] px-4 text-2xs font-700 text-[var(--color-sage)] dark:bg-slate-900 dark:text-emerald-200"
            hover-class="opacity-92" @tap="handleUndoLatestRecord">
            一键撤回
          </button>
        </view>
      </view>

      <view v-if="duplicateMessage"
        class="info-soft app-fade-up bg-[var(--color-cream)]/60 text-[var(--color-ink)] dark:bg-amber-500/14 dark:text-amber-100">
        {{ duplicateMessage }}
      </view>

      <CollapsibleSection title="记录范围与筛选" description="切换单株/全部、快速选植物，都收进这一层。"
        :tag-text="activeTab === 'single' ? '单株视角' : '全部视角'" tag-tone="cream" tag-icon="⌕" :default-expanded="true">
        <view class="surface-soft flex items-center gap-2 rounded-full bg-[var(--color-surface)]/66 p-1 dark:bg-slate-800">
          <button v-for="tab in recordTabs" :key="tab.key" class="btn-segment flex-1"
            :class="activeTab === tab.key ? 'bg-[var(--color-surface)] text-app-ink shadow-[0_10rpx_22rpx_rgba(148,163,184,0.14)] dark:bg-slate-900 dark:text-slate-100' : 'bg-transparent text-app-muted/80 dark:text-app-muted/70'"
            hover-class="opacity-92" @tap="activeTab = tab.key">
            <text class="truncate">{{ tab.label }}</text>
          </button>
        </view>

        <scroll-view scroll-x class="mt-4 whitespace-nowrap">
          <view class="flex items-center gap-2 pb-1">
            <button v-for="flower in activeFlowers" :key="flower.id" class="btn-chip"
              :class="selectedFlowerId === flower.id ? 'bg-app-mint text-app-ink shadow-[0_10rpx_22rpx_rgba(138,216,197,0.24)]' : 'surface-soft bg-[var(--color-surface)]/72 text-app-muted dark:bg-slate-800 dark:text-slate-200'"
              hover-class="opacity-92" @tap="handleSwitchFlower(flower.id)">
              {{ flowerDisplayNameMap[flower.id] ?? flower.name }}
            </button>
          </view>
        </scroll-view>

        <view v-if="selectedFlower" class="mt-3 flex flex-wrap gap-2">
          <TagLabel :text="selectedFlowerCategoryLabel" tone="blush" icon="✿" />
          <TagLabel :text="selectedFlowerStatusLabel" :status="selectedFlower.careStatus" />
        </view>
      </CollapsibleSection>

      <EmptyEmpty v-if="displayedRecords.length === 0" scene="record"
        :title="activeTab === 'single' ? '这盆植物还没有专属记录' : '还没有任何养护记录'" :description="activeTab === 'single'
          ? '先为它记下一次浇水、施肥或擦叶吧，时间轴会慢慢长出来。'
          : '从今天开始留痕，后面的照顾节奏就会越来越清楚。'" action-text="去打卡" @action="openCheckin()" />

      <view v-for="group in groupedTimeline" v-else :key="group.dateLabel"
        class="card-soft app-fade-up rounded-[32rpx] dark:bg-slate-900">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-app-ink dark:text-slate-100">
              {{ group.dateLabel }}
            </text>
            <text class="mt-1 block text-sm text-app-muted dark:text-slate-300">
              倒序时间轴，今天的照顾会排在最前面。
            </text>
          </view>
          <TagLabel :text="`${group.items.length} 条`" tone="blush" />
        </view>

        <view class="mt-4">
          <TimeLine :items="group.items" />
        </view>
      </view>

      <CollapsibleSection title="撤回留存日志" description="低频日志折叠收纳，默认不干扰主时间轴浏览。" :tag-text="`${recentUndoLogs.length} 条`"
        tag-tone="slate" tag-icon="↺">
        <TimeLine :items="undoTimelineItems" empty-text="最近还没有撤回记录，时间轴保持得很完整。" />
      </CollapsibleSection>

      <RecordCheckinPopup v-model="isCheckinVisible" :flower-options="activeFlowers"
        :initial-flower-id="selectedFlowerId" :initial-action-type="currentActionType" :submitting="isSubmitting"
        @submit="handleSubmitRecord" />
    </view>

    <AppBottomNav active-key="record" />
  </view>
</template>
