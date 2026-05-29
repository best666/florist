import type { IImageAsset, IsoDateTimeString, PriceInCents } from './common'
import type {
  FlowerCareDifficulty,
  FlowerCategory,
  FlowerPlacement,
} from '../enums'

export type FlowerHealthStatus =
  | 'watering-needed'
  | 'healthy'
  | 'dormant'
  | 'fertilizing-needed'

/**
 * 植株档案实体，适用于前端页面消费、缓存持久化和后端接口返回。
 */
export interface IFlower {
  /** 植株唯一标识。 */
  readonly id: string
  /** 植株名称，如“龟背竹”。 */
  readonly name: string
  /** 用户自定义昵称。 */
  readonly nickname?: string
  /** 植株品类。 */
  readonly category: FlowerCategory
  /** 植株摆放位置。 */
  readonly placement: FlowerPlacement
  /** 养护难度。 */
  readonly careDifficulty: FlowerCareDifficulty
  /** 当前养护状态。 */
  readonly careStatus: FlowerHealthStatus
  /** 购入时间。 */
  readonly purchasedAt?: IsoDateTimeString
  /** 购入价格，单位为分。 */
  readonly priceInCents?: PriceInCents
  /** 补充备注。 */
  readonly note?: string
  /** 封面图片 ID，指向 images 中的一张图片。未设置时取首张。 */
  readonly coverImageId?: string
  /** 植株展示 emoji，未设置时按品类/名称自动匹配。 */
  readonly emoji?: string
  /** 植株图片列表。 */
  readonly images: ReadonlyArray<IImageAsset>
  /** 最近浇水时间。 */
  readonly lastWateredAt?: IsoDateTimeString
  /** 最近施肥时间。 */
  readonly lastFertilizedAt?: IsoDateTimeString
  /** 创建时间。 */
  readonly createdAt: IsoDateTimeString
  /** 更新时间。 */
  readonly updatedAt: IsoDateTimeString
  /** 逻辑删除状态。 */
  readonly isDeleted: boolean
  /** 删除时间。 */
  readonly deletedAt?: IsoDateTimeString
  /** 待清理时间。 */
  readonly pendingPurgeAt?: IsoDateTimeString
}
