import type { IFlower } from '@florist/contracts';
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { FlowersService } from './flowers.service';
import { SyncFlowerBatchDto } from './dto/sync-flower.dto';
import { UpsertFlowerDto } from './dto/upsert-flower.dto';

@Controller('flowers')
export class FlowersController {
  public constructor(private readonly flowersService: FlowersService) {}

  @Get()
  public getFlowerCenter(@CurrentUserId() userId?: string) {
    return this.flowersService.getFlowerCenter(userId);
  }

  @Get('recycle-bin')
  public getRecycleBin(@CurrentUserId() userId?: string): Promise<ReadonlyArray<IFlower>> {
    return this.flowersService.listRecycleBin(userId);
  }

  @Get(':id')
  public getFlowerById(
    @CurrentUserId() userId: string | undefined,
    @Param('id') flowerId: string,
  ): Promise<IFlower> {
    return this.flowersService.getFlowerById(flowerId, userId);
  }

  @Post()
  public createFlower(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: UpsertFlowerDto,
  ): Promise<IFlower> {
    return this.flowersService.upsertFlower(payload, undefined, userId);
  }

  @Post('sync/batch')
  public syncFlowersBatch(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: SyncFlowerBatchDto,
  ) {
    return this.flowersService.syncFlowersBatch(payload.items, userId);
  }

  @Patch(':id')
  public updateFlower(
    @CurrentUserId() userId: string | undefined,
    @Param('id') flowerId: string,
    @Body() payload: UpsertFlowerDto,
  ): Promise<IFlower> {
    return this.flowersService.upsertFlower(payload, flowerId, userId);
  }

  @Delete(':id')
  public moveFlowerToRecycleBin(
    @CurrentUserId() userId: string | undefined,
    @Param('id') flowerId: string,
  ): Promise<IFlower> {
    return this.flowersService.moveFlowerToRecycleBin(flowerId, userId);
  }

  @Post(':id/restore')
  public restoreFlower(
    @CurrentUserId() userId: string | undefined,
    @Param('id') flowerId: string,
  ): Promise<IFlower> {
    return this.flowersService.restoreFlower(flowerId, userId);
  }

  @Delete('recycle-bin/:id')
  public purgeFlower(
    @CurrentUserId() userId: string | undefined,
    @Param('id') flowerId: string,
  ): Promise<{ removedId: string }> {
    return this.flowersService.purgeFlower(flowerId, userId);
  }
}
