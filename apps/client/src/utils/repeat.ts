import type { TimeInput } from './time'
import { toDate } from './time'

export interface ActionRecordLike {
  readonly targetId: string
  readonly actionType: string
  readonly createdAt: string
}

export interface RepeatCheckOptions {
  /**
   * 当前对象标识，例如植株 id。
   */
  readonly targetId: string
  /**
   * 当前操作类型，例如 watering。
   */
  readonly actionType: string
  /**
   * 重复校验窗口，单位小时。
   */
  readonly withinHours: number
  /**
   * 计算基准时间，默认取当前时间。
   */
  readonly now?: TimeInput
}

export function hasRepeatedActionWithinHours<TRecord extends ActionRecordLike>(
  records: ReadonlyArray<TRecord>,
  options: RepeatCheckOptions,
): boolean {
  const currentDate = toDate(options.now ?? Date.now())

  if (!currentDate || options.withinHours <= 0) {
    return false
  }

  const maxDiffInMs = options.withinHours * 60 * 60 * 1000

  return records.some(record => {
    if (record.targetId !== options.targetId || record.actionType !== options.actionType) {
      return false
    }

    const recordDate = toDate(record.createdAt)

    if (!recordDate) {
      return false
    }

    return currentDate.getTime() - recordDate.getTime() <= maxDiffInMs
  })
}
