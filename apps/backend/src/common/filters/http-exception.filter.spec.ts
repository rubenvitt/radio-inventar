import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockConfigService: Partial<ConfigService>;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('development'),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headersSent: false,
    };

    mockRequest = {
      method: 'GET',
      path: '/test',
      headers: {},
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    filter = new HttpExceptionFilter(mockConfigService as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with string message', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Test error',
        }),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Custom error', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Custom error',
          error: 'Bad Request',
        }),
      );
    });

    it('should handle HttpException with array of messages', () => {
      const exception = new HttpException(
        { message: ['field1 must not be empty', 'field2 must be a string'], error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.statusCode).toBe(400);
      expect(jsonCall.message).toBe('field1 must not be empty, field2 must be a string');
      expect(jsonCall.error).toBe('Bad Request');
      expect(jsonCall.errors).toBeDefined();
      expect(jsonCall.errors).toHaveLength(2);
      expect(jsonCall.errors[0]).toEqual({
        field: 'field1',
        message: 'field1 must not be empty',
      });
      expect(jsonCall.errors[1]).toEqual({
        field: 'field2',
        message: 'field2 must be a string',
      });
    });

    it('should handle HttpException with non-string, non-array message', () => {
      const exception = new HttpException(
        { message: 123 as any },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An error occurred',
        }),
      );
    });
  });

  describe('Generic error handling', () => {
    it('should handle generic Error as 500', () => {
      const exception = new Error('Generic error');
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
        }),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 500',
        expect.stringContaining('Error: Generic error'),
      );
    });

    it('should handle non-Error exceptions', () => {
      const exception = 'String error';
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
        }),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 500',
        'String error',
      );
    });

    it('should handle null exception', () => {
      const exception = null;
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
        }),
      );
    });
  });

  describe('Environment-based response formatting', () => {
    it('should include timestamp and path in development mode', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).toHaveProperty('timestamp');
      expect(jsonCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(jsonCall).toHaveProperty('path', '/test');
    });

    it('should NOT include timestamp and path in production mode', () => {
      (mockConfigService.get as jest.Mock).mockReturnValue('production');
      filter = new HttpExceptionFilter(mockConfigService as ConfigService);

      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('timestamp');
      expect(jsonCall).not.toHaveProperty('path');
      expect(jsonCall).toEqual({
        statusCode: 400,
        message: 'Test',
      });
    });

    it('should treat non-production values as development', () => {
      (mockConfigService.get as jest.Mock).mockReturnValue('staging');
      filter = new HttpExceptionFilter(mockConfigService as ConfigService);

      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).toHaveProperty('timestamp');
      expect(jsonCall).toHaveProperty('path');
    });
  });

  describe('Request method and path logging', () => {
    it('should log POST request correctly', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/devices';

      const exception = new HttpException('Validation failed', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'POST /api/devices - 400',
        expect.any(String),
      );
    });

    it('should log PUT request correctly', () => {
      mockRequest.method = 'PUT';
      mockRequest.path = '/api/devices/123';

      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'PUT /api/devices/123 - 404',
        expect.any(String),
      );
    });

    it('should log DELETE request correctly', () => {
      mockRequest.method = 'DELETE';
      mockRequest.path = '/api/devices/456';

      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'DELETE /api/devices/456 - 403',
        expect.any(String),
      );
    });
  });

  describe('Error response structure', () => {
    it('should not include error field if not present in exception', () => {
      const exception = new HttpException('Simple message', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('error');
    });

    it('should include error field if present in exception response', () => {
      const exception = new HttpException(
        { message: 'Validation failed', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).toHaveProperty('error', 'Bad Request');
    });

    it('should not include errors array if no validation errors', () => {
      const exception = new HttpException('Simple error', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('errors');
    });

    it('should include errors array for validation errors', () => {
      const exception = new HttpException(
        { message: ['username must not be empty', 'email must be a valid email', 'password must be longer'] },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.errors).toHaveLength(3);
      expect(jsonCall.errors[0]).toEqual({ field: 'username', message: 'username must not be empty' });
      expect(jsonCall.errors[1]).toEqual({ field: 'email', message: 'email must be a valid email' });
      expect(jsonCall.errors[2]).toEqual({ field: 'password', message: 'password must be longer' });
    });

    it('should extract field names from validation messages with regex', () => {
      const exception = new HttpException(
        { message: ['deviceId must be a string', 'count should not be empty'] },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.errors[0]).toEqual({ field: 'deviceId', message: 'deviceId must be a string' });
      expect(jsonCall.errors[1]).toEqual({ field: 'count', message: 'count should not be empty' });
    });

    it('should extract first word as field even if message does not match typical pattern', () => {
      const exception = new HttpException(
        { message: ['Invalid input', 'Something went wrong'] },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      // Regex matches first word followed by space
      expect(jsonCall.errors[0]).toEqual({ field: 'Invalid', message: 'Invalid input' });
      expect(jsonCall.errors[1]).toEqual({ field: 'Something', message: 'Something went wrong' });
    });

    it('should use "unknown" field when message has no space', () => {
      const exception = new HttpException(
        { message: ['Error', 'Failed'] },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.errors[0]).toEqual({ field: 'unknown', message: 'Error' });
      expect(jsonCall.errors[1]).toEqual({ field: 'unknown', message: 'Failed' });
    });
  });

  describe('Various HTTP status codes', () => {
    it('should handle 401 Unauthorized', () => {
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Unauthorized',
        }),
      );
    });

    it('should handle 403 Forbidden', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should handle 404 Not Found', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle 422 Unprocessable Entity', () => {
      const exception = new HttpException('Unprocessable Entity', HttpStatus.UNPROCESSABLE_ENTITY);
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
    });

    it('should handle 503 Service Unavailable', () => {
      const exception = new HttpException('Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
    });
  });

  describe('Request ID sanitization', () => {
    it('should accept valid alphanumeric request ID', () => {
      mockRequest.headers['x-request-id'] = 'abc123-def456';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400 [RequestID: abc123-def456]',
        expect.any(String),
      );
    });

    it('should accept request ID with only hyphens and alphanumeric', () => {
      mockRequest.headers['x-request-id'] = 'request-123-ABC-xyz';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400 [RequestID: request-123-ABC-xyz]',
        expect.any(String),
      );
    });

    it('should reject request ID with ANSI escape sequences', () => {
      mockRequest.headers['x-request-id'] = 'abc\x1b[31mmalicious\x1b[0m123';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      // Should not include request ID in log
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });

    it('should reject request ID with newline characters', () => {
      mockRequest.headers['x-request-id'] = 'abc\n[INJECTED LOG]\n123';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });

    it('should reject request ID with special characters', () => {
      mockRequest.headers['x-request-id'] = 'abc@#$%^&*()123';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });

    it('should reject request ID longer than 64 characters', () => {
      mockRequest.headers['x-request-id'] = 'a'.repeat(65);
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });

    it('should accept request ID with exactly 64 characters', () => {
      const validId = 'a'.repeat(64);
      mockRequest.headers['x-request-id'] = validId;
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `GET /test - 400 [RequestID: ${validId}]`,
        expect.any(String),
      );
    });

    it('should reject empty request ID', () => {
      mockRequest.headers['x-request-id'] = '';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });

    it('should handle missing request ID header', () => {
      // No x-request-id header set
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });

    it('should reject request ID with path traversal attempts', () => {
      mockRequest.headers['x-request-id'] = '../../../etc/passwd';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });

    it('should reject request ID with unicode characters', () => {
      mockRequest.headers['x-request-id'] = 'abc-😀-123';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });

    it('should reject request ID with SQL injection attempts', () => {
      mockRequest.headers['x-request-id'] = "abc'; DROP TABLE users; --";
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - 400',
        expect.any(String),
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle path with special characters', () => {
      mockRequest.path = '/test\x1b[31minjection/with spaces';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      // Path should be sanitized (non-printable characters removed)
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const jsonCall = mockResponse.json.mock.calls[0][0];
      // ANSI escape sequences and non-printable chars are removed, leaving only printable ASCII
      expect(jsonCall.path).toBe('/test[31minjection/with spaces');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test[31minjection/with spaces - 400',
        expect.any(String),
      );
    });

    it('should handle empty message array', () => {
      const exception = new HttpException(
        { message: [] },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.message).toBe('');
      expect(jsonCall.errors).toEqual([]);
    });

    it('should handle exception response with null values', () => {
      const exception = new HttpException(
        { message: null as any, error: null as any },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.message).toBe('An error occurred');
      expect(jsonCall).not.toHaveProperty('error');
    });

    it('should handle empty string message', () => {
      const exception = new HttpException('', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.message).toBe('');
    });
  });
});
