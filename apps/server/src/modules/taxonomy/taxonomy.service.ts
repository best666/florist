import type { IFlowerTaxonomyItem } from '@florist/contracts'
import { TaxonomyType } from '@florist/contracts'
import { Injectable, NotFoundException } from '@nestjs/common'
import type { TaxonomyItem } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { createEntityId } from '../../common/utils/entity-id'
import type { CreateTaxonomyItemDto, UpdateTaxonomyItemDto, SyncTaxonomyItemDto } from './dto/taxonomy.dto'

function mapItem(item: TaxonomyItem): IFlowerTaxonomyItem {
  return {
    id: item.id,
    type: item.type as TaxonomyType,
    label: item.label,
    baseValue: item.baseValue,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async listItems(userId: string, type?: TaxonomyType): Promise<IFlowerTaxonomyItem[]> {
    const items = await this.prisma.taxonomyItem.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { sortOrder: 'asc' },
    })
    return items.map(mapItem)
  }

  async createItem(userId: string, dto: CreateTaxonomyItemDto): Promise<IFlowerTaxonomyItem> {
    const item = await this.prisma.taxonomyItem.create({
      data: {
        id: createEntityId('tax'),
        userId,
        type: dto.type,
        label: dto.label.trim(),
        baseValue: dto.baseValue,
        sortOrder: dto.sortOrder ?? 0,
      },
    })
    return mapItem(item)
  }

  async updateItem(id: string, userId: string, dto: UpdateTaxonomyItemDto): Promise<IFlowerTaxonomyItem> {
    const existing = await this.prisma.taxonomyItem.findFirst({ where: { id, userId } })
    if (!existing) throw new NotFoundException('分类选项不存在')

    const item = await this.prisma.taxonomyItem.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.baseValue !== undefined ? { baseValue: dto.baseValue } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    })
    return mapItem(item)
  }

  async deleteItem(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.taxonomyItem.findFirst({ where: { id, userId } })
    if (!existing) throw new NotFoundException('分类选项不存在')

    // 删除分类项，同时清空引用该分类的 Flower 上的 custom*Id
    const type = existing.type as TaxonomyType
    const nullField: Record<string, null> = {}

    switch (type) {
      case TaxonomyType.Category:
        nullField.customCategoryId = null
        break
      case TaxonomyType.Placement:
        nullField.customPlacementId = null
        break
      case TaxonomyType.Difficulty:
        nullField.customCareDifficultyId = null
        break
      case TaxonomyType.Status:
        nullField.customCareStatusId = null
        break
    }

    await this.prisma.$transaction([
      this.prisma.flower.updateMany({
        where: { userId },
        data: nullField,
      }),
      this.prisma.taxonomyItem.delete({ where: { id } }),
    ])
  }

  async syncBatch(userId: string, items: SyncTaxonomyItemDto[]): Promise<IFlowerTaxonomyItem[]> {
    const results: IFlowerTaxonomyItem[] = []

    for (const dto of items) {
      const existing = await this.prisma.taxonomyItem.findFirst({ where: { id: dto.id, userId } })
      const item = existing
        ? await this.prisma.taxonomyItem.update({
          where: { id: dto.id },
          data: { label: dto.label.trim(), baseValue: dto.baseValue, sortOrder: dto.sortOrder ?? 0 },
        })
        : await this.prisma.taxonomyItem.create({
          data: {
            id: dto.id,
            userId,
            type: dto.type,
            label: dto.label.trim(),
            baseValue: dto.baseValue,
            sortOrder: dto.sortOrder ?? 0,
          },
        })
      results.push(mapItem(item))
    }

    return results
  }
}
