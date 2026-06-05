import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module'
import { TaxonomyController } from './taxonomy.controller'
import { TaxonomyService } from './taxonomy.service'

@Module({
  imports: [UsersModule],
  controllers: [TaxonomyController],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
