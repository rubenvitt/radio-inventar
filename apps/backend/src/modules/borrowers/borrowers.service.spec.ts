import { Test, TestingModule } from '@nestjs/testing';
import { BorrowersService } from './borrowers.service';
import { BorrowersRepository } from './borrowers.repository';

describe('BorrowersService', () => {
  let service: BorrowersService;
  let repository: {
    findSuggestions: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findSuggestions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowersService,
        { provide: BorrowersRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<BorrowersService>(BorrowersService);
  });

  describe('getSuggestions', () => {
    it('should delegate to repository with query and limit', async () => {
      const mockSuggestions = [
        { name: 'Tim Müller', lastUsed: new Date('2025-12-17') },
      ];
      repository.findSuggestions.mockResolvedValue(mockSuggestions);

      const result = await service.getSuggestions('Ti', 5);

      expect(repository.findSuggestions).toHaveBeenCalledWith('Ti', 5);
      expect(result).toEqual(mockSuggestions);
    });

    it('should delegate to repository with default limit (10) when not provided', async () => {
      repository.findSuggestions.mockResolvedValue([]);

      await service.getSuggestions('Ti');

      // Service now explicitly passes default value (10) instead of undefined
      expect(repository.findSuggestions).toHaveBeenCalledWith('Ti', 10);
    });

    it('should return empty array when no suggestions found', async () => {
      repository.findSuggestions.mockResolvedValue([]);

      const result = await service.getSuggestions('xyz');

      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Repository error');
      repository.findSuggestions.mockRejectedValue(error);

      await expect(service.getSuggestions('Ti')).rejects.toThrow('Repository error');
    });
  });
});
