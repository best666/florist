import { http } from '@/utils/request'
import type { LocalReminderConfig } from '@/interfaces'

interface SchedulerReminderConfigResponse {
  enabled: boolean
  reminderHour: number
  reminderMinute: number
  quietHours: {
    startHour: number
    startMinute: number
    endHour: number
    endMinute: number
  }
  reminderText: string
  lastTriggeredDate: string | null
}

function mapSchedulerReminderConfig(
  response: SchedulerReminderConfigResponse,
): LocalReminderConfig {
  return {
    enabled: response.enabled,
    reminderHour: response.reminderHour,
    reminderMinute: response.reminderMinute,
    quietHours: response.quietHours,
    reminderText: response.reminderText,
    lastTriggeredDate: response.lastTriggeredDate,
  }
}

export function fetchReminderConfig(): Promise<LocalReminderConfig> {
  return http.get<SchedulerReminderConfigResponse>('/scheduler/reminder-config', undefined, {
    showLoading: false,
    skipErrorToast: true,
  }).then(mapSchedulerReminderConfig)
}

export function updateReminderConfigOnServer(payload: LocalReminderConfig): Promise<LocalReminderConfig> {
  return http.put<SchedulerReminderConfigResponse, {
    enabled: boolean
    reminderHour: number
    reminderMinute: number
    quietStartHour: number
    quietStartMinute: number
    quietEndHour: number
    quietEndMinute: number
    reminderText: string
    lastTriggeredDate: string | null
  }>('/scheduler/reminder-config', {
    enabled: payload.enabled,
    reminderHour: payload.reminderHour,
    reminderMinute: payload.reminderMinute,
    quietStartHour: payload.quietHours.startHour,
    quietStartMinute: payload.quietHours.startMinute,
    quietEndHour: payload.quietHours.endHour,
    quietEndMinute: payload.quietHours.endMinute,
    reminderText: payload.reminderText,
    lastTriggeredDate: payload.lastTriggeredDate,
  }, {
    showLoading: false,
    skipErrorToast: true,
    cancelDuplicate: true,
  }).then(mapSchedulerReminderConfig)
}
