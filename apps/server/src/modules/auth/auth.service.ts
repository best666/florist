import { createHash } from 'node:crypto';
import type { IUserAuthSession } from '@florist/contracts';
import { UserLoginType } from '@florist/contracts';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { ServerEnvConfig } from '../../config/server-env';
import { UsersService } from '../users/users.service';
import { LoginAnonymousUserDto, RegisterAnonymousUserDto } from './dto/login-anonymous.dto';
import { LoginH5PhoneUserDto } from './dto/login-h5-phone.dto';
import { LoginWechatUserDto } from './dto/login-wechat.dto';

@Injectable()
export class AuthService {
  private readonly appEnv: ServerEnvConfig;

  public constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    this.appEnv = configService.getOrThrow<ServerEnvConfig>('app');
  }

  public async registerAnonymousUser(payload: RegisterAnonymousUserDto): Promise<IUserAuthSession> {
    return this.usersService.createAnonymousUser(payload.nickname);
  }

  public async loginAnonymousUser(payload: LoginAnonymousUserDto): Promise<IUserAuthSession> {
    const session = await this.usersService.loginAnonymousUser(payload.userId);

    if (!session) {
      throw new UnauthorizedException('匿名用户不存在或不可用');
    }

    return session;
  }

  public async loginWechatUser(payload: LoginWechatUserDto): Promise<IUserAuthSession> {
    const wechatOpenIdHash = createHash('sha256')
      .update(payload.code.trim())
      .digest('hex');

    return this.usersService.loginWechatUser({
      wechatOpenIdHash,
      loginType: UserLoginType.WechatMiniProgram,
      ...(payload.nickname ? { nickname: payload.nickname } : {}),
      ...(payload.avatarUrl ? { avatarUrl: payload.avatarUrl } : {}),
    });
  }

  public async loginH5PhoneUser(payload: LoginH5PhoneUserDto): Promise<IUserAuthSession> {
    const normalizedPhone = payload.phoneNumber.trim();
    const normalizedCode = payload.verificationCode.trim();

    if (!this.appEnv.h5LoginPhone || !this.appEnv.h5LoginCode) {
      throw new UnauthorizedException('H5 手机验证码登录尚未配置');
    }

    if (normalizedPhone !== this.appEnv.h5LoginPhone || normalizedCode !== this.appEnv.h5LoginCode) {
      throw new UnauthorizedException('手机号或验证码不正确');
    }

    return this.usersService.loginH5PhoneUser({
      phoneNumber: normalizedPhone,
      loginType: UserLoginType.H5PhoneCode,
      nickname: payload.nickname?.trim() || this.appEnv.h5LoginNickname,
    });
  }

  public async getSession(userId?: string): Promise<IUserAuthSession> {
    const resolvedUserId = await this.usersService.resolveCurrentUserId(userId);
    return this.usersService.buildUserSession(resolvedUserId, false);
  }
}
