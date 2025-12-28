import { Module } from '@nestjs/common';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';
import { SetupRepository } from './setup.repository';
import { SetupGuard } from './guards/setup.guard';

@Module({
  controllers: [SetupController],
  providers: [SetupService, SetupRepository, SetupGuard],
  exports: [SetupService],
})
export class SetupModule {}
