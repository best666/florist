import type { IRecord } from '@florist/contracts';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateRecordDto } from './dto/create-record.dto';
import { RecordCenterResponse, RecordsService } from './records.service';
import { SyncRecordBatchDto } from './dto/sync-record.dto';

@Controller('records')
export class RecordsController {
  public constructor(private readonly recordsService: RecordsService) {}

  @Get()
  public getRecordCenter(@CurrentUserId() userId?: string): Promise<RecordCenterResponse> {
    return this.recordsService.getRecordCenter(userId);
  }

  @Post()
  public createRecord(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: CreateRecordDto,
  ): Promise<IRecord> {
    return this.recordsService.addRecord(payload, userId);
  }

  @Post('sync/batch')
  public syncRecordsBatch(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: SyncRecordBatchDto,
  ): Promise<RecordCenterResponse> {
    return this.recordsService.syncRecordsBatch(payload.items, userId);
  }

  @Post(':id/undo')
  public undoRecord(
    @CurrentUserId() userId: string | undefined,
    @Param('id') recordId: string,
  ) {
    return this.recordsService.undoRecord(recordId, userId);
  }
}
