import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthRepository } from './auth/auth.repository';
import { AdminDevicesController } from './devices/admin-devices.controller';
import { AdminDevicesService } from './devices/admin-devices.service';
import { AdminDevicesRepository } from './devices/admin-devices.repository';
import { PrintTemplateService } from './services/print-template.service';
import { HistoryModule } from './history/history.module';
import { PocketIdConfigService } from '../../config/pocket-id.config';

@Module({
  imports: [HistoryModule], // Story 6.1: Dashboard & History endpoints
  controllers: [AuthController, AdminDevicesController],
  providers: [
    AuthService,
    AuthRepository,
    AdminDevicesService,
    AdminDevicesRepository,
    PrintTemplateService, // Story 6.5: PDF print template generation
    PocketIdConfigService,
  ],
  exports: [AuthService],
})
export class AdminModule {}
