import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsString, ValidateNested } from 'class-validator';
import { CreateRecordDto } from './create-record.dto';

export class SyncRecordDto extends CreateRecordDto {
  @IsString()
  declare public id: string;

  @IsDateString()
  public createdAt!: string;
}

export class SyncRecordBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncRecordDto)
  public items!: SyncRecordDto[];
}
