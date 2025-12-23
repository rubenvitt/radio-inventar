import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { HistoryRepository } from './history.repository';

/**
 * History Module
 *
 * Provides admin dashboard statistics and loan history endpoints.
 * Internal to AdminModule - no exports needed.
 *
 * Endpoints:
 * - GET /admin/history/dashboard - Dashboard statistics and active loans
 * - GET /admin/history/history - Paginated loan history with filters
 *
 * All endpoints protected by SessionAuthGuard.
 */
@Module({
  controllers: [HistoryController],
  providers: [HistoryService, HistoryRepository],
  exports: [], // Internal module - no exports
})
export class HistoryModule {}
