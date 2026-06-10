import type { IUser, IUserAuthSession } from '@florist/contracts';
import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { AuthService } from './auth.service';
import { BindPhoneDto } from './dto/bind-phone.dto';
import { H5OneClickLoginDto } from './dto/h5-one-click-login.dto';
import { LoginAnonymousUserDto, RegisterAnonymousUserDto } from './dto/login-anonymous.dto';
import { LoginH5PhoneUserDto } from './dto/login-h5-phone.dto';
import { LoginWechatUserDto } from './dto/login-wechat.dto';
import { RequestH5PhoneCodeDto } from './dto/request-h5-phone-code.dto';
import { SendBindPhoneCodeDto } from './dto/send-bind-phone-code.dto';

@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Get('h5/captcha')
  public getH5Captcha(@Req() request: Record<string, unknown>) {
    return this.authService.generateCaptcha(request as never);
  }

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

  @Post('h5/phone/login')
  public loginH5PhoneUser(
    @Body() payload: LoginH5PhoneUserDto,
    @Req() request: Record<string, unknown>,
  ): Promise<IUserAuthSession> {
    return this.authService.loginH5PhoneUser(payload, request as never);
  }

  @Post('h5/phone/code')
  public requestH5PhoneCode(
    @Body() payload: RequestH5PhoneCodeDto,
    @Req() request: Record<string, unknown>,
  ) {
    return this.authService.requestH5PhoneCode(payload, request as never);
  }

  @Post('h5/one-click/auth-token')
  public getH5OneClickAuthToken(@Req() request: Record<string, unknown>) {
    return this.authService.getH5OneClickAuthToken(request as never);
  }

  @Post('h5/one-click/login')
  public loginH5OneClick(
    @Body() payload: H5OneClickLoginDto,
    @Req() request: Record<string, unknown>,
  ): Promise<IUserAuthSession> {
    return this.authService.loginH5OneClick(payload, request as never);
  }

  @Post('bind-phone/send-code')
  public sendBindPhoneCode(@Body() payload: SendBindPhoneCodeDto) {
    return this.authService.sendBindPhoneCode(payload.phoneNumber);
  }

  @Post('bind-phone')
  public bindPhone(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: BindPhoneDto,
  ): Promise<IUser> {
    return this.authService.bindPhone(payload.phoneNumber, payload.code, userId);
  }

  @Get('session')
  public getSession(@CurrentUserId() userId?: string): Promise<IUserAuthSession> {
    return this.authService.getSession(userId);
  }
}
