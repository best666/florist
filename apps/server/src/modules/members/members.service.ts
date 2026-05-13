import type { IMember, IMemberPackagePlan, IMemberPaymentOrder, MemberBenefitType } from '@florist/contracts';
import {
  MemberBenefitType as MemberBenefitTypeEnum,
  MemberPackageType,
  MemberPaymentChannel,
  MemberPaymentStatus,
  MemberStatus,
} from '@florist/contracts';
import { Injectable } from '@nestjs/common';
import { createEntityId } from '../../common/utils/entity-id';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RechargeMemberDto } from './dto/recharge-member.dto';
import { UpsertMemberDto } from './dto/upsert-member.dto';
import { toMemberEntity } from './entities/member.entity';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ORDER_EXPIRES_IN_MS = 15 * 60 * 1000;

function createBenefitList(): ReadonlyArray<MemberBenefitType> {
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

const MEMBER_PACKAGE_PLANS: ReadonlyArray<IMemberPackagePlan> = [
  {
    packageType: MemberPackageType.Monthly,
    title: '月卡会员',
    subtitle: '适合轻量开通的月度会员方案',
    priceInCents: 1900,
    originPriceInCents: 2900,
    durationDays: 30,
    benefitTypes: createBenefitList(),
    highlightLabel: '灵活开通',
    disclaimer: '一次性支付，不自动续费。',
  },
  {
    packageType: MemberPackageType.Yearly,
    title: '年卡会员',
    subtitle: '覆盖四季养护与长期整理场景',
    priceInCents: 12800,
    originPriceInCents: 22800,
    durationDays: 365,
    benefitTypes: createBenefitList(),
    highlightLabel: '推荐',
    disclaimer: '一次性支付，到期自动降级。',
  },
  {
    packageType: MemberPackageType.Lifetime,
    title: '终身卡',
    subtitle: '一次开通，长期解锁完整会员能力',
    priceInCents: 39900,
    originPriceInCents: 59900,
    benefitTypes: createBenefitList(),
    highlightLabel: '长期陪伴',
    disclaimer: '一次性支付，永久有效，不自动续费。',
  },
];

function resolveMemberPlan(packageType: MemberPackageType): IMemberPackagePlan {
  return MEMBER_PACKAGE_PLANS.find(plan => plan.packageType === packageType) ?? MEMBER_PACKAGE_PLANS[1]!;
}

function resolveExpiredAt(packageType: MemberPackageType, startedAt: string): string | undefined {
  if (packageType === MemberPackageType.Lifetime) {
    return undefined;
  }

  const durationDays = resolveMemberPlan(packageType).durationDays ?? 0;
  return new Date(new Date(startedAt).getTime() + durationDays * DAY_IN_MS).toISOString();
}

@Injectable()
export class MembersService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  public async getPackagePlans(): Promise<ReadonlyArray<IMemberPackagePlan>> {
    return MEMBER_PACKAGE_PLANS;
  }

  public async getCurrentMember(userIdInput?: string): Promise<IMember> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const member = await this.prisma.member.findUnique({
      where: { userId },
    });

    if (!member) {
      const createdMember = await this.prisma.member.create({
        data: {
          id: createEntityId('member'),
          userId,
          packageType: MemberPackageType.Monthly,
          status: MemberStatus.Inactive,
          benefitTypes: [],
        },
      });

      return toMemberEntity(createdMember);
    }

    return this.syncMemberExpiration(userId, member);
  }

  public async upsertCurrentMember(payload: UpsertMemberDto, userIdInput?: string): Promise<IMember> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const member = await this.prisma.member.upsert({
      where: { userId },
      update: {
        packageType: payload.packageType,
        status: payload.status,
        benefitTypes: payload.benefitTypes,
        startedAt: payload.startedAt ? new Date(payload.startedAt) : null,
        expiredAt: payload.expiredAt ? new Date(payload.expiredAt) : null,
      },
      create: {
        id: createEntityId('member'),
        userId,
        packageType: payload.packageType,
        status: payload.status,
        benefitTypes: payload.benefitTypes,
        startedAt: payload.startedAt ? new Date(payload.startedAt) : null,
        expiredAt: payload.expiredAt ? new Date(payload.expiredAt) : null,
      },
    });

    return toMemberEntity(member);
  }

  public async rechargeMember(payload: RechargeMemberDto, userIdInput?: string): Promise<{
    order: IMemberPaymentOrder;
    member: IMember;
  }> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const now = new Date();
    const plan = resolveMemberPlan(payload.packageType);
    const order: IMemberPaymentOrder = {
      id: createEntityId('member-order'),
      packageType: payload.packageType,
      channel: payload.channel,
      amountInCents: plan.priceInCents,
      status: MemberPaymentStatus.Paid,
      createdAt: now.toISOString(),
      expiredAt: new Date(now.getTime() + ORDER_EXPIRES_IN_MS).toISOString(),
      ...(payload.channel === MemberPaymentChannel.H5QrCode
        ? {
            qrCodeText: `florist://member-pay/${userId}/${payload.packageType}`,
          }
        : {}),
    };
    const startedAt = now.toISOString();
    const expiredAt = resolveExpiredAt(payload.packageType, startedAt);
    const member = await this.prisma.member.upsert({
      where: { userId },
      update: {
        packageType: payload.packageType,
        status: MemberStatus.Active,
        benefitTypes: plan.benefitTypes,
        startedAt: now,
        expiredAt: expiredAt ? new Date(expiredAt) : null,
      },
      create: {
        id: createEntityId('member'),
        userId,
        packageType: payload.packageType,
        status: MemberStatus.Active,
        benefitTypes: plan.benefitTypes,
        startedAt: now,
        expiredAt: expiredAt ? new Date(expiredAt) : null,
      },
    });

    return {
      order,
      member: toMemberEntity(member),
    };
  }

  public async checkMemberBenefit(benefit: MemberBenefitType, userIdInput?: string): Promise<{
    allowed: boolean;
    benefit: MemberBenefitType;
    member: IMember;
    reason: string;
  }> {
    const member = await this.getCurrentMember(userIdInput);
    const allowed = member.status === MemberStatus.Active && member.benefitTypes.includes(benefit);

    return {
      allowed,
      benefit,
      member,
      reason: allowed ? '会员权益可用' : '当前账号未解锁该会员权益',
    };
  }

  public async refreshCurrentMember(userIdInput?: string): Promise<IMember> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const member = await this.prisma.member.findUnique({ where: { userId } });

    if (!member) {
      return this.getCurrentMember(userId);
    }

    return this.syncMemberExpiration(userId, member);
  }

  private async syncMemberExpiration(userId: string, member: {
    id: string;
    userId: string;
    packageType: string;
    status: string;
    benefitTypes: unknown;
    startedAt: Date | null;
    expiredAt: Date | null;
  }): Promise<IMember> {
    if (!member.expiredAt || member.expiredAt.getTime() > Date.now() || member.status !== MemberStatus.Active) {
      return toMemberEntity(member as never);
    }

    const updatedMember = await this.prisma.member.update({
      where: { userId },
      data: {
        status: MemberStatus.Expired,
        benefitTypes: [],
      },
    });

    return toMemberEntity(updatedMember);
  }
}
