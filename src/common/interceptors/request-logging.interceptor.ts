import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Logs one line per request: method, path, status and latency.
 *
 * Deliberately logs none of the request body, query, or headers — those can
 * carry auth tokens, wallet secrets, or personal data, and this interceptor
 * is global (every request, every route). Status and latency are read on
 * both the success and error path via `tap`'s two callbacks, so a request
 * that throws still produces its log line.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, path } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(method, path, response.statusCode, start),
        error: (err: unknown) =>
          this.log(method, path, this.statusOf(err, response), start),
      }),
    );
  }

  private statusOf(err: unknown, response: Response): number {
    if (
      err &&
      typeof err === 'object' &&
      'getStatus' in err &&
      typeof (err as { getStatus: unknown }).getStatus === 'function'
    ) {
      return (err as { getStatus: () => number }).getStatus();
    }
    return response.statusCode || 500;
  }

  private log(
    method: string,
    path: string,
    status: number,
    start: number,
  ): void {
    const latencyMs = Date.now() - start;
    this.logger.log(`${method} ${path} ${status} ${latencyMs}ms`);
  }
}
