import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';

@Module({
	imports: [ConfigModule, UsersModule],
	controllers: [ImageController],
	providers: [ImageService],
	exports: [ImageService],
})
export class ImageModule {}
