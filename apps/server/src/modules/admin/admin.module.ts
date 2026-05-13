import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminAuthService, AdminAuthGuard, AdminService],
  exports: [AdminAuthService, AdminAuthGuard],
})
export class AdminModule {}
