import { Test, TestingModule } from '@nestjs/testing';
import { AuthRepository } from './auth.repository';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Logger } from '@nestjs/common';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prisma: {
    adminUser: {
      findUnique: jest.Mock;
    };
  };

  // Mock date for deterministic tests
  const mockDate = new Date('2025-01-15T10:30:00Z');

  const mockAdminUser = {
    id: 'cuid1234567890abcdefghij',
    username: 'admin',
    passwordHash: '$2b$10$hashedpasswordexample1234567890',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    prisma = {
      adminUser: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUsername', () => {
    it('should return user if exists', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(mockAdminUser);

      const result = await repository.findByUsername('admin');

      expect(result).toEqual(mockAdminUser);
      expect(result?.username).toBe('admin');
      expect(result?.passwordHash).toBe('$2b$10$hashedpasswordexample1234567890');
    });

    it('should return null if user does not exist', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);

      const result = await repository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('should call prisma.adminUser.findUnique with correct parameters', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(mockAdminUser);

      await repository.findByUsername('admin');

      expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { username: 'admin' },
      });
      expect(prisma.adminUser.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should log debug message when finding admin by username', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      prisma.adminUser.findUnique.mockResolvedValue(mockAdminUser);

      await repository.findByUsername('admin');

      expect(debugSpy).toHaveBeenCalledWith('Finding admin by username');
    });
  });

  describe('error handling', () => {
    it('should throw error when database connection fails', async () => {
      const dbError = new Error('Database connection failed');
      prisma.adminUser.findUnique.mockRejectedValue(dbError);

      await expect(repository.findByUsername('admin')).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should throw error when database connection times out', async () => {
      const timeoutError = new Error('Query timeout exceeded');
      prisma.adminUser.findUnique.mockRejectedValue(timeoutError);

      await expect(repository.findByUsername('admin')).rejects.toThrow(
        'Query timeout exceeded',
      );
    });

    it('should throw error when Prisma client error occurs', async () => {
      const prismaError = new Error('P2002: Unique constraint failed');
      prisma.adminUser.findUnique.mockRejectedValue(prismaError);

      await expect(repository.findByUsername('admin')).rejects.toThrow(
        'P2002: Unique constraint failed',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle username with special characters', async () => {
      const specialUsername = 'admin@example.com';
      prisma.adminUser.findUnique.mockResolvedValue({
        ...mockAdminUser,
        username: specialUsername,
      });

      const result = await repository.findByUsername(specialUsername);

      expect(result?.username).toBe(specialUsername);
      expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { username: specialUsername },
      });
    });

    it('should handle username with dots and underscores', async () => {
      const specialUsername = 'admin.user_123';
      prisma.adminUser.findUnique.mockResolvedValue({
        ...mockAdminUser,
        username: specialUsername,
      });

      const result = await repository.findByUsername(specialUsername);

      expect(result?.username).toBe(specialUsername);
      expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { username: specialUsername },
      });
    });

    it('should handle username case sensitivity correctly', async () => {
      // Database search is case-sensitive - 'Admin' and 'admin' are different
      prisma.adminUser.findUnique.mockResolvedValue(null);

      const result = await repository.findByUsername('Admin');

      expect(result).toBeNull();
      expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { username: 'Admin' },
      });
    });

    it('should handle empty string username', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);

      const result = await repository.findByUsername('');

      expect(result).toBeNull();
      expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { username: '' },
      });
    });

    it('should handle very long username (at max length 50)', async () => {
      const longUsername = 'a'.repeat(50); // Max length per schema
      prisma.adminUser.findUnique.mockResolvedValue({
        ...mockAdminUser,
        username: longUsername,
      });

      const result = await repository.findByUsername(longUsername);

      expect(result?.username).toBe(longUsername);
      expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { username: longUsername },
      });
    });
  });
});
