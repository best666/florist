import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { FlowersController } from './flowers.controller';
import { FlowersService } from './flowers.service';

@Module({
  imports: [UsersModule],
  controllers: [FlowersController],
  providers: [FlowersService],
  exports: [FlowersService],
})
export class FlowersModule {}
