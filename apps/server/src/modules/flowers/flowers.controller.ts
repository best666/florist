import type { IFlower } from '@florist/contracts';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { FlowersService } from './flowers.service';
import { UpsertFlowerDto } from './dto/upsert-flower.dto';

@Controller('flowers')
export class FlowersController {
  public constructor(private readonly flowersService: FlowersService) {}

  @Get()
  public getFlowerCenter() {
    return this.flowersService.getFlowerCenter();
  }

  @Post()
  public createFlower(@Body() payload: UpsertFlowerDto): Promise<IFlower> {
    return this.flowersService.upsertFlower(payload);
  }

  @Patch(':id')
  public updateFlower(
    @Param('id') flowerId: string,
    @Body() payload: UpsertFlowerDto,
  ): Promise<IFlower> {
    return this.flowersService.upsertFlower(payload, flowerId);
  }

  @Post(':id/recycle')
  public moveFlowerToRecycleBin(@Param('id') flowerId: string): Promise<IFlower> {
    return this.flowersService.moveFlowerToRecycleBin(flowerId);
  }
}
