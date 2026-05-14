import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { createEntityId } from '../../common/utils/entity-id';
import { UpsertReminderConfigDto } from './dto/upsert-reminder-config.dto';

const DEFAULT_REMINDER_CONFIG_ID = 'default';
const DATABASE_FALLBACK_LOG_TTL_MS = 60 * 1000;

export interface ReminderConfigResponse {
  enabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  quietHours: {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  };
  reminderText: string;
  lastTriggeredDate: string | null;
}

const DEFAULT_REMINDER_CONFIG: ReminderConfigResponse = {
  enabled: false,
  reminderHour: 9,
  reminderMinute: 0,
  quietHours: {
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
  },
  reminderText: '今天也来看看小植物吧，轻轻浇水、擦叶或记录一下状态。',
  lastTriggeredDate: null,
};

function isWithinQuietHours(config: ReminderConfigResponse, currentDate = new Date()): boolean {
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const startMinutes = config.quietHours.startHour * 60 + config.quietHours.startMinute;
  const endMinutes = config.quietHours.endHour * 60 + config.quietHours.endMinute;

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly databaseFallbackLogTimestamps = new Map<string, number>();

  public constructor(private readonly prisma: PrismaService) {}

  private isDatabaseUnavailableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const errorMessage = error.message.toLowerCase();

    if (
      errorMessage.includes('pool timeout')
      || errorMessage.includes('econnrefused')
      || errorMessage.includes('can\'t reach database server')
      || errorMessage.includes('p1001')
    ) {
      return true;
    }

    const errorCause = error as Error & { cause?: { message?: string } };
    const causeMessage = errorCause.cause?.message?.toLowerCase();

    return Boolean(
      causeMessage
      && (causeMessage.includes('pool timeout')
        || causeMessage.includes('econnrefused')
        || causeMessage.includes('can\'t reach database server')),
    );
  }

  private logDatabaseFallback(action: string, error: unknown): void {
    const now = Date.now();
    const lastLoggedAt = this.databaseFallbackLogTimestamps.get(action) ?? 0;

    if (now - lastLoggedAt < DATABASE_FALLBACK_LOG_TTL_MS) {
      return;
    }

    this.databaseFallbackLogTimestamps.set(action, now);
    const detail = error instanceof Error ? error.message : 'unknown error';
    this.logger.warn(`${action} 降级为默认值: ${detail}`);
  }

  public async getReminderConfig(): Promise<ReminderConfigResponse> {
    try {
      const config = await this.prisma.reminderConfig.findUnique({
        where: { id: DEFAULT_REMINDER_CONFIG_ID },
      });

      if (!config) {
        return DEFAULT_REMINDER_CONFIG;
      }

      return {
        enabled: config.enabled,
        reminderHour: config.reminderHour,
        reminderMinute: config.reminderMinute,
        quietHours: {
          startHour: config.quietStartHour,
          startMinute: config.quietStartMinute,
          endHour: config.quietEndHour,
          endMinute: config.quietEndMinute,
        },
        reminderText: config.reminderText,
        lastTriggeredDate: config.lastTriggeredDate,
      };
    }
    catch (error) {
      if (!this.isDatabaseUnavailableError(error)) {
        throw error;
      }

      this.logDatabaseFallback('读取提醒配置', error);
      return DEFAULT_REMINDER_CONFIG;
    }
  }

  public async upsertReminderConfig(payload: UpsertReminderConfigDto): Promise<ReminderConfigResponse> {
    await this.prisma.reminderConfig.upsert({
      where: { id: DEFAULT_REMINDER_CONFIG_ID },
      update: {
        enabled: payload.enabled,
        reminderHour: payload.reminderHour,
        reminderMinute: payload.reminderMinute,
        quietStartHour: payload.quietStartHour,
        quietStartMinute: payload.quietStartMinute,
        quietEndHour: payload.quietEndHour,
        quietEndMinute: payload.quietEndMinute,
        reminderText: payload.reminderText,
        lastTriggeredDate: payload.lastTriggeredDate ?? null,
      },
      create: {
        id: DEFAULT_REMINDER_CONFIG_ID,
        enabled: payload.enabled,
        reminderHour: payload.reminderHour,
        reminderMinute: payload.reminderMinute,
        quietStartHour: payload.quietStartHour,
        quietStartMinute: payload.quietStartMinute,
        quietEndHour: payload.quietEndHour,
        quietEndMinute: payload.quietEndMinute,
        reminderText: payload.reminderText,
        lastTriggeredDate: payload.lastTriggeredDate ?? null,
      },
    });

    return this.getReminderConfig();
  }

  public async getRecentPushLogs() {
    try {
      return await this.prisma.reminderPushLog.findMany({
        orderBy: { triggeredAt: 'desc' },
        take: 10,
      });
    }
    catch (error) {
      if (!this.isDatabaseUnavailableError(error)) {
        throw error;
      }

      this.logDatabaseFallback('读取提醒日志', error);
      return [];
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  public async scanReminderJobs(): Promise<void> {
    let config: ReminderConfigResponse;

    try {
      config = await this.getReminderConfig();
    }
    catch (error) {
      if (!this.isDatabaseUnavailableError(error)) {
        throw error;
      }

      this.logDatabaseFallback('扫描提醒任务', error);
      return;
    }

    if (!config.enabled || isWithinQuietHours(config)) {
      return;
    }

    const currentDate = new Date();
    const currentKey = currentDate.toISOString().slice(0, 10);

    if (
      config.lastTriggeredDate === currentKey
      || currentDate.getHours() !== config.reminderHour
      || currentDate.getMinutes() < config.reminderMinute
    ) {
      return;
    }

    try {
      await this.prisma.$transaction([
        this.prisma.reminderPushLog.create({
          data: {
            id: createEntityId('push-log'),
            reminderConfigId: DEFAULT_REMINDER_CONFIG_ID,
            triggeredAt: currentDate,
            message: config.reminderText,
            status: 'logged',
          },
        }),
        this.prisma.reminderConfig.upsert({
          where: { id: DEFAULT_REMINDER_CONFIG_ID },
          update: { lastTriggeredDate: currentKey },
          create: {
            id: DEFAULT_REMINDER_CONFIG_ID,
            enabled: config.enabled,
            reminderHour: config.reminderHour,
            reminderMinute: config.reminderMinute,
            quietStartHour: config.quietHours.startHour,
            quietStartMinute: config.quietHours.startMinute,
            quietEndHour: config.quietHours.endHour,
            quietEndMinute: config.quietHours.endMinute,
            reminderText: config.reminderText,
            lastTriggeredDate: currentKey,
          },
        }),
      ]);
    }
    catch (error) {
      if (!this.isDatabaseUnavailableError(error)) {
        throw error;
      }

      this.logDatabaseFallback('写入提醒任务日志', error);
    }
  }
}
