<script setup lang="ts">
import { computed, ref } from 'vue'
import { TaxonomyType } from '@florist/contracts'
import {
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_DIFFICULTY_OPTIONS,
  FLOWER_PLACEMENT_OPTIONS,
  FLOWER_STATUS_OPTIONS,
} from '@/interfaces'
import { useFlowerTaxonomyStore } from '@/store'
import { createTaxonomyItem, deleteTaxonomyItem, updateTaxonomyItem } from '@/api/taxonomy'
import { showGentleConfirm, showGentleToast } from '@/utils'

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

// 工具：获取当前 tab 对应的 store 方法
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
        ? 'herbaceous'
        : t === 'placement'
          ? 'indoor_balcony'
          : t === 'difficulty'
            ? 'easy'
            : 'healthy',
  }
}

const defaultOpts = computed(() => {
  const s = storeForTab()
  const hiddenSet = new Set(s.hidden)
  const opts =
    activeTab.value === 'category'
      ? FLOWER_CATEGORY_OPTIONS
      : activeTab.value === 'placement'
        ? FLOWER_PLACEMENT_OPTIONS
        : activeTab.value === 'difficulty'
          ? FLOWER_DIFFICULTY_OPTIONS
          : FLOWER_STATUS_OPTIONS
  return opts.map((o) => ({ ...o, hidden: hiddenSet.has(o.value) }))
})

const customOpts = computed(() => storeForTab().customs)

// 编辑
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
  const updateMap = {
    category: () => store.updateCustomCategory(id, { baseValue: 'herbaceous' as any, label }),
    placement: () => store.updateCustomPlacement(id, { baseValue: 'indoor_balcony' as any, label }),
    difficulty: () => store.updateCustomCareDifficulty(id, { baseValue: 'easy' as any, label }),
    status: () => store.updateCustomCareStatus(id, { baseValue: 'healthy' as any, label }),
  }[t]
  updateMap()
  try {
    await updateTaxonomyItem(id, { label })
  } catch {
    /* offline */
  }
  cancelEdit()
}

// 删除（含二次确认）
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
  const removeMap = {
    category: () => store.removeCustomCategory(id),
    placement: () => store.removeCustomPlacement(id),
    difficulty: () => store.removeCustomCareDifficulty(id),
    status: () => store.removeCustomCareStatus(id),
  }[activeTab.value]
  removeMap()
}

// 新增
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
  const addMap = {
    category: () =>
      item
        ? (store.customCategories = [...store.customCategories, item as any])
        : store.addCustomCategory(s.baseValue as any, label),
    placement: () =>
      item
        ? (store.customPlacements = [...store.customPlacements, item as any])
        : store.addCustomPlacement(s.baseValue as any, label),
    difficulty: () =>
      item
        ? (store.customCareDifficulties = [...store.customCareDifficulties, item as any])
        : store.addCustomCareDifficulty(s.baseValue as any, label),
    status: () =>
      item
        ? (store.customCareStatuses = [...store.customCareStatuses, item as any])
        : store.addCustomCareStatus(s.baseValue as any, label),
  }[activeTab.value]
  addMap()
  showGentleToast(`已添加「${label}」`)
  cancelAdd()
}

function toggleDefault(value: string) {
  const s = storeForTab()
  if (s.hidden.includes(value)) s.unhide(value)
  else s.hide(value)
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
      <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
      <text class="block text-lg font-800 text-app-ink dark:text-slate-100">编辑分类与状态</text>

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

      <!-- 默认选项：chips -->
      <view class="mt-5">
        <text class="text-2xs font-700 text-app-muted dark:text-slate-400">默认选项（点击隐藏/显示）</text>
        <view class="mt-2 flex flex-wrap gap-2">
          <text
            v-for="opt in defaultOpts"
            :key="opt.value"
            class="cursor-pointer rounded-full px-3 py-1.5 text-2xs font-600 transition-all"
            :class="
              opt.hidden
                ? 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-500'
                : 'bg-[var(--color-mint)]/25 text-white dark:bg-emerald-500/25 dark:text-emerald-100'
            "
            @tap="toggleDefault(opt.value)"
            >{{ opt.label }}</text
          >
        </view>
      </view>

      <!-- 自定义选项：带操作按钮的列表 -->
      <view class="mt-5">
        <text class="text-2xs font-700 text-app-muted dark:text-slate-400">自定义选项</text>

        <view
          v-if="customOpts.length > 0"
          class="mt-2 flex flex-col gap-2"
        >
          <view
            v-for="opt in customOpts"
            :key="opt.id"
            class="flex items-center gap-2 rounded-[16rpx] bg-[var(--color-cream)]/40 px-3 py-2.5 dark:bg-slate-800"
          >
            <template v-if="editingId === opt.id">
              <input
                v-model="editLabel"
                class="field-input-sm min-w-0 flex-1"
                :maxlength="10"
              />
              <button
                class="btn-base h-[56rpx] min-h-[56rpx] rounded-full bg-[var(--color-mint)]/25 px-3 text-2xs font-700 text-white border-none dark:bg-emerald-500/25 dark:text-emerald-100"
                hover-class="opacity-80"
                @tap="saveEdit(opt.id)"
              >
                保存
              </button>
              <button
                class="btn-base h-[56rpx] min-h-[56rpx] rounded-full bg-slate-100 px-3 text-2xs font-700 text-app-muted border-none dark:bg-slate-700 dark:text-slate-300"
                hover-class="opacity-80"
                @tap="cancelEdit"
              >
                取消
              </button>
            </template>
            <template v-else>
              <text class="min-w-0 flex-1 text-sm text-app-ink dark:text-slate-200">{{ opt.label }}</text>
              <button
                class="btn-base h-[52rpx] min-h-[52rpx] rounded-full bg-slate-100 px-3 text-2xs text-app-muted border-none dark:bg-slate-700 dark:text-slate-300"
                hover-class="opacity-80"
                @tap="startEdit(opt.id, opt.label)"
              >
                编辑
              </button>
              <button
                class="btn-base h-[52rpx] min-h-[52rpx] rounded-full bg-rose-50 px-3 text-2xs text-rose-500 border-none dark:bg-rose-500/15 dark:text-rose-300"
                hover-class="opacity-80"
                @tap="removeItem(opt.id, opt.label)"
              >
                删除
              </button>
            </template>
          </view>
        </view>
        <text
          v-else
          class="mt-2 block text-2xs text-app-muted/60 dark:text-slate-500"
          >暂无自定义选项</text
        >

        <!-- 新增：在末尾 -->
        <view
          v-if="adding"
          class="mt-2 flex items-center gap-2"
        >
          <input
            v-model="newLabel"
            class="field-input-sm min-w-0 flex-1"
            placeholder="输入名称（最多10字）"
            :maxlength="10"
          />
          <button
            class="btn-base h-[56rpx] min-h-[56rpx] rounded-full bg-[var(--color-mint)]/25 px-3 text-2xs font-700 text-white border-none dark:bg-emerald-500/25 dark:text-emerald-100"
            hover-class="opacity-80"
            @tap="confirmAdd"
          >
            确认
          </button>
          <button
            class="btn-base h-[56rpx] min-h-[56rpx] rounded-full bg-slate-100 px-3 text-2xs font-700 text-app-muted border-none dark:bg-slate-700 dark:text-slate-300"
            hover-class="opacity-80"
            @tap="cancelAdd"
          >
            取消
          </button>
        </view>
        <button
          v-else
          class="btn-base mt-2 h-[64rpx] min-h-[64rpx] w-full rounded-[20rpx] bg-[var(--color-mint)]/10 text-2xs font-700 text-[var(--color-sage)] border-none dark:bg-emerald-500/12 dark:text-emerald-300"
          hover-class="opacity-80"
          @tap="startAdd"
        >
          + 新增自定义选项
        </button>
      </view>
    </view>
  </view>
</template>
