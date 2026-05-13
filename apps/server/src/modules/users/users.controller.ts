import type { IUser } from '@florist/contracts';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  public constructor(private readonly usersService: UsersService) {}

  @Get('current')
  public getCurrentUser(@CurrentUserId() userId?: string): Promise<IUser> {
    return this.usersService.getCurrentUser(userId);
  }

  @Put('current')
  public updateCurrentUser(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: UpdateCurrentUserDto,
  ): Promise<IUser> {
    return this.usersService.updateCurrentUser(payload, userId);
  }
}
