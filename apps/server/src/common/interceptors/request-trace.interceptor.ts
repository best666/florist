import { randomUUID } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class RequestTraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestTraceInterceptor.name);

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const response = httpContext.getResponse<{
      setHeader: (name: string, value: string) => void;
      statusCode?: number;
    }>();
    const requestId = String(request.headers?.['x-request-id'] ?? randomUUID());
    const startedAt = Date.now();

    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        const method = request.method ?? 'UNKNOWN';
        const url = request.originalUrl ?? request.url ?? '/';
        const statusCode = response.statusCode ?? 200;

        this.logger.log(
          `${method} ${url} ${statusCode} ${durationMs}ms requestId=${requestId}`,
        );
      }),
    );
  }
}
