import type { IUserAuthSession } from '@florist/contracts';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { AuthService } from './auth.service';
import { LoginAnonymousUserDto, RegisterAnonymousUserDto } from './dto/login-anonymous.dto';
import { LoginWechatUserDto } from './dto/login-wechat.dto';

@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Post('anonymous/register')
  public registerAnonymousUser(@Body() payload: RegisterAnonymousUserDto): Promise<IUserAuthSession> {
    return this.authService.registerAnonymousUser(payload);
  }

  @Post('anonymous/login')
  public loginAnonymousUser(@Body() payload: LoginAnonymousUserDto): Promise<IUserAuthSession> {
    return this.authService.loginAnonymousUser(payload);
  }

  @Post('wechat/login')
  public loginWechatUser(@Body() payload: LoginWechatUserDto): Promise<IUserAuthSession> {
    return this.authService.loginWechatUser(payload);
  }

  @Get('session')
  public getSession(@CurrentUserId() userId?: string): Promise<IUserAuthSession> {
    return this.authService.getSession(userId);
  }
}
