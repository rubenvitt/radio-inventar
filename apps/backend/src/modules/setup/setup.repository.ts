import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { AdminUser } from '@prisma/client';

@Injectable()
export class SetupRepository {
  private readonly logger = new Logger(SetupRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if any admin user exists in the database
   */
  async adminExists(): Promise<boolean> {
    this.logger.debug('Checking if admin exists');
    try {
      const count = await this.prisma.adminUser.count();
      return count > 0;
    } catch (error) {
      this.logger.error('Failed to check admin existence', error);
      throw error;
    }
  }

  /**
   * Create the first admin user
   */
  async createAdmin(username: string, passwordHash: string): Promise<AdminUser> {
    this.logger.debug('Creating first admin user');
    try {
      return await this.prisma.adminUser.create({
        data: {
          username,
          passwordHash,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create admin user', error);
      throw error;
    }
  }
}
