import { createHash, createHmac, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
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

@Injectable()
export class SmsService {
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private readonly signName: string;
  private readonly templateCode: string;
  private readonly isConfigured: boolean;

  public constructor(configService: ConfigService) {
    const config = configService.getOrThrow<ServerEnvConfig>('app');
    this.accessKeyId = config.aliyunSmsAccessKeyId;
    this.accessKeySecret = config.aliyunSmsAccessKeySecret;
    this.signName = config.aliyunSmsSignName;
    this.templateCode = config.aliyunSmsTemplateCode;
    this.isConfigured = Boolean(
      this.accessKeyId && this.accessKeySecret && this.signName && this.templateCode,
    );
  }

  /** 是否已配置阿里云短信（未配置时使用本地开发模式） */
  public get configured(): boolean {
    return this.isConfigured;
  }

  /** 生成 6 位随机数字验证码 */
  public generateCode(): string {
    return String(randomInt(100_000, 999_999));
  }

  /** 通过阿里云短信发送验证码 */
  public async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    if (!this.isConfigured) {
      return;
    }

    const params: Record<string, string> = {
      AccessKeyId: this.accessKeyId,
      Action: 'SendSms',
      Format: 'JSON',
      OutId: createHash('md5').update(`${phoneNumber}:${Date.now()}`).digest('hex'),
      PhoneNumbers: phoneNumber,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: createHash('md5').update(`${Date.now()}:${Math.random()}`).digest('hex'),
      SignatureVersion: '1.0',
      SignName: this.signName,
      TemplateCode: this.templateCode,
      TemplateParam: JSON.stringify({ code }),
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

    const response = await fetch(`https://dysmsapi.aliyuncs.com/?${queryString}&Signature=${percentEncode(signature)}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`阿里云短信发送失败: HTTP ${response.status}`);
    }

    const result = await response.json() as { Code?: string; Message?: string };

    if (result.Code !== 'OK') {
      throw new Error(`阿里云短信发送失败: ${result.Code ?? 'Unknown'} - ${result.Message ?? ''}`);
    }
  }
}
