import { Module } from '@nestjs/common';
import { AiProxyModule } from '../ai-proxy/ai-proxy.module';
import { AdminModule } from '../admin/admin.module';
import { UsersModule } from '../users/users.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [UsersModule, AdminModule, AiProxyModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
