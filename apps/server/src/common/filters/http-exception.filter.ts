import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnvConfig } from '../../config/server-env';
import { RequestMonitorService } from '../services/request-monitor.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly appEnv: ServerEnvConfig;

  public constructor(
    configService: ConfigService,
    private readonly requestMonitorService: RequestMonitorService,
  ) {
    this.appEnv = configService.getOrThrow<ServerEnvConfig>('app');
  }

  public async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<{
      status: (statusCode: number) => { json: (payload: unknown) => void };
      getHeader?: (name: string) => string | number | string[] | undefined;
    }>();
    const request = httpContext.getRequest<{ url?: string; method?: string; originalUrl?: string }>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;
    const resolvedMessage = this.resolveMessage(exceptionResponse, exception);
    const message = this.shouldHideInternalMessage(statusCode)
      ? '服务暂时有点忙，请稍后再试。'
      : resolvedMessage;
    const code = isHttpException ? `HTTP_${statusCode}` : 'INTERNAL_SERVER_ERROR';
    const requestId = response.getHeader?.('x-request-id');

    if (!isHttpException || statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method ?? 'UNKNOWN'} ${request.url ?? '/'} ${statusCode} ${resolvedMessage}`,
        this.appEnv.exposeInternalErrorDetails && exception instanceof Error
          ? exception.stack
          : undefined,
      );
    }

    try {
      await this.requestMonitorService.logException({
        endpoint: `${request.method ?? 'UNKNOWN'} ${request.originalUrl ?? request.url ?? '/'}`,
        statusCode,
        ...(requestId ? { requestId: String(requestId) } : {}),
        errorMessage: message,
      });
    } catch (monitorError: unknown) {
      this.logger.error(
        '记录异常日志失败',
        monitorError instanceof Error ? monitorError.message : String(monitorError),
      );
    }

    response.status(statusCode).json({
      success: false,
      code,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId: String(requestId) } : {}),
    });
  }

  private shouldHideInternalMessage(statusCode: number): boolean {
    return !this.appEnv.exposeInternalErrorDetails
      && statusCode >= HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(exceptionResponse: unknown, exception: unknown): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object'
      && exceptionResponse !== null
      && 'message' in exceptionResponse
    ) {
      const responseMessage = (exceptionResponse as { message?: string | string[] }).message;

      if (Array.isArray(responseMessage)) {
        return responseMessage.join('；');
      }

      if (typeof responseMessage === 'string') {
        return responseMessage;
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return '服务端处理失败';
  }
}
