import {
  MemberBenefitType,
  MemberPackageType,
  MemberStatus,
} from '@florist/contracts';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class UpsertMemberDto {
  @IsEnum(MemberPackageType)
  public packageType!: MemberPackageType;

  @IsEnum(MemberStatus)
  public status!: MemberStatus;

  @IsArray()
  @IsEnum(MemberBenefitType, { each: true })
  public benefitTypes!: MemberBenefitType[];

  @IsOptional()
  @IsDateString()
  public startedAt?: string;

  @IsOptional()
  @IsDateString()
  public expiredAt?: string;
}
