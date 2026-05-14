import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { UsersModule } from '../users/users.module';
import { FlowersController } from './flowers.controller';
import { FlowersService } from './flowers.service';

@Module({
  imports: [UsersModule, MembersModule],
  controllers: [FlowersController],
  providers: [FlowersService],
  exports: [FlowersService],
})
export class FlowersModule {}
