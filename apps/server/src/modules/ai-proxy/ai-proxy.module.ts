import { Module } from '@nestjs/common';
import { FlowersModule } from '../flowers/flowers.module';
import { ImageModule } from '../image/image.module';
import { UsersModule } from '../users/users.module';
import { WeatherModule } from '../weather/weather.module';
import { AiProxyController } from './ai-proxy.controller';
import { AiProxyService } from './ai-proxy.service';

@Module({
	imports: [FlowersModule, WeatherModule, ImageModule, UsersModule],
	controllers: [AiProxyController],
	providers: [AiProxyService],
})
export class AiProxyModule {}
