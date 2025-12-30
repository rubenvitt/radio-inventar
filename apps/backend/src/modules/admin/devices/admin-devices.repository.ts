import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { type DeviceStatus, PAGINATION } from '@radio-inventar/shared';
import type { Device } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Input type for creating a device.
 * Compatible with CreateDeviceDto from controller.
 */
export interface CreateDeviceInput {
  callSign: string;
  serialNumber?: string | null;
  deviceType: string;
  notes?: string | null;
}

/**
 * Input type for updating a device.
 * Compatible with UpdateDeviceDto from controller.
 */
export interface UpdateDeviceInput {
  callSign?: string;
  serialNumber?: string | null;
  deviceType?: string;
  notes?: string | null;
}

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = PAGINATION;

export interface FindAllDevicesOptions {
  status?: DeviceStatus | undefined;
  take?: number | undefined;
  skip?: number | undefined;
}

@Injectable()
export class AdminDevicesRepository {
  private readonly logger = new Logger(AdminDevicesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new device
   * @throws {BadRequestException} If callSign is empty (400)
   * @throws {ConflictException} If callSign already exists (409)
   * @throws {HttpException} On other database errors (500)
   */
  async create(dto: CreateDeviceInput): Promise<Device> {
    // Defensive check at repository level - DTO already validates this
    if (!dto.callSign?.trim()) {
      throw new BadRequestException('callSign darf nicht leer sein');
    }
    // FIX 2: Validate deviceType is not empty
    if (!dto.deviceType?.trim()) {
      throw new BadRequestException('deviceType darf nicht leer sein');
    }

    this.logger.debug(
      `Creating device with callSign="${dto.callSign}", deviceType="${dto.deviceType}"`,
    );

    try {
      // FIX 4: Use transaction for consistency with other mutations
      return await this.prisma.$transaction(async (tx) => {
        const device = await tx.device.create({
          data: {
            callSign: dto.callSign,
            serialNumber: dto.serialNumber ?? null,
            deviceType: dto.deviceType,
            notes: dto.notes ?? null,
          },
        });

        this.logger.debug(`Device created successfully: id=${device.id}`);
        return device;
      }, { timeout: 10000 });
    } catch (error: unknown) {
      // Re-throw known exceptions from transaction
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Handle Prisma errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(`Duplicate callSign: ${dto.callSign}`);
        throw new ConflictException('Funkruf existiert bereits');
      }

      this.logger.error(
        'Failed to create device:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update an existing device
   * @throws {BadRequestException} If callSign is empty when provided (400)
   * @throws {NotFoundException} If device not found (404)
   * @throws {ConflictException} If callSign already exists (409)
   * @throws {HttpException} On other database errors (500)
   */
  async update(id: string, dto: UpdateDeviceInput): Promise<Device> {
    // Defensive check at repository level - DTO already validates this
    if (dto.callSign !== undefined && !dto.callSign?.trim()) {
      throw new BadRequestException('callSign darf nicht leer sein');
    }
    // FIX 3: Validate deviceType is not empty when provided
    if (dto.deviceType !== undefined && !dto.deviceType?.trim()) {
      throw new BadRequestException('deviceType darf nicht leer sein');
    }

    this.logger.debug(`Updating device id=${id} with data:`, dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.device.update({
          where: { id },
          data: {
            ...(dto.callSign !== undefined && { callSign: dto.callSign }),
            ...(dto.serialNumber !== undefined && {
              serialNumber: dto.serialNumber,
            }),
            ...(dto.deviceType !== undefined && { deviceType: dto.deviceType }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
          },
        });

        this.logger.debug(`Device updated successfully: id=${id}`);
        return updated;
      }, { timeout: 10000 });
    } catch (error: unknown) {
      // Re-throw known exceptions from transaction
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          this.logger.warn(`Device not found during update: id=${id}`);
          throw new NotFoundException('Gerät nicht gefunden');
        }
        if (error.code === 'P2002') {
          this.logger.warn(`Duplicate callSign during update: ${dto.callSign}`);
          throw new ConflictException('Funkruf existiert bereits');
        }
      }

      this.logger.error(
        'Failed to update device:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update device status
   * @throws {NotFoundException} If device not found (404)
   * @throws {BadRequestException} If trying to set status to ON_LOAN (400)
   * @throws {HttpException} On other database errors (500)
   */
  async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
    this.logger.debug(`Updating device status: id=${id}, status=${status}`);

    // Validate status is not ON_LOAN (can stay outside - this is validating INPUT, not DB state)
    if (status === 'ON_LOAN') {
      this.logger.warn(`Attempt to manually set ON_LOAN status: id=${id}`);
      throw new BadRequestException(
        'Status ON_LOAN kann nicht manuell gesetzt werden',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.device.update({
          where: { id },
          data: { status },
        });

        this.logger.debug(`Device status updated successfully: id=${id}`);
        return updated;
      }, { timeout: 10000 });
    } catch (error: unknown) {
      // Re-throw known exceptions from transaction
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle Prisma P2025 (not found - race condition)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`Device not found during status update: id=${id}`);
        throw new NotFoundException('Gerät nicht gefunden');
      }

      this.logger.error(
        'Failed to update device status:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a device and all associated loan history
   * @param id Device ID
   * @param options.force If true, allows deletion of ON_LOAN devices
   * @throws {NotFoundException} If device not found (404)
   * @throws {ConflictException} If device is ON_LOAN and force=false (409)
   * @throws {HttpException} On other database errors (500)
   */
  async delete(id: string, options?: { force?: boolean }): Promise<void> {
    this.logger.debug(`Deleting device: id=${id}, force=${options?.force ?? false}`);

    try {
      await this.prisma.$transaction(async (tx) => {
        // Check status inside transaction to prevent TOCTOU race condition
        const device = await tx.device.findUnique({ where: { id } });

        if (!device) {
          this.logger.warn(`Device not found: id=${id}`);
          throw new NotFoundException('Gerät nicht gefunden');
        }

        if (device.status === 'ON_LOAN' && !options?.force) {
          this.logger.warn(
            `Attempt to delete device with ON_LOAN status: id=${id}`,
          );
          throw new ConflictException(
            'Gerät kann nicht gelöscht werden, da es ausgeliehen ist',
          );
        }

        // Log force-delete of ON_LOAN device
        if (device.status === 'ON_LOAN' && options?.force) {
          this.logger.warn(
            `Force-deleting ON_LOAN device: id=${id} - associated loans will be deleted`,
          );
        }

        // Delete all loan history for this device first
        const deletedLoans = await tx.loan.deleteMany({
          where: { deviceId: id },
        });
        if (deletedLoans.count > 0) {
          this.logger.debug(
            `Deleted ${deletedLoans.count} loan records for device: id=${id}`,
          );
        }

        await tx.device.delete({ where: { id } });
        this.logger.debug(`Device deleted successfully: id=${id}`);
      }, { timeout: 10000 });
    } catch (error: unknown) {
      // Re-throw known exceptions from transaction
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Handle Prisma P2025 (not found - race condition)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`Device not found during delete: id=${id}`);
        throw new NotFoundException('Gerät nicht gefunden');
      }

      this.logger.error(
        'Failed to delete device:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find device by ID
   * @returns Device or null if not found
   * @note Use this for read operations; for mutations use service layer which throws NotFoundException
   */
  async findById(id: string): Promise<Device | null> {
    this.logger.debug(`Finding device by id=${id}`);

    try {
      const device = await this.prisma.device.findUnique({
        where: { id },
      });

      if (device) {
        this.logger.debug(`Device found: id=${id}`);
      } else {
        this.logger.debug(`Device not found: id=${id}`);
      }

      return device;
    } catch (error: unknown) {
      this.logger.error(
        'Failed to find device by id:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all devices with optional filtering and pagination
   */
  async findAll(options: FindAllDevicesOptions = {}): Promise<Device[]> {
    const { status, take, skip } = options;
    const effectiveTake = Math.min(take ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const effectiveSkip = Math.max(0, skip ?? 0);

    this.logger.debug(
      `Finding all devices${status ? ` with status=${status}` : ''}, take=${effectiveTake}, skip=${effectiveSkip}`,
    );

    try {
      const devices = await this.prisma.device.findMany({
        ...(status && { where: { status } }),
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
        take: effectiveTake,
        skip: effectiveSkip,
      });

      this.logger.debug(`Found ${devices.length} devices`);
      return devices;
    } catch (error: unknown) {
      this.logger.error(
        'Failed to find devices:',
        error instanceof Error ? error.message : error,
      );
      throw new HttpException(
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
