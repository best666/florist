import { Module } from '@nestjs/common';
import { AiProxyModule } from './modules/ai-proxy/ai-proxy.module';
import { HealthModule } from './modules/health/health.module';
import { ImageModule } from './modules/image/image.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [HealthModule, AiProxyModule, ImageModule, SyncModule, SchedulerModule],
})
export class AppModule {}
