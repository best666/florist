import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminAuthService, type AdminSession } from './admin-auth.service';

interface AdminGuardRequest {
  headers?: Record<string, string | string[] | undefined>;
  adminSession?: AdminSession;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  public constructor(private readonly adminAuthService: AdminAuthService) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminGuardRequest>();
    const cookieHeader = request.headers?.cookie;
    const normalizedCookieHeader = Array.isArray(cookieHeader)
      ? cookieHeader.join('; ')
      : cookieHeader;
    const adminSession = this.adminAuthService.resolveSession(normalizedCookieHeader);

    if (!adminSession) {
      throw new UnauthorizedException('管理员登录已过期，请重新登录');
    }

    request.adminSession = adminSession;
    return true;
  }
}
