import { Global, Module } from '@nestjs/common';
import { RuntimeCacheService } from '../services/runtime-cache.service';
import { RequestMonitorService } from '../services/request-monitor.service';
import { SmsService } from '../services/sms.service';

@Global()
@Module({
  providers: [RuntimeCacheService, RequestMonitorService, SmsService],
  exports: [RuntimeCacheService, RequestMonitorService, SmsService],
})
export class CommonInfraModule {}
