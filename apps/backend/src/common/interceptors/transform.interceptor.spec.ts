import { TransformInterceptor } from './transform.interceptor';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap response data in { data: ... } format', async () => {
    const mockData = [
      {
        id: 'test1',
        name: 'Test Item 1',
      },
      {
        id: 'test2',
        name: 'Test Item 2',
      },
    ];
    const mockCallHandler = {
      handle: () => of(mockData),
    };

    const result$ = interceptor.intercept({} as any, mockCallHandler);
    const result = await firstValueFrom(result$);

    expect(result).toHaveProperty('data');
    expect((result as { data: unknown }).data).toEqual(mockData);
  });

  it('should wrap empty array in { data: [] } format', async () => {
    const mockCallHandler = {
      handle: () => of([]),
    };

    const result$ = interceptor.intercept({} as any, mockCallHandler);
    const result = await firstValueFrom(result$);

    expect(result).toHaveProperty('data');
    expect((result as { data: unknown }).data).toEqual([]);
    expect(Array.isArray((result as { data: unknown }).data)).toBe(true);
  });

  it('should wrap single object in { data: ... } format', async () => {
    const mockObject = {
      id: 'test1',
      name: 'Test Item',
    };
    const mockCallHandler = {
      handle: () => of(mockObject),
    };

    const result$ = interceptor.intercept({} as any, mockCallHandler);
    const result = await firstValueFrom(result$);

    expect(result).toHaveProperty('data');
    expect((result as { data: unknown }).data).toEqual(mockObject);
  });

  it('should NOT double-wrap responses with { data: [], meta: {} } structure', async () => {
    const paginatedResponse = {
      data: [{ id: 'test1', name: 'Item 1' }],
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    };
    const mockCallHandler = {
      handle: () => of(paginatedResponse),
    };

    const result$ = interceptor.intercept({} as any, mockCallHandler);
    const result = await firstValueFrom(result$);

    // Should NOT be wrapped again - should return original structure
    expect(result).toEqual(paginatedResponse);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('meta');
    expect(Array.isArray((result as { data: unknown[] }).data)).toBe(true);
  });

  it('should NOT double-wrap responses with empty { data: [], meta: {} }', async () => {
    const emptyPaginatedResponse = {
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    };
    const mockCallHandler = {
      handle: () => of(emptyPaginatedResponse),
    };

    const result$ = interceptor.intercept({} as any, mockCallHandler);
    const result = await firstValueFrom(result$);

    expect(result).toEqual(emptyPaginatedResponse);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('meta');
  });

  it('should wrap null response in { data: null }', async () => {
    const mockCallHandler = {
      handle: () => of(null),
    };

    const result$ = interceptor.intercept({} as any, mockCallHandler);
    const result = await firstValueFrom(result$);

    expect(result).toEqual({ data: null });
  });

  it('should wrap primitive values in { data: ... }', async () => {
    const mockCallHandler = {
      handle: () => of('string value'),
    };

    const result$ = interceptor.intercept({} as any, mockCallHandler);
    const result = await firstValueFrom(result$);

    expect(result).toEqual({ data: 'string value' });
  });
});
