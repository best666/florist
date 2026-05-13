import type { IUser, IUserAuthSession, UserLoginType } from '@florist/contracts';
import { UserStatus } from '@florist/contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  DEFAULT_LOCAL_USER_ID,
  DEFAULT_LOCAL_USER_LOGIN_TYPE,
  DEFAULT_LOCAL_USER_NICKNAME,
} from '../../common/constants/default-user';
import { DatabaseCryptoService } from '../../common/services/database-crypto.service';
import { createEntityId } from '../../common/utils/entity-id';
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
        loginType: DEFAULT_LOCAL_USER_LOGIN_TYPE,
        status: UserStatus.Normal,
        lastLoginAt: new Date(),
      },
    });

    return DEFAULT_LOCAL_USER_ID;
  }

  public async resolveCurrentUserId(requestUserId?: string): Promise<string> {
    const normalizedUserId = requestUserId?.trim();

    if (!normalizedUserId) {
      return this.ensureDefaultUserId();
    }

    const user = await this.prisma.user.findUnique({ where: { id: normalizedUserId } });

    if (!user || user.status !== UserStatus.Normal) {
      throw new UnauthorizedException('当前用户会话无效');
    }

    return user.id;
  }

  public async buildUserSession(userId: string, isNewUser: boolean): Promise<IUserAuthSession> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const userEntity = toUserEntity(user, this.cryptoService);

    return {
      user: userEntity,
      loginType: (userEntity.loginType ?? DEFAULT_LOCAL_USER_LOGIN_TYPE) as UserLoginType,
      sessionUserId: user.id,
      isNewUser,
      loggedInAt: new Date().toISOString(),
    };
  }

  public async createAnonymousUser(nickname?: string): Promise<IUserAuthSession> {
    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        id: createEntityId('user'),
        nickname: nickname?.trim() || DEFAULT_LOCAL_USER_NICKNAME,
        loginType: DEFAULT_LOCAL_USER_LOGIN_TYPE,
        status: UserStatus.Normal,
        lastLoginAt: now,
      },
    });

    return this.buildUserSession(user.id, true);
  }

  public async loginAnonymousUser(userId: string): Promise<IUserAuthSession | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        loginType: DEFAULT_LOCAL_USER_LOGIN_TYPE,
        status: UserStatus.Normal,
      },
    });

    if (!user) {
      return null;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildUserSession(user.id, false);
  }

  public async loginWechatUser(input: {
    wechatOpenIdHash: string;
    nickname?: string;
    avatarUrl?: string;
    loginType: UserLoginType;
  }): Promise<IUserAuthSession> {
    const now = new Date();
    const existingUser = await this.prisma.user.findUnique({
      where: { wechatOpenIdHash: input.wechatOpenIdHash },
    });

    if (existingUser) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          nickname: input.nickname?.trim() || existingUser.nickname,
          avatarUrl: normalizeOptionalString(input.avatarUrl) ?? existingUser.avatarUrl,
          lastLoginAt: now,
        },
      });

      return this.buildUserSession(existingUser.id, false);
    }

    const createdUser = await this.prisma.user.create({
      data: {
        id: createEntityId('user'),
        nickname: input.nickname?.trim() || '微信花友',
        avatarUrl: normalizeOptionalString(input.avatarUrl),
        loginType: input.loginType,
        wechatOpenIdHash: input.wechatOpenIdHash,
        status: UserStatus.Normal,
        lastLoginAt: now,
      },
    });

    return this.buildUserSession(createdUser.id, true);
  }

  public async getCurrentUser(requestUserId?: string): Promise<IUser> {
    const userId = await this.resolveCurrentUserId(requestUserId);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return toUserEntity(user, this.cryptoService);
  }

  public async updateCurrentUser(payload: UpdateCurrentUserDto, requestUserId?: string): Promise<IUser> {
    const userId = await this.resolveCurrentUserId(requestUserId);
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
        lastLoginAt: currentUser.lastLoginAt,
      },
    });

    return toUserEntity(updatedUser, this.cryptoService);
  }
}
