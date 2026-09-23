import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

interface Window {
  count: number;
  /** Unix ms the current window resets at. */
  resetsAt: number;
}

/**
 * Fixed-window velocity limit on ticket verification scans, keyed
 * independently by requester IP and by the `qrSecret` being scanned.
 *
 * A gate scanner is normally slow and human-paced, so either axis spiking —
 * one IP hammering many secrets, or one secret being replayed rapidly —
 * indicates brute forcing or a photographed/replayed QR code rather than
 * legitimate gate traffic. Either axis tripping the limit rejects the
 * request; a request only has to fail one check to be abuse.
 *
 * State is in-process (a `Map`), which is enough for a single instance and
 * for tests. A multi-instance deployment would need this backed by
 * something shared (e.g. Redis) so limits hold across instances — tracked
 * as a follow-up, not blocking for the current single-instance deployment.
 */
@Injectable()
export class ScanRateLimitGuard implements CanActivate {
  private readonly byIp = new Map<string, Window>();
  private readonly bySecret = new Map<string, Window>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const max = this.config.get<number>('SCAN_RATE_LIMIT_MAX', 10);
    const windowMs = this.config.get<number>(
      'SCAN_RATE_LIMIT_WINDOW_MS',
      60_000,
    );

    const ip = request.ip ?? 'unknown';
    const qrSecret = String(request.params['qrSecret'] ?? 'unknown');

    this.assertWithinLimit(this.byIp, ip, max, windowMs, 'this IP');
    this.assertWithinLimit(
      this.bySecret,
      qrSecret,
      max,
      windowMs,
      'this ticket',
    );

    return true;
  }

  private assertWithinLimit(
    store: Map<string, Window>,
    key: string,
    max: number,
    windowMs: number,
    subject: string,
  ): void {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetsAt <= now) {
      store.set(key, { count: 1, resetsAt: now + windowMs });
      return;
    }

    if (existing.count >= max) {
      throw new HttpException(
        `Too many verification attempts for ${subject}. Try again shortly.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;
  }
}
