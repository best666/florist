import { Module } from '@nestjs/common';
import { FlowersModule } from '../flowers/flowers.module';
import { WeatherModule } from '../weather/weather.module';
import { AiProxyController } from './ai-proxy.controller';
import { AiProxyService } from './ai-proxy.service';

@Module({
	imports: [FlowersModule, WeatherModule],
	controllers: [AiProxyController],
	providers: [AiProxyService],
})
export class AiProxyModule {}
