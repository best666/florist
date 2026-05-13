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
    images: flower.images.map(mapImage),
    ...(toIsoString(flower.lastWateredAt) ? { lastWateredAt: flower.lastWateredAt!.toISOString() } : {}),
    ...(toIsoString(flower.lastFertilizedAt) ? { lastFertilizedAt: flower.lastFertilizedAt!.toISOString() } : {}),
    createdAt: flower.createdAt.toISOString(),
    updatedAt: flower.updatedAt.toISOString(),
    isDeleted: flower.isDeleted,
    ...(toIsoString(flower.deletedAt) ? { deletedAt: flower.deletedAt!.toISOString() } : {}),
    ...(toIsoString(flower.pendingPurgeAt) ? { pendingPurgeAt: flower.pendingPurgeAt!.toISOString() } : {}),
  };
}

@Injectable()
export class FlowersService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  public async getFlowerCenter(): Promise<FlowerCenterResponse> {
    const userId = await this.usersService.ensureDefaultUserId();

    await this.cleanupRecycleBin();

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

  public async getFlowerById(flowerId: string): Promise<IFlower> {
    const userId = await this.usersService.ensureDefaultUserId();
    const flower = await this.prisma.flower.findFirst({
      where: { id: flowerId, userId },
      include: { images: true },
    });

    if (!flower) {
      throw new NotFoundException('植株不存在');
    }

    return mapFlower(flower);
  }

  public async upsertFlower(payload: UpsertFlowerDto, flowerId?: string): Promise<IFlower> {
    const userId = await this.usersService.ensureDefaultUserId();
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

    return this.getFlowerById(nextId);
  }

  public async moveFlowerToRecycleBin(flowerId: string): Promise<IFlower> {
    const userId = await this.usersService.ensureDefaultUserId();
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

    return this.getFlowerById(flowerId);
  }

  public async cleanupRecycleBin(): Promise<void> {
    const userId = await this.usersService.ensureDefaultUserId();

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
