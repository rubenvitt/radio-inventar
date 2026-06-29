import { Module } from '@nestjs/common';
import { BorrowersController } from './borrowers.controller';
import { BorrowersService } from './borrowers.service';
import { BorrowersRepository } from './borrowers.repository';

// RadioAdminModule is @Global, so BorrowersRepository gets RadioAdminService
// injected without an explicit import; PrismaModule is no longer needed.
@Module({
  controllers: [BorrowersController],
  providers: [BorrowersService, BorrowersRepository],
  exports: [BorrowersService],
})
export class BorrowersModule {}
