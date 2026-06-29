import { Test, TestingModule } from '@nestjs/testing';
import { BorrowersRepository } from './borrowers.repository';
import { RadioAdminService } from '@/modules/radio-admin/radio-admin.service';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

describe('BorrowersRepository', () => {
  let repository: BorrowersRepository;
  let radioAdmin: {
    fetchBorrowerSuggestions: jest.Mock;
  };

  // epoch-ms values as delivered by radio-admin.
  const msA = Date.parse('2025-12-17T10:00:00Z');
  const msB = Date.parse('2025-12-16T10:00:00Z');
  const msC = Date.parse('2025-12-15T10:00:00Z');

  beforeEach(async () => {
    radioAdmin = {
      fetchBorrowerSuggestions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowersRepository,
        { provide: RadioAdminService, useValue: radioAdmin },
      ],
    }).compile();

    repository = module.get<BorrowersRepository>(BorrowersRepository);
  });

  describe('findSuggestions', () => {
    it('should return suggestions with epoch-ms converted to Date', async () => {
      radioAdmin.fetchBorrowerSuggestions.mockResolvedValue([
        { name: 'Tim Müller', lastUsed: msA },
        { name: 'Tim Schäfer', lastUsed: msB },
      ]);

      const result = await repository.findSuggestions('Tim');

      expect(result).toEqual([
        { name: 'Tim Müller', lastUsed: new Date(msA) },
        { name: 'Tim Schäfer', lastUsed: new Date(msB) },
      ]);
      expect(result[0].lastUsed).toBeInstanceOf(Date);
      expect(result[0].lastUsed.toISOString()).toBe('2025-12-17T10:00:00.000Z');
    });

    it('should delegate to radio-admin with the query and capped limit', async () => {
      radioAdmin.fetchBorrowerSuggestions.mockResolvedValue([]);

      await repository.findSuggestions('Tim', 5);

      expect(radioAdmin.fetchBorrowerSuggestions).toHaveBeenCalledWith('Tim', 5);
    });

    it('should cap limit at 50', async () => {
      radioAdmin.fetchBorrowerSuggestions.mockResolvedValue([]);

      await repository.findSuggestions('Tim', 100);

      expect(radioAdmin.fetchBorrowerSuggestions).toHaveBeenCalledWith('Tim', 50);
    });

    it('should use the default limit of 10 when none is provided', async () => {
      radioAdmin.fetchBorrowerSuggestions.mockResolvedValue([]);

      await repository.findSuggestions('Tim');

      expect(radioAdmin.fetchBorrowerSuggestions).toHaveBeenCalledWith('Tim', 10);
    });

    it('should pass the query through verbatim (escaping lives in radio-admin)', async () => {
      radioAdmin.fetchBorrowerSuggestions.mockResolvedValue([]);

      await repository.findSuggestions('Müller-Schmidt');

      expect(radioAdmin.fetchBorrowerSuggestions).toHaveBeenCalledWith('Müller-Schmidt', 10);
    });

    it('should return an empty array when there are no matches', async () => {
      radioAdmin.fetchBorrowerSuggestions.mockResolvedValue([]);

      const result = await repository.findSuggestions('xyz');

      expect(result).toEqual([]);
    });

    it('should preserve order and handle multiple matching borrowers', async () => {
      radioAdmin.fetchBorrowerSuggestions.mockResolvedValue([
        { name: 'Anna Schmidt', lastUsed: msA },
        { name: 'Anna Müller', lastUsed: msB },
        { name: 'Anna Weber', lastUsed: msC },
      ]);

      const result = await repository.findSuggestions('Anna');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Anna Schmidt');
      expect(result[1].name).toBe('Anna Müller');
      expect(result[2].name).toBe('Anna Weber');
      expect(result[2].lastUsed).toEqual(new Date(msC));
    });

    it('should sanitize a non-HttpException error to a 500 HttpException', async () => {
      radioAdmin.fetchBorrowerSuggestions.mockRejectedValue(new Error('boom: P2002 leak'));

      await expect(repository.findSuggestions('Tim')).rejects.toThrow(HttpException);
      await expect(repository.findSuggestions('Tim')).rejects.toMatchObject({
        message: 'Database operation failed',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });

    it('should rethrow an HttpException unchanged', async () => {
      radioAdmin.fetchBorrowerSuggestions.mockRejectedValue(
        new NotFoundException('original message'),
      );

      await expect(repository.findSuggestions('Tim')).rejects.toThrow(NotFoundException);
      await expect(repository.findSuggestions('Tim')).rejects.toMatchObject({
        message: 'original message',
        status: HttpStatus.NOT_FOUND,
      });
    });
  });
});
