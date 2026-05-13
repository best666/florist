import { FeedbackStatus } from '@florist/contracts';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class ReplyFeedbackDto {
  @IsEnum(FeedbackStatus)
  public status!: FeedbackStatus;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  public reply!: string;
}
