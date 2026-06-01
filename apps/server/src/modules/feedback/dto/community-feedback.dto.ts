import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CommunityFeedbackQueryDto {
  @IsOptional()
  @IsString()
  public sort?: 'votes' | 'newest';

  @IsOptional()
  @IsString()
  public cursor?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  public limit: number = 20;
}

export class AddCommentDto {
  @IsString()
  @MaxLength(500)
  public content!: string;
}
