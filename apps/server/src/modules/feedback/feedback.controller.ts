import type { IFeedback } from '@florist/contracts';
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { AdminAuthGuard } from '../admin/admin-auth.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { QueryFeedbackDto, UpdateFeedbackStatusDto } from './dto/query-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  public constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  public listFeedbacks(@CurrentUserId() userId?: string): Promise<ReadonlyArray<IFeedback>> {
    return this.feedbackService.listCurrentUserFeedbacks(userId);
  }

  @Get('admin')
  @UseGuards(AdminAuthGuard)
  public listAdminFeedbacks(@Query() query: QueryFeedbackDto): Promise<ReadonlyArray<IFeedback>> {
    return this.feedbackService.listAdminFeedbacks(query);
  }

  @Post()
  public createFeedback(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: CreateFeedbackDto,
  ): Promise<IFeedback> {
    return this.feedbackService.createFeedback(payload, userId);
  }

  @Patch(':id/status')
  @UseGuards(AdminAuthGuard)
  public updateFeedbackStatus(
    @Param('id') feedbackId: string,
    @Body() payload: UpdateFeedbackStatusDto,
  ): Promise<IFeedback> {
    return this.feedbackService.updateFeedbackStatus(feedbackId, payload);
  }
}
