import { createHash } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ServerEnvConfig } from '../../config/server-env';
import { createEntityId } from '../utils/entity-id';
import { PrismaService } from '../../modules/prisma/prisma.service';

interface ProxyLogPayload {
  scope: string;
  endpoint: string;
  userId?: string;
  requestHash?: string;
  cacheHit?: boolean;
  success: boolean;
  statusCode: number;
  durationMs: number;
  quotaCost?: number;
  upstreamProvider?: string;
  errorMessage?: string;
}

@Injectable()
export class RequestMonitorService {
  private readonly logger = new Logger(RequestMonitorService.name);
  private readonly appEnv: ServerEnvConfig;

  public constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.appEnv = configService.getOrThrow<ServerEnvConfig>('app');
  }

  public createPayloadHash(scope: string, payload: unknown): string {
    return createHash('sha256')
      .update(`${scope}:${JSON.stringify(payload)}`)
      .digest('hex');
  }

  public async ensureAiQuota(userId: string, scope: string, cost = 1): Promise<void> {
    const dateKey = new Date().toISOString().slice(0, 10);
    const quotaId = `${userId}:${scope}:${dateKey}`;

    const currentQuota = await this.prisma.aiDailyQuota.findUnique({
      where: { id: quotaId },
    });
    const nextUsedCount = (currentQuota?.usedCount ?? 0) + cost;

    if (nextUsedCount > this.appEnv.aiDailyQuota) {
      throw new HttpException('今日 AI 调用额度已用完，请明天再试', HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.prisma.aiDailyQuota.upsert({
      where: { id: quotaId },
      update: {
        usedCount: nextUsedCount,
        limitCount: this.appEnv.aiDailyQuota,
      },
      create: {
        id: quotaId,
        userId,
        scope,
        dateKey,
        usedCount: cost,
        limitCount: this.appEnv.aiDailyQuota,
      },
    });
  }

  public async logProxyRequest(payload: ProxyLogPayload): Promise<void> {
    try {
      await this.prisma.proxyRequestLog.create({
        data: {
          id: createEntityId('proxy-log'),
          scope: payload.scope,
          endpoint: payload.endpoint,
          ...(payload.userId ? { userId: payload.userId } : {}),
          ...(payload.requestHash ? { requestHash: payload.requestHash } : {}),
          cacheHit: payload.cacheHit ?? false,
          success: payload.success,
          statusCode: payload.statusCode,
          durationMs: payload.durationMs,
          quotaCost: payload.quotaCost ?? 0,
          ...(payload.upstreamProvider ? { upstreamProvider: payload.upstreamProvider } : {}),
          ...(payload.errorMessage ? { errorMessage: payload.errorMessage.slice(0, 500) } : {}),
        },
      });
    }
    catch (error) {
      this.logger.warn(
        `记录代理日志失败: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  public async logException(payload: {
    endpoint: string;
    statusCode: number;
    requestId?: string;
    errorMessage: string;
  }): Promise<void> {
    await this.logProxyRequest({
      scope: 'exception',
      endpoint: payload.endpoint,
      success: false,
      statusCode: payload.statusCode,
      durationMs: 0,
      errorMessage: payload.errorMessage,
      ...(payload.requestId ? { requestHash: payload.requestId } : {}),
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  public async cleanupOldLogs(): Promise<void> {
    const expiredBefore = new Date(
      Date.now() - this.appEnv.requestLogRetentionDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.proxyRequestLog.deleteMany({
      where: {
        createdAt: {
          lt: expiredBefore,
        },
      },
    });
  }
}
