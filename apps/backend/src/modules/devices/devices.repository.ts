import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { type DeviceStatus, PAGINATION } from '@radio-inventar/shared';
import type { Device } from '@prisma/client';

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = PAGINATION;

export interface FindDevicesOptions {
  status?: DeviceStatus | undefined;
  take?: number | undefined;
  skip?: number | undefined;
}

@Injectable()
export class DevicesRepository {
  private readonly logger = new Logger(DevicesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindDevicesOptions = {}): Promise<Device[]> {
    const { status, take, skip } = options;
    const effectiveTake = Math.min(take ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const effectiveSkip = Math.max(0, skip ?? 0);

    this.logger.debug(
      `Finding devices${status ? ` with status=${status}` : ''}, take=${effectiveTake}, skip=${effectiveSkip}`,
    );

    try {
      return await this.prisma.device.findMany({
        ...(status && { where: { status } }),
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
        take: effectiveTake,
        skip: effectiveSkip,
      });
    } catch (error: unknown) {
      this.logger.error('Failed to find devices:', error instanceof Error ? error.message : error);
      // Re-throw a sanitized error, not the original Prisma error
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
