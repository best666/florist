import type { IFlowerTaxonomyItem, TaxonomyType } from '@florist/contracts'
import { http } from '@/utils/request'

export function fetchTaxonomyItems(type?: TaxonomyType): Promise<IFlowerTaxonomyItem[]> {
  return http.get<IFlowerTaxonomyItem[]>('/taxonomy', type ? { type } : undefined, {
    showLoading: false,
    skipErrorToast: true,
  })
}

export function createTaxonomyItem(dto: {
  type: TaxonomyType
  label: string
  baseValue: string
  sortOrder?: number
}): Promise<IFlowerTaxonomyItem> {
  return http.post<IFlowerTaxonomyItem>('/taxonomy', dto, {
    skipErrorToast: true,
  })
}

export function updateTaxonomyItem(
  id: string,
  dto: { label?: string; baseValue?: string; sortOrder?: number },
): Promise<IFlowerTaxonomyItem> {
  return http.post<IFlowerTaxonomyItem>(`/taxonomy/${id}`, dto, {
    skipErrorToast: true,
  })
}

export function deleteTaxonomyItem(id: string): Promise<void> {
  return http.post<void>(`/taxonomy/${id}/delete`, undefined, {
    skipErrorToast: true,
  })
}

export function syncTaxonomyItems(
  items: Array<{
    id: string
    type: TaxonomyType
    label: string
    baseValue: string
    sortOrder?: number
  }>,
): Promise<IFlowerTaxonomyItem[]> {
  return http.post<IFlowerTaxonomyItem[], Array<Record<string, unknown>>>('/taxonomy/sync', items as unknown as Record<string, unknown>[], {
    skipErrorToast: true,
  })
}
