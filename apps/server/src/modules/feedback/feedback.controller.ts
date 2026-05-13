import type { IFeedback } from '@florist/contracts';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  public constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  public listFeedbacks(): Promise<ReadonlyArray<IFeedback>> {
    return this.feedbackService.listCurrentUserFeedbacks();
  }

  @Post()
  public createFeedback(@Body() payload: CreateFeedbackDto): Promise<IFeedback> {
    return this.feedbackService.createFeedback(payload);
  }
}
