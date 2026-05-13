import type { IImageAsset, IsoDateTimeString } from './common'
import type { RecordActionType } from '../enums'

/**
 * 养护记录实体，对应前后端记录流和时间轴展示。
 */
export interface IRecord {
  /** 记录唯一标识。 */
  readonly id: string
  /** 关联植株 id。 */
  readonly flowerId: string
  /** 养护操作类型。 */
  readonly actionType: RecordActionType
  /** 备注内容。 */
  readonly note?: string
  /** 记录附带图片。 */
  readonly images: ReadonlyArray<IImageAsset>
  /** 记录创建时间。 */
  readonly createdAt: IsoDateTimeString
}
