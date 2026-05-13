import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class SearchCityQueryDto {
  @IsString()
  @MinLength(1)
  public keyword!: string;
}

export class ReverseGeocodeQueryDto {
  @Type(() => Number)
  @IsNumber()
  public latitude!: number;

  @Type(() => Number)
  @IsNumber()
  public longitude!: number;
}

export class WeatherQueryDto extends ReverseGeocodeQueryDto {
  @IsString()
  public id!: string;

  @IsString()
  public name!: string;

  @IsString()
  public country!: string;

  @IsOptional()
  @IsString()
  public admin1?: string;

  @IsOptional()
  @IsString()
  public timezone?: string;
}
