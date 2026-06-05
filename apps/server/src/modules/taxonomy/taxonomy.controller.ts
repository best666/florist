import { TaxonomyType } from '@florist/contracts'
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator'
import { UsersService } from '../users/users.service'
import { CreateTaxonomyItemDto, UpdateTaxonomyItemDto, SyncTaxonomyItemDto } from './dto/taxonomy.dto'
import { TaxonomyService } from './taxonomy.service'

@Controller('taxonomy')
export class TaxonomyController {
  constructor(
    private readonly taxonomyService: TaxonomyService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveUserId(input?: string): Promise<string> {
    return this.usersService.resolveCurrentUserId(input)
  }

  @Get()
  public async listItems(
    @CurrentUserId() userId: string | undefined,
    @Query('type') type?: TaxonomyType,
  ) {
    const resolvedUserId = await this.resolveUserId(userId)
    return this.taxonomyService.listItems(resolvedUserId, type)
  }

  @Post()
  public async createItem(
    @CurrentUserId() userId: string | undefined,
    @Body() dto: CreateTaxonomyItemDto,
  ) {
    const resolvedUserId = await this.resolveUserId(userId)
    return this.taxonomyService.createItem(resolvedUserId, dto)
  }

  @Patch(':id')
  public async updateItem(
    @Param('id') id: string,
    @CurrentUserId() userId: string | undefined,
    @Body() dto: UpdateTaxonomyItemDto,
  ) {
    const resolvedUserId = await this.resolveUserId(userId)
    return this.taxonomyService.updateItem(id, resolvedUserId, dto)
  }

  @Delete(':id')
  public async deleteItem(
    @Param('id') id: string,
    @CurrentUserId() userId: string | undefined,
  ) {
    const resolvedUserId = await this.resolveUserId(userId)
    return this.taxonomyService.deleteItem(id, resolvedUserId)
  }

  @Post('sync')
  public async syncBatch(
    @CurrentUserId() userId: string | undefined,
    @Body() items: SyncTaxonomyItemDto[],
  ) {
    const resolvedUserId = await this.resolveUserId(userId)
    return this.taxonomyService.syncBatch(resolvedUserId, items)
  }
}
