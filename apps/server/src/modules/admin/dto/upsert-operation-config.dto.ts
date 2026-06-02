import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AdminAdSlotItemDto {
  @IsString()
  @MaxLength(64)
  public id!: string;

  @IsString()
  @MaxLength(64)
  public title!: string;

  @IsString()
  @MaxLength(64)
  public placement!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  public imageUrl?: string;

  @IsUrl({ require_tld: false })
  public targetUrl!: string;

  @IsBoolean()
  public enabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  public note?: string;
}

export class UpsertOperationConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminAdSlotItemDto)
  public adSlots!: AdminAdSlotItemDto[];
}
