import {
  MemberBenefitType,
  MemberPackageType,
  MemberStatus,
} from '@florist/contracts';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
} from 'class-validator';

export class UpdateUserMemberDto {
  @IsEnum(MemberPackageType)
  public packageType!: MemberPackageType;

  @IsEnum(MemberStatus)
  public status!: MemberStatus;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(MemberBenefitType, { each: true })
  public benefitTypes?: MemberBenefitType[];

  @IsOptional()
  @IsISO8601()
  public startedAt?: string;

  @IsOptional()
  @IsISO8601()
  public expiredAt?: string;
}
