import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseCryptoService } from '../../common/services/database-crypto.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [ConfigModule],
  controllers: [UsersController],
  providers: [DatabaseCryptoService, UsersService],
  exports: [DatabaseCryptoService, UsersService],
})
export class UsersModule {}
