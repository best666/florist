import { Module } from '@nestjs/common';
import { FlowersModule } from '../flowers/flowers.module';
import { UsersModule } from '../users/users.module';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({
  imports: [FlowersModule, UsersModule],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
