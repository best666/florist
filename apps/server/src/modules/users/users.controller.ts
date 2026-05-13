import type { IUser } from '@florist/contracts';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  public constructor(private readonly usersService: UsersService) {}

  @Get('current')
  public getCurrentUser(): Promise<IUser> {
    return this.usersService.getCurrentUser();
  }

  @Put('current')
  public updateCurrentUser(@Body() payload: UpdateCurrentUserDto): Promise<IUser> {
    return this.usersService.updateCurrentUser(payload);
  }
}
