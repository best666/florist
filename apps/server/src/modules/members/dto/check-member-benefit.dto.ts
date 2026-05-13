import { MemberBenefitType } from '@florist/contracts';
import { IsEnum } from 'class-validator';

export class CheckMemberBenefitDto {
  @IsEnum(MemberBenefitType)
  public benefit!: MemberBenefitType;
}
