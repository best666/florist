import type { IAiAdvice } from '@florist/contracts';
import { Body, Controller, Post } from '@nestjs/common';
import { RequestCareAdviceDto } from './dto/request-care-advice.dto';
import { AiProxyService } from './ai-proxy.service';

@Controller('ai-proxy')
export class AiProxyController {
  public constructor(private readonly aiProxyService: AiProxyService) {}

  @Post('care-advice')
  public getCareAdvice(@Body() payload: RequestCareAdviceDto): Promise<IAiAdvice> {
    return this.aiProxyService.getCareAdvice(payload);
  }
}
