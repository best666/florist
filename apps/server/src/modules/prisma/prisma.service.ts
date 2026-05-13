import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { ServerEnvConfig } from '../../config/server-env';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public constructor(configService: ConfigService) {
    const appEnv = configService.getOrThrow<ServerEnvConfig>('app');

    super({
      adapter: new PrismaMariaDb(appEnv.databaseUrl),
    });
  }

  public async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
