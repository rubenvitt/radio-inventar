import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
}

/**
 * Checks if a response already has a standard API envelope structure.
 * Prevents double-wrapping for endpoints that return { data, meta } or { data }.
 */
function isAlreadyWrapped(response: unknown): boolean {
  if (response === null || typeof response !== 'object') {
    return false;
  }

  const obj = response as Record<string, unknown>;

  // Check if response has 'data' property (standard envelope)
  // Also check for 'meta' to catch paginated responses like { data: [], meta: {} }
  return 'data' in obj && (Array.isArray(obj.data) || 'meta' in obj);
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((response) => {
        // Don't double-wrap responses that already have a data/meta envelope
        if (isAlreadyWrapped(response)) {
          return response;
        }
        return { data: response };
      }),
    );
  }
}
