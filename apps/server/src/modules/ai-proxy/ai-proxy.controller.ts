import type {
  IAiAdvice,
  IAiPlantDiagnosis,
  IAiTripCarePlan,
  IPlantAiAdvice,
} from '@florist/contracts';
import { Body, Controller, Post } from '@nestjs/common';
import {
  RequestCareAdviceDto,
  RequestPlantDiagnosisDto,
  RequestSinglePlantCareAdviceDto,
  RequestTripCarePlanDto,
} from './dto/request-care-advice.dto';
import { AiProxyService } from './ai-proxy.service';

@Controller('ai-proxy')
export class AiProxyController {
  public constructor(private readonly aiProxyService: AiProxyService) {}

  @Post('care-advice')
  public getCareAdvice(@Body() payload: RequestCareAdviceDto): Promise<IAiAdvice> {
    return this.aiProxyService.getCareAdvice(payload);
  }

  @Post('plant-care-advice')
  public getSinglePlantCareAdvice(
    @Body() payload: RequestSinglePlantCareAdviceDto,
  ): Promise<IPlantAiAdvice> {
    return this.aiProxyService.getSinglePlantCareAdvice(payload);
  }

  @Post('plant-diagnosis')
  public getPlantDiagnosis(
    @Body() payload: RequestPlantDiagnosisDto,
  ): Promise<IAiPlantDiagnosis> {
    return this.aiProxyService.getPlantDiagnosis(payload);
  }

  @Post('trip-care-plan')
  public getTripCarePlan(
    @Body() payload: RequestTripCarePlanDto,
  ): Promise<IAiTripCarePlan> {
    return this.aiProxyService.getTripCarePlan(payload);
  }
}
