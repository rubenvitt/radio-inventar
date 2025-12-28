import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BorrowersController } from './borrowers.controller';
import { BorrowersService } from './borrowers.service';
import { BorrowersRepository } from './borrowers.repository';

@Module({
  imports: [PrismaModule],
  controllers: [BorrowersController],
  providers: [BorrowersService, BorrowersRepository],
  exports: [BorrowersService],
})
export class BorrowersModule {}
