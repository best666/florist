import type { IMember, MemberBenefitType } from '@florist/contracts';
import type { Member } from '@prisma/client';

export function toMemberEntity(member: Member): IMember {
  return {
    id: member.id,
    userId: member.userId,
    packageType: member.packageType as IMember['packageType'],
    status: member.status as IMember['status'],
    benefitTypes: member.benefitTypes as ReadonlyArray<MemberBenefitType>,
    ...(member.startedAt ? { startedAt: member.startedAt.toISOString() } : {}),
    ...(member.expiredAt ? { expiredAt: member.expiredAt.toISOString() } : {}),
  };
}
