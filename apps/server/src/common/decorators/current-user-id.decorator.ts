import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const headerValue = request.headers?.['x-user-id'];

    return Array.isArray(headerValue) ? headerValue[0] : headerValue;
  },
);
