import type { IFlower, IImageAsset } from '@florist/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Flower, FlowerImage, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createEntityId } from '../../common/utils/entity-id';
import { UpsertFlowerDto } from './dto/upsert-flower.dto';
import { UsersService } from '../users/users.service';

const FLOWER_RECYCLE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type FlowerWithImages = Flower & { images: FlowerImage[] };

export interface FlowerCenterResponse {
  flowers: IFlower[];
  recycleBin: IFlower[];
}

function normalizeOptionalString(value?: string): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : null;
}

function toIsoString(value: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

function mapImage(image: FlowerImage): IImageAsset {
  return {
    id: image.id,
    url: image.url,
    ...(image.compressedUrl ? { compressedUrl: image.compressedUrl } : {}),
    createdAt: image.createdAt.toISOString(),
  };
}

function mapFlower(flower: FlowerWithImages): IFlower {
  return {
    id: flower.id,
    name: flower.name,
    ...(flower.nickname ? { nickname: flower.nickname } : {}),
    category: flower.category as IFlower['category'],
    placement: flower.placement as IFlower['placement'],
    careDifficulty: flower.careDifficulty as IFlower['careDifficulty'],
    careStatus: flower.careStatus as IFlower['careStatus'],
    ...(toIsoString(flower.purchasedAt) ? { purchasedAt: flower.purchasedAt!.toISOString() } : {}),
    ...(typeof flower.priceInCents === 'number' ? { priceInCents: flower.priceInCents } : {}),
    ...(flower.note ? { note: flower.note } : {}),
    ...(flower.coverImageId ? { coverImageId: flower.coverImageId } : {}),
    images: flower.images.map(mapImage),
    ...(toIsoString(flower.lastWateredAt) ? { lastWateredAt: flower.lastWateredAt!.toISOString() } : {}),
    ...(toIsoString(flower.lastFertilizedAt) ? { lastFertilizedAt: flower.lastFertilizedAt!.toISOString() } : {}),
    createdAt: flower.createdAt.toISOString(),
    updatedAt: flower.updatedAt.toISOString(),
    isDeleted: flower.isDeleted,
    ...(toIsoString(flower.deletedAt) ? { deletedAt: flower.deletedAt!.toISOString() } : {}),
    ...(toIsoString(flower.pendingPurgeAt) ? { pendingPurgeAt: flower.pendingPurgeAt!.toISOString() } : {}),
    ...(flower.customCategoryId ? { customCategoryId: flower.customCategoryId } : {}),
    ...(flower.customPlacementId ? { customPlacementId: flower.customPlacementId } : {}),
    ...(flower.customCareDifficultyId ? { customCareDifficultyId: flower.customCareDifficultyId } : {}),
    ...(flower.customCareStatusId ? { customCareStatusId: flower.customCareStatusId } : {}),
  };
}

@Injectable()
export class FlowersService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveUserId(userIdInput?: string): Promise<string> {
    return this.usersService.resolveCurrentUserId(userIdInput);
  }

  public async getFlowerCenter(userIdInput?: string): Promise<FlowerCenterResponse> {
    const userId = await this.resolveUserId(userIdInput);
    await this.cleanupRecycleBinByUserId(userId);

    const flowers = await this.prisma.flower.findMany({
      where: { userId, isDeleted: false },
      include: { images: true },
      orderBy: { updatedAt: 'desc' },
    });

    const recycleBin = await this.prisma.flower.findMany({
      where: { userId, isDeleted: true },
      include: { images: true },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      flowers: flowers.map(mapFlower),
      recycleBin: recycleBin.map(mapFlower),
    };
  }

  public async getFlowerById(flowerId: string, userIdInput?: string): Promise<IFlower> {
    const userId = await this.resolveUserId(userIdInput);
    const flower = await this.prisma.flower.findFirst({
      where: { id: flowerId, userId },
      include: { images: true },
    });

    if (!flower) {
      throw new NotFoundException('植株不存在');
    }

    return mapFlower(flower);
  }

  public async upsertFlower(payload: UpsertFlowerDto, flowerId?: string, userIdInput?: string): Promise<IFlower> {
    const userId = await this.resolveUserId(userIdInput);
    const existingFlower = flowerId
      ? await this.prisma.flower.findFirst({ where: { id: flowerId, userId } })
      : null;
    const nextId = existingFlower?.id ?? createEntityId('flower');
    const now = new Date();

    const flowerData: Prisma.FlowerUncheckedCreateInput = {
      id: nextId,
      userId,
      name: payload.name.trim(),
      nickname: normalizeOptionalString(payload.nickname),
      category: payload.category,
      placement: payload.placement,
      careDifficulty: payload.careDifficulty,
      careStatus: payload.careStatus,
      purchasedAt: payload.purchasedAt ? new Date(payload.purchasedAt) : null,
      priceInCents: payload.priceInCents ?? null,
      note: normalizeOptionalString(payload.note),
      coverImageId: payload.coverImageId?.trim() || null,
      lastWateredAt: payload.lastWateredAt ? new Date(payload.lastWateredAt) : null,
      lastFertilizedAt: payload.lastFertilizedAt ? new Date(payload.lastFertilizedAt) : null,
      createdAt: existingFlower?.createdAt ?? now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
      pendingPurgeAt: null,
    };

    await this.prisma.$transaction(async (transaction) => {
      if (existingFlower) {
        await transaction.flower.update({
          where: { id: nextId },
          data: flowerData,
        });
        await transaction.flowerImage.deleteMany({ where: { flowerId: nextId } });
      }
      else {
        await transaction.flower.create({ data: flowerData });
      }

      if (payload.images.length > 0) {
        await transaction.flowerImage.createMany({
          data: payload.images.map(image => ({
            id: image.id || createEntityId('flower-image'),
            flowerId: nextId,
            url: image.url,
            compressedUrl: image.compressedUrl ?? null,
            createdAt: new Date(image.createdAt),
          })),
        });
      }
    });

    return this.getFlowerById(nextId, userId);
  }

  public async moveFlowerToRecycleBin(flowerId: string, userIdInput?: string): Promise<IFlower> {
    const userId = await this.resolveUserId(userIdInput);
    const flower = await this.prisma.flower.findFirst({ where: { id: flowerId, userId } });

    if (!flower) {
      throw new NotFoundException('植株不存在');
    }

    const deletedAt = new Date();

    await this.prisma.flower.update({
      where: { id: flowerId },
      data: {
        isDeleted: true,
        deletedAt,
        pendingPurgeAt: new Date(Date.now() + FLOWER_RECYCLE_RETENTION_MS),
        updatedAt: deletedAt,
      },
    });

    return this.getFlowerById(flowerId, userId);
  }

  public async listRecycleBin(userIdInput?: string): Promise<ReadonlyArray<IFlower>> {
    const userId = await this.resolveUserId(userIdInput);
    const recycleBin = await this.prisma.flower.findMany({
      where: { userId, isDeleted: true },
      include: { images: true },
      orderBy: { updatedAt: 'desc' },
    });

    return recycleBin.map(mapFlower);
  }

  public async restoreFlower(flowerId: string, userIdInput?: string): Promise<IFlower> {
    const userId = await this.resolveUserId(userIdInput);
    const flower = await this.prisma.flower.findFirst({
      where: { id: flowerId, userId, isDeleted: true },
    });

    if (!flower) {
      throw new NotFoundException('回收站中未找到该植株');
    }

    await this.prisma.flower.update({
      where: { id: flowerId },
      data: {
        isDeleted: false,
        deletedAt: null,
        pendingPurgeAt: null,
      },
    });

    return this.getFlowerById(flowerId, userId);
  }

  public async purgeFlower(flowerId: string, userIdInput?: string): Promise<{ removedId: string }> {
    const userId = await this.resolveUserId(userIdInput);
    const flower = await this.prisma.flower.findFirst({
      where: { id: flowerId, userId },
    });

    if (!flower) {
      throw new NotFoundException('植株不存在');
    }

    await this.prisma.flower.delete({ where: { id: flowerId } });

    return { removedId: flowerId };
  }

  public async syncFlowersBatch(
    payloads: ReadonlyArray<{
      id: string;
      createdAt: string;
      updatedAt?: string;
      isDeleted?: boolean;
      deletedAt?: string;
      pendingPurgeAt?: string;
    } & UpsertFlowerDto>,
    userIdInput?: string,
  ): Promise<FlowerCenterResponse> {
    const userId = await this.resolveUserId(userIdInput);

    await this.prisma.$transaction(async (transaction) => {
      for (const payload of payloads) {
        await transaction.flower.upsert({
          where: { id: payload.id },
          update: {
            userId,
            name: payload.name.trim(),
            nickname: normalizeOptionalString(payload.nickname),
            category: payload.category,
            placement: payload.placement,
            careDifficulty: payload.careDifficulty,
            careStatus: payload.careStatus,
            purchasedAt: payload.purchasedAt ? new Date(payload.purchasedAt) : null,
            priceInCents: payload.priceInCents ?? null,
            note: normalizeOptionalString(payload.note),
            coverImageId: payload.coverImageId?.trim() || null,
            lastWateredAt: payload.lastWateredAt ? new Date(payload.lastWateredAt) : null,
            lastFertilizedAt: payload.lastFertilizedAt ? new Date(payload.lastFertilizedAt) : null,
            updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date(),
            isDeleted: payload.isDeleted ?? false,
            deletedAt: payload.deletedAt ? new Date(payload.deletedAt) : null,
            pendingPurgeAt: payload.pendingPurgeAt ? new Date(payload.pendingPurgeAt) : null,
          },
          create: {
            id: payload.id,
            userId,
            name: payload.name.trim(),
            nickname: normalizeOptionalString(payload.nickname),
            category: payload.category,
            placement: payload.placement,
            careDifficulty: payload.careDifficulty,
            careStatus: payload.careStatus,
            purchasedAt: payload.purchasedAt ? new Date(payload.purchasedAt) : null,
            priceInCents: payload.priceInCents ?? null,
            note: normalizeOptionalString(payload.note),
            coverImageId: payload.coverImageId?.trim() || null,
            lastWateredAt: payload.lastWateredAt ? new Date(payload.lastWateredAt) : null,
            lastFertilizedAt: payload.lastFertilizedAt ? new Date(payload.lastFertilizedAt) : null,
            createdAt: new Date(payload.createdAt),
            updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date(payload.createdAt),
            isDeleted: payload.isDeleted ?? false,
            deletedAt: payload.deletedAt ? new Date(payload.deletedAt) : null,
            pendingPurgeAt: payload.pendingPurgeAt ? new Date(payload.pendingPurgeAt) : null,
          },
        });

        await transaction.flowerImage.deleteMany({ where: { flowerId: payload.id } });

        if (payload.images.length > 0) {
          await transaction.flowerImage.createMany({
            data: payload.images.map(image => ({
              id: image.id || createEntityId('flower-image'),
              flowerId: payload.id,
              url: image.url,
              compressedUrl: image.compressedUrl ?? null,
              createdAt: new Date(image.createdAt),
            })),
          });
        }
      }
    });

    return this.getFlowerCenter(userId);
  }

  public async cleanupRecycleBin(userIdInput?: string): Promise<void> {
    const userId = await this.resolveUserId(userIdInput);
    await this.cleanupRecycleBinByUserId(userId);
  }

  private async cleanupRecycleBinByUserId(userId: string): Promise<void> {

    await this.prisma.flower.deleteMany({
      where: {
        userId,
        isDeleted: true,
        pendingPurgeAt: {
          lte: new Date(),
        },
      },
    });
  }
}
