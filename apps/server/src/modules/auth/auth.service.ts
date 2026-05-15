import { createHash } from 'node:crypto';
import type { IUserAuthSession } from '@florist/contracts';
import { UserLoginType } from '@florist/contracts';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { RuntimeCacheService } from '../../common/services/runtime-cache.service';
import type { ServerEnvConfig } from '../../config/server-env';
import { UsersService } from '../users/users.service';
import { LoginAnonymousUserDto, RegisterAnonymousUserDto } from './dto/login-anonymous.dto';
import { LoginH5PhoneUserDto } from './dto/login-h5-phone.dto';
import { LoginWechatUserDto } from './dto/login-wechat.dto';
import { RequestH5PhoneCodeDto } from './dto/request-h5-phone-code.dto';

interface H5PhoneCodeResponse {
  readonly delivered: true;
  readonly message: string;
  readonly maskedPhoneNumber: string;
  readonly cooldownSeconds: number;
  readonly verificationCode?: string;
}

const H5_PHONE_CODE_COOLDOWN_MS = 60_000;
const H5_PHONE_CODE_EXPIRES_MS = 5 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly appEnv: ServerEnvConfig;

  public constructor(
    private readonly usersService: UsersService,
    private readonly runtimeCacheService: RuntimeCacheService,
    configService: ConfigService,
  ) {
    this.appEnv = configService.getOrThrow<ServerEnvConfig>('app');
  }

  public requestH5PhoneCode(payload: RequestH5PhoneCodeDto): H5PhoneCodeResponse {
    const normalizedPhone = payload.phoneNumber.trim();
    const cooldownCacheKey = `auth:h5-phone-code:${normalizedPhone}`;
    const verificationCodeCacheKey = `auth:h5-phone-code:verify:${normalizedPhone}`;
    const nextAllowedAt = this.runtimeCacheService.get<number>(cooldownCacheKey);

    if (!this.appEnv.h5LoginPhone || !this.appEnv.h5LoginCode) {
      throw new UnauthorizedException('H5 手机验证码登录尚未配置');
    }

    if (normalizedPhone !== this.appEnv.h5LoginPhone) {
      throw new UnauthorizedException('当前开发环境未为这个手机号开放验证码');
    }

    if (nextAllowedAt !== null && nextAllowedAt > Date.now()) {
      const remainingSeconds = Math.max(Math.ceil((nextAllowedAt - Date.now()) / 1000), 1);
      throw new HttpException(`请求过于频繁，请在 ${remainingSeconds} 秒后再试`, HttpStatus.TOO_MANY_REQUESTS);
    }

    this.runtimeCacheService.set(cooldownCacheKey, Date.now() + H5_PHONE_CODE_COOLDOWN_MS, H5_PHONE_CODE_COOLDOWN_MS);
    this.runtimeCacheService.set(verificationCodeCacheKey, this.appEnv.h5LoginCode, H5_PHONE_CODE_EXPIRES_MS);

    const baseResponse: H5PhoneCodeResponse = {
      delivered: true,
      message: this.isDevelopmentRuntime()
        ? '开发环境验证码已生成，已回填到当前登录表单，5 分钟内有效。'
        : '验证码已发送，请注意查收。',
      maskedPhoneNumber: this.maskPhoneNumber(normalizedPhone),
      cooldownSeconds: Math.floor(H5_PHONE_CODE_COOLDOWN_MS / 1000),
      ...(this.isDevelopmentRuntime()
        ? {
            verificationCode: this.appEnv.h5LoginCode,
          }
        : {}),
    };

    return baseResponse;
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
    const verificationCodeCacheKey = `auth:h5-phone-code:verify:${normalizedPhone}`;
    const requestedVerificationCode = this.runtimeCacheService.get<string>(verificationCodeCacheKey);

    if (!this.appEnv.h5LoginPhone || !this.appEnv.h5LoginCode) {
      throw new UnauthorizedException('H5 手机验证码登录尚未配置');
    }

    if (normalizedPhone !== this.appEnv.h5LoginPhone) {
      throw new UnauthorizedException('手机号或验证码不正确');
    }

    if (!requestedVerificationCode) {
      throw new UnauthorizedException('请先获取验证码，验证码 5 分钟内有效');
    }

    if (normalizedCode !== requestedVerificationCode) {
      throw new UnauthorizedException('手机号或验证码不正确');
    }

    this.runtimeCacheService.delete(verificationCodeCacheKey);

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

  private isDevelopmentRuntime(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  private maskPhoneNumber(phoneNumber: string): string {
    return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`;
  }
}
