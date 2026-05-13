import { Body, Controller, Get, Put } from '@nestjs/common';
import { UpsertReminderConfigDto } from './dto/upsert-reminder-config.dto';
import type { ReminderConfigResponse } from './scheduler.service';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
export class SchedulerController {
  public constructor(private readonly schedulerService: SchedulerService) {}

  @Get('reminder-config')
  public getReminderConfig(): Promise<ReminderConfigResponse> {
    return this.schedulerService.getReminderConfig();
  }

  @Put('reminder-config')
  public updateReminderConfig(@Body() payload: UpsertReminderConfigDto): Promise<ReminderConfigResponse> {
    return this.schedulerService.upsertReminderConfig(payload);
  }

  @Get('push-logs')
  public getRecentPushLogs() {
    return this.schedulerService.getRecentPushLogs();
  }
}
