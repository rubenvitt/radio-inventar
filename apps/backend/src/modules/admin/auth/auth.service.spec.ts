import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;

  const mockAdmin = {
    id: 'admin1abcdefghijklmnopqr',
    username: 'admin',
    passwordHash: '$2b$10$hashedPasswordExample1234567890',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const mockRepository = {
      findByUsername: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get(AuthRepository);

    // Reset bcrypt mock
    jest.clearAllMocks();
  });

  describe('validateCredentials', () => {
    it('should delegate to repository', async () => {
      repository.findByUsername.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.validateCredentials('admin', 'correct-password');

      expect(repository.findByUsername).toHaveBeenCalledWith('admin');
      expect(repository.findByUsername).toHaveBeenCalledTimes(1);
    });

    it('should return null for unknown user (timing-attack prevention: bcrypt still called)', async () => {
      repository.findByUsername.mockResolvedValue(null);
      // bcrypt.compare is called with dummy hash for timing attack prevention
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateCredentials('unknown', 'any-password');

      expect(result).toBeNull();
      expect(repository.findByUsername).toHaveBeenCalledWith('unknown');
      expect(repository.findByUsername).toHaveBeenCalledTimes(1);
      // bcrypt.compare MUST be called even for unknown user (timing attack prevention)
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('should use dummy hash for timing attack prevention when user not found', async () => {
      repository.findByUsername.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.validateCredentials('nonexistent', 'password');

      // Should compare against a dummy hash, not the user's hash
      expect(bcrypt.compare).toHaveBeenCalled();
      const compareCall = (bcrypt.compare as jest.Mock).mock.calls[0];
      expect(compareCall[0]).toBe('password');
      // Dummy hash should be a valid bcrypt hash
      expect(compareCall[1]).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('should return null for wrong password', async () => {
      repository.findByUsername.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateCredentials('admin', 'wrong-password');

      expect(result).toBeNull();
      expect(repository.findByUsername).toHaveBeenCalledWith('admin');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', mockAdmin.passwordHash);
    });

    it('should return user for correct password', async () => {
      repository.findByUsername.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateCredentials('admin', 'correct-password');

      expect(result).toEqual({
        id: mockAdmin.id,
        username: mockAdmin.username,
      });
      expect(result?.id).toBe(mockAdmin.id);
      expect(result?.username).toBe(mockAdmin.username);
    });

    it('should call bcrypt.compare correctly', async () => {
      repository.findByUsername.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.validateCredentials('admin', 'test-password');

      expect(bcrypt.compare).toHaveBeenCalledWith('test-password', mockAdmin.passwordHash);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('should not expose passwordHash in returned user object', async () => {
      repository.findByUsername.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateCredentials('admin', 'correct-password');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toEqual({
        id: mockAdmin.id,
        username: mockAdmin.username,
      });
    });
  });

  describe('createSession', () => {
    it('should regenerate session and set data correctly (session fixation prevention)', async () => {
      const mockSession = {
        regenerate: jest.fn((cb) => cb(null)),
        userId: undefined,
        username: undefined,
        isAdmin: undefined,
      };
      const mockRequest = {
        session: mockSession,
      } as unknown as Request;

      const user = { id: 'admin123', username: 'testadmin' };

      await service.createSession(mockRequest, user);

      expect(mockSession.regenerate).toHaveBeenCalled();
      expect(mockRequest.session.userId).toBe('admin123');
      expect(mockRequest.session.username).toBe('testadmin');
      expect(mockRequest.session.isAdmin).toBe(true);
    });

    it('should set isAdmin to true for all users', async () => {
      const mockSession = {
        regenerate: jest.fn((cb) => cb(null)),
        userId: undefined,
        username: undefined,
        isAdmin: undefined,
      };
      const mockRequest = {
        session: mockSession,
      } as unknown as Request;

      const user = { id: 'user456', username: 'anotheruser' };

      await service.createSession(mockRequest, user);

      expect(mockRequest.session.isAdmin).toBe(true);
    });

    it('should reject with InternalServerErrorException if session regeneration fails (Review #2)', async () => {
      const regenerateError = new Error('Regeneration failed');
      const mockSession = {
        regenerate: jest.fn((cb) => cb(regenerateError)),
      };
      const mockRequest = {
        session: mockSession,
      } as unknown as Request;

      const user = { id: 'newuser', username: 'newusername' };

      // Review #2: now throws typed InternalServerErrorException instead of raw error
      await expect(service.createSession(mockRequest, user)).rejects.toThrow('Session konnte nicht erstellt werden');
    });

    it('should not set session data if regeneration fails', async () => {
      const regenerateError = new Error('Regeneration failed');
      const mockSession = {
        regenerate: jest.fn((cb) => cb(regenerateError)),
        userId: 'old',
        username: 'oldname',
        isAdmin: false,
      };
      const mockRequest = {
        session: mockSession,
      } as unknown as Request;

      const user = { id: 'newuser', username: 'newusername' };

      await expect(service.createSession(mockRequest, user)).rejects.toThrow();
      // Session data should not be updated on failure
      expect(mockRequest.session.userId).toBe('old');
    });
  });

  describe('destroySession', () => {
    it('should destroy session successfully', async () => {
      const mockDestroy = jest.fn((callback) => callback(null));
      const mockRequest = {
        session: {
          destroy: mockDestroy,
        },
      } as unknown as Request;

      await service.destroySession(mockRequest);

      expect(mockDestroy).toHaveBeenCalled();
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException on session destruction error (Review #2)', async () => {
      const mockError = new Error('Session destruction failed');
      const mockDestroy = jest.fn((callback) => callback(mockError));
      const mockRequest = {
        session: {
          destroy: mockDestroy,
        },
      } as unknown as Request;

      // Review #2: now throws typed InternalServerErrorException instead of raw error
      await expect(service.destroySession(mockRequest)).rejects.toThrow('Session konnte nicht beendet werden');
      expect(mockDestroy).toHaveBeenCalled();
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSessionInfo', () => {
    it('should return valid session info', () => {
      const mockRequest = {
        session: {
          userId: 'admin123',
          username: 'testadmin',
          isAdmin: true,
        },
      } as Request;

      const result = service.getSessionInfo(mockRequest);

      expect(result).toEqual({
        username: 'testadmin',
        isValid: true,
      });
      expect(result.username).toBe('testadmin');
      expect(result.isValid).toBe(true);
    });

    it('should throw 401 for missing userId', () => {
      const mockRequest = {
        session: {
          username: 'testadmin',
          isAdmin: true,
        },
      } as Request;

      expect(() => service.getSessionInfo(mockRequest)).toThrow(UnauthorizedException);
      expect(() => service.getSessionInfo(mockRequest)).toThrow(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    });

    it('should throw 401 for missing isAdmin', () => {
      const mockRequest = {
        session: {
          userId: 'admin123',
          username: 'testadmin',
        },
      } as Request;

      expect(() => service.getSessionInfo(mockRequest)).toThrow(UnauthorizedException);
      expect(() => service.getSessionInfo(mockRequest)).toThrow(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    });

    it('should use correct error message from AUTH_ERROR_MESSAGES', () => {
      const mockRequest = {
        session: {},
      } as Request;

      try {
        service.getSessionInfo(mockRequest);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
      }
    });

    it('should throw 401 for missing session object', () => {
      const mockRequest = {} as Request;

      expect(() => service.getSessionInfo(mockRequest)).toThrow(UnauthorizedException);
      expect(() => service.getSessionInfo(mockRequest)).toThrow(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    });

    it('should return empty username if not present in session', () => {
      const mockRequest = {
        session: {
          userId: 'admin123',
          isAdmin: true,
        },
      } as Request;

      const result = service.getSessionInfo(mockRequest);

      expect(result).toEqual({
        username: '',
        isValid: true,
      });
      expect(result.username).toBe('');
    });

    it('should throw 401 when isAdmin is false', () => {
      const mockRequest = {
        session: {
          userId: 'admin123',
          username: 'testadmin',
          isAdmin: false,
        },
      } as Request;

      expect(() => service.getSessionInfo(mockRequest)).toThrow(UnauthorizedException);
      expect(() => service.getSessionInfo(mockRequest)).toThrow(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    });

    it('should throw 401 when userId is empty string', () => {
      const mockRequest = {
        session: {
          userId: '',
          username: 'testadmin',
          isAdmin: true,
        },
      } as Request;

      expect(() => service.getSessionInfo(mockRequest)).toThrow(UnauthorizedException);
      expect(() => service.getSessionInfo(mockRequest)).toThrow(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
    });
  });
});
