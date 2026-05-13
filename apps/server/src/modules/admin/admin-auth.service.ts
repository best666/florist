import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnvConfig } from '../../config/server-env';

export interface AdminSession {
  readonly username: string;
  readonly expiresAt: string;
}

interface AdminSessionTokenPayload extends AdminSession {
  readonly token: string;
}

@Injectable()
export class AdminAuthService {
  public static readonly cookieName = 'florist_admin_session';
  private readonly appEnv: ServerEnvConfig;

  public constructor(configService: ConfigService) {
    this.appEnv = configService.getOrThrow<ServerEnvConfig>('app');
  }

  public validateCredentials(username: string, password: string): boolean {
    return this.safeEquals(username.trim(), this.appEnv.adminUsername)
      && this.safeEquals(password, this.appEnv.adminPassword);
  }

  public createSession(username: string): AdminSessionTokenPayload {
    const expiresAt = new Date(Date.now() + this.appEnv.adminSessionTtlMs).toISOString();
    const payload = Buffer.from(JSON.stringify({ username, expiresAt }), 'utf8').toString('base64url');
    const signature = this.sign(payload);

    return {
      username,
      expiresAt,
      token: `${payload}.${signature}`,
    };
  }

  public resolveSession(cookieHeader?: string): AdminSession | null {
    const token = this.readCookie(cookieHeader, AdminAuthService.cookieName);

    if (!token) {
      return null;
    }

    const [payload, signature] = token.split('.');

    if (!payload || !signature) {
      return null;
    }

    if (!this.safeEquals(signature, this.sign(payload))) {
      return null;
    }

    let parsedPayload: { username?: string; expiresAt?: string };

    try {
      parsedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        username?: string;
        expiresAt?: string;
      };
    }
    catch {
      return null;
    }

    const username = parsedPayload.username?.trim();
    const expiresAt = parsedPayload.expiresAt;

    if (!username || !expiresAt) {
      return null;
    }

    if (Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) {
      return null;
    }

    return { username, expiresAt };
  }

  public buildSessionCookie(token: string): string {
    const cookieParts = [
      `${AdminAuthService.cookieName}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${Math.floor(this.appEnv.adminSessionTtlMs / 1000)}`,
    ];

    if (process.env.NODE_ENV === 'production') {
      cookieParts.push('Secure');
    }

    return cookieParts.join('; ');
  }

  public buildLogoutCookie(): string {
    const cookieParts = [
      `${AdminAuthService.cookieName}=`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      'Max-Age=0',
    ];

    if (process.env.NODE_ENV === 'production') {
      cookieParts.push('Secure');
    }

    return cookieParts.join('; ');
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.appEnv.adminSessionSecret)
      .update(payload)
      .digest('hex');
  }

  private readCookie(cookieHeader: string | undefined, cookieName: string): string | undefined {
    if (!cookieHeader) {
      return undefined;
    }

    const targetPrefix = `${cookieName}=`;

    return cookieHeader
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith(targetPrefix))
      ?.slice(targetPrefix.length);
  }

  private safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
