import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UploadImageDto {
  @IsString()
  @MaxLength(16 * 1024 * 1024)
  public dataUrl!: string;

  @IsString()
  @IsIn(['avatar', 'flower', 'record'])
  public scope!: 'avatar' | 'flower' | 'record';

  @IsOptional()
  @IsString()
  @IsIn(['none', 'square', 'card'])
  public cropMode?: 'none' | 'square' | 'card';

  @IsOptional()
  @IsInt()
  @Min(240)
  @Max(1600)
  public maxWidth?: number;

  @IsOptional()
  @IsInt()
  @Min(40)
  @Max(96)
  public quality?: number;
}
