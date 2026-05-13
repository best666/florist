import { Global, Module } from '@nestjs/common';
import { RuntimeCacheService } from '../services/runtime-cache.service';
import { RequestMonitorService } from '../services/request-monitor.service';

@Global()
@Module({
  providers: [RuntimeCacheService, RequestMonitorService],
  exports: [RuntimeCacheService, RequestMonitorService],
})
export class CommonInfraModule {}
