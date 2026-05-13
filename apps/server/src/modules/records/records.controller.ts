import type { IRecord } from '@florist/contracts';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateRecordDto } from './dto/create-record.dto';
import { RecordCenterResponse, RecordsService } from './records.service';

@Controller('records')
export class RecordsController {
  public constructor(private readonly recordsService: RecordsService) {}

  @Get()
  public getRecordCenter(): Promise<RecordCenterResponse> {
    return this.recordsService.getRecordCenter();
  }

  @Post()
  public createRecord(@Body() payload: CreateRecordDto): Promise<IRecord> {
    return this.recordsService.addRecord(payload);
  }

  @Post(':id/undo')
  public undoRecord(@Param('id') recordId: string) {
    return this.recordsService.undoRecord(recordId);
  }
}
