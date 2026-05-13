import type { IMember } from '@florist/contracts';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { UpsertMemberDto } from './dto/upsert-member.dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  public constructor(private readonly membersService: MembersService) {}

  @Get('current')
  public getCurrentMember(): Promise<IMember> {
    return this.membersService.getCurrentMember();
  }

  @Put('current')
  public upsertCurrentMember(@Body() payload: UpsertMemberDto): Promise<IMember> {
    return this.membersService.upsertCurrentMember(payload);
  }
}
