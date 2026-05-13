import type { IUser } from '@florist/contracts';
import { UserStatus } from '@florist/contracts';
import { Injectable } from '@nestjs/common';
import { DEFAULT_LOCAL_USER_ID, DEFAULT_LOCAL_USER_NICKNAME } from '../../common/constants/default-user';
import { DatabaseCryptoService } from '../../common/services/database-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';
import { toUserEntity } from './entities/user.entity';

function normalizeOptionalString(value?: string): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : null;
}

@Injectable()
export class UsersService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: DatabaseCryptoService,
  ) {}

  public async ensureDefaultUserId(): Promise<string> {
    await this.prisma.user.upsert({
      where: { id: DEFAULT_LOCAL_USER_ID },
      update: {},
      create: {
        id: DEFAULT_LOCAL_USER_ID,
        nickname: DEFAULT_LOCAL_USER_NICKNAME,
        status: UserStatus.Normal,
      },
    });

    return DEFAULT_LOCAL_USER_ID;
  }

  public async getCurrentUser(): Promise<IUser> {
    const userId = await this.ensureDefaultUserId();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return toUserEntity(user, this.cryptoService);
  }

  public async updateCurrentUser(payload: UpdateCurrentUserDto): Promise<IUser> {
    const userId = await this.ensureDefaultUserId();
    const currentUser = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: payload.nickname?.trim() || currentUser.nickname,
        avatarUrl: normalizeOptionalString(payload.avatarUrl),
        cityCipher: payload.city
          ? this.cryptoService.encryptText(payload.city.trim())
          : null,
        phoneMaskedCipher: payload.phoneMasked
          ? this.cryptoService.encryptText(payload.phoneMasked.trim())
          : null,
      },
    });

    return toUserEntity(updatedUser, this.cryptoService);
  }
}
