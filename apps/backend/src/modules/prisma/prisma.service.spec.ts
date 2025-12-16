import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(async () => {
    // Clean up any connections
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to database successfully', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith('Database connection established successfully');
    });

    it('should throw and log error on connection failure with Error instance', async () => {
      const error = new Error('Connection failed');
      jest.spyOn(service, '$connect').mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to connect to database:', 'Connection failed');
    });

    it('should throw and log error on connection failure with non-Error object', async () => {
      const error = 'String error';
      jest.spyOn(service, '$connect').mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toBe('String error');
      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to connect to database:', 'String error');
    });

    it('should throw and log error on connection failure with unknown error', async () => {
      const error = { custom: 'object' };
      jest.spyOn(service, '$connect').mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toEqual({ custom: 'object' });
      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to connect to database:', { custom: 'object' });
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database successfully', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue();

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith('Database connection closed');
    });

    it('should handle disconnect error gracefully with Error instance', async () => {
      const error = new Error('Disconnect failed');
      jest.spyOn(service, '$disconnect').mockRejectedValue(error);

      // Should not throw, just log the error
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error disconnecting from database:', 'Disconnect failed');
    });

    it('should handle disconnect error gracefully with non-Error object', async () => {
      const error = 'Disconnect error string';
      jest.spyOn(service, '$disconnect').mockRejectedValue(error);

      // Should not throw, just log the error
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error disconnecting from database:', 'Disconnect error string');
    });

    it('should handle disconnect error gracefully with unknown error type', async () => {
      const error = null;
      jest.spyOn(service, '$disconnect').mockRejectedValue(error);

      // Should not throw, just log the error
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error disconnecting from database:', null);
    });
  });
});
