<script setup lang="ts">
import { FlowerCareDifficulty, FlowerCategory, FlowerPlacement } from '@florist/contracts'
import { computed, reactive, ref, watch } from 'vue'
import { createDefaultFlowerFormValues, type FlowerFormValues } from '@/interfaces'
import { suggestFlowerTaxonomy, type TaxonomySuggestion } from '@/api/ai'
import { containsIllegalCharacters, isBlankString, showGentleToast } from '@/utils'
import CloseButton from '../app/CloseButton.vue'
import ImagePicker from '../app/ImagePicker.vue'
import InfoPopover from '../app/InfoPopover.vue'
import SubmitBtn from '../app/SubmitBtn.vue'

interface FlowerCreatePopupProps {
  modelValue: boolean
  submitting?: boolean
}

const props = withDefaults(defineProps<FlowerCreatePopupProps>(), {
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [value: FlowerFormValues]
}>()

const formState = reactive<FlowerFormValues>(createDefaultFlowerFormValues())
const formError = ref('')
const aiSuggesting = ref(false)
const aiSuggestion = ref<TaxonomySuggestion | null>(null)

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return
    Object.assign(formState, {
      ...createDefaultFlowerFormValues(),
      lastWateredAt: '',
      lastFertilizedAt: '',
    })
    formError.value = ''
    aiSuggestion.value = null
  },
)

const canSuggest = computed(() => formState.name.trim().length > 0 && !aiSuggesting.value)

const aiSuggestionLabel = computed(() => {
  if (!aiSuggestion.value) return ''
  const s = aiSuggestion.value
  if (s.confidence === 'high') return `已根据「${formState.name.trim()}」智能推荐了分类和养护设置`
  return '已根据名称推测了默认设置，后续可在编辑中调整'
})

function validateForm(): boolean {
  if (isBlankString(formState.name)) {
    formError.value = '至少需要填写植株名称'
    return false
  }
  if (containsIllegalCharacters(formState.name)) {
    formError.value = '植株名称里似乎有不太合适的字符'
    return false
  }
  if (formState.name.trim().length > 20) {
    formError.value = '名称最多 20 个字'
    return false
  }
  if (formState.nickname && containsIllegalCharacters(formState.nickname)) {
    formError.value = '昵称里似乎有不太合适的字符'
    return false
  }
  if (formState.nickname && formState.nickname.trim().length > 20) {
    formError.value = '昵称最多 20 个字'
    return false
  }
  formError.value = ''
  return true
}

function handleSubmit(): void {
  if (!validateForm()) return
  emit('submit', { ...formState })
}

async function handleAiSuggest(): Promise<void> {
  if (!canSuggest.value) return
  aiSuggesting.value = true
  try {
    const suggestion = await suggestFlowerTaxonomy(formState.name.trim())
    aiSuggestion.value = suggestion
    if (suggestion.category) formState.category = suggestion.category as FlowerCategory
    if (suggestion.placement) formState.placement = suggestion.placement as FlowerPlacement
    if (suggestion.careDifficulty) formState.careDifficulty = suggestion.careDifficulty as FlowerCareDifficulty
    if (suggestion.careStatus) formState.careStatus = suggestion.careStatus as typeof formState.careStatus
  } catch {
    showGentleToast('AI 暂时无法识别，已使用默认设置')
  } finally {
    aiSuggesting.value = false
  }
}

function handleClose(): void {
  emit('update:modelValue', false)
}
</script>

<template>
  <view v-if="props.modelValue" class="fixed inset-0 z-70 flex items-end overflow-hidden bg-slate-900/34 backdrop-blur-[6rpx]" @tap="handleClose">
    <view
      class="relative max-h-[90vh] w-full overflow-y-auto rounded-t-[40rpx] bg-[var(--color-surface)] px-5 pb-8 pt-5 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)]"
      @tap.stop
    >
      <!-- 拖拽指示条 -->
      <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />

      <!-- 标题 -->
      <view class="flex items-center gap-1">
        <text class="block text-[44rpx] font-900 leading-tight text-app-ink">新增一盆小可爱</text>
        <InfoPopover content="先写上名字就可以创建啦，品类和状态会自动设置，创建后随时可以编辑调整。" icon="help" />
      </view>
      <CloseButton @click="handleClose" />

      <!-- 名称 -->
      <view class="mt-6">
        <text class="block text-2xs font-700 tracking-[0.04em] text-app-muted">植株名称</text>
        <input
          v-model="formState.name"
          class="field-input-md mt-2 w-full px-4 text-sm text-app-ink"
          placeholder="比如：龟背竹、绿萝"
          :maxlength="20"
          @input="formError = ''"
        />
      </view>

      <!-- AI 智能推荐 -->
      <view class="mt-4">
        <button
          class="btn-pill-sm surface-soft px-4 text-app-muted"
          :class="!canSuggest ? 'opacity-50' : ''"
          :loading="aiSuggesting"
          :disabled="!canSuggest"
          hover-class="opacity-80"
          @tap="handleAiSuggest"
        >
          ✨ AI 智能推荐分类
        </button>
        <text v-if="aiSuggestionLabel" class="mt-2 block text-2xs leading-5 text-[var(--color-sage)]">
          {{ aiSuggestionLabel }}
        </text>
      </view>

      <!-- 昵称 -->
      <view class="mt-5">
        <text class="block text-2xs font-700 tracking-[0.04em] text-app-muted">昵称（可选）</text>
        <input
          v-model="formState.nickname"
          class="field-input-md mt-2 w-full px-4 text-sm text-app-ink"
          placeholder="给它取个小名"
          :maxlength="20"
        />
      </view>

      <!-- 图片 -->
      <view class="mt-5">
        <text class="block text-2xs font-700 tracking-[0.04em] text-app-muted">照片（可选）</text>
        <ImagePicker
          v-model="formState.images"
          v-model:cover-image-id="formState.coverImageId"
          :max-count="6"
          upload-mode="cloud"
          asset-prefix="image"
          scope="flower"
          crop-mode="card"
          :support-cover="true"
          add-text="添加图片"
          error-text="这张图片先休息一下"
        />
      </view>

      <!-- 错误 -->
      <text v-if="formError" class="mt-4 block text-sm text-[var(--color-blush)]">
        {{ formError }}
      </text>

      <!-- 提交 -->
      <SubmitBtn class="mt-6" text="创建植株" loading-text="创建中..." :loading="props.submitting" @click="handleSubmit" />
    </view>
  </view>
</template>
