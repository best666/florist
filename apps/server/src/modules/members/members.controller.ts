import type { IMember } from '@florist/contracts';
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { RechargeMemberDto } from './dto/recharge-member.dto';
import { UpsertMemberDto } from './dto/upsert-member.dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  public constructor(private readonly membersService: MembersService) {}

  @Get('plans')
  public getPackagePlans() {
    return this.membersService.getPackagePlans();
  }

  @Get('current')
  public getCurrentMember(@CurrentUserId() userId?: string): Promise<IMember> {
    return this.membersService.getCurrentMember(userId);
  }

  @Get('access/:benefit')
  public checkMemberBenefit(
    @CurrentUserId() userId: string | undefined,
    @Param('benefit') benefit: Parameters<MembersService['checkMemberBenefit']>[0],
  ) {
    return this.membersService.checkMemberBenefit(benefit, userId);
  }

  @Post('recharge')
  public rechargeMember(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: RechargeMemberDto,
  ) {
    return this.membersService.rechargeMember(payload, userId);
  }

  @Post('refresh')
  public refreshCurrentMember(@CurrentUserId() userId?: string) {
    return this.membersService.refreshCurrentMember(userId);
  }

  @Put('current')
  public upsertCurrentMember(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: UpsertMemberDto,
  ): Promise<IMember> {
    return this.membersService.upsertCurrentMember(payload, userId);
  }
}
