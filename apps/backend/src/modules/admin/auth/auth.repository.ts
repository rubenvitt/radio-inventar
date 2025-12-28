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
}
