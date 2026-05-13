import { Controller, Get, Post } from '@nestjs/common';
import { BackupsService, type BackupStatusResponse } from './backups.service';

@Controller('backups')
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
