import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CompressImageDto {
  @IsString()
  public dataUrl!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(320)
  @Max(2048)
  public maxWidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(40)
  @Max(95)
  public quality?: number;
}
