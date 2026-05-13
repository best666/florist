import type { IsoDateTimeString } from './common'
import type { UserStatus } from '../enums'

/**
 * 用户基础信息实体，适配前端用户态与后端基础资料接口。
 */
export interface IUser {
  /** 用户唯一标识。 */
  readonly id: string
  /** 用户昵称。 */
  readonly nickname: string
  /** 用户头像地址。 */
  readonly avatarUrl?: string
  /** 绑定城市，可用于默认天气查询。 */
  readonly city?: string
  /** 手机号脱敏展示值。 */
  readonly phoneMasked?: string
  /** 用户状态。 */
  readonly status: UserStatus
  /** 创建时间。 */
  readonly createdAt: IsoDateTimeString
  /** 更新时间。 */
  readonly updatedAt: IsoDateTimeString
}
