import { TaxonomyType } from '@florist/contracts'
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateTaxonomyItemDto {
  @IsEnum(TaxonomyType)
  public type!: TaxonomyType

  @IsString()
  @MaxLength(20)
  public label!: string

  @IsString()
  @MaxLength(32)
  public baseValue!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  public sortOrder?: number
}

export class UpdateTaxonomyItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  public label?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public baseValue?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  public sortOrder?: number
}

export class SyncTaxonomyItemDto {
  @IsString()
  public id!: string

  @IsEnum(TaxonomyType)
  public type!: TaxonomyType

  @IsString()
  @MaxLength(20)
  public label!: string

  @IsString()
  @MaxLength(32)
  public baseValue!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  public sortOrder?: number
}
