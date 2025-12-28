import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  // Validate client-provided request ID (prevent HTTP Response Splitting)
  private static readonly REQUEST_ID_PATTERN = /^[a-zA-Z0-9-]{1,64}$/;

  use(req: Request, res: Response, next: NextFunction) {
    // Validate client-provided ID or generate new one if invalid
    const clientRequestId = req.headers['x-request-id'] as string | undefined;
    const requestId = (clientRequestId && RequestIdMiddleware.REQUEST_ID_PATTERN.test(clientRequestId))
      ? clientRequestId
      : randomUUID();

    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
