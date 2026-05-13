import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ImageAssetItemDto } from '../../../common/dto/image-asset.dto';

export class CreateFeedbackDto {
  @IsString()
  @MaxLength(1000)
  public content!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAssetItemDto)
  public images!: ImageAssetItemDto[];
}
