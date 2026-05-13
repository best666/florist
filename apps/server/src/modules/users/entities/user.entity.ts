import type { IUser } from '@florist/contracts';
import type { User } from '@prisma/client';
import { DatabaseCryptoService } from '../../../common/services/database-crypto.service';

export function toUserEntity(user: User, cryptoService: DatabaseCryptoService): IUser {
  const city = cryptoService.decryptText(user.cityCipher);
  const phoneMasked = cryptoService.decryptText(user.phoneMaskedCipher);

  return {
    id: user.id,
    nickname: user.nickname,
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    ...(city ? { city } : {}),
    ...(phoneMasked ? { phoneMasked } : {}),
    status: user.status as IUser['status'],
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
