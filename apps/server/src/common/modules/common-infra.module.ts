import { Global, Module } from '@nestjs/common';
import { CaptchaService } from '../services/captcha.service';
import { PnvsService } from '../services/pnvs.service';
import { RuntimeCacheService } from '../services/runtime-cache.service';
import { RequestMonitorService } from '../services/request-monitor.service';
import { SmsService } from '../services/sms.service';

@Global()
@Module({
  providers: [RuntimeCacheService, RequestMonitorService, SmsService, CaptchaService, PnvsService],
  exports: [RuntimeCacheService, RequestMonitorService, SmsService, CaptchaService, PnvsService],
})
export class CommonInfraModule {}
