import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MembersModule } from '../members/members.module';
import { UsersModule } from '../users/users.module';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';

@Module({
	imports: [ConfigModule, UsersModule, MembersModule],
	controllers: [ImageController],
	providers: [ImageService],
	exports: [ImageService],
})
export class ImageModule {}
