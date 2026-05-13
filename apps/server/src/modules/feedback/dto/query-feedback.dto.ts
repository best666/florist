import { FeedbackStatus } from '@florist/contracts';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryFeedbackDto {
  @IsOptional()
  @IsEnum(FeedbackStatus)
  public status?: FeedbackStatus;
}

export class UpdateFeedbackStatusDto {
  @IsEnum(FeedbackStatus)
  public status!: FeedbackStatus;
}
