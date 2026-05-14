import type { IUser } from '@florist/contracts';
import type { User } from '@prisma/client';
import { DatabaseCryptoService } from '../../../common/services/database-crypto.service';

export function toUserEntity(user: User, cryptoService: DatabaseCryptoService): IUser {
  const city = cryptoService.decryptText(user.cityCipher);
  const phoneMasked = cryptoService.decryptText(user.phoneMaskedCipher);
  const loginType = user.loginType as NonNullable<IUser['loginType']>;

  return {
    id: user.id,
    nickname: user.nickname,
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    ...(user.profileSignature ? { profileSignature: user.profileSignature } : {}),
    ...(city ? { city } : {}),
    ...(phoneMasked ? { phoneMasked } : {}),
    ...(user.loginType ? { loginType } : {}),
    status: user.status as IUser['status'],
    ...(user.lastLoginAt ? { lastLoginAt: user.lastLoginAt.toISOString() } : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
