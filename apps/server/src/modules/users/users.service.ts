import { createHash, randomInt } from 'node:crypto';
import type { IUser, IUserAuthSession, UserLoginType } from '@florist/contracts';
import { UserStatus } from '@florist/contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User as UserRecord } from '@prisma/client';
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

function maskPhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\s+/g, '');

  if (!/^1\d{10}$/.test(digits)) {
    return digits;
  }

  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

const FLOWER_NICKNAME_PREFIXES = [
  '晚樱',
  '青藤',
  '晓露',
  '晴岚',
  '疏影',
  '听雨',
  '映月',
  '南枝',
  '拾光',
  '落霞',
] as const;

const FLOWER_NICKNAME_SUFFIXES = [
  '茉莉',
  '山茶',
  '铃兰',
  '木槿',
  '海棠',
  '芍药',
  '玉兰',
  '桔梗',
  '鸢尾',
  '雏菊',
] as const;

@Injectable()
export class UsersService {
  private defaultUserReadyPromise: Promise<string> | null = null;

  public constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: DatabaseCryptoService,
  ) {}

  public async ensureDefaultUserId(): Promise<string> {
    if (this.defaultUserReadyPromise) {
      return this.defaultUserReadyPromise;
    }

    this.defaultUserReadyPromise = this.prisma.user.findUnique({
      where: { id: DEFAULT_LOCAL_USER_ID },
    }).then(async (existingUser) => {
      if (existingUser) {
        return DEFAULT_LOCAL_USER_ID;
      }

      try {
        await this.prisma.user.create({
          data: {
            id: DEFAULT_LOCAL_USER_ID,
            nickname: DEFAULT_LOCAL_USER_NICKNAME,
            loginType: DEFAULT_LOCAL_USER_LOGIN_TYPE,
            status: UserStatus.Normal,
            lastLoginAt: new Date(),
          },
        });

        return DEFAULT_LOCAL_USER_ID;
      }
      catch (error) {
        const createdUser = await this.prisma.user.findUnique({
          where: { id: DEFAULT_LOCAL_USER_ID },
        });

        if (createdUser) {
          return DEFAULT_LOCAL_USER_ID;
        }

        throw error;
      }
    })
      .catch((error) => {
        this.defaultUserReadyPromise = null;
        throw error;
      });

    return this.defaultUserReadyPromise;
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
        nickname: this.resolveDefaultNickname(input.nickname),
        avatarUrl: normalizeOptionalString(input.avatarUrl),
        loginType: input.loginType,
        wechatOpenIdHash: input.wechatOpenIdHash,
        status: UserStatus.Normal,
        lastLoginAt: now,
      },
    });

    return this.buildUserSession(createdUser.id, true);
  }

  /**
   * H5 手机号登录：以 phoneHash 作为跨端统一标识。
   *
   * 1. 计算 phoneHash → 优先按 phoneHash 查找（可发现微信端已绑定同一手机号的用户）
   * 2. 如果 phoneHash 匹配到已有用户 → 更新并返回该用户（跨端合并）
   * 3. 如果未匹配 → 按确定性 ID 查找（兼容旧数据）
   * 4. 都不存在 → 创建新用户，同时写入 phoneHash
   */
  public async loginH5PhoneUser(input: {
    phoneNumber: string;
    nickname?: string;
    loginType: UserLoginType;
  }): Promise<IUserAuthSession> {
    const now = new Date();
    const normalizedPhone = input.phoneNumber.trim();
    const phoneHash = createHash('sha256').update(normalizedPhone).digest('hex');
    const deterministicId = `h5-phone-${phoneHash.slice(0, 24)}`;
    const phoneMasked = maskPhoneNumber(normalizedPhone);
    const phoneMaskedCipher = this.cryptoService.encryptText(phoneMasked);

    // 1. 优先按 phoneHash 查找 —— 支持跨端账号发现
    const phoneUser = await this.prisma.user.findUnique({
      where: { phoneHash },
    });

    if (phoneUser) {
      await this.prisma.user.update({
        where: { id: phoneUser.id },
        data: {
          nickname: input.nickname?.trim() || phoneUser.nickname,
          phoneMaskedCipher,
          lastLoginAt: now,
        },
      });

      return this.buildUserSession(phoneUser.id, false);
    }

    // 2. 按确定性 ID 查找 —— 兼容 phoneHash 出现之前的旧用户
    const existingById = await this.prisma.user.findUnique({
      where: { id: deterministicId },
    });

    if (existingById) {
      // 补写 phoneHash（旧用户可能没有）
      await this.prisma.user.update({
        where: { id: existingById.id },
        data: {
          nickname: input.nickname?.trim() || existingById.nickname,
          phoneHash,
          phoneMaskedCipher,
          lastLoginAt: now,
        },
      });

      return this.buildUserSession(existingById.id, false);
    }

    // 3. 创建新用户
    const createdUser = await this.prisma.user.create({
      data: {
        id: deterministicId,
        nickname: this.resolveDefaultNickname(input.nickname),
        loginType: input.loginType,
        phoneHash,
        phoneMaskedCipher,
        status: UserStatus.Normal,
        lastLoginAt: now,
      },
    });

    return this.buildUserSession(createdUser.id, true);
  }

  /**
   * 为当前用户绑定手机号，实现跨端账号统一。
   *
   * 前置检查：
   * 1. 当前用户是否已绑定手机号 → 已绑定则拒绝（防止覆盖已有绑定）
   * 2. 手机号是否已绑定到微信账号 → 已绑定则拒绝（防止窃取他人数据）
   *
   * 合并场景：当前用户无手机号 && 手机号属于一个纯 H5 用户（无微信绑定）
   * → 将 H5 用户的数据迁移到当前用户，清除 H5 用户的 phoneHash。
   */
  public async bindPhoneToUser(
    phoneNumber: string,
    requestUserId?: string,
  ): Promise<IUser> {
    const userId = await this.resolveCurrentUserId(requestUserId);
    const normalizedPhone = phoneNumber.trim();
    const phoneHash = createHash('sha256').update(normalizedPhone).digest('hex');
    const phoneMasked = maskPhoneNumber(normalizedPhone);
    const phoneMaskedCipher = this.cryptoService.encryptText(phoneMasked);

    // 1. 检查当前用户是否已绑定手机号
    const currentUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (currentUser.phoneHash) {
      if (currentUser.phoneHash !== phoneHash) {
        throw new UnauthorizedException('当前账号已绑定手机号，如需更换请先解绑');
      }
      // 同一手机号 → 检查是否有未完成的数据迁移
      // phoneHash 是唯一索引，旧用户已被清除 phoneHash，需通过确定性 ID 查找
      const deterministicId = `h5-phone-${phoneHash.slice(0, 24)}`;
      if (deterministicId !== userId) {
        const orphanUser = await this.prisma.user.findUnique({
          where: { id: deterministicId },
        });
        if (orphanUser && !orphanUser.phoneHash) {
          // 发现孤儿用户（phoneHash 已被清除但数据未迁移）→ 补迁移
          return this.migrateAndBind(
            userId, currentUser, orphanUser, phoneHash, phoneMaskedCipher,
          );
        }
      }
      return toUserEntity(currentUser, this.cryptoService);
    }

    // 2. 检查该手机号是否已被其他用户占用
    const phoneUser = await this.prisma.user.findUnique({
      where: { phoneHash },
    });

    // 手机号未被占用：直接绑定
    if (!phoneUser) {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { phoneHash, phoneMaskedCipher },
      });
      return toUserEntity(updatedUser, this.cryptoService);
    }

    // 3. 手机号已被占用
    if (phoneUser.wechatOpenIdHash) {
      // 对方已绑定微信 → 如果当前用户是 H5-only（无微信），反向合并：
      // 将当前 H5 用户的数据迁移到微信用户，两个端统一为一个账号
      if (!currentUser.wechatOpenIdHash) {
        return this.migrateAndBind(
          phoneUser.id, phoneUser, currentUser, phoneHash, phoneMaskedCipher,
        );
      }
      // 双方都有微信 → 两个微信用户抢同一个手机号 → 拒绝
      throw new UnauthorizedException(
        '该手机号已绑定到其他微信账号，不能重复绑定',
      );
    }

    // 4. 手机号属于一个纯 H5 用户（无微信绑定）→ 合并到当前用户
    return this.migrateAndBind(
      userId, currentUser, phoneUser, phoneHash, phoneMaskedCipher,
    );
  }

  /** 执行数据迁移 + 手机号绑定（可重复调用，幂等） */
  private async migrateAndBind(
    userId: string,
    currentUser: UserRecord,
    oldUser: UserRecord,
    phoneHash: string,
    phoneMaskedCipher: string,
  ): Promise<IUser> {
    const oldUserId = oldUser.id;

    await this.prisma.$transaction(async (tx) => {
      await tx.flower.updateMany({
        where: { userId: oldUserId },
        data: { userId },
      });
      await tx.careRecord.updateMany({
        where: { userId: oldUserId },
        data: { userId },
      });
      await tx.recordUndoLog.updateMany({
        where: { userId: oldUserId },
        data: { userId },
      });
      await tx.taxonomyItem.updateMany({
        where: { userId: oldUserId },
        data: { userId },
      });

      const currentMember = await tx.member.findUnique({ where: { userId } });
      if (!currentMember) {
        await tx.member.updateMany({
          where: { userId: oldUserId },
          data: { userId },
        });
      } else {
        await tx.member.deleteMany({ where: { userId: oldUserId } });
      }

      await tx.feedback.updateMany({
        where: { userId: oldUserId },
        data: { userId },
      });
      await tx.feedbackVote.updateMany({
        where: { userId: oldUserId },
        data: { userId },
      });
      await tx.feedbackComment.updateMany({
        where: { userId: oldUserId },
        data: { userId },
      });

      const profileMerge: Record<string, unknown> = {
        phoneHash,
        phoneMaskedCipher,
      };
      if (!currentUser.avatarUrl && oldUser.avatarUrl) {
        profileMerge.avatarUrl = oldUser.avatarUrl;
      }
      if (!currentUser.profileSignature && oldUser.profileSignature) {
        profileMerge.profileSignature = oldUser.profileSignature;
      }

      await tx.user.update({
        where: { id: oldUserId },
        data: { phoneHash: null },
      });
      await tx.user.update({
        where: { id: userId },
        data: profileMerge,
      });
    });

    return toUserEntity(
      await this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.cryptoService,
    );
  }

  public async getCurrentUser(requestUserId?: string): Promise<IUser> {
    const userId = await this.resolveCurrentUserId(requestUserId);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return toUserEntity(user, this.cryptoService);
  }

  private resolveDefaultNickname(nickname?: string): string {
    const normalizedNickname = nickname?.trim();

    if (normalizedNickname) {
      return normalizedNickname;
    }

    const prefix = FLOWER_NICKNAME_PREFIXES[randomInt(0, FLOWER_NICKNAME_PREFIXES.length)] ?? '晚樱';
    const suffix = FLOWER_NICKNAME_SUFFIXES[randomInt(0, FLOWER_NICKNAME_SUFFIXES.length)] ?? '茉莉';

    return `${prefix}${suffix}`;
  }

  public async updateCurrentUser(payload: UpdateCurrentUserDto, requestUserId?: string): Promise<IUser> {
    const userId = await this.resolveCurrentUserId(requestUserId);
    const currentUser = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: payload.nickname?.trim() || currentUser.nickname,
        avatarUrl: normalizeOptionalString(payload.avatarUrl),
        profileSignature: normalizeOptionalString(payload.profileSignature),
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
