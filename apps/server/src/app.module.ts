import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { appConfig } from './config/app.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestTraceInterceptor } from './common/interceptors/request-trace.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { getServerEnvFilePaths, validateServerEnv } from './config/server-env';
import { AiProxyModule } from './modules/ai-proxy/ai-proxy.module';
import { AuthModule } from './modules/auth/auth.module';
import { BackupsModule } from './modules/backups/backups.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { FlowersModule } from './modules/flowers/flowers.module';
import { HealthModule } from './modules/health/health.module';
import { ImageModule } from './modules/image/image.module';
import { MembersModule } from './modules/members/members.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RecordsModule } from './modules/records/records.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SyncModule } from './modules/sync/sync.module';
import { UsersModule } from './modules/users/users.module';
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
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    FlowersModule,
    RecordsModule,
    MembersModule,
    FeedbackModule,
    WeatherModule,
    AiProxyModule,
    ImageModule,
    SyncModule,
    SchedulerModule,
    BackupsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTraceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
