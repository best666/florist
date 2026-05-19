import type { FlowerHealthStatus } from '@florist/contracts';
import {
  FlowerCareDifficulty,
  FlowerCategory,
  FlowerPlacement,
} from '@florist/contracts';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ImageAssetItemDto } from '../../../common/dto/image-asset.dto';

const FLOWER_HEALTH_STATUS_OPTIONS = [
  'watering-needed',
  'healthy',
  'dormant',
  'fertilizing-needed',
] as const satisfies readonly FlowerHealthStatus[];

export class UpsertFlowerDto {
  @IsString()
  @MaxLength(40)
  public name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  public nickname?: string;

  @IsEnum(FlowerCategory)
  public category!: FlowerCategory;

  @IsEnum(FlowerPlacement)
  public placement!: FlowerPlacement;

  @IsEnum(FlowerCareDifficulty)
  public careDifficulty!: FlowerCareDifficulty;

  @IsIn(FLOWER_HEALTH_STATUS_OPTIONS)
  public careStatus!: FlowerHealthStatus;

  @IsOptional()
  @IsString()
  public coverImageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  public note?: string;

  @IsOptional()
  @IsDateString()
  public purchasedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999999)
  public priceInCents?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageAssetItemDto)
  public images!: ImageAssetItemDto[];

  @IsOptional()
  @IsDateString()
  public lastWateredAt?: string;

  @IsOptional()
  @IsDateString()
  public lastFertilizedAt?: string;
}
