import type { CommunityFeedbackResponse, IFeedback, IImageAsset } from '@florist/contracts'
import { http } from '@/utils/request'

export interface CreateFeedbackPayload {
  content: string
  images: ReadonlyArray<IImageAsset>
}

export function fetchCommunityFeedbacks(params: {
  sort?: 'votes' | 'newest'
  cursor?: string
  limit: number
}): Promise<CommunityFeedbackResponse> {
  return http.get<CommunityFeedbackResponse>('/feedback/community', params, {
    showLoading: false,
    skipErrorToast: true,
  })
}

export function fetchCommunityFeedbackDetail(id: string): Promise<IFeedback> {
  return http.get<IFeedback>(`/feedback/community/${id}`, undefined, {
    showLoading: false,
    skipErrorToast: true,
  })
}

export function createFeedback(payload: CreateFeedbackPayload): Promise<IFeedback> {
  return http.post<IFeedback, CreateFeedbackPayload>('/feedback', payload, {
    showLoading: true,
    loadingText: '提交中...',
  })
}

export function voteFeedback(feedbackId: string): Promise<{ voteCount: number; hasVoted: boolean }> {
  return http.post<{ voteCount: number; hasVoted: boolean }, undefined>(
    `/feedback/${feedbackId}/vote`,
    undefined,
    { showLoading: false, skipErrorToast: true },
  )
}

export function addComment(feedbackId: string, content: string): Promise<IFeedback> {
  return http.post<IFeedback, { content: string }>(
    `/feedback/${feedbackId}/comments`,
    { content },
    { showLoading: false, skipErrorToast: true },
  )
}
