import { Test, TestingModule } from '@nestjs/testing';
import { BorrowersRepository } from './borrowers.repository';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('BorrowersRepository', () => {
  let repository: BorrowersRepository;
  let prisma: {
    loan: {
      groupBy: jest.Mock;
    };
  };

  const mockDate = new Date('2025-12-17T10:00:00Z');

  beforeEach(async () => {
    prisma = {
      loan: {
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowersRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<BorrowersRepository>(BorrowersRepository);
  });

  describe('findSuggestions', () => {
    it('should return suggestions with correct structure', async () => {
      const mockSuggestions = [
        { borrowerName: 'Tim Müller', _max: { borrowedAt: new Date('2025-12-17') } },
        { borrowerName: 'Tim Schäfer', _max: { borrowedAt: new Date('2025-12-16') } },
      ];
      prisma.loan.groupBy.mockResolvedValue(mockSuggestions);

      const result = await repository.findSuggestions('Tim');

      expect(result).toEqual([
        { name: 'Tim Müller', lastUsed: new Date('2025-12-17') },
        { name: 'Tim Schäfer', lastUsed: new Date('2025-12-16') },
      ]);
    });

    it('should use case-insensitive search', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('tim');

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { borrowerName: { contains: 'tim', mode: 'insensitive' } },
        }),
      );
    });

    it('should respect limit parameter', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('Tim', 5);

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('should cap limit at 50', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('Tim', 100);

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should use default limit of 10', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('Tim');

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should return empty array when no matches', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      const result = await repository.findSuggestions('xyz');

      expect(result).toEqual([]);
    });

    it('should order by most recently used first', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('Tim');

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { _max: { borrowedAt: 'desc' } },
        }),
      );
    });

    it('should group by borrowerName', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('Tim');

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['borrowerName'],
        }),
      );
    });

    it('should aggregate max borrowedAt', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('Tim');

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          _max: { borrowedAt: true },
        }),
      );
    });

    it('should throw sanitized HttpException on database error', async () => {
      prisma.loan.groupBy.mockRejectedValue(new Error('Database error'));

      await expect(repository.findSuggestions('Tim')).rejects.toThrow(HttpException);
      await expect(repository.findSuggestions('Tim')).rejects.toMatchObject({
        message: 'Database operation failed',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });

    it('should sanitize Prisma client errors to prevent information leakage', async () => {
      const clientError = new Error('P2002: Unique constraint failed');
      prisma.loan.groupBy.mockRejectedValue(clientError);

      await expect(repository.findSuggestions('Tim')).rejects.toThrow('Database operation failed');
    });

    it('should handle multiple matching borrowers', async () => {
      const mockSuggestions = [
        { borrowerName: 'Anna Schmidt', _max: { borrowedAt: new Date('2025-12-17') } },
        { borrowerName: 'Anna Müller', _max: { borrowedAt: new Date('2025-12-16') } },
        { borrowerName: 'Anna Weber', _max: { borrowedAt: new Date('2025-12-15') } },
      ];
      prisma.loan.groupBy.mockResolvedValue(mockSuggestions);

      const result = await repository.findSuggestions('Anna');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Anna Schmidt');
      expect(result[1].name).toBe('Anna Müller');
      expect(result[2].name).toBe('Anna Weber');
    });

    it('should handle special characters in search query', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('Müller-Schmidt');

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { borrowerName: { contains: 'Müller-Schmidt', mode: 'insensitive' } },
        }),
      );
    });

    it('should escape % wildcard to prevent matching all names', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('%');

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { borrowerName: { contains: '\\%', mode: 'insensitive' } },
        }),
      );
    });

    it('should escape _ wildcard to prevent single character matching', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('_');

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { borrowerName: { contains: '\\_', mode: 'insensitive' } },
        }),
      );
    });

    it('should escape multiple wildcards in query', async () => {
      prisma.loan.groupBy.mockResolvedValue([]);

      await repository.findSuggestions('Tim%Müller_');

      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { borrowerName: { contains: 'Tim\\%Müller\\_', mode: 'insensitive' } },
        }),
      );
    });

    it('should still work with normal queries after escaping', async () => {
      const mockSuggestions = [
        { borrowerName: 'Tim Müller', _max: { borrowedAt: new Date('2025-12-17') } },
      ];
      prisma.loan.groupBy.mockResolvedValue(mockSuggestions);

      const result = await repository.findSuggestions('Tim');

      expect(result).toEqual([
        { name: 'Tim Müller', lastUsed: new Date('2025-12-17') },
      ]);
      expect(prisma.loan.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { borrowerName: { contains: 'Tim', mode: 'insensitive' } },
        }),
      );
    });
  });
});
