import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AdminSession } from './admin-auth.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminService, type AdminDashboardResponse, type AdminFeedbackItem, type AdminOperationConfigs, type AdminUserListItem } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import { UpdateUserMemberDto } from './dto/update-user-member.dto';
import { UpsertOperationConfigDto } from './dto/upsert-operation-config.dto';

interface AdminRequest {
  headers?: Record<string, string | string[] | undefined>;
  adminSession?: AdminSession;
}

interface AdminResponse {
  setHeader: (name: string, value: string) => void;
}

@Controller('admin')
export class AdminController {
  public constructor(
    private readonly adminService: AdminService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  @Post('auth/login')
  @HttpCode(200)
  public login(
    @Body() payload: AdminLoginDto,
    @Res({ passthrough: true }) response: AdminResponse,
  ): { username: string; expiresAt: string } {
    const username = payload.username.trim();

    if (!this.adminAuthService.validateCredentials(username, payload.password)) {
      throw new UnauthorizedException('管理员账号或密码错误');
    }

    const session = this.adminAuthService.createSession(username);
    response.setHeader('Set-Cookie', this.adminAuthService.buildSessionCookie(session.token));

    return {
      username: session.username,
      expiresAt: session.expiresAt,
    };
  }

  @Post('auth/logout')
  @HttpCode(200)
  public logout(@Res({ passthrough: true }) response: AdminResponse): { loggedOut: boolean } {
    response.setHeader('Set-Cookie', this.adminAuthService.buildLogoutCookie());
    return { loggedOut: true };
  }

  @Get('auth/session')
  public getSession(@Req() request: AdminRequest): { active: boolean; username?: string; expiresAt?: string } {
    const cookieHeader = request.headers?.cookie;
    const normalizedCookieHeader = Array.isArray(cookieHeader)
      ? cookieHeader.join('; ')
      : cookieHeader;
    const adminSession = this.adminAuthService.resolveSession(normalizedCookieHeader);

    if (!adminSession) {
      return { active: false };
    }

    return {
      active: true,
      username: adminSession.username,
      expiresAt: adminSession.expiresAt,
    };
  }

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  public getDashboard(): Promise<AdminDashboardResponse> {
    return this.adminService.getDashboard();
  }

  @Patch('users/:id/member')
  @UseGuards(AdminAuthGuard)
  public updateUserMember(
    @Param('id') userId: string,
    @Body() payload: UpdateUserMemberDto,
  ): Promise<AdminUserListItem> {
    return this.adminService.updateUserMember(userId, payload);
  }

  @Patch('feedback/:id/reply')
  @UseGuards(AdminAuthGuard)
  public replyFeedback(
    @Param('id') feedbackId: string,
    @Body() payload: ReplyFeedbackDto,
    @Req() request: AdminRequest,
  ): Promise<AdminFeedbackItem> {
    return this.adminService.replyFeedback(
      feedbackId,
      payload,
      request.adminSession?.username ?? 'admin',
    );
  }

  @Put('configs/operation')
  @UseGuards(AdminAuthGuard)
  public upsertOperationConfigs(
    @Body() payload: UpsertOperationConfigDto,
  ): Promise<AdminOperationConfigs> {
    return this.adminService.upsertOperationConfigs(payload);
  }
}
