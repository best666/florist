import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UpsertFlowerDto } from './upsert-flower.dto';

export class SyncFlowerDto extends UpsertFlowerDto {
  @IsString()
  public id!: string;

  @IsDateString()
  public createdAt!: string;

  @IsOptional()
  @IsDateString()
  public updatedAt?: string;

  @IsOptional()
  public isDeleted?: boolean;

  @IsOptional()
  @IsDateString()
  public deletedAt?: string;

  @IsOptional()
  @IsDateString()
  public pendingPurgeAt?: string;
}

export class SyncFlowerBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncFlowerDto)
  public items!: SyncFlowerDto[];
}
