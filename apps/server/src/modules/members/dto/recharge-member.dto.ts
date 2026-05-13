import { MemberPackageType, MemberPaymentChannel } from '@florist/contracts';
import { IsEnum } from 'class-validator';

export class RechargeMemberDto {
  @IsEnum(MemberPackageType)
  public packageType!: MemberPackageType;

  @IsEnum(MemberPaymentChannel)
  public channel!: MemberPaymentChannel;
}
