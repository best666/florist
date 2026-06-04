import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadImageDto {
  @IsString()
  @IsIn(['avatar', 'flower', 'record'])
  public scope!: 'avatar' | 'flower' | 'record';

  @IsOptional()
  @IsString()
  @IsIn(['none', 'square', 'card'])
  public cropMode?: 'none' | 'square' | 'card';

  @IsOptional()
  @Type(() => Number)
  public maxWidth?: number;

  @IsOptional()
  @Type(() => Number)
  public quality?: number;
}
