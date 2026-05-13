import {
  FlowerCareDifficulty,
  FlowerCategory,
  FlowerPlacement,
  RecordActionType,
  type FlowerHealthStatus,
} from '@florist/contracts';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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

  @IsString()
  @MaxLength(20)
  public season!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  public solarTerm?: string;
}

export class AdviceRecordDto {
  @IsEnum(RecordActionType)
  public actionType!: RecordActionType;

  @IsOptional()
  @IsString()
  public note?: string;

  @IsDateString()
  public createdAt!: string;

  @IsNumber()
  public cooldownMinutes!: number;
}

export class AdviceFlowerDto {
  @IsString()
  public id!: string;

  @IsString()
  public name!: string;

  @IsOptional()
  @IsString()
  public nickname?: string;

  @IsEnum(FlowerPlacement)
  public placement!: FlowerPlacement;

  @IsEnum(FlowerCategory)
  public category!: FlowerCategory;

  @IsEnum(FlowerCareDifficulty)
  public careDifficulty!: FlowerCareDifficulty;

  @IsIn(FLOWER_HEALTH_STATUS_OPTIONS)
  public careStatus!: FlowerHealthStatus;

  @IsOptional()
  @IsString()
  public note?: string;

  @IsOptional()
  @IsDateString()
  public lastWateredAt?: string;

  @IsOptional()
  @IsDateString()
  public lastFertilizedAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdviceRecordDto)
  public records!: AdviceRecordDto[];
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

export class RequestSinglePlantCareAdviceDto {
  @ValidateNested()
  @Type(() => AdviceWeatherDto)
  public weather!: AdviceWeatherDto;

  @ValidateNested()
  @Type(() => AdviceFlowerDto)
  public flower!: AdviceFlowerDto;
}

export class RequestPlantDiagnosisDto {
  @IsString()
  public imageDataUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public imageName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdviceWeatherDto)
  public weather?: AdviceWeatherDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdviceFlowerDto)
  public flower?: AdviceFlowerDto;
}

export class RequestTripCarePlanDto {
  @IsInt()
  @Min(1)
  @Max(30)
  public travelDays!: number;

  @ValidateNested()
  @Type(() => AdviceWeatherDto)
  public weather!: AdviceWeatherDto;

  @ValidateNested()
  @Type(() => AdviceFlowerDto)
  public flower!: AdviceFlowerDto;
}
