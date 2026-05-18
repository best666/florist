import { computed, ref, type Ref } from 'vue'
import { useFlowerTaxonomyStore } from '@/store'

export interface CustomOptionEditorConfig {
  /** 表单中对应的基础值 ref，如 category/placement/careDifficulty/careStatus */
  baseValue: Ref<string>
  /** 表单中对应的自定义选项 ID ref */
  customId: Ref<string | undefined>
  /** 当前选中类型的默认回退值（删除自定义选项时使用） */
  fallbackBaseValue: string
  /** 编辑器类型标识，用于 store 方法路由 */
  type: 'category' | 'placement' | 'difficulty' | 'status'
  /** 中文标签，用于错误提示（如"分类""位置"） */
  typeLabel: string
  /** 标签最大长度 */
  maxLabelLength?: number
}

/**
 * 管理单个自定义选项编辑器（新增/编辑/删除/排序）的通用 composable。
 * 品类、位置、难度、状态四个编辑器共用同一套逻辑，通过 config 区分。
 */
export function useCustomOptionEditor(config: CustomOptionEditorConfig) {
  const taxonomyStore = useFlowerTaxonomyStore()

  const draftLabel = ref('')
  const draftBaseValue = ref(config.baseValue.value)
  const editingId = ref('')
  const isCreating = ref(false)

  // ---- store 操作方法选择 ----
  function getById(id?: string) {
    if (!id) return null
    const map = {
      category: taxonomyStore.getCustomCategoryById,
      placement: taxonomyStore.getCustomPlacementById,
      difficulty: taxonomyStore.getCustomCareDifficultyById,
      status: taxonomyStore.getCustomCareStatusById,
    }
    return map[config.type](id as any) as { id: string; label: string; baseValue: string } | null
  }

  function add(label: string): { id: string } {
    // 各 store 方法的第一个参数类型不同（FlowerCategory / FlowerPlacement / etc.），
    // 运行时通过 config.type 路由，此处用 any 桥接类型差异。
    const map: Record<string, (baseValue: any, label: string) => { id: string }> = {
      category: taxonomyStore.addCustomCategory,
      placement: taxonomyStore.addCustomPlacement,
      difficulty: taxonomyStore.addCustomCareDifficulty,
      status: taxonomyStore.addCustomCareStatus,
    }
    return map[config.type]!(draftBaseValue.value as any, label)
  }

  function update(id: string, payload: { baseValue: string; label: string }) {
    const map = {
      category: taxonomyStore.updateCustomCategory,
      placement: taxonomyStore.updateCustomPlacement,
      difficulty: taxonomyStore.updateCustomCareDifficulty,
      status: taxonomyStore.updateCustomCareStatus,
    }
    map[config.type](id as any, payload as any)
  }

  function remove(id: string) {
    const map = {
      category: taxonomyStore.removeCustomCategory,
      placement: taxonomyStore.removeCustomPlacement,
      difficulty: taxonomyStore.removeCustomCareDifficulty,
      status: taxonomyStore.removeCustomCareStatus,
    }
    map[config.type](id as any)
  }

  function moveOption(id: string, direction: 'top' | 'up' | 'down') {
    const map = {
      category: taxonomyStore.moveCustomCategory,
      placement: taxonomyStore.moveCustomPlacement,
      difficulty: taxonomyStore.moveCustomCareDifficulty,
      status: taxonomyStore.moveCustomCareStatus,
    }
    map[config.type](id as any, direction)
  }

  // ---- computed ----
  const customList = computed(() => {
    const map = {
      category: taxonomyStore.customCategories,
      placement: taxonomyStore.customPlacements,
      difficulty: taxonomyStore.customCareDifficulties,
      status: taxonomyStore.customCareStatuses,
    }
    return map[config.type] as ReadonlyArray<{ id: string; label: string; baseValue: string }>
  })

  const selectedOption = computed(() => getById(config.customId.value))
  const selectedIndex = computed(() =>
    selectedOption.value
      ? customList.value.findIndex((o) => o.id === selectedOption.value!.id)
      : -1,
  )

  const isEditorVisible = computed(() => isCreating.value || Boolean(editingId.value))
  const canMoveUp = computed(() => selectedIndex.value > 0)
  const canMoveDown = computed(
    () => selectedIndex.value >= 0 && selectedIndex.value < customList.value.length - 1,
  )

  // ---- handlers ----
  function resetEditor(): void {
    draftLabel.value = ''
    draftBaseValue.value = config.baseValue.value
    editingId.value = ''
    isCreating.value = false
  }

  function startCreate(initialBaseValue?: string): void {
    isCreating.value = true
    editingId.value = ''
    draftLabel.value = ''
    draftBaseValue.value = initialBaseValue ?? config.baseValue.value
  }

  function startEdit(customOptionId: string): void {
    const option = getById(customOptionId)
    if (!option) return

    editingId.value = option.id
    isCreating.value = false
    draftLabel.value = option.label
    draftBaseValue.value = option.baseValue
  }

  /**
   * 保存自定义选项（创建或更新）。返回验证错误信息，成功返回 null。
   */
  function save(): string | null {
    const label = draftLabel.value.trim()
    const max = config.maxLabelLength ?? 10

    if (label.length === 0) {
      return `先写一个自定义${config.typeLabel}名称。`
    }
    if (label.length > max) {
      return `自定义${config.typeLabel}先控制在 ${max} 个字以内。`
    }

    if (editingId.value) {
      update(editingId.value, {
        baseValue: draftBaseValue.value,
        label,
      })
      config.customId.value = editingId.value
    } else {
      const option = add(label)
      config.customId.value = option.id
    }

    config.baseValue.value = draftBaseValue.value
    resetEditor()
    return null
  }

  function removeOption(customOptionId: string): void {
    remove(customOptionId)

    if (config.customId.value === customOptionId) {
      config.customId.value = undefined
      config.baseValue.value = config.fallbackBaseValue
    }

    if (editingId.value === customOptionId) {
      resetEditor()
    }
  }

  function moveSelected(direction: 'top' | 'up' | 'down'): void {
    const option = selectedOption.value
    if (!option) return
    moveOption(option.id, direction)
  }

  function cancel(): void {
    resetEditor()
  }

  return {
    // state
    draftLabel,
    draftBaseValue,
    editingId,
    isCreating,
    // computed
    selectedOption,
    selectedIndex,
    isEditorVisible,
    canMoveUp,
    canMoveDown,
    // handlers
    resetEditor,
    startCreate,
    startEdit,
    save,
    removeOption,
    moveSelected,
    cancel,
  }
}
