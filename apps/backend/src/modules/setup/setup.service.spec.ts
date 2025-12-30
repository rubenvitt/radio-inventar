import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SetupService } from './setup.service';
import { SetupRepository } from './setup.repository';
import { SETUP_ERROR_MESSAGES, AUTH_CONFIG } from '@radio-inventar/shared';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('SetupService', () => {
  let service: SetupService;
  let repository: jest.Mocked<SetupRepository>;

  const mockRequest = {
    session: {
      regenerate: jest.fn((cb: (err?: Error | null) => void) => cb()),
      save: jest.fn((cb: (err?: Error | null) => void) => cb()),
      userId: undefined as string | undefined,
      username: undefined as string | undefined,
      isAdmin: undefined as boolean | undefined,
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupService,
        {
          provide: SetupRepository,
          useValue: {
            adminExists: jest.fn(),
            createAdmin: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SetupService>(SetupService);
    repository = module.get(SetupRepository);

    // Reset mocks
    jest.clearAllMocks();
    service.invalidateCache();

    // Reset mock request session
    mockRequest.session.regenerate = jest.fn((cb: (err?: Error | null) => void) => cb());
    mockRequest.session.save = jest.fn((cb: (err?: Error | null) => void) => cb());
    mockRequest.session.userId = undefined;
    mockRequest.session.username = undefined;
    mockRequest.session.isAdmin = undefined;
  });

  describe('isSetupComplete', () => {
    it('should return false when no admin exists', async () => {
      repository.adminExists.mockResolvedValue(false);

      const result = await service.isSetupComplete();

      expect(result).toBe(false);
      expect(repository.adminExists).toHaveBeenCalledTimes(1);
    });

    it('should return true when admin exists', async () => {
      repository.adminExists.mockResolvedValue(true);

      const result = await service.isSetupComplete();

      expect(result).toBe(true);
      expect(repository.adminExists).toHaveBeenCalledTimes(1);
    });

    it('should cache the result and not query database again', async () => {
      repository.adminExists.mockResolvedValue(false);

      // First call
      await service.isSetupComplete();
      // Second call
      await service.isSetupComplete();

      // Should only query once due to caching
      expect(repository.adminExists).toHaveBeenCalledTimes(1);
    });
  });

  describe('createFirstAdmin', () => {
    const mockAdmin = {
      id: 'test-id',
      username: 'admin',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      repository.createAdmin.mockResolvedValue(mockAdmin);
    });

    it('should create admin successfully when no admin exists', async () => {
      repository.adminExists.mockResolvedValue(false);

      const result = await service.createFirstAdmin('admin', 'password123', mockRequest);

      expect(result).toEqual({ id: 'test-id', username: 'admin' });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', AUTH_CONFIG.BCRYPT_ROUNDS);
      expect(repository.createAdmin).toHaveBeenCalledWith('admin', 'hashed-password');
    });

    it('should throw ConflictException when admin already exists', async () => {
      repository.adminExists.mockResolvedValue(true);

      await expect(
        service.createFirstAdmin('admin', 'password123', mockRequest)
      ).rejects.toThrow(ConflictException);

      await expect(
        service.createFirstAdmin('admin', 'password123', mockRequest)
      ).rejects.toThrow(SETUP_ERROR_MESSAGES.ADMIN_EXISTS);
    });

    it('should create session after admin creation', async () => {
      repository.adminExists.mockResolvedValue(false);

      await service.createFirstAdmin('admin', 'password123', mockRequest);

      expect(mockRequest.session.regenerate).toHaveBeenCalled();
      expect(mockRequest.session.userId).toBe('test-id');
      expect(mockRequest.session.username).toBe('admin');
      expect(mockRequest.session.isAdmin).toBe(true);
    });

    it('should update cache after admin creation', async () => {
      repository.adminExists.mockResolvedValue(false);

      await service.createFirstAdmin('admin', 'password123', mockRequest);

      // Cache should now be true
      const isComplete = await service.isSetupComplete();
      expect(isComplete).toBe(true);
      // Should not query database again
      expect(repository.adminExists).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateCache', () => {
    it('should clear the cache', async () => {
      repository.adminExists.mockResolvedValue(true);

      // Populate cache
      await service.isSetupComplete();
      expect(repository.adminExists).toHaveBeenCalledTimes(1);

      // Invalidate cache
      service.invalidateCache();

      // Should query database again
      await service.isSetupComplete();
      expect(repository.adminExists).toHaveBeenCalledTimes(2);
    });
  });
});
