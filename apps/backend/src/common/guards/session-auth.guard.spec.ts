import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';
import { SessionAuthGuard } from './session-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('SessionAuthGuard', () => {
  let guard: SessionAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<SessionAuthGuard>(SessionAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockExecutionContext = (session?: any): ExecutionContext => {
    const mockRequest = {
      session,
    } as Request;

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('Positive Tests', () => {
    it('should allow access when valid session with userId and isAdmin exists', () => {
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        isAdmin: true,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should bypass guard when @Public decorator is present', () => {
      const mockContext = createMockExecutionContext();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should bypass guard when @Public decorator is present even with invalid session', () => {
      const mockContext = createMockExecutionContext({
        userId: undefined,
        isAdmin: false,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('Negative Tests', () => {
    it('should throw 401 UnauthorizedException when session is missing', () => {
      const mockContext = createMockExecutionContext(undefined);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('should throw 401 UnauthorizedException when userId is missing', () => {
      const mockContext = createMockExecutionContext({
        userId: undefined,
        isAdmin: true,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('should throw 401 UnauthorizedException when userId is null', () => {
      const mockContext = createMockExecutionContext({
        userId: null,
        isAdmin: true,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('should throw 401 UnauthorizedException when isAdmin is missing', () => {
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        isAdmin: undefined,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('should throw 401 UnauthorizedException when isAdmin is false', () => {
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        isAdmin: false,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('should throw 401 UnauthorizedException when both userId and isAdmin are missing', () => {
      const mockContext = createMockExecutionContext({});

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });
  });

  describe('Error Message Tests', () => {
    it('should throw UnauthorizedException with SESSION_EXPIRED message when session is invalid', () => {
      const mockContext = createMockExecutionContext(undefined);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.SESSION_EXPIRED),
      );
    });

    it('should throw UnauthorizedException with SESSION_EXPIRED message when userId is missing', () => {
      const mockContext = createMockExecutionContext({
        userId: undefined,
        isAdmin: true,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.SESSION_EXPIRED),
      );
    });

    it('should throw UnauthorizedException with SESSION_EXPIRED message when isAdmin is missing', () => {
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        isAdmin: undefined,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.SESSION_EXPIRED),
      );
    });

    it('should verify error message equals "Sitzung abgelaufen oder ungültig"', () => {
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        isAdmin: false,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      try {
        guard.canActivate(mockContext);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).toBe('Sitzung abgelaufen oder ungültig');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should throw 401 when session exists but is empty object', () => {
      const mockContext = createMockExecutionContext({});

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('should throw 401 when userId is empty string', () => {
      const mockContext = createMockExecutionContext({
        userId: '',
        isAdmin: true,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('should allow access when userId is valid string and isAdmin is explicitly true', () => {
      const mockContext = createMockExecutionContext({
        userId: 'valid-admin-id',
        isAdmin: true,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });
});
