import { FlowerPlacement, type FlowerHealthStatus } from '@florist/contracts';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const FLOWER_HEALTH_STATUS_OPTIONS = [
  'watering-needed',
  'healthy',
  'dormant',
  'fertilizing-needed',
] as const satisfies readonly FlowerHealthStatus[];

export class AdviceWeatherDto {
  @IsString()
  public cityName!: string;

  @IsString()
  public weatherText!: string;

  @IsNumber()
  public temperature!: number;

  @IsNumber()
  public humidity!: number;

  @IsNumber()
  public precipitationProbability!: number;

  @IsNumber()
  public windSpeed!: number;
}

export class AdviceFlowerDto {
  @IsString()
  public name!: string;

  @IsOptional()
  @IsString()
  public nickname?: string;

  @IsEnum(FlowerPlacement)
  public placement!: FlowerPlacement;

  @IsIn(FLOWER_HEALTH_STATUS_OPTIONS)
  public careStatus!: FlowerHealthStatus;

  @IsOptional()
  @IsString()
  public lastWateredAt?: string;
}

export class RequestCareAdviceDto {
  @ValidateNested()
  @Type(() => AdviceWeatherDto)
  public weather!: AdviceWeatherDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdviceFlowerDto)
  public flowers!: AdviceFlowerDto[];
}
