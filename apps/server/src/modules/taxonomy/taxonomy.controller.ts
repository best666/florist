import { TaxonomyType } from '@florist/contracts'
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator'
import { CreateTaxonomyItemDto, UpdateTaxonomyItemDto, SyncTaxonomyItemDto } from './dto/taxonomy.dto'
import { TaxonomyService } from './taxonomy.service'

@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Get()
  public listItems(
    @CurrentUserId() userId: string | undefined,
    @Query('type') type?: TaxonomyType,
  ) {
    return this.taxonomyService.listItems(userId ?? '', type)
  }

  @Post()
  public createItem(
    @CurrentUserId() userId: string | undefined,
    @Body() dto: CreateTaxonomyItemDto,
  ) {
    return this.taxonomyService.createItem(userId ?? '', dto)
  }

  @Patch(':id')
  public updateItem(
    @Param('id') id: string,
    @CurrentUserId() userId: string | undefined,
    @Body() dto: UpdateTaxonomyItemDto,
  ) {
    return this.taxonomyService.updateItem(id, userId ?? '', dto)
  }

  @Delete(':id')
  public deleteItem(
    @Param('id') id: string,
    @CurrentUserId() userId: string | undefined,
  ) {
    return this.taxonomyService.deleteItem(id, userId ?? '')
  }

  @Post('sync')
  public syncBatch(
    @CurrentUserId() userId: string | undefined,
    @Body() items: SyncTaxonomyItemDto[],
  ) {
    return this.taxonomyService.syncBatch(userId ?? '', items)
  }
}
