import type { IFeedback, IMember, IUser, MemberBenefitType } from '@florist/contracts';
import {
  FeedbackStatus,
  MemberBenefitType as MemberBenefitTypeEnum,
  MemberPackageType,
  MemberStatus,
} from '@florist/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Feedback, FeedbackImage, Member, Prisma, User } from '@prisma/client';
import { DatabaseCryptoService } from '../../common/services/database-crypto.service';
import { createEntityId } from '../../common/utils/entity-id';
import { PrismaService } from '../prisma/prisma.service';
import { toFeedbackEntity } from '../feedback/entities/feedback.entity';
import { toMemberEntity } from '../members/entities/member.entity';
import { toUserEntity } from '../users/entities/user.entity';
import type { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import type { UpdateUserMemberDto } from './dto/update-user-member.dto';
import type { UpsertOperationConfigDto } from './dto/upsert-operation-config.dto';

type FeedbackWithUser = Feedback & { images: FeedbackImage[]; user: User };
type UserWithAdminData = User & {
  members: Member[];
  _count: {
    flowers: number;
    records: number;
    feedbacks: number;
  };
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const APP_CONFIG_KEYS = {
  adSlots: 'admin:ad-slots',
} as const;

function buildDefaultBenefits(): ReadonlyArray<MemberBenefitType> {
  return [
    MemberBenefitTypeEnum.UnlimitedAiAdvice,
    MemberBenefitTypeEnum.NoWatermark,
    MemberBenefitTypeEnum.AllThemes,
    MemberBenefitTypeEnum.CloudBackup,
    MemberBenefitTypeEnum.AdFree,
    MemberBenefitTypeEnum.GrowthPoster,
    MemberBenefitTypeEnum.TripCarePlan,
  ] as const satisfies ReadonlyArray<MemberBenefitType>;
}

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function resolveMemberExpiredAt(packageType: MemberPackageType, startedAt: Date): Date | null {
  if (packageType === MemberPackageType.Lifetime) {
    return null;
  }

  const durationDays = packageType === MemberPackageType.Yearly ? 365 : 30;
  return new Date(startedAt.getTime() + durationDays * DAY_IN_MS);
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export interface AdminAdSlotConfig {
  readonly id: string;
  readonly title: string;
  readonly placement: string;
  readonly imageUrl?: string;
  readonly targetUrl: string;
  readonly enabled: boolean;
  readonly note?: string;
}

export interface AdminOperationConfigs {
  readonly adSlots: ReadonlyArray<AdminAdSlotConfig>;
}

export interface AdminUserListItem {
  readonly user: IUser;
  readonly member?: IMember;
  readonly flowerCount: number;
  readonly recordCount: number;
  readonly feedbackCount: number;
}

export interface AdminFeedbackItem extends IFeedback {
  readonly updatedAt: string;
  readonly user: IUser;
}

export interface AdminDashboardResponse {
  readonly overview: {
    readonly totalUsers: number;
    readonly totalFlowers: number;
    readonly totalRecords: number;
    readonly activeMembers: number;
    readonly pendingFeedbacks: number;
    readonly aiCallsToday: number;
  };
  readonly users: ReadonlyArray<AdminUserListItem>;
  readonly analytics: {
    readonly activeCareUsersLast7Days: number;
    readonly averageFlowersPerUser: number;
    readonly averageRecordsPerUser: number;
    readonly averageCooldownMinutes: number;
    readonly actionBreakdown: ReadonlyArray<{ readonly name: string; readonly count: number }>;
    readonly categoryBreakdown: ReadonlyArray<{ readonly name: string; readonly count: number }>;
    readonly memberPackageBreakdown: ReadonlyArray<{ readonly name: string; readonly count: number }>;
    readonly hotHours: ReadonlyArray<{ readonly hour: string; readonly count: number }>;
    readonly last7DayRecords: ReadonlyArray<{ readonly date: string; readonly count: number }>;
  };
  readonly feedbacks: ReadonlyArray<AdminFeedbackItem>;
  readonly operationConfigs: AdminOperationConfigs;
  readonly monitoring: {
    readonly aiQuota: {
      readonly dateKey: string;
      readonly totalUsedCount: number;
      readonly totalLimitCount: number;
      readonly topUsers: ReadonlyArray<{
        readonly userId: string;
        readonly nickname: string;
        readonly scope: string;
        readonly usedCount: number;
        readonly limitCount: number;
      }>;
    };
    readonly traffic: {
      readonly totalRequestsLast24Hours: number;
      readonly errorRequestsLast24Hours: number;
      readonly cacheHitsLast24Hours: number;
      readonly averageDurationMs: number;
      readonly topScopes: ReadonlyArray<{ readonly name: string; readonly count: number }>;
      readonly topEndpoints: ReadonlyArray<{ readonly name: string; readonly count: number }>;
      readonly recentLogs: ReadonlyArray<{
        readonly id: string;
        readonly scope: string;
        readonly endpoint: string;
        readonly success: boolean;
        readonly statusCode: number;
        readonly durationMs: number;
        readonly createdAt: string;
      }>;
    };
  };
}

const DEFAULT_AD_SLOTS: ReadonlyArray<AdminAdSlotConfig> = [
  {
    id: 'home-hero',
    title: '首页头图广告',
    placement: 'home_top_banner',
    imageUrl: 'https://images.example.com/florist/home-hero.jpg',
    targetUrl: 'https://shop.example.com/florist/starter-kit',
    enabled: true,
    note: '用于首页顶部推荐位',
  },
  {
    id: 'growth-inline',
    title: '成长相册插入广告',
    placement: 'growth_album_inline',
    imageUrl: 'https://images.example.com/florist/growth-inline.jpg',
    targetUrl: 'https://shop.example.com/florist/plant-lamp',
    enabled: true,
    note: '用于成长相册中段曝光',
  },
  {
    id: 'member-footer',
    title: '会员页底部广告',
    placement: 'member_footer',
    imageUrl: 'https://images.example.com/florist/member-footer.jpg',
    targetUrl: 'https://shop.example.com/florist/fertilizer-box',
    enabled: false,
    note: '可用于会员续费联动投放',
  },
];

@Injectable()
export class AdminService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: DatabaseCryptoService,
  ) {}

  public async getDashboard(): Promise<AdminDashboardResponse> {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * DAY_IN_MS);
    const users = await this.prisma.user.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        members: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            flowers: true,
            records: true,
            feedbacks: true,
          },
        },
      },
    });
    const [flowers, records, members, feedbacks, aiQuotas, proxyLogs, operationConfigs] = await Promise.all([
      this.prisma.flower.findMany({
        select: {
          category: true,
          isDeleted: true,
          userId: true,
        },
      }),
      this.prisma.careRecord.findMany({
        select: {
          actionType: true,
          cooldownMinutes: true,
          createdAt: true,
          userId: true,
        },
      }),
      this.prisma.member.findMany({
        select: {
          packageType: true,
          status: true,
          expiredAt: true,
          userId: true,
        },
      }),
      this.prisma.feedback.findMany({
        include: {
          images: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 80,
      }),
      this.prisma.aiDailyQuota.findMany({
        where: { dateKey: todayKey },
        orderBy: { usedCount: 'desc' },
        take: 20,
      }),
      this.prisma.proxyRequestLog.findMany({
        where: { createdAt: { gte: last24Hours } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.getOperationConfigs(),
    ]);

    const userNicknameMap = new Map(users.map(user => [user.id, user.nickname] as const));
    const visibleFlowers = flowers.filter(flower => !flower.isDeleted);
    const activeMembers = members.filter(member => {
      if (member.status !== MemberStatus.Active) {
        return false;
      }

      return !member.expiredAt || member.expiredAt.getTime() > Date.now();
    });
    const recordsLast7Days = records.filter(record => record.createdAt.getTime() >= last7Days.getTime());
    const hotHourCounter = new Map<string, number>();
    const recentDayCounter = new Map<string, number>();
    const actionCounter = new Map<string, number>();
    const categoryCounter = new Map<string, number>();
    const memberPackageCounter = new Map<string, number>();
    const scopeCounter = new Map<string, number>();
    const endpointCounter = new Map<string, number>();
    let cooldownTotal = 0;
    let errorCount = 0;
    let cacheHitCount = 0;
    let durationTotal = 0;

    for (const flower of visibleFlowers) {
      categoryCounter.set(flower.category, (categoryCounter.get(flower.category) ?? 0) + 1);
    }

    for (const record of records) {
      const hourKey = `${record.createdAt.getHours()}`.padStart(2, '0');
      const dayKey = record.createdAt.toISOString().slice(0, 10);
      actionCounter.set(record.actionType, (actionCounter.get(record.actionType) ?? 0) + 1);
      hotHourCounter.set(hourKey, (hotHourCounter.get(hourKey) ?? 0) + 1);
      recentDayCounter.set(dayKey, (recentDayCounter.get(dayKey) ?? 0) + 1);
      cooldownTotal += record.cooldownMinutes;
    }

    for (const member of members) {
      memberPackageCounter.set(member.packageType, (memberPackageCounter.get(member.packageType) ?? 0) + 1);
    }

    for (const log of proxyLogs) {
      scopeCounter.set(log.scope, (scopeCounter.get(log.scope) ?? 0) + 1);
      endpointCounter.set(log.endpoint, (endpointCounter.get(log.endpoint) ?? 0) + 1);
      durationTotal += log.durationMs;
      cacheHitCount += log.cacheHit ? 1 : 0;
      errorCount += log.success ? 0 : 1;
    }

    const totalAiUsedCount = aiQuotas.reduce((sum, quota) => sum + quota.usedCount, 0);
    const totalAiLimitCount = aiQuotas.reduce((sum, quota) => sum + quota.limitCount, 0);

    return {
      overview: {
        totalUsers: users.length,
        totalFlowers: visibleFlowers.length,
        totalRecords: records.length,
        activeMembers: activeMembers.length,
        pendingFeedbacks: feedbacks.filter(feedback => feedback.status === FeedbackStatus.Pending).length,
        aiCallsToday: totalAiUsedCount,
      },
      users: users.map(user => this.mapAdminUser(user)),
      analytics: {
        activeCareUsersLast7Days: new Set(recordsLast7Days.map(record => record.userId)).size,
        averageFlowersPerUser: users.length > 0 ? roundToSingleDecimal(visibleFlowers.length / users.length) : 0,
        averageRecordsPerUser: users.length > 0 ? roundToSingleDecimal(records.length / users.length) : 0,
        averageCooldownMinutes: records.length > 0 ? roundToSingleDecimal(cooldownTotal / records.length) : 0,
        actionBreakdown: this.mapCounter(actionCounter),
        categoryBreakdown: this.mapCounter(categoryCounter),
        memberPackageBreakdown: this.mapCounter(memberPackageCounter),
        hotHours: this.mapCounter(hotHourCounter, 'hour').map(item => ({
          hour: `${item.name}:00`,
          count: item.count,
        })),
        last7DayRecords: Array.from({ length: 7 }, (_, index) => {
          const date = new Date(last7Days.getTime() + index * DAY_IN_MS).toISOString().slice(0, 10);
          return {
            date,
            count: recentDayCounter.get(date) ?? 0,
          };
        }),
      },
      feedbacks: feedbacks.map(feedback => this.mapAdminFeedback(feedback)),
      operationConfigs,
      monitoring: {
        aiQuota: {
          dateKey: todayKey,
          totalUsedCount: totalAiUsedCount,
          totalLimitCount: totalAiLimitCount,
          topUsers: aiQuotas.map(quota => ({
            userId: quota.userId,
            nickname: userNicknameMap.get(quota.userId) ?? quota.userId,
            scope: quota.scope,
            usedCount: quota.usedCount,
            limitCount: quota.limitCount,
          })),
        },
        traffic: {
          totalRequestsLast24Hours: proxyLogs.length,
          errorRequestsLast24Hours: errorCount,
          cacheHitsLast24Hours: cacheHitCount,
          averageDurationMs: proxyLogs.length > 0 ? roundToSingleDecimal(durationTotal / proxyLogs.length) : 0,
          topScopes: this.mapCounter(scopeCounter),
          topEndpoints: this.mapCounter(endpointCounter),
          recentLogs: proxyLogs.slice(0, 20).map(log => ({
            id: log.id,
            scope: log.scope,
            endpoint: log.endpoint,
            success: log.success,
            statusCode: log.statusCode,
            durationMs: log.durationMs,
            createdAt: log.createdAt.toISOString(),
          })),
        },
      },
    };
  }

  public async updateUserMember(userId: string, payload: UpdateUserMemberDto): Promise<AdminUserListItem> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const startedAt = payload.startedAt ? new Date(payload.startedAt) : new Date();
    const benefitTypes = payload.benefitTypes && payload.benefitTypes.length > 0
      ? payload.benefitTypes
      : (payload.status === MemberStatus.Active ? [...buildDefaultBenefits()] : []);
    const expiredAt = payload.expiredAt
      ? new Date(payload.expiredAt)
      : (payload.status === MemberStatus.Active ? resolveMemberExpiredAt(payload.packageType, startedAt) : null);

    await this.prisma.member.upsert({
      where: { userId },
      update: {
        packageType: payload.packageType,
        status: payload.status,
        benefitTypes,
        startedAt,
        expiredAt,
      },
      create: {
        id: createEntityId('member'),
        userId,
        packageType: payload.packageType,
        status: payload.status,
        benefitTypes,
        startedAt,
        expiredAt,
      },
    });

    const updatedUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        members: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            flowers: true,
            records: true,
            feedbacks: true,
          },
        },
      },
    });

    return this.mapAdminUser(updatedUser);
  }

  public async replyFeedback(
    feedbackId: string,
    payload: ReplyFeedbackDto,
    repliedBy: string,
  ): Promise<AdminFeedbackItem> {
    await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: payload.status,
        replyCipher: this.cryptoService.encryptText(payload.reply.trim()),
        repliedAt: new Date(),
        repliedBy,
      },
    });

    const feedback = await this.prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        images: true,
        user: true,
      },
    });

    if (!feedback) {
      throw new NotFoundException('反馈不存在');
    }

    return this.mapAdminFeedback(feedback);
  }

  public async upsertOperationConfigs(payload: UpsertOperationConfigDto): Promise<AdminOperationConfigs> {
    await this.prisma.appConfig.upsert({
      where: { key: APP_CONFIG_KEYS.adSlots },
      update: { value: toJsonValue(payload.adSlots) },
      create: {
        key: APP_CONFIG_KEYS.adSlots,
        value: toJsonValue(payload.adSlots),
      },
    });

    return this.getOperationConfigs();
  }

  private async getOperationConfigs(): Promise<AdminOperationConfigs> {
    const adSlotConfig = await this.prisma.appConfig.upsert({
      where: { key: APP_CONFIG_KEYS.adSlots },
      update: {},
      create: {
        key: APP_CONFIG_KEYS.adSlots,
        value: toJsonValue(DEFAULT_AD_SLOTS),
      },
    });

    return {
      adSlots: this.parseConfigArray<AdminAdSlotConfig>(adSlotConfig.value, DEFAULT_AD_SLOTS),
    };
  }

  private mapAdminUser(user: UserWithAdminData): AdminUserListItem {
    const member = user.members[0];

    return {
      user: toUserEntity(user, this.cryptoService),
      ...(member ? { member: toMemberEntity(member) } : {}),
      flowerCount: user._count.flowers,
      recordCount: user._count.records,
      feedbackCount: user._count.feedbacks,
    };
  }

  private mapAdminFeedback(feedback: FeedbackWithUser): AdminFeedbackItem {
    return {
      ...toFeedbackEntity(feedback, this.cryptoService),
      updatedAt: feedback.updatedAt.toISOString(),
      user: toUserEntity(feedback.user, this.cryptoService),
    };
  }

  private mapCounter(counter: Map<string, number>, key = 'name'): ReadonlyArray<{ readonly name: string; readonly count: number }> {
    return Array.from(counter.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([name, count]) => ({ [key]: name, name, count }));
  }

  private parseConfigArray<T>(value: unknown, fallback: ReadonlyArray<T>): ReadonlyArray<T> {
    return Array.isArray(value) ? value as T[] : [...fallback];
  }
}
