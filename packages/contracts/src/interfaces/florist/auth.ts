import type { IsoDateTimeString } from './common'
import type { IUser } from './user'
import type { UserLoginType } from '../enums'

/**
 * 登录成功后返回的用户会话结构。
 */
export interface IUserAuthSession {
  /** 当前登录用户。 */
  readonly user: IUser
  /** 本次登录来源。 */
  readonly loginType: UserLoginType
  /** 当前会话使用的用户标识，前端后续请求可放入 x-user-id。 */
  readonly sessionUserId: string
  /** 是否首次创建。 */
  readonly isNewUser: boolean
  /** 登录时间。 */
  readonly loggedInAt: IsoDateTimeString
}
