import { createHash, createHmac } from 'node:crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnvConfig } from '../../config/server-env';

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

interface GetAuthTokenResponse {
  readonly accessToken: string;
  readonly jwtToken: string;
}

@Injectable()
export class PnvsService {
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private readonly schemeCode: string;
  private readonly configured: boolean;

  public constructor(configService: ConfigService) {
    const config = configService.getOrThrow<ServerEnvConfig>('app');
    this.accessKeyId = config.pnvsAccessKeyId;
    this.accessKeySecret = config.pnvsAccessKeySecret;
    this.schemeCode = config.pnvsSchemeCode;
    this.configured = Boolean(this.accessKeyId && this.accessKeySecret && this.schemeCode);
  }

  /** 是否已配置 PNVS（未配置时不启用一键登录） */
  public get isConfigured(): boolean {
    return this.configured;
  }

  /**
   * 获取 H5 一键登录的鉴权 Token。
   *
   * @param url    页面地址，格式: https://florist.subest.top/
   * @param origin 请求来源，格式: https://florist.subest.top
   */
  public async getAuthToken(url: string, origin: string): Promise<GetAuthTokenResponse> {
    const params: Record<string, string> = {
      AccessKeyId: this.accessKeyId,
      Action: 'GetAuthToken',
      BizType: '1', // 1 = 一键登录
      Format: 'JSON',
      Origin: origin,
      SchemeCode: this.schemeCode,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: createHash('md5').update(`${Date.now()}:${Math.random()}`).digest('hex'),
      SignatureVersion: '1.0',
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      Url: url,
      Version: '2017-05-25',
    };

    const sortedKeys = Object.keys(params).sort();
    const canonicalQuery = sortedKeys
      .map((key) => `${percentEncode(key)}=${percentEncode(params[key]!)}`)
      .join('&');

    const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;
    const signature = createHmac('sha1', `${this.accessKeySecret}&`)
      .update(stringToSign)
      .digest('base64');

    const queryString = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(params[key]!)}`)
      .join('&');

    const response = await fetch(
      `https://dypnsapi.aliyuncs.com/?${queryString}&Signature=${percentEncode(signature)}`,
      { method: 'POST' },
    );

    if (!response.ok) {
      throw new HttpException(
        '号码认证服务暂时不可用，请稍后再试',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const result = (await response.json()) as {
      Code?: string;
      Message?: string;
      TokenInfo?: { AccessToken?: string; JwtToken?: string };
    };

    if (result.Code !== 'OK' || !result.TokenInfo?.AccessToken || !result.TokenInfo?.JwtToken) {
      throw new HttpException(
        `号码认证服务异常: ${result.Message ?? '获取鉴权 Token 失败'}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      accessToken: result.TokenInfo.AccessToken,
      jwtToken: result.TokenInfo.JwtToken,
    };
  }

  /**
   * 通过 spToken 换取手机号（H5 一键登录专用）。
   * spToken 仅可使用一次，运营商有效期：移动 2min / 电信 10min / 联通 30min。
   */
  public async getPhoneWithToken(spToken: string): Promise<string> {
    const params: Record<string, string> = {
      AccessKeyId: this.accessKeyId,
      Action: 'GetPhoneWithToken',
      Format: 'JSON',
      SchemeCode: this.schemeCode,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: createHash('md5').update(`${Date.now()}:${Math.random()}`).digest('hex'),
      SignatureVersion: '1.0',
      SpToken: spToken,
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      Version: '2017-05-25',
    };

    const sortedKeys = Object.keys(params).sort();
    const canonicalQuery = sortedKeys
      .map((key) => `${percentEncode(key)}=${percentEncode(params[key]!)}`)
      .join('&');

    const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;
    const signature = createHmac('sha1', `${this.accessKeySecret}&`)
      .update(stringToSign)
      .digest('base64');

    const queryString = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(params[key]!)}`)
      .join('&');

    const response = await fetch(
      `https://dypnsapi.aliyuncs.com/?${queryString}&Signature=${percentEncode(signature)}`,
      { method: 'POST' },
    );

    if (!response.ok) {
      throw new HttpException(
        '号码认证服务暂时不可用，请稍后再试',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const result = (await response.json()) as {
      Code?: string;
      Message?: string;
      Data?: { PhoneNumber?: string };
    };

    if (result.Code !== 'OK' || !result.Data?.PhoneNumber) {
      throw new HttpException(
        `获取手机号失败: ${result.Message ?? '请检查网络环境后重试'}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return result.Data.PhoneNumber;
  }
}
