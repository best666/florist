import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ServerEnvConfig } from '../../config/server-env';
import { DatabaseCryptoService } from '../../common/services/database-crypto.service';
import { PrismaService } from '../prisma/prisma.service';

export interface BackupStatusResponse {
  backupDir: string;
  retentionDays: number;
  latestBackupFile?: string;
  latestBackupAt?: string;
}

@Injectable()
export class BackupsService {
  private readonly appEnv: ServerEnvConfig;

  public constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cryptoService: DatabaseCryptoService,
  ) {
    this.appEnv = configService.getOrThrow<ServerEnvConfig>('app');
  }

  public async getBackupStatus(): Promise<BackupStatusResponse> {
    const backupDir = path.resolve(process.cwd(), this.appEnv.backupDir);
    await mkdir(backupDir, { recursive: true });
    const files = await readdir(backupDir);
    const backupFiles = files.filter(fileName => fileName.endsWith('.bak'));

    if (backupFiles.length === 0) {
      return {
        backupDir,
        retentionDays: this.appEnv.backupRetentionDays,
      };
    }

    const latestBackupFile = backupFiles.sort().at(-1)!;
    const latestBackupStat = await stat(path.join(backupDir, latestBackupFile));

    return {
      backupDir,
      retentionDays: this.appEnv.backupRetentionDays,
      latestBackupFile,
      latestBackupAt: latestBackupStat.mtime.toISOString(),
    };
  }

  public async runBackup(reason: 'manual' | 'scheduled' = 'manual'): Promise<BackupStatusResponse> {
    const backupDir = path.resolve(process.cwd(), this.appEnv.backupDir);
    await mkdir(backupDir, { recursive: true });

    const payload = {
      reason,
      createdAt: new Date().toISOString(),
      users: await this.prisma.user.findMany({ orderBy: { updatedAt: 'desc' } }),
      flowers: await this.prisma.flower.findMany({ include: { images: true }, orderBy: { updatedAt: 'desc' } }),
      records: await this.prisma.careRecord.findMany({ include: { images: true }, orderBy: { createdAt: 'desc' } }),
      members: await this.prisma.member.findMany({ orderBy: { updatedAt: 'desc' } }),
      feedbacks: await this.prisma.feedback.findMany({ include: { images: true }, orderBy: { updatedAt: 'desc' } }),
    };
    const fileName = `florist-backup-${payload.createdAt.replace(/[:.]/g, '-')}.bak`;
    const filePath = path.join(backupDir, fileName);
    const encryptedBackup = this.cryptoService.encryptText(JSON.stringify(payload));

    await writeFile(filePath, encryptedBackup, 'utf8');
    await this.cleanupExpiredBackups(backupDir);

    return this.getBackupStatus();
  }

  public async readLatestBackupPreview(): Promise<string | null> {
    const status = await this.getBackupStatus();

    if (!status.latestBackupFile) {
      return null;
    }

    const backupPath = path.join(status.backupDir, status.latestBackupFile);
    const encryptedContent = await readFile(backupPath, 'utf8');

    return this.cryptoService.decryptText(encryptedContent) ?? null;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  public async handleScheduledBackup(): Promise<void> {
    await this.runBackup('scheduled');
  }

  private async cleanupExpiredBackups(backupDir: string): Promise<void> {
    const backupFiles = (await readdir(backupDir)).filter(fileName => fileName.endsWith('.bak'));
    const expiredBefore = Date.now() - (this.appEnv.backupRetentionDays * 24 * 60 * 60 * 1000);

    await Promise.all(backupFiles.map(async (fileName) => {
      const filePath = path.join(backupDir, fileName);
      const fileStat = await stat(filePath);

      if (fileStat.mtime.getTime() < expiredBefore) {
        await rm(filePath, { force: true });
      }
    }));
  }
}
