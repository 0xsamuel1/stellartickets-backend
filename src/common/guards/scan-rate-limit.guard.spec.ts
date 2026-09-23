import { ExecutionContext, HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ScanRateLimitGuard } from './scan-rate-limit.guard';

function mockContext(ip: string, qrSecret: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip, params: { qrSecret } }),
    }),
  } as unknown as ExecutionContext;
}

function guardWithLimits(max: number, windowMs: number): ScanRateLimitGuard {
  const config = {
    get: jest.fn((key: string) =>
      key === 'SCAN_RATE_LIMIT_MAX' ? max : windowMs,
    ),
  };
  return new ScanRateLimitGuard(config as unknown as ConfigService);
}

describe('ScanRateLimitGuard', () => {
  it('allows requests within the limit', () => {
    const guard = guardWithLimits(3, 60_000);
    expect(guard.canActivate(mockContext('1.1.1.1', 'secret-a'))).toBe(true);
    expect(guard.canActivate(mockContext('1.1.1.1', 'secret-a'))).toBe(true);
    expect(guard.canActivate(mockContext('1.1.1.1', 'secret-a'))).toBe(true);
  });

  it('rejects once the same IP exceeds the limit, even across different secrets', () => {
    const guard = guardWithLimits(2, 60_000);
    guard.canActivate(mockContext('1.1.1.1', 'secret-a'));
    guard.canActivate(mockContext('1.1.1.1', 'secret-b'));

    expect(() => guard.canActivate(mockContext('1.1.1.1', 'secret-c'))).toThrow(
      HttpException,
    );
  });

  it('rejects once the same secret is scanned too many times, even from different IPs', () => {
    const guard = guardWithLimits(2, 60_000);
    guard.canActivate(mockContext('1.1.1.1', 'secret-a'));
    guard.canActivate(mockContext('2.2.2.2', 'secret-a'));

    expect(() => guard.canActivate(mockContext('3.3.3.3', 'secret-a'))).toThrow(
      HttpException,
    );
  });

  it('does not let one IP/secret pair affect another', () => {
    const guard = guardWithLimits(1, 60_000);
    guard.canActivate(mockContext('1.1.1.1', 'secret-a'));

    expect(guard.canActivate(mockContext('2.2.2.2', 'secret-b'))).toBe(true);
  });

  it('resets the count after the window elapses', () => {
    const guard = guardWithLimits(1, 10);
    guard.canActivate(mockContext('1.1.1.1', 'secret-a'));
    expect(() => guard.canActivate(mockContext('1.1.1.1', 'secret-a'))).toThrow(
      HttpException,
    );

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(guard.canActivate(mockContext('1.1.1.1', 'secret-a'))).toBe(
          true,
        );
        resolve();
      }, 20);
    });
  });

  it('falls back to defaults when config values are unset', () => {
    const config = {
      get: jest.fn((_key: string, fallback: number) => fallback),
    };
    const guard = new ScanRateLimitGuard(config as unknown as ConfigService);

    expect(guard.canActivate(mockContext('1.1.1.1', 'secret-a'))).toBe(true);
  });
});
