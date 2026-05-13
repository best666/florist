import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertReminderConfigDto {
  @IsBoolean()
  public enabled!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  public reminderHour!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  public reminderMinute!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  public quietStartHour!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  public quietStartMinute!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  public quietEndHour!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  public quietEndMinute!: number;

  @IsString()
  public reminderText!: string;

  @IsOptional()
  @IsString()
  public lastTriggeredDate?: string | null;
}
