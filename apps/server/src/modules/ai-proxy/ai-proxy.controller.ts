import type {
  IAiAdvice,
  IAiPlantDiagnosis,
  IAiTripCarePlan,
  IPlantAiAdvice,
} from '@florist/contracts';
import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
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
  public getCareAdvice(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: RequestCareAdviceDto,
  ): Promise<IAiAdvice> {
    return this.aiProxyService.getCareAdvice(payload, userId);
  }

  @Post('plant-care-advice')
  public getSinglePlantCareAdvice(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: RequestSinglePlantCareAdviceDto,
  ): Promise<IPlantAiAdvice> {
    return this.aiProxyService.getSinglePlantCareAdvice(payload, userId);
  }

  @Post('plant-diagnosis')
  public getPlantDiagnosis(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: RequestPlantDiagnosisDto,
  ): Promise<IAiPlantDiagnosis> {
    return this.aiProxyService.getPlantDiagnosis(payload, userId);
  }

  @Post('trip-care-plan')
  public getTripCarePlan(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: RequestTripCarePlanDto,
  ): Promise<IAiTripCarePlan> {
    return this.aiProxyService.getTripCarePlan(payload, userId);
  }
}
