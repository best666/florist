import { createHash } from 'node:crypto';
import type { IUserAuthSession } from '@florist/contracts';
import { UserLoginType } from '@florist/contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createEntityId } from '../../common/utils/entity-id';
import { UsersService } from '../users/users.service';
import { LoginAnonymousUserDto, RegisterAnonymousUserDto } from './dto/login-anonymous.dto';
import { LoginWechatUserDto } from './dto/login-wechat.dto';

@Injectable()
export class AuthService {
  public constructor(private readonly usersService: UsersService) {}

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
    const wechatOpenIdHash = createHash('sha256')
      .update(payload.code.trim())
      .digest('hex');

    return this.usersService.loginWechatUser({
      wechatOpenIdHash,
      loginType: UserLoginType.WechatMiniProgram,
      ...(payload.nickname ? { nickname: payload.nickname } : {}),
      ...(payload.avatarUrl ? { avatarUrl: payload.avatarUrl } : {}),
    });
  }

  public async getSession(userId?: string): Promise<IUserAuthSession> {
    const resolvedUserId = await this.usersService.resolveCurrentUserId(userId);
    return this.usersService.buildUserSession(resolvedUserId, false);
  }
}
