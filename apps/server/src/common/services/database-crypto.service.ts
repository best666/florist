import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnvConfig } from '../../config/server-env';

const CRYPTO_PREFIX = 'v1';

@Injectable()
export class DatabaseCryptoService {
  private readonly secretKey: Buffer;

  public constructor(configService: ConfigService) {
    const appEnv = configService.getOrThrow<ServerEnvConfig>('app');
    this.secretKey = createHash('sha256')
      .update(appEnv.databaseEncryptionKey)
      .digest();
  }

  public encryptText(plainText: string): string {
    if (plainText.trim().length === 0) {
      return plainText;
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.secretKey, iv);
    const encryptedBuffer = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      CRYPTO_PREFIX,
      iv.toString('hex'),
      authTag.toString('hex'),
      encryptedBuffer.toString('hex'),
    ].join(':');
  }

  public decryptText(cipherText?: string | null): string | undefined {
    if (!cipherText) {
      return undefined;
    }

    const [prefix, ivHex, authTagHex, encryptedHex] = cipherText.split(':');

    if (prefix !== CRYPTO_PREFIX || !ivHex || !authTagHex || !encryptedHex) {
      return cipherText;
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.secretKey,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const decryptedBuffer = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);

    return decryptedBuffer.toString('utf8');
  }
}
