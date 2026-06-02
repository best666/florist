import type { TaxonomyType } from '../enums'

/** 可自定义的分类选项 */
export interface IFlowerTaxonomyItem {
  readonly id: string
  readonly type: TaxonomyType
  readonly label: string
  readonly baseValue: string
  readonly sortOrder: number
  readonly createdAt: string
  readonly updatedAt: string
}
