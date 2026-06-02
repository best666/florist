<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TaxonomyType } from '@florist/contracts'
import {
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_DIFFICULTY_OPTIONS,
  FLOWER_PLACEMENT_OPTIONS,
  FLOWER_STATUS_OPTIONS,
} from '@/interfaces'
import { useFlowerTaxonomyStore } from '@/store'
import { createTaxonomyItem, deleteTaxonomyItem, syncTaxonomyItems, updateTaxonomyItem } from '@/api/taxonomy'
import { showGentleConfirm, showGentleToast } from '@/utils'
import { getEncryptedStorage, setEncryptedStorage } from '@/utils/storage'
import { useAuthStore } from '@/store'
import CloseButton from './app/CloseButton.vue'

interface Props {
  modelValue: boolean
}
defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const store = useFlowerTaxonomyStore()

type TabKey = 'category' | 'placement' | 'difficulty' | 'status'
const activeTab = ref<TabKey>('category')
const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'category', label: '品类', icon: '🌿' },
  { key: 'placement', label: '位置', icon: '📍' },
  { key: 'difficulty', label: '难度', icon: '💪' },
  { key: 'status', label: '状态', icon: '📊' },
]

// --- 排序存储 ---
const ORDER_STORAGE_KEY = 'taxonomy-sort-order'

function loadOrder(): Record<string, string[]> {
  return getEncryptedStorage<Record<string, string[]>>(ORDER_STORAGE_KEY) ?? {}
}

function saveOrder(order: Record<string, string[]>): void {
  setEncryptedStorage(ORDER_STORAGE_KEY, order)
}

const sortOrder = ref<Record<string, string[]>>(loadOrder())

// 当前 tab 的有序 key 列表
const orderedKeys = computed(() => sortOrder.value[activeTab.value] ?? [])

// --- 工具函数 ---
function storeForTab() {
  const t = activeTab.value
  return {
    hidden:
      t === 'category'
        ? store.hiddenCategories
        : t === 'placement'
          ? store.hiddenPlacements
          : t === 'difficulty'
            ? store.hiddenCareDifficulties
            : store.hiddenCareStatuses,
    hide:
      t === 'category'
        ? (v: string) => store.hideCategory(v)
        : t === 'placement'
          ? (v: string) => store.hidePlacement(v)
          : t === 'difficulty'
            ? (v: string) => store.hideCareDifficulty(v)
            : (v: string) => store.hideCareStatus(v),
    unhide:
      t === 'category'
        ? (v: string) => store.unhideCategory(v)
        : t === 'placement'
          ? (v: string) => store.unhidePlacement(v)
          : t === 'difficulty'
            ? (v: string) => store.unhideCareDifficulty(v)
            : (v: string) => store.unhideCareStatus(v),
    customs:
      t === 'category'
        ? store.customCategories
        : t === 'placement'
          ? store.customPlacements
          : t === 'difficulty'
            ? store.customCareDifficulties
            : store.customCareStatuses,
    baseValue:
      t === 'category'
        ? ('herbaceous' as const)
        : t === 'placement'
          ? ('indoor_balcony' as const)
          : t === 'difficulty'
            ? ('easy' as const)
            : ('healthy' as const),
  }
}

// 默认选项
const defaultOpts = computed(() => {
  const opts =
    activeTab.value === 'category'
      ? FLOWER_CATEGORY_OPTIONS
      : activeTab.value === 'placement'
        ? FLOWER_PLACEMENT_OPTIONS
        : activeTab.value === 'difficulty'
          ? FLOWER_DIFFICULTY_OPTIONS
          : FLOWER_STATUS_OPTIONS
  const hiddenSet = new Set(storeForTab().hidden)
  return opts.map((o) => ({ ...o, hidden: hiddenSet.has(o.value) }))
})

// 合并排序列表：默认 + 自定义
interface SortableOption {
  key: string
  label: string
  isCustom: boolean
  hidden?: boolean
  customId?: string
}

const sortedOptions = computed<SortableOption[]>(() => {
  const customs = storeForTab().customs
  const defaults = defaultOpts.value

  // 构建查找表
  const defaultMap = new Map(defaults.map((d) => [d.value, d]))
  const customMap = new Map(customs.map((c) => [c.id, c]))

  const keys = orderedKeys.value
  const result: SortableOption[] = []
  const seen = new Set<string>()

  // 按已保存的顺序排列
  for (const key of keys) {
    const def = defaultMap.get(key as any)
    if (def) {
      seen.add(key)
      result.push({ key, label: def.label, isCustom: false, hidden: def.hidden })
      continue
    }
    const cust = customMap.get(key)
    if (cust) {
      seen.add(key)
      result.push({ key, label: cust.label, isCustom: true, customId: cust.id })
    }
  }

  // 追加新出现的（未在排序列表中）
  for (const def of defaults) {
    if (!seen.has(def.value)) {
      result.push({ key: def.value, label: def.label, isCustom: false, hidden: def.hidden })
    }
  }
  for (const cust of customs) {
    if (!seen.has(cust.id)) {
      result.push({ key: cust.id, label: cust.label, isCustom: true, customId: cust.id })
    }
  }

  return result
})

const authStore = useAuthStore()

// 持久化 + 后端同步
function persistOrder(): void {
  sortOrder.value = {
    ...sortOrder.value,
    [activeTab.value]: sortedOptions.value.map((o) => o.key),
  }
  saveOrder(sortOrder.value)
}

async function syncOrderToServer(): Promise<void> {
  if (!authStore.isAuthenticated) return
  const customs = storeForTab().customs
  if (customs.length === 0) return
  const orderedKeys = sortedOptions.value.map((o) => o.key)
  const items = customs
    .filter((c) => orderedKeys.includes(c.id))
    .map((c, _i) => ({
      id: c.id,
      type: activeTab.value as TaxonomyType,
      label: c.label,
      baseValue: c.baseValue,
      sortOrder: orderedKeys.indexOf(c.id),
    }))
  if (items.length === 0) return
  try {
    await syncTaxonomyItems(items)
  } catch {
    /* offline */
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null

watch(
  sortedOptions,
  () => {
    persistOrder()
    // 防抖后端同步：停止拖拽 800ms 后才同步
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      void syncOrderToServer()
    }, 800)
  },
  { deep: true },
)

// --- 拖拽排序（平滑动画）---
const dragIndex = ref(-1)
const dragTargetIndex = ref(-1)
const dragOffsetY = ref(0)
const dragStartY = ref(0)
const ITEM_HEIGHT_PX = 48 // 每项预估高度 px（行高 + gap）

function onDragStart(index: number, e: TouchEvent): void {
  const touch = e.touches[0]
  if (!touch) return
  dragIndex.value = index
  dragTargetIndex.value = index
  dragStartY.value = touch.clientY
  dragOffsetY.value = 0
}

function onDragMove(e: TouchEvent): void {
  if (dragIndex.value < 0) return
  const touch = e.touches[0]
  if (!touch) return
  const dy = touch.clientY - dragStartY.value
  dragOffsetY.value = dy

  const total = sortedOptions.value.length
  const rawTarget = dragIndex.value + Math.round(dy / ITEM_HEIGHT_PX)
  const newTarget = Math.max(0, Math.min(total - 1, rawTarget))
  dragTargetIndex.value = newTarget
}

function onDragEnd(): void {
  if (dragIndex.value < 0) return

  const from = dragIndex.value
  const to = dragTargetIndex.value

  // 提交排序变更
  if (from !== to) {
    const keys = sortedOptions.value.map((o) => o.key)
    const [moved] = keys.splice(from, 1)
    if (moved) {
      keys.splice(to, 0, moved)
      sortOrder.value = {
        ...sortOrder.value,
        [activeTab.value]: keys,
      }
      saveOrder(sortOrder.value)
    }
  }

  dragIndex.value = -1
  dragTargetIndex.value = -1
  dragOffsetY.value = 0
  // 立即触发放松后的后端同步
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    void syncOrderToServer()
  }, 400)
}

/** 每项在拖拽时的 translateY 偏移 */
function itemTranslateY(index: number): string {
  if (dragIndex.value < 0) return '0px'
  const from = dragIndex.value
  const to = dragTargetIndex.value

  if (index === from) {
    // 拖拽项：直接跟随手指移动
    return `${dragOffsetY.value}px`
  }

  if (from < to && index > from && index <= to) {
    // 向下拖：中间项向上移一格
    return `-${ITEM_HEIGHT_PX}px`
  }
  if (from > to && index >= to && index < from) {
    // 向上拖：中间项向下移一格
    return `${ITEM_HEIGHT_PX}px`
  }
  return '0px'
}

// --- 编辑 / 删除 ---
const editingId = ref<string | null>(null)
const editLabel = ref('')

function startEdit(id: string, label: string) {
  editingId.value = id
  editLabel.value = label
}
function cancelEdit() {
  editingId.value = null
  editLabel.value = ''
}
async function saveEdit(id: string) {
  const label = editLabel.value.trim().slice(0, 10)
  if (!label) return
  const t = activeTab.value
  if (t === 'category') store.updateCustomCategory(id, { baseValue: 'herbaceous' as any, label })
  else if (t === 'placement') store.updateCustomPlacement(id, { baseValue: 'indoor_balcony' as any, label })
  else if (t === 'difficulty') store.updateCustomCareDifficulty(id, { baseValue: 'easy' as any, label })
  else store.updateCustomCareStatus(id, { baseValue: 'healthy' as any, label })
  try {
    await updateTaxonomyItem(id, { label })
  } catch {
    /* offline */
  }
  cancelEdit()
}

async function removeItem(id: string, label: string) {
  const confirmed = await showGentleConfirm({
    content: `确定要删除「${label}」吗？删除后已使用该选项的植株会回退到默认值。`,
  })
  if (!confirmed) return
  try {
    await deleteTaxonomyItem(id)
  } catch {
    /* offline */
  }
  const t = activeTab.value
  if (t === 'category') store.removeCustomCategory(id)
  else if (t === 'placement') store.removeCustomPlacement(id)
  else if (t === 'difficulty') store.removeCustomCareDifficulty(id)
  else store.removeCustomCareStatus(id)
}

function toggleDefault(value: string) {
  const s = storeForTab()
  if (s.hidden.includes(value)) s.unhide(value)
  else s.hide(value)
}

// --- 新增 ---
const adding = ref(false)
const newLabel = ref('')
function startAdd() {
  adding.value = true
  newLabel.value = ''
}
function cancelAdd() {
  adding.value = false
  newLabel.value = ''
}
async function confirmAdd() {
  const label = newLabel.value.trim().slice(0, 10)
  if (!label) return
  const s = storeForTab()
  let item: { id: string } | null = null
  try {
    item = await createTaxonomyItem({ type: activeTab.value as TaxonomyType, label, baseValue: s.baseValue })
  } catch {
    /* offline */
  }

  const t = activeTab.value
  if (t === 'category') {
    item
      ? (store.customCategories = [...store.customCategories, item as any])
      : store.addCustomCategory(s.baseValue as any, label)
  } else if (t === 'placement') {
    item
      ? (store.customPlacements = [...store.customPlacements, item as any])
      : store.addCustomPlacement(s.baseValue as any, label)
  } else if (t === 'difficulty') {
    item
      ? (store.customCareDifficulties = [...store.customCareDifficulties, item as any])
      : store.addCustomCareDifficulty(s.baseValue as any, label)
  } else {
    item
      ? (store.customCareStatuses = [...store.customCareStatuses, item as any])
      : store.addCustomCareStatus(s.baseValue as any, label)
  }
  showGentleToast(`已添加「${label}」`)
  cancelAdd()
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <view
    v-if="modelValue"
    class="fixed inset-0 z-70 flex items-end bg-slate-900/34 backdrop-blur-[6rpx]"
    @tap="close"
  >
    <view
      class="relative max-h-[72vh] w-full overflow-y-auto rounded-t-[40rpx] bg-[var(--color-surface)] px-5 pb-8 pt-5 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] dark:bg-slate-900"
      @tap.stop
    >
      <!-- 拖拽手柄 + 标题 + 关闭按钮 -->
      <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />

      <text class="text-lg font-800 text-app-ink dark:text-slate-100">编辑分类与状态</text>
      <CloseButton @click="close" />

      <!-- Tabs -->
      <view class="mt-4 flex gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="btn-base h-[60rpx] min-h-[60rpx] rounded-full px-4 text-2xs font-700 border-none"
          :class="
            activeTab === tab.key
              ? 'bg-[var(--color-mint)]/25 text-white dark:bg-emerald-500/25 dark:text-emerald-100'
              : 'bg-slate-100 text-app-muted dark:bg-slate-800 dark:text-slate-400'
          "
          hover-class="opacity-80"
          @tap="activeTab = tab.key"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </view>

      <!-- 排序列表 -->
      <view class="mt-5">
        <text class="text-2xs font-700 text-app-muted dark:text-slate-400">
          拖动 ⋮⋮ 排序，点击隐藏/显示
        </text>

        <view
          v-if="sortedOptions.length > 0"
          class="mt-2 flex flex-col gap-1.5"
          @touchmove.prevent="onDragMove"
          @touchend="onDragEnd"
          @touchcancel="onDragEnd"
        >
          <view
            v-for="(opt, index) in sortedOptions"
            :key="opt.key"
            class="flex items-center gap-2 rounded-[16rpx] bg-[var(--color-cream)]/30 px-2 py-2 dark:bg-slate-800"
            :class="{
              'opacity-60 line-through': opt.hidden && !opt.isCustom,
            }"
            :style="{
              transform:
                dragIndex === index
                  ? `translateY(${itemTranslateY(index)}) scale(1.03)`
                  : `translateY(${itemTranslateY(index)})`,
              transition: dragIndex < 0 ? 'transform 0.22s ease' : 'none',
              zIndex: dragIndex === index ? 20 : 0,
              boxShadow: dragIndex === index ? '0 8rpx 32rpx rgba(15,23,42,0.18)' : 'none',
              opacity: dragIndex >= 0 && dragIndex === index ? 0.95 : 1,
            }"
          >
            <!-- 编辑态 (仅自定义) -->
            <template v-if="editingId === opt.key && opt.isCustom">
              <input
                v-model="editLabel"
                class="field-input-sm min-w-0 flex-1"
                :maxlength="10"
              />
              <button
                class="btn-base h-[52rpx] min-h-[52rpx] flex-none rounded-full bg-[var(--color-mint)]/25 px-3 text-2xs font-700 text-white border-none dark:bg-emerald-500/25 dark:text-emerald-100"
                hover-class="opacity-80"
                @tap="saveEdit(opt.customId!)"
              >
                保存
              </button>
              <button
                class="btn-base h-[52rpx] min-h-[52rpx] flex-none rounded-full bg-slate-100 px-3 text-2xs font-700 text-app-muted border-none dark:bg-slate-700 dark:text-slate-300"
                hover-class="opacity-80"
                @tap="cancelEdit"
              >
                取消
              </button>
            </template>

            <!-- 普通态 -->
            <template v-else>
              <!-- 拖拽手柄 -->
              <view
                class="flex h-[44rpx] w-[36rpx] flex-none cursor-grab touch-none items-center justify-center text-app-muted/40 active:text-app-muted dark:text-slate-500 dark:active:text-slate-300"
                @touchstart="onDragStart(index, $event)"
              >
                <text class="text-[28rpx] leading-none tracking-[0.08em]">⋮⋮</text>
              </view>

              <!-- 标签 -->
              <text
                class="min-w-0 flex-1 text-sm text-app-ink dark:text-slate-200"
                :class="{ 'line-through text-slate-400 dark:text-slate-500': opt.hidden && !opt.isCustom }"
                >{{ opt.label }}</text
              >

              <!-- 默认选项：显示/隐藏切换 -->
              <template v-if="!opt.isCustom">
                <button
                  class="btn-base h-[48rpx] min-h-[48rpx] flex-none rounded-full px-3 text-2xs font-600 border-none"
                  :class="
                    opt.hidden
                      ? 'bg-[var(--color-mint)]/20 text-[var(--color-sage)] dark:bg-emerald-500/20 dark:text-emerald-200'
                      : 'bg-slate-100 text-app-muted dark:bg-slate-700 dark:text-slate-300'
                  "
                  hover-class="opacity-80"
                  @tap="toggleDefault(opt.key)"
                >
                  {{ opt.hidden ? '显示' : '隐藏' }}
                </button>
              </template>

              <!-- 自定义选项：编辑 + 删除 -->
              <template v-else>
                <button
                  class="btn-base h-[48rpx] min-h-[48rpx] flex-none rounded-full bg-slate-100 px-3 text-2xs text-app-muted border-none dark:bg-slate-700 dark:text-slate-300"
                  hover-class="opacity-80"
                  @tap="startEdit(opt.key, opt.label)"
                >
                  编辑
                </button>
                <button
                  class="btn-base h-[48rpx] min-h-[48rpx] flex-none rounded-full bg-rose-50 px-3 text-2xs text-rose-500 border-none dark:bg-rose-500/15 dark:text-rose-300"
                  hover-class="opacity-80"
                  @tap="removeItem(opt.customId!, opt.label)"
                >
                  删除
                </button>
              </template>
            </template>
          </view>
        </view>

        <text
          v-else
          class="mt-2 block text-2xs text-app-muted/60 dark:text-slate-500"
          >暂无选项</text
        >
      </view>

      <!-- 新增自定义选项 -->
      <view class="mt-4">
        <view
          v-if="adding"
          class="flex items-center gap-2"
        >
          <input
            v-model="newLabel"
            class="field-input-sm min-w-0 flex-1"
            placeholder="输入名称（最多10字）"
            :maxlength="10"
          />
          <button
            class="btn-base h-[56rpx] min-h-[56rpx] flex-none rounded-full bg-[var(--color-mint)]/25 px-3 text-2xs font-700 text-white border-none dark:bg-emerald-500/25 dark:text-emerald-100"
            hover-class="opacity-80"
            @tap="confirmAdd"
          >
            确认
          </button>
          <button
            class="btn-base h-[56rpx] min-h-[56rpx] flex-none rounded-full bg-slate-100 px-3 text-2xs font-700 text-app-muted border-none dark:bg-slate-700 dark:text-slate-300"
            hover-class="opacity-80"
            @tap="cancelAdd"
          >
            取消
          </button>
        </view>
        <button
          v-else
          class="btn-base mt-1 h-[64rpx] min-h-[64rpx] w-full rounded-[20rpx] bg-[var(--color-mint)]/10 text-2xs font-700 text-white/88 border-none dark:bg-emerald-500/12 dark:text-emerald-300"
          hover-class="opacity-80"
          @tap="startAdd"
        >
          + 新增自定义选项
        </button>
      </view>
    </view>
  </view>
</template>
