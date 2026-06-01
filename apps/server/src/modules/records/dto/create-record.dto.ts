import { RecordActionType } from '@florist/contracts';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ImageAssetItemDto } from '../../../common/dto/image-asset.dto';

export class CreateRecordDto {
  @IsString()
  public flowerId!: string;

  @IsEnum(RecordActionType)
  public actionType!: RecordActionType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  public note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAssetItemDto)
  public images!: ImageAssetItemDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  public cooldownMinutes?: number;
}

export class UndoRecordResponseDto {
  public succeeded!: boolean;
}

export class RecordUndoLogDto {
  public id!: string;
  public recordId!: string;
  public flowerId!: string;
  public actionType!: string;
  public revertedAt!: string;
  public originalCreatedAt!: string;
  public note?: string;
}
