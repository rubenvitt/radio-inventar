import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { LoansRepository } from './loans.repository';

@Module({
  controllers: [LoansController],
  providers: [LoansService, LoansRepository],
  exports: [LoansService, LoansRepository], // For cross-module usage
})
export class LoansModule {}
