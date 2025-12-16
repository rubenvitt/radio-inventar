import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return ok status when database is connected', async () => {
      prismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(result.timestamp).toBeDefined();
    });

    it('should throw SERVICE_UNAVAILABLE when database is disconnected', async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      await expect(controller.check()).rejects.toThrow(HttpException);

      try {
        await controller.check();
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.status).toBe('error');
        expect(response.database).toBe('disconnected');
      }
    });

    it('should include timestamp in response', async () => {
      prismaService.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const before = new Date().toISOString();
      const result = await controller.check();
      const after = new Date().toISOString();

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });
  });
});
