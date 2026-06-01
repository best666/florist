<script setup lang="ts">
import type { IFeedback, IImageAsset } from '@florist/contracts'
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import AppBottomNav from '@/components/AppBottomNav.vue'
import AppButton from '@/components/AppButton.vue'
import ImagePicker from '@/components/ImagePicker.vue'
import SubmitBtn from '@/components/SubmitBtn.vue'
import {
  addComment,
  createFeedback,
  fetchCommunityFeedbacks,
  type CreateFeedbackPayload,
  voteFeedback,
} from '@/api/community'
import { usePageTheme } from '@/hooks/usePageTheme'
import { usePageTip } from '@/hooks/usePageTip'
import { COMMUNITY_TIPS } from '@/interfaces/page-tips'
import { useAuthStore } from '@/store'
import { formatDateTime, showGentleSuccess, showGentleToast } from '@/utils'

const themeClass = usePageTheme()
const { currentTip: communityTip } = usePageTip(COMMUNITY_TIPS)
const authStore = useAuthStore()

const feedbacks = ref<IFeedback[]>([])
const totalCount = ref(0)
const nextCursor = ref<string | null>(null)
const sortBy = ref<'votes' | 'newest'>('votes')
const isLoading = ref(false)
const isSubmitting = ref(false)

// 新增反馈
const showForm = ref(false)
const newContent = ref('')
const newImages = ref<IImageAsset[]>([])

// 评论
const commentingId = ref('')
const commentContent = ref('')
const isCommenting = ref(false)

// 详情展开
const expandedId = ref('')

const isLoggedIn = computed(() => authStore.isAuthenticated)
const hasMore = computed(() => nextCursor.value !== null)

async function loadFeedbacks(reset = false): Promise<void> {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const cursor = reset ? undefined : (nextCursor.value ?? undefined)
    const result = await fetchCommunityFeedbacks({
      sort: sortBy.value,
      ...(cursor ? { cursor } : {}),
      limit: 15,
    })

    if (reset || !cursor) {
      feedbacks.value = [...result.items]
    } else {
      feedbacks.value = [...feedbacks.value, ...result.items]
    }

    totalCount.value = result.totalCount
    nextCursor.value = result.nextCursor
  } catch {
    // 静默处理
  } finally {
    isLoading.value = false
  }
}

function changeSort(sort: 'votes' | 'newest'): void {
  if (sortBy.value === sort) return
  sortBy.value = sort
  loadFeedbacks(true)
}

async function handleVote(item: IFeedback): Promise<void> {
  if (!isLoggedIn.value) {
    showGentleToast('请先登录后再参与投票。')
    goToMinePage()
    return
  }

  try {
    const result = await voteFeedback(item.id)
    // 更新本地数据
    const target = feedbacks.value.find(f => f.id === item.id)
    if (target) {
      ;(target as { voteCount: number }).voteCount = result.voteCount
      ;(target as { hasVoted?: boolean }).hasVoted = result.hasVoted
    }
  } catch {
    showGentleToast('投票失败，请稍后再试。')
  }
}

async function handleAddComment(feedbackId: string): Promise<void> {
  if (!isLoggedIn.value) {
    showGentleToast('请先登录后再参与评论。')
    goToMinePage()
    return
  }

  const content = commentContent.value.trim()
  if (content.length < 2) {
    showGentleToast('评论内容写满 2 个字再来吧。')
    return
  }

  isCommenting.value = true
  try {
    const updated = await addComment(feedbackId, content)
    const idx = feedbacks.value.findIndex(f => f.id === feedbackId)
    if (idx !== -1) {
      feedbacks.value[idx] = updated
    }
    commentContent.value = ''
    commentingId.value = ''
    showGentleSuccess('评论已经发布啦。')
  } catch {
    showGentleToast('评论发送失败，请稍后再试。')
  } finally {
    isCommenting.value = false
  }
}

function toggleExpand(feedbackId: string): void {
  expandedId.value = expandedId.value === feedbackId ? '' : feedbackId
}

function toggleCommentInput(feedbackId: string): void {
  commentingId.value = commentingId.value === feedbackId ? '' : feedbackId
  commentContent.value = ''
}

async function handleSubmitFeedback(): Promise<void> {
  if (!isLoggedIn.value) {
    showGentleToast('请先登录后再提交反馈。')
    goToMinePage()
    return
  }

  const content = newContent.value.trim()
  if (content.length < 5) {
    showGentleToast('反馈内容写满 5 个字，我们会更容易看懂你的想法。')
    return
  }

  isSubmitting.value = true
  try {
    await createFeedback({
      content,
      images: [...newImages.value] as CreateFeedbackPayload['images'],
    })
    newContent.value = ''
    newImages.value = []
    showForm.value = false
    showGentleSuccess('反馈已提交，AI 审核通过后将在社区展示。')
    loadFeedbacks(true)
  } catch (error) {
    showGentleToast(error instanceof Error ? error.message : '提交失败，请稍后再试。')
  } finally {
    isSubmitting.value = false
  }
}

function previewImages(images: ReadonlyArray<IImageAsset>, current: string): void {
  uni.previewImage({ urls: images.map(i => i.url), current })
}

function goToMinePage(): void {
  goToMinePage()
}

function openNewFeedback(): void {
  if (!isLoggedIn.value) {
    showGentleToast('请先登录后再提交反馈。')
    goToMinePage()
    return
  }
  showForm.value = true
}

onShow(() => {
  loadFeedbacks(true)
})
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-app-ivory" :class="themeClass">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-5 pb-[160rpx]">
      <!-- Hero -->
      <view class="hero-shell app-fade-up bg-linear-to-br from-[var(--color-mint)] via-[var(--color-cream)] to-[var(--color-blush)]">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-[var(--color-surface)]/78 text-app-muted">花友社区</view>
            <view class="mt-3 text-title font-900 leading-tight text-app-ink">
              每一条建议，都让花园变得更好
            </view>
            <view class="mt-2 text-body text-app-muted">{{ communityTip }}</view>
          </view>
          <view class="app-float-soft flex h-[130rpx] w-[130rpx] items-center justify-center rounded-full bg-[var(--color-surface)]/58 text-[56rpx]">
            💬
          </view>
        </view>
        <view class="mt-4 flex items-center gap-3">
          <view class="text-2xs text-app-muted">{{ totalCount }} 条花友反馈</view>
          <view class="ml-auto flex gap-2">
            <AppButton
              variant="pill" size="sm"
              :custom-class="sortBy === 'votes' ? 'h-8 bg-[var(--color-mint)] text-app-ink' : 'h-8 bg-[var(--color-surface)] text-app-muted'"
              @tap="changeSort('votes')"
            >
              🔥 热门
            </AppButton>
            <AppButton
              variant="pill" size="sm"
              :custom-class="sortBy === 'newest' ? 'h-8 bg-[var(--color-mint)] text-app-ink' : 'h-8 bg-[var(--color-surface)] text-app-muted'"
              @tap="changeSort('newest')"
            >
              🕐 最新
            </AppButton>
          </view>
        </view>
      </view>

      <!-- 反馈列表 -->
      <view v-if="feedbacks.length === 0 && !isLoading" class="flex flex-col items-center gap-4 py-16">
        <text class="text-5xl">🌱</text>
        <text class="text-app-muted">还没有人提出建议，来做第一个花友吧。</text>
      </view>

      <view v-for="item in feedbacks" :key="item.id"
        class="card-soft app-fade-up rounded-[28rpx] dark:bg-slate-900"
      >
        <!-- 发布者信息 -->
        <view class="flex items-center gap-3">
          <view class="h-10 w-10 rounded-full bg-[var(--color-cream)]/60 flex items-center justify-center text-lg">
            {{ item.authorAvatar || '🌸' }}
          </view>
          <view class="flex-1">
            <text class="block text-sm font-700 text-app-ink">{{ item.authorName }}</text>
            <text class="block text-2xs text-app-muted">{{ formatDateTime(item.createdAt, { pattern: 'MM-DD HH:mm' }) }}</text>
          </view>
          <!-- 投票按钮 -->
          <AppButton
            variant="pill" size="none"
            :custom-class="'gap-1.5 px-3 py-1.5 ' + (item.hasVoted ? 'bg-[var(--color-mint)]/20 text-[var(--color-sage)]' : 'bg-[var(--color-surface)] text-app-muted')"
            hover-class="opacity-90" @tap="handleVote(item)"
          >
            <text>{{ item.hasVoted ? '✅' : '👍' }}</text>
            <text class="text-2xs font-700">{{ item.voteCount }}</text>
          </AppButton>
        </view>

        <!-- 内容 -->
        <text class="mt-3 block text-sm leading-7 text-app-ink">{{ item.content }}</text>

        <!-- 图片 -->
        <view v-if="item.images.length > 0" class="mt-3 flex gap-3">
          <image
            v-for="img in item.images.slice(0, 3)" :key="img.id"
            :src="img.compressedUrl || img.url" mode="aspectFill"
            class="h-[160rpx] w-[160rpx] rounded-[18rpx] bg-[var(--color-surface)]"
            @tap="previewImages(item.images, img.url)"
          />
        </view>

        <!-- 状态标签 -->
        <view v-if="item.status === 'pending'" class="mt-2">
          <text class="text-2xs text-amber-500">⏳ AI 审核中...</text>
        </view>
        <view v-if="item.reply" class="info-soft mt-3 bg-[var(--color-mint)]/10">
          <text class="block text-2xs font-700 text-[var(--color-sage)]">官方回复</text>
          <text class="mt-1 block text-sm text-app-ink">{{ item.reply.content }}</text>
        </view>

        <!-- 操作栏 -->
        <view class="mt-3 flex gap-3 border-t border-[var(--color-cream)]/30 pt-3">
          <AppButton
            variant="text" size="sm" custom-class="h-8 px-3 text-app-muted"
            hover-class="opacity-80" @tap="toggleExpand(item.id)"
          >
            💬 {{ item.comments?.length ?? 0 }} 条讨论
          </AppButton>
          <AppButton
            variant="text" size="sm" custom-class="h-8 px-3 text-app-muted"
            hover-class="opacity-80" @tap="toggleCommentInput(item.id)"
          >
            ✍️ 参与讨论
          </AppButton>
        </view>

        <!-- 评论列表 -->
        <view v-if="expandedId === item.id && item.comments && item.comments.length > 0" class="mt-3 flex flex-col gap-3">
          <view v-for="comment in item.comments" :key="comment.id"
            class="rounded-[18rpx] bg-[var(--color-cream)]/30 px-3 py-3"
          >
            <view class="flex items-center gap-2">
              <text class="text-2xs font-700 text-app-ink">{{ comment.authorName }}</text>
              <text class="text-3xs text-app-muted">{{ formatDateTime(comment.createdAt, { pattern: 'MM-DD HH:mm' }) }}</text>
            </view>
            <text class="mt-1 block text-sm text-app-ink">{{ comment.content }}</text>
          </view>
        </view>

        <!-- 评论输入 -->
        <view v-if="commentingId === item.id" class="mt-3 flex gap-3">
          <input v-model="commentContent" class="field-input-sm flex-1 dark:bg-slate-900 dark:text-slate-100"
            placeholder="写下你的想法..." :maxlength="200" confirm-type="done"
            @confirm="handleAddComment(item.id)" />
          <AppButton
            variant="card" size="sm" tone="mint" custom-class="h-[80rpx] min-h-[80rpx] rounded-[18rpx]"
            hover-class="opacity-90" :loading="isCommenting" @tap="handleAddComment(item.id)"
          >
            发送
          </AppButton>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="flex justify-center py-4">
        <AppButton
          variant="pill" size="none" custom-class="h-10 px-6 text-2xs bg-[var(--color-surface)] text-app-muted"
          hover-class="opacity-90" :loading="isLoading" @tap="loadFeedbacks()"
        >
          加载更多
        </AppButton>
      </view>
    </view>

    <AppBottomNav active-key="mine" />
  </view>

  <!-- 浮动反馈按钮 -->
  <view class="fixed bottom-[180rpx] right-6 z-50">
    <AppButton
      variant="pill" size="none"
      custom-class="h-[112rpx] w-[112rpx] text-[44rpx] bg-[var(--color-mint)] shadow-[0_12rpx_36rpx_rgba(138,216,197,0.40)]"
      hover-class="opacity-90" @tap="openNewFeedback"
    >
      💡
    </AppButton>
  </view>

  <!-- 新增反馈弹窗 -->
  <view v-if="showForm" class="fixed inset-0 z-60 flex items-end bg-slate-900/34 backdrop-blur-[6rpx]" @tap="showForm = false">
    <view class="max-h-[85vh] w-full rounded-t-[40rpx] bg-[var(--color-surface)] px-5 pb-8 pt-4 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] dark:bg-slate-900" @tap.stop>
      <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
      <text class="block text-xl font-800 text-app-ink dark:text-slate-100">提出你的想法</text>
      <text class="mt-1 block text-sm text-app-muted">你的建议会经过 AI 审核，合规后展示给所有花友。</text>

      <scroll-view scroll-y class="mt-4 max-h-[60vh] pr-1">
        <textarea v-model="newContent" class="field-textarea dark:bg-slate-900 dark:text-slate-100" :maxlength="1000"
          auto-height placeholder="比如：希望增加什么功能、哪个页面可以改进、或者任何让你更舒服的小想法。"
        />

        <view class="mt-3">
          <ImagePicker v-model="newImages" :max-count="3" upload-mode="cloud"
            asset-prefix="community-feedback" scope="record"
            add-text="添加配图" error-text="这张图片先休息一下" />
        </view>

        <text class="mt-4 block text-2xs text-app-muted/60">
          ⚠️ 提交后需经 AI 内容审核，通过后才会在社区中展示。请勿发表攻击性、广告或不相关内容。
        </text>
      </scroll-view>

      <view class="mt-4 flex gap-3">
        <button class="btn-pill-md flex-1 bg-slate-100 text-app-muted dark:bg-slate-800 dark:text-slate-200"
          hover-class="opacity-92" @tap="showForm = false">取消</button>
        <view class="flex-1">
          <SubmitBtn text="提交反馈" loading-text="AI 审核中..." :loading="isSubmitting" variant="mint" size="md"
            @click="handleSubmitFeedback" />
        </view>
      </view>
    </view>
  </view>
</template>
