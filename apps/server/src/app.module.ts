import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { getServerEnvFilePaths, validateServerEnv } from './config/server-env';
import { AiProxyModule } from './modules/ai-proxy/ai-proxy.module';
import { FlowersModule } from './modules/flowers/flowers.module';
import { HealthModule } from './modules/health/health.module';
import { ImageModule } from './modules/image/image.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RecordsModule } from './modules/records/records.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SyncModule } from './modules/sync/sync.module';
import { WeatherModule } from './modules/weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: getServerEnvFilePaths(process.env.NODE_ENV),
      load: [appConfig],
      validate: validateServerEnv,
      expandVariables: true,
    }),
    PrismaModule,
    HealthModule,
    FlowersModule,
    RecordsModule,
    WeatherModule,
    AiProxyModule,
    ImageModule,
    SyncModule,
    SchedulerModule,
  ],
})
export class AppModule {}
