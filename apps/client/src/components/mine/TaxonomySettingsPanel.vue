<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  FLOWER_CATEGORY_OPTIONS,
  FLOWER_DIFFICULTY_OPTIONS,
  FLOWER_PLACEMENT_OPTIONS,
  FLOWER_STATUS_OPTIONS,
  type FlowerHealthStatus,
} from '@/interfaces'
import { useFlowerTaxonomyStore } from '@/store'
import { showGentleConfirm, showGentleToast } from '@/utils'
import CollapsibleSection from '../app/CollapsibleSection.vue'
import InfoPopover from '../app/InfoPopover.vue'

const store = useFlowerTaxonomyStore()

// —— 品类 ——
const categoryHiddenSet = computed(() => new Set(store.hiddenCategories))
function toggleHideCategory(value: string, label: string): void {
  if (categoryHiddenSet.value.has(value)) {
    store.unhideCategory(value)
  } else {
    store.hideCategory(value)
    showGentleToast(`已隐藏「${label}」`)
  }
}
function removeCategory(id: string, label: string): void {
  store.removeCustomCategory(id)
  showGentleToast(`已删除自定义品类「${label}」`)
}

// —— 位置 ——
const placementHiddenSet = computed(() => new Set(store.hiddenPlacements))
function toggleHidePlacement(value: string, label: string): void {
  if (placementHiddenSet.value.has(value)) {
    store.unhidePlacement(value)
  } else {
    store.hidePlacement(value)
    showGentleToast(`已隐藏「${label}」`)
  }
}
function removePlacement(id: string, label: string): void {
  store.removeCustomPlacement(id)
  showGentleToast(`已删除自定义位置「${label}」`)
}

// —— 难度 ——
const difficultyHiddenSet = computed(() => new Set(store.hiddenCareDifficulties))
function toggleHideDifficulty(value: string, label: string): void {
  if (difficultyHiddenSet.value.has(value)) {
    store.unhideCareDifficulty(value)
  } else {
    store.hideCareDifficulty(value)
    showGentleToast(`已隐藏「${label}」`)
  }
}
function removeDifficulty(id: string, label: string): void {
  store.removeCustomCareDifficulty(id)
  showGentleToast(`已删除自定义难度「${label}」`)
}

// —— 状态 ——
const statusHiddenSet = computed(() => new Set(store.hiddenCareStatuses))
function toggleHideStatus(value: string, label: string): void {
  if (statusHiddenSet.value.has(value)) {
    store.unhideCareStatus(value)
  } else {
    store.hideCareStatus(value)
    showGentleToast(`已隐藏「${label}」`)
  }
}
function removeStatus(id: string, label: string): void {
  store.removeCustomCareStatus(id)
  showGentleToast(`已删除自定义状态「${label}」`)
}

// —— 新增自定义 ——
const newCustomName = ref('')
const editingType = ref<'category' | 'placement' | 'difficulty' | 'status' | null>(null)

function startAdd(type: 'category' | 'placement' | 'difficulty' | 'status'): void {
  editingType.value = type
  newCustomName.value = ''
}

function cancelAdd(): void {
  editingType.value = null
  newCustomName.value = ''
}

function confirmAdd(): void {
  if (!editingType.value || !newCustomName.value.trim()) return
  const label = newCustomName.value.trim().slice(0, 10)
  switch (editingType.value) {
    case 'category':
      store.addCustomCategory('herbaceous' as any, label)
      break
    case 'placement':
      store.addCustomPlacement('indoor_balcony' as any, label)
      break
    case 'difficulty':
      store.addCustomCareDifficulty('easy' as any, label)
      break
    case 'status':
      store.addCustomCareStatus('healthy' as FlowerHealthStatus, label)
      break
  }
  showGentleToast(`已添加「${label}」`)
  cancelAdd()
}
</script>

<template>
  <view class="flex flex-col gap-4">
    <!-- 品类 -->
    <CollapsibleSection title="🌿 品类管理" :default-expanded="false">
      <InfoPopover content="植株品类默认选项可以隐藏或新增自定义。隐藏的选项不会在新增或筛选时出现。" />
      <view class="mt-3 flex flex-wrap gap-2">
        <text
          v-for="opt in FLOWER_CATEGORY_OPTIONS"
          :key="opt.value"
          class="inline-block cursor-pointer rounded-full px-3 py-1.5 text-2xs font-600"
          :class="categoryHiddenSet.has(opt.value)
            ? 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-600'
            : 'bg-[var(--color-mint)]/10 text-[var(--color-sage)]'"
          @tap="toggleHideCategory(opt.value, opt.label)"
        >
          {{ opt.label }}
        </text>
        <text
          v-for="opt in store.customCategories"
          :key="opt.id"
          class="inline-block cursor-pointer rounded-full bg-[var(--color-gold)]/12 px-3 py-1.5 text-2xs font-600 text-[var(--color-gold)]"
          @tap="removeCategory(opt.id, opt.label)"
        >
          {{ opt.label }} ✕
        </text>
      </view>
    </CollapsibleSection>

    <!-- 位置 -->
    <CollapsibleSection title="📍 位置管理" :default-expanded="false">
      <view class="mt-3 flex flex-wrap gap-2">
        <text
          v-for="opt in FLOWER_PLACEMENT_OPTIONS"
          :key="opt.value"
          class="inline-block cursor-pointer rounded-full px-3 py-1.5 text-2xs font-600"
          :class="placementHiddenSet.has(opt.value)
            ? 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-600'
            : 'bg-[var(--color-blush)]/10 text-[var(--color-ink)]'"
          @tap="toggleHidePlacement(opt.value, opt.label)"
        >
          {{ opt.label }}
        </text>
        <text
          v-for="opt in store.customPlacements"
          :key="opt.id"
          class="inline-block cursor-pointer rounded-full bg-[var(--color-gold)]/12 px-3 py-1.5 text-2xs font-600 text-[var(--color-gold)]"
          @tap="removePlacement(opt.id, opt.label)"
        >
          {{ opt.label }} ✕
        </text>
      </view>
    </CollapsibleSection>

    <!-- 难度 -->
    <CollapsibleSection title="💪 难度管理" :default-expanded="false">
      <view class="mt-3 flex flex-wrap gap-2">
        <text
          v-for="opt in FLOWER_DIFFICULTY_OPTIONS"
          :key="opt.value"
          class="inline-block cursor-pointer rounded-full px-3 py-1.5 text-2xs font-600"
          :class="difficultyHiddenSet.has(opt.value)
            ? 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-600'
            : 'bg-[var(--color-cream)]/40 text-[var(--color-ink)]'"
          @tap="toggleHideDifficulty(opt.value, opt.label)"
        >
          {{ opt.label }}
        </text>
        <text
          v-for="opt in store.customCareDifficulties"
          :key="opt.id"
          class="inline-block cursor-pointer rounded-full bg-[var(--color-gold)]/12 px-3 py-1.5 text-2xs font-600 text-[var(--color-gold)]"
          @tap="removeDifficulty(opt.id, opt.label)"
        >
          {{ opt.label }} ✕
        </text>
      </view>
    </CollapsibleSection>

    <!-- 状态 -->
    <CollapsibleSection title="📊 状态管理" :default-expanded="false">
      <view class="mt-3 flex flex-wrap gap-2">
        <text
          v-for="opt in FLOWER_STATUS_OPTIONS"
          :key="opt.value"
          class="inline-block cursor-pointer rounded-full px-3 py-1.5 text-2xs font-600"
          :class="statusHiddenSet.has(opt.value)
            ? 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-600'
            : 'bg-[var(--color-blush)]/8 text-[var(--color-ink)]'"
          @tap="toggleHideStatus(opt.value, opt.label)"
        >
          {{ opt.label }}
        </text>
        <text
          v-for="opt in store.customCareStatuses"
          :key="opt.id"
          class="inline-block cursor-pointer rounded-full bg-[var(--color-gold)]/12 px-3 py-1.5 text-2xs font-600 text-[var(--color-gold)]"
          @tap="removeStatus(opt.id, opt.label)"
        >
          {{ opt.label }} ✕
        </text>
      </view>
    </CollapsibleSection>

    <!-- 新增入口 -->
    <view v-if="editingType" class="card-soft rounded-[28rpx] px-4 py-4">
      <view class="flex items-center gap-2">
        <input
          v-model="newCustomName"
          class="field-input-sm flex-1"
          placeholder="输入自定义名称（最多10字）"
          :maxlength="10"
        />
        <text class="btn-pill-sm bg-[var(--color-mint)]/15 px-4 text-[var(--color-sage)]" @tap="confirmAdd">确认</text>
        <text class="btn-pill-sm bg-slate-100 px-4 text-app-muted" @tap="cancelAdd">取消</text>
      </view>
    </view>
    <view v-else class="text-center">
      <text
        class="inline-block cursor-pointer rounded-full bg-[var(--color-gold)]/12 px-5 py-2 text-2xs font-700 text-[var(--color-gold)]"
        @tap="startAdd('category')"
      >+ 新增自定义品类</text>
    </view>
  </view>
</template>
