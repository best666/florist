import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImageAssetItemDto {
  @IsString()
  public id!: string;

  @IsString()
  public url!: string;

  @IsOptional()
  @IsString()
  public compressedUrl?: string;

  @IsDateString()
  public createdAt!: string;
}

export class ImageAssetArrayDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAssetItemDto)
  public items!: ImageAssetItemDto[];
}
