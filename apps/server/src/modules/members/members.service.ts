import type { IMember } from '@florist/contracts';
import { MemberPackageType, MemberStatus } from '@florist/contracts';
import { Injectable } from '@nestjs/common';
import { createEntityId } from '../../common/utils/entity-id';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMemberDto } from './dto/upsert-member.dto';
import { toMemberEntity } from './entities/member.entity';

@Injectable()
export class MembersService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  public async getCurrentMember(): Promise<IMember> {
    const userId = await this.usersService.ensureDefaultUserId();
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

    return toMemberEntity(member);
  }

  public async upsertCurrentMember(payload: UpsertMemberDto): Promise<IMember> {
    const userId = await this.usersService.ensureDefaultUserId();
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
}
