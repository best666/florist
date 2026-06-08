import { Global, Module } from '@nestjs/common';
import { CaptchaService } from '../services/captcha.service';
import { RuntimeCacheService } from '../services/runtime-cache.service';
import { RequestMonitorService } from '../services/request-monitor.service';
import { SmsService } from '../services/sms.service';

@Global()
@Module({
  providers: [RuntimeCacheService, RequestMonitorService, SmsService, CaptchaService],
  exports: [RuntimeCacheService, RequestMonitorService, SmsService, CaptchaService],
})
export class CommonInfraModule {}
