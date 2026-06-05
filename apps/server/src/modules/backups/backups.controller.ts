import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin/admin-auth.guard';
import { BackupsService, type BackupStatusResponse } from './backups.service';

@Controller('backups')
@UseGuards(AdminAuthGuard)
export class BackupsController {
  public constructor(private readonly backupsService: BackupsService) {}

  @Get('status')
  public getBackupStatus(): Promise<BackupStatusResponse> {
    return this.backupsService.getBackupStatus();
  }

  @Get('latest-preview')
  public getLatestBackupPreview(): Promise<string | null> {
    return this.backupsService.readLatestBackupPreview();
  }

  @Post('run')
  public runBackup(): Promise<BackupStatusResponse> {
    return this.backupsService.runBackup('manual');
  }
}
