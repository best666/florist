import { Controller, Get } from '@nestjs/common';

interface HealthCheckResponse {
  status: 'ok';
  service: string;
}

@Controller('health')
export class HealthController {
  @Get()
  public getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'florist-server',
    };
  }
}
