import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { AdminUser } from '@prisma/client';

@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<AdminUser | null> {
    this.logger.debug('Finding admin by username');
    try {
      return await this.prisma.adminUser.findUnique({ where: { username } });
    } catch (error) {
      // Review #2: Add error logging for database failures
      this.logger.error('Failed to find admin user', error);
      throw error;
    }
  }

  async findById(id: string): Promise<AdminUser | null> {
    this.logger.debug('Finding admin by ID');
    try {
      return await this.prisma.adminUser.findUnique({ where: { id } });
    } catch (error) {
      this.logger.error('Failed to find admin user by ID', error);
      throw error;
    }
  }

  async updateCredentials(
    id: string,
    data: { username?: string; passwordHash?: string },
  ): Promise<AdminUser> {
    this.logger.debug('Updating admin credentials');
    try {
      return await this.prisma.adminUser.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error('Failed to update admin credentials', error);
      throw error;
    }
  }

  async isUsernameTaken(username: string, excludeId: string): Promise<boolean> {
    this.logger.debug('Checking if username is taken');
    try {
      const existingUser = await this.prisma.adminUser.findFirst({
        where: {
          username,
          id: { not: excludeId },
        },
      });
      return existingUser !== null;
    } catch (error) {
      this.logger.error('Failed to check username availability', error);
      throw error;
    }
  }
}
