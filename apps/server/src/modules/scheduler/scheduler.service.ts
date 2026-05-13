import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { createEntityId } from '../../common/utils/entity-id';
import { UpsertReminderConfigDto } from './dto/upsert-reminder-config.dto';

const DEFAULT_REMINDER_CONFIG_ID = 'default';

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
  public constructor(private readonly prisma: PrismaService) {}

  public async getReminderConfig(): Promise<ReminderConfigResponse> {
    const config = await this.prisma.reminderConfig.findUnique({
      where: { id: DEFAULT_REMINDER_CONFIG_ID },
    });

    if (!config) {
      return {
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
    return this.prisma.reminderPushLog.findMany({
      orderBy: { triggeredAt: 'desc' },
      take: 10,
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  public async scanReminderJobs(): Promise<void> {
    const config = await this.getReminderConfig();

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
}
