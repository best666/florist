import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';

@Module({
	imports: [ScheduleModule.forRoot(), AdminModule],
	controllers: [SchedulerController],
	providers: [SchedulerService],
	exports: [SchedulerService],
})
export class SchedulerModule {}
