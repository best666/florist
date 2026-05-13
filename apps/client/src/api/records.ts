import type { IRecord, RecordActionType } from '@florist/contracts'
import { http } from '@/utils/request'
import type { LocalRecord, RecordFormValues, RecordUndoLog } from '@/interfaces'

export interface RecordCenterResponse {
  records: LocalRecord[]
  undoLogs: RecordUndoLog[]
}

export interface UndoRecordResponse {
  succeeded: boolean
  center: RecordCenterResponse
}

export function fetchRecordCenter(): Promise<RecordCenterResponse> {
  return http.get<RecordCenterResponse>('/records', undefined, {
    showLoading: false,
    skipErrorToast: true,
  })
}

export function createRecord(payload: RecordFormValues): Promise<IRecord> {
  return http.post<IRecord, RecordFormValues>('/records', payload, {
    loadingText: '正在记录打卡',
    skipErrorToast: true,
  })
}

export function undoRecord(recordId: string): Promise<UndoRecordResponse> {
  return http.post<UndoRecordResponse>(`/records/${recordId}/undo`, undefined, {
    loadingText: '正在撤回记录',
    skipErrorToast: true,
  })
}
