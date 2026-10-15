import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

function contextFor(
  method: string,
  path: string,
  statusCode: number,
): ExecutionContext {
  const response = { statusCode };
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, path }),
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

function handlerFor(result: unknown, isError = false): CallHandler {
  return {
    handle: () => (isError ? throwError(() => result) : of(result)),
  };
}

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new RequestLoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs method, path, status and latency on success', (done) => {
    const context = contextFor('GET', '/events/event-1', 200);

    interceptor
      .intercept(context, handlerFor({ ok: true }))
      .subscribe(() => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        const [line] = logSpy.mock.calls[0] as [string];
        expect(line).toMatch(/^GET \/events\/event-1 200 \d+ms$/);
        done();
      });
  });

  it('logs the response status and still reports latency when the handler throws', (done) => {
    const context = contextFor('POST', '/tickets/issue', 500);
    const error = {
      getStatus: () => 400,
    };

    interceptor.intercept(context, handlerFor(error, true)).subscribe({
      error: () => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        const [line] = logSpy.mock.calls[0] as [string];
        expect(line).toMatch(/^POST \/tickets\/issue 400 \d+ms$/);
        done();
      },
    });
  });

  it('falls back to the response status code for a plain error with no getStatus', (done) => {
    const context = contextFor('GET', '/health', 500);

    interceptor
      .intercept(context, handlerFor(new Error('boom'), true))
      .subscribe({
        error: () => {
          const [line] = logSpy.mock.calls[0] as [string];
          expect(line).toMatch(/^GET \/health 500 \d+ms$/);
          done();
        },
      });
  });
});
