import { RecordActionType, type IImageAsset, type IRecord } from '@florist/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { CareRecord, CareRecordImage, Prisma, RecordUndoLog } from '@prisma/client';
import { createEntityId } from '../../common/utils/entity-id';
import { FlowersService } from '../flowers/flowers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { SyncRecordDto } from './dto/sync-record.dto';
import { UsersService } from '../users/users.service';

const RECORD_UNDO_WINDOW_MS = 5 * 60 * 1000;

type RecordWithImages = CareRecord & { images: CareRecordImage[] };

export interface RecordUndoLogResponse {
  id: string;
  recordId: string;
  flowerId: string;
  actionType: string;
  revertedAt: string;
  originalCreatedAt: string;
  note?: string;
}

export interface RecordCenterResponse {
  records: IRecord[];
  undoLogs: RecordUndoLogResponse[];
}

function normalizeOptionalString(value?: string): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : null;
}

function mapImage(image: CareRecordImage): IImageAsset {
  return {
    id: image.id,
    url: image.url,
    ...(image.compressedUrl ? { compressedUrl: image.compressedUrl } : {}),
    createdAt: image.createdAt.toISOString(),
  };
}

function mapRecord(record: RecordWithImages): IRecord {
  return {
    id: record.id,
    flowerId: record.flowerId,
    actionType: record.actionType as RecordActionType,
    ...(record.note ? { note: record.note } : {}),
    images: record.images.map(mapImage),
    cooldownMinutes: record.cooldownMinutes,
    createdAt: record.createdAt.toISOString(),
  };
}

function mapUndoLog(log: RecordUndoLog): RecordUndoLogResponse {
  return {
    id: log.id,
    recordId: log.recordId,
    flowerId: log.flowerId,
    actionType: log.actionType,
    revertedAt: log.revertedAt.toISOString(),
    originalCreatedAt: log.originalCreatedAt.toISOString(),
    ...(log.note ? { note: log.note } : {}),
  };
}

@Injectable()
export class RecordsService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly flowersService: FlowersService,
    private readonly usersService: UsersService,
  ) {}

  public async getRecordCenter(userIdInput?: string): Promise<RecordCenterResponse> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const [records, undoLogs] = await Promise.all([
      this.prisma.careRecord.findMany({
        where: { userId },
        include: { images: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recordUndoLog.findMany({
        where: { userId },
        orderBy: { revertedAt: 'desc' },
      }),
    ]);

    return {
      records: records.map(mapRecord),
      undoLogs: undoLogs.map(mapUndoLog),
    };
  }

  public async addRecord(payload: CreateRecordDto, userIdInput?: string): Promise<IRecord> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    await this.flowersService.getFlowerById(payload.flowerId, userId);

    const recordId = createEntityId('record');
    const createdAt = new Date();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.careRecord.create({
        data: {
          id: recordId,
          userId,
          flowerId: payload.flowerId,
          actionType: payload.actionType,
          note: normalizeOptionalString(payload.note),
          cooldownMinutes: payload.cooldownMinutes,
          createdAt,
        },
      });

      if (payload.images.length > 0) {
        await transaction.careRecordImage.createMany({
          data: payload.images.map(image => ({
            id: image.id || createEntityId('record-image'),
            recordId,
            url: image.url,
            compressedUrl: image.compressedUrl ?? null,
            createdAt: new Date(image.createdAt),
          })),
        });
      }

      if (payload.actionType === RecordActionType.Watering) {
        await transaction.flower.update({
          where: { id: payload.flowerId },
          data: {
            lastWateredAt: createdAt,
            careStatus: 'healthy',
            updatedAt: createdAt,
          },
        });
      }

      if (payload.actionType === RecordActionType.Fertilizing) {
        await transaction.flower.update({
          where: { id: payload.flowerId },
          data: {
            lastFertilizedAt: createdAt,
            careStatus: 'healthy',
            updatedAt: createdAt,
          },
        });
      }
    });

    const record = await this.prisma.careRecord.findUnique({
      where: { id: recordId },
      include: { images: true },
    });

    if (!record) {
      throw new NotFoundException('养护记录创建失败');
    }

    return mapRecord(record);
  }

  public async undoRecord(recordId: string, userIdInput?: string): Promise<{ succeeded: boolean, center: RecordCenterResponse }> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const targetRecord = await this.prisma.careRecord.findFirst({
      where: { id: recordId, userId },
      include: { images: true },
    });

    if (!targetRecord) {
      return {
        succeeded: false,
        center: await this.getRecordCenter(userId),
      };
    }

    if (Date.now() - targetRecord.createdAt.getTime() > RECORD_UNDO_WINDOW_MS) {
      return {
        succeeded: false,
        center: await this.getRecordCenter(userId),
      };
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.recordUndoLog.create({
        data: {
          id: createEntityId('undo'),
          userId,
          recordId: targetRecord.id,
          flowerId: targetRecord.flowerId,
          actionType: targetRecord.actionType,
          revertedAt: new Date(),
          originalCreatedAt: targetRecord.createdAt,
          note: targetRecord.note,
        },
      });

      await transaction.careRecordImage.deleteMany({ where: { recordId } });
      await transaction.careRecord.delete({ where: { id: recordId } });

      if (
        targetRecord.actionType === RecordActionType.Watering
        || targetRecord.actionType === RecordActionType.Fertilizing
      ) {
        const latestWatering = await transaction.careRecord.findFirst({
          where: {
            userId,
            flowerId: targetRecord.flowerId,
            actionType: RecordActionType.Watering,
          },
          orderBy: { createdAt: 'desc' },
        });
        const latestFertilizing = await transaction.careRecord.findFirst({
          where: {
            userId,
            flowerId: targetRecord.flowerId,
            actionType: RecordActionType.Fertilizing,
          },
          orderBy: { createdAt: 'desc' },
        });

        await transaction.flower.update({
          where: { id: targetRecord.flowerId },
          data: {
            lastWateredAt: latestWatering?.createdAt ?? null,
            lastFertilizedAt: latestFertilizing?.createdAt ?? null,
            updatedAt: new Date(),
          },
        });
      }
    });

    return {
      succeeded: true,
      center: await this.getRecordCenter(userId),
    };
  }

  public async syncRecordsBatch(
    payloads: ReadonlyArray<SyncRecordDto>,
    userIdInput?: string,
  ): Promise<RecordCenterResponse> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);

    await this.prisma.$transaction(async (transaction) => {
      for (const payload of payloads) {
        await this.flowersService.getFlowerById(payload.flowerId, userId);

        await transaction.careRecord.upsert({
          where: { id: payload.id },
          update: {
            userId,
            flowerId: payload.flowerId,
            actionType: payload.actionType,
            note: normalizeOptionalString(payload.note),
            cooldownMinutes: payload.cooldownMinutes,
            createdAt: new Date(payload.createdAt),
          },
          create: {
            id: payload.id,
            userId,
            flowerId: payload.flowerId,
            actionType: payload.actionType,
            note: normalizeOptionalString(payload.note),
            cooldownMinutes: payload.cooldownMinutes,
            createdAt: new Date(payload.createdAt),
          },
        });

        await transaction.careRecordImage.deleteMany({ where: { recordId: payload.id } });

        if (payload.images.length > 0) {
          await transaction.careRecordImage.createMany({
            data: payload.images.map(image => ({
              id: image.id || createEntityId('record-image'),
              recordId: payload.id,
              url: image.url,
              compressedUrl: image.compressedUrl ?? null,
              createdAt: new Date(image.createdAt),
            })),
          });
        }
      }
    });

    return this.getRecordCenter(userId);
  }
}
