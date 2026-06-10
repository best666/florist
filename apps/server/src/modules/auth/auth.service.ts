import { createHash } from 'node:crypto';
import type { IUserAuthSession } from '@florist/contracts';
import { UserLoginType } from '@florist/contracts';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { CaptchaService } from '../../common/services/captcha.service';
import { PnvsService } from '../../common/services/pnvs.service';
import { RuntimeCacheService } from '../../common/services/runtime-cache.service';
import { SmsService } from '../../common/services/sms.service';
import type { ServerEnvConfig } from '../../config/server-env';
import { UsersService } from '../users/users.service';
import { LoginAnonymousUserDto, RegisterAnonymousUserDto } from './dto/login-anonymous.dto';
import { H5OneClickLoginDto } from './dto/h5-one-click-login.dto';
import { LoginH5PhoneUserDto } from './dto/login-h5-phone.dto';
import { LoginWechatUserDto } from './dto/login-wechat.dto';
import { RequestH5PhoneCodeDto } from './dto/request-h5-phone-code.dto';

/** 最小化的请求接口，用于提取客户端 IP */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClientRequest = any;

interface H5PhoneCodeResponse {
  readonly delivered: true;
  readonly message: string;
  readonly maskedPhoneNumber: string;
  readonly cooldownSeconds: number;
  readonly verificationCode?: string;
}

interface WechatCode2SessionResponse {
  readonly openid?: string;
  readonly session_key?: string;
  readonly unionid?: string;
  readonly errcode?: number;
  readonly errmsg?: string;
}

interface ResolvedWechatSession {
  readonly openId: string;
  readonly sessionKey: string;
}

const H5_PHONE_CODE_COOLDOWN_MS = 60_000;
const H5_PHONE_CODE_EXPIRES_MS = 5 * 60 * 1000;
const VERIFICATION_MAX_ERROR_ATTEMPTS = 3;

// IP 频率限制
const RATE_CAPTCHA_GENERATE_PER_MIN = 30;
const RATE_CAPTCHA_VERIFY_PER_MIN = 60;
const RATE_SMS_SEND_PER_MIN = 10;
const RATE_SMS_SEND_PER_HOUR = 20;
const RATE_LOGIN_PER_MIN = 20;
const RATE_CODE_VERIFY_PER_MIN = 30;
const RATE_ONE_CLICK_AUTH_TOKEN_PER_MIN = 30;
const RATE_ONE_CLICK_LOGIN_PER_MIN = 20;
const SMS_DAILY_LIMIT_PER_PHONE = 10;

@Injectable()
export class AuthService {
  private readonly appEnv: ServerEnvConfig;

  public constructor(
    private readonly usersService: UsersService,
    private readonly runtimeCacheService: RuntimeCacheService,
    private readonly smsService: SmsService,
    private readonly captchaService: CaptchaService,
    private readonly pnvsService: PnvsService,
    configService: ConfigService,
  ) {
    this.appEnv = configService.getOrThrow<ServerEnvConfig>('app');
  }

  public generateCaptcha(request: ClientRequest): { captchaId: string; svg: string } {
    const clientIp = this.extractClientIp(request);
    this.checkIpRateLimit(clientIp, 'captcha_generate', RATE_CAPTCHA_GENERATE_PER_MIN, 60_000);
    return this.captchaService.generate();
  }

  public async requestH5PhoneCode(
    payload: RequestH5PhoneCodeDto,
    request: ClientRequest,
  ): Promise<H5PhoneCodeResponse> {
    const normalizedPhone = payload.phoneNumber.trim();
    const clientIp = this.extractClientIp(request);

    // 1. 校验图形验证码（一次性消费）
    this.checkIpRateLimit(clientIp, 'captcha_verify', RATE_CAPTCHA_VERIFY_PER_MIN, 60_000);
    const captchaValid = this.captchaService.validate(payload.captchaId, payload.captchaAnswer);

    if (!captchaValid) {
      throw new UnauthorizedException('图形验证码不正确或已过期，请刷新后重试');
    }

    // 2. 手机号冷却检查（60s）
    const cooldownCacheKey = `auth:h5-phone-code:${normalizedPhone}`;
    const nextAllowedAt = this.runtimeCacheService.get<number>(cooldownCacheKey);

    if (nextAllowedAt !== null && nextAllowedAt > Date.now()) {
      const remainingSeconds = Math.max(Math.ceil((nextAllowedAt - Date.now()) / 1000), 1);
      throw new HttpException(
        `请求过于频繁，请在 ${remainingSeconds} 秒后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. IP 维度短信发送频率
    this.checkIpRateLimit(clientIp, 'sms_send', RATE_SMS_SEND_PER_MIN, 60_000);
    this.checkIpRateLimit(clientIp, 'sms_send_hourly', RATE_SMS_SEND_PER_HOUR, 60 * 60_000);

    // 4. 手机号每日上限
    const todayKey = new Date().toISOString().slice(0, 10);
    const dailyCount = this.runtimeCacheService.increment(
      `sms:daily:${normalizedPhone}:${todayKey}`,
      24 * 60 * 60 * 1000,
    );

    if (dailyCount > SMS_DAILY_LIMIT_PER_PHONE) {
      throw new HttpException(
        `该手机号今日验证码请求已达上限（${SMS_DAILY_LIMIT_PER_PHONE} 次），请明天再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 5. 生成验证码并发送短信
    const code = this.smsService.generateCode();
    const isDev = this.isDevelopmentRuntime() && !this.smsService.configured;

    if (isDev) {
      // 开发环境：未配置阿里云短信时跳过发送，直接返回验证码
    } else {
      try {
        await this.smsService.sendVerificationCode(normalizedPhone, code);
      } catch (error) {
        throw new HttpException(
          '短信验证码发送失败，请稍后再试',
          HttpStatus.BAD_GATEWAY,
        );
      }
    }

    // 6. 存储验证码和冷却时间
    this.runtimeCacheService.set(
      cooldownCacheKey,
      Date.now() + H5_PHONE_CODE_COOLDOWN_MS,
      H5_PHONE_CODE_COOLDOWN_MS,
    );

    const verificationCodeCacheKey = `auth:h5-phone-code:verify:${normalizedPhone}`;
    const expiresAt = Date.now() + H5_PHONE_CODE_EXPIRES_MS;
    this.runtimeCacheService.set(
      verificationCodeCacheKey,
      { code, errorCount: 0, expiresAt },
      H5_PHONE_CODE_EXPIRES_MS,
    );

    return {
      delivered: true,
      message: isDev
        ? '开发环境验证码已生成，已自动填入（未配置阿里云短信）。'
        : '验证码已发送，请注意查收。',
      maskedPhoneNumber: this.maskPhoneNumber(normalizedPhone),
      cooldownSeconds: Math.floor(H5_PHONE_CODE_COOLDOWN_MS / 1000),
      ...(isDev ? { verificationCode: code } : {}),
    };
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
    const wechatSession = await this.resolveWechatSession(payload.code.trim());
    const wechatOpenIdHash = createHash('sha256')
      .update(wechatSession.openId)
      .digest('hex');

    return this.usersService.loginWechatUser({
      wechatOpenIdHash,
      loginType: UserLoginType.WechatMiniProgram,
      ...(payload.nickname ? { nickname: payload.nickname } : {}),
      ...(payload.avatarUrl ? { avatarUrl: payload.avatarUrl } : {}),
    });
  }

  public async loginH5PhoneUser(
    payload: LoginH5PhoneUserDto,
    request: ClientRequest,
  ): Promise<IUserAuthSession> {
    const normalizedPhone = payload.phoneNumber.trim();
    const normalizedCode = payload.verificationCode.trim();
    const clientIp = this.extractClientIp(request);

    // 1. IP 维度登录频率限制
    this.checkIpRateLimit(clientIp, 'login', RATE_LOGIN_PER_MIN, 60_000);

    // 2. 验证码验证频率限制（防止针对同一手机号的暴力破解）
    this.checkIpRateLimit(clientIp, 'code_verify', RATE_CODE_VERIFY_PER_MIN, 60_000);

    const verificationCodeCacheKey = `auth:h5-phone-code:verify:${normalizedPhone}`;
    const cachedData = this.runtimeCacheService.get<{
      code: string;
      errorCount: number;
      expiresAt: number;
    }>(verificationCodeCacheKey);

    if (!cachedData) {
      throw new UnauthorizedException('验证码已过期，请重新获取验证码后再试');
    }

    if (normalizedCode !== cachedData.code) {
      const newErrorCount = cachedData.errorCount + 1;

      if (newErrorCount >= VERIFICATION_MAX_ERROR_ATTEMPTS) {
        this.runtimeCacheService.delete(verificationCodeCacheKey);
        throw new UnauthorizedException(
          `验证码错误次数过多，已失效，请重新获取验证码后再试`,
        );
      }

      // 更新错误次数（使用剩余 TTL，不延长验证码整体有效期）
      const remainingTtlMs = Math.max(cachedData.expiresAt - Date.now(), 1_000);
      this.runtimeCacheService.set(
        verificationCodeCacheKey,
        { code: cachedData.code, errorCount: newErrorCount, expiresAt: cachedData.expiresAt },
        remainingTtlMs,
      );

      throw new UnauthorizedException(
        `验证码不正确（剩余 ${VERIFICATION_MAX_ERROR_ATTEMPTS - newErrorCount} 次尝试机会）`,
      );
    }

    // 验证成功，删除验证码缓存
    this.runtimeCacheService.delete(verificationCodeCacheKey);

    const nickname = payload.nickname?.trim();
    return this.usersService.loginH5PhoneUser({
      phoneNumber: normalizedPhone,
      loginType: UserLoginType.H5PhoneCode,
      ...(nickname ? { nickname } : {}),
    });
  }

  public async getH5OneClickAuthToken(
    request: ClientRequest,
  ): Promise<{ accessToken: string; jwtToken: string }> {
    const clientIp = this.extractClientIp(request);

    // IP 频率限制
    this.checkIpRateLimit(clientIp, 'one_click_auth_token', RATE_ONE_CLICK_AUTH_TOKEN_PER_MIN, 60_000);

    // 使用配置中的 publicBaseUrl 作为页面地址和请求来源
    const pageUrl = `${this.appEnv.publicBaseUrl}/`;
    const origin = this.appEnv.publicBaseUrl;

    return this.pnvsService.getAuthToken(pageUrl, origin);
  }

  public async loginH5OneClick(
    payload: H5OneClickLoginDto,
    request: ClientRequest,
  ): Promise<IUserAuthSession> {
    const clientIp = this.extractClientIp(request);

    // IP 频率限制
    this.checkIpRateLimit(clientIp, 'one_click_login', RATE_ONE_CLICK_LOGIN_PER_MIN, 60_000);

    // 调用 PNVS 获取手机号
    const phoneNumber = await this.pnvsService.getPhoneWithToken(payload.spToken.trim());

    return this.usersService.loginH5PhoneUser({
      phoneNumber,
      loginType: UserLoginType.H5OneClick,
    });
  }

  public async sendBindPhoneCode(phoneNumber: string) {
    const normalizedPhone = phoneNumber.trim();
    const cacheKey = `auth:bind-phone-code:${normalizedPhone}`;
    const cooldownCacheKey = `auth:bind-phone-code:cooldown:${normalizedPhone}`;
    const cooldownMs = 60_000;
    const codeExpiresMs = 5 * 60 * 1000;

    const nextAllowedAt = this.runtimeCacheService.get<number>(cooldownCacheKey);
    if (nextAllowedAt !== null && nextAllowedAt > Date.now()) {
      const remainingSeconds = Math.max(Math.ceil((nextAllowedAt - Date.now()) / 1000), 1);
      throw new HttpException(
        `请求过于频繁，请在 ${remainingSeconds} 秒后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.smsService.generateCode();

    // 发送短信（未配置阿里云短信时跳过发送，仅用于本地开发）
    try {
      await this.smsService.sendVerificationCode(normalizedPhone, code);
    } catch (error) {
      throw new HttpException(
        '短信验证码发送失败，请稍后再试',
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.runtimeCacheService.set(cooldownCacheKey, Date.now() + cooldownMs, cooldownMs);
    this.runtimeCacheService.set(cacheKey, code, codeExpiresMs);

    const isDev = this.isDevelopmentRuntime() && !this.smsService.configured;

    return {
      delivered: true,
      message: isDev
        ? '开发环境验证码已生成，已自动填入（未配置阿里云短信）。'
        : '验证码已发送，请注意查收。',
      maskedPhoneNumber: this.maskPhoneNumber(normalizedPhone),
      cooldownSeconds: Math.floor(cooldownMs / 1000),
      ...(isDev ? { verificationCode: code } : {}),
    };
  }

  public async bindPhone(phoneNumber: string, code: string, userId?: string) {
    const normalizedPhone = phoneNumber.trim();
    const normalizedCode = code.trim();
    const cacheKey = `auth:bind-phone-code:${normalizedPhone}`;

    const storedCode = this.runtimeCacheService.get<string>(cacheKey);

    if (!storedCode) {
      throw new UnauthorizedException('验证码已过期，请重新获取');
    }

    if (normalizedCode !== storedCode) {
      this.runtimeCacheService.delete(cacheKey);
      throw new UnauthorizedException('验证码不正确');
    }

    this.runtimeCacheService.delete(cacheKey);
    return this.usersService.bindPhoneToUser(phoneNumber, userId);
  }

  public async getSession(userId?: string): Promise<IUserAuthSession> {
    const resolvedUserId = await this.usersService.resolveCurrentUserId(userId);
    return this.usersService.buildUserSession(resolvedUserId, false);
  }

  /** 从请求中提取客户端 IP */
  private extractClientIp(request: ClientRequest): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]!.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.length > 0) {
      return realIp.trim();
    }

    return request.socket?.remoteAddress ?? 'unknown-ip';
  }

  /** IP 维度频率限制，超出上限时抛 HttpException */
  private checkIpRateLimit(
    ip: string,
    action: string,
    maxCount: number,
    windowMs: number,
  ): void {
    const key = `rate:${action}:${ip}`;
    const count = this.runtimeCacheService.increment(key, windowMs);

    if (count > maxCount) {
      throw new HttpException(
        '请求过于频繁，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private isDevelopmentRuntime(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  private async resolveWechatSession(code: string): Promise<ResolvedWechatSession> {
    if (this.shouldUseWechatCodeFallback()) {
      return this.createDevelopmentWechatSession(code);
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', this.appEnv.wechatMiniProgramAppId);
    url.searchParams.set('secret', this.appEnv.wechatMiniProgramSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    let response: Response;

    try {
      response = await fetch(url);
    }
    catch {
      throw new HttpException('微信登录服务暂时不可用，请稍后再试', HttpStatus.BAD_GATEWAY);
    }

    if (!response.ok) {
      throw new HttpException('微信登录服务暂时不可用，请稍后再试', HttpStatus.BAD_GATEWAY);
    }

    const payload = await response.json() as WechatCode2SessionResponse;

    if (payload.errcode) {
      if ([40029, 40163].includes(payload.errcode)) {
        throw new UnauthorizedException('微信登录凭证已失效，请重新发起登录');
      }

      throw new HttpException(
        `微信登录服务异常: ${payload.errmsg ?? 'unknown error'}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!payload.openid || !payload.session_key) {
      throw new HttpException('微信登录返回缺少 openid 或 session_key', HttpStatus.BAD_GATEWAY);
    }

    return {
      openId: payload.openid,
      sessionKey: payload.session_key,
    };
  }

  private shouldUseWechatCodeFallback(): boolean {
    return this.isDevelopmentRuntime()
      && (!this.appEnv.wechatMiniProgramAppId || !this.appEnv.wechatMiniProgramSecret);
  }

  private createDevelopmentWechatSession(_code: string): ResolvedWechatSession {
    // 开发环境无真实微信服务器，不能使用临时 code 派生 openId（每次 uni.login() 的
    // code 都不同，会导致每次登录创建新用户，数据不可达、手机号绑定冲突）。
    // 使用 appId 作为命名空间保证同一小程序内 openId 稳定；未配置 appId 时回退到固定值。
    const namespace = this.appEnv.wechatMiniProgramAppId || 'florist-dev-default';
    const devOpenId = createHash('sha256').update(`dev-openid:${namespace}`).digest('hex');
    const devSessionKey = createHash('sha256').update(`dev-session:${namespace}`).digest('hex');
    return {
      openId: devOpenId,
      sessionKey: devSessionKey,
    };
  }

  private maskPhoneNumber(phoneNumber: string): string {
    return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`;
  }
}
