import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface ApiResponseEnvelope<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
  timestamp: string;
  requestId?: string;
}

function isResponseEnvelope(payload: unknown): payload is ApiResponseEnvelope<unknown> {
  return typeof payload === 'object'
    && payload !== null
    && 'success' in payload
    && 'code' in payload
    && 'message' in payload
    && 'timestamp' in payload;
}

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<{
      getHeader?: (name: string) => string | number | string[] | undefined;
    }>();

    return next.handle().pipe(
      map((payload) => {
        if (isResponseEnvelope(payload)) {
          return payload;
        }

        const requestId = response.getHeader?.('x-request-id');

        return {
          success: true,
          code: 'OK',
          message: 'ok',
          data: payload,
          timestamp: new Date().toISOString(),
          ...(requestId ? { requestId: String(requestId) } : {}),
        } satisfies ApiResponseEnvelope<unknown>;
      }),
    );
  }
}
