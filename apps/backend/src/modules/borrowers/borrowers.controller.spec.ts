import { Test, TestingModule } from '@nestjs/testing';
import { BorrowersController } from './borrowers.controller';
import { BorrowersService } from './borrowers.service';
import { BorrowerSuggestionsQueryDto } from './dto/borrower-suggestions.query';

describe('BorrowersController', () => {
  let controller: BorrowersController;
  let service: jest.Mocked<BorrowersService>;

  const mockSuggestions = [
    { name: 'Tim Müller', lastUsed: new Date('2025-12-17T10:00:00Z') },
    { name: 'Tim Schäfer', lastUsed: new Date('2025-12-16T10:00:00Z') },
  ];

  beforeEach(async () => {
    const mockService = {
      getSuggestions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BorrowersController],
      providers: [{ provide: BorrowersService, useValue: mockService }],
    }).compile();

    controller = module.get<BorrowersController>(BorrowersController);
    service = module.get(BorrowersService);
  });

  describe('getSuggestions', () => {
    it('should return suggestions from service', async () => {
      service.getSuggestions.mockResolvedValue(mockSuggestions);
      const query: BorrowerSuggestionsQueryDto = { q: 'Ti', limit: 10 };

      const result = await controller.getSuggestions(query);

      expect(service.getSuggestions).toHaveBeenCalledWith('Ti', 10);
      expect(result).toEqual(mockSuggestions);
    });

    it('should use default limit when not provided', async () => {
      service.getSuggestions.mockResolvedValue([]);
      const query: BorrowerSuggestionsQueryDto = { q: 'Ti' };

      await controller.getSuggestions(query);

      expect(service.getSuggestions).toHaveBeenCalledWith('Ti', undefined);
    });

    it('should pass custom limit to service', async () => {
      service.getSuggestions.mockResolvedValue([]);
      const query: BorrowerSuggestionsQueryDto = { q: 'Anna', limit: 25 };

      await controller.getSuggestions(query);

      expect(service.getSuggestions).toHaveBeenCalledWith('Anna', 25);
    });

    it('should return empty array when no suggestions match', async () => {
      service.getSuggestions.mockResolvedValue([]);
      const query: BorrowerSuggestionsQueryDto = { q: 'xyz' };

      const result = await controller.getSuggestions(query);

      expect(result).toEqual([]);
    });

    it('should handle minimum query length (2 chars)', async () => {
      service.getSuggestions.mockResolvedValue(mockSuggestions);
      const query: BorrowerSuggestionsQueryDto = { q: 'Ti' };

      await controller.getSuggestions(query);

      expect(service.getSuggestions).toHaveBeenCalledWith('Ti', undefined);
    });

    it('should handle maximum limit (50)', async () => {
      service.getSuggestions.mockResolvedValue([]);
      const query: BorrowerSuggestionsQueryDto = { q: 'Tim', limit: 50 };

      await controller.getSuggestions(query);

      expect(service.getSuggestions).toHaveBeenCalledWith('Tim', 50);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      service.getSuggestions.mockRejectedValue(error);
      const query: BorrowerSuggestionsQueryDto = { q: 'Ti' };

      await expect(controller.getSuggestions(query)).rejects.toThrow('Service error');
    });
  });
});
