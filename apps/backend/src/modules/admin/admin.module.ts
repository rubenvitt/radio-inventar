import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthRepository } from './auth/auth.repository';
import { PocketIdService } from './auth/pocket-id.service';
import { AdminDevicesController } from './devices/admin-devices.controller';
import { AdminDevicesService } from './devices/admin-devices.service';
import { PrintTemplateService } from './services/print-template.service';
import { HistoryModule } from './history/history.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  // DevicesModule provides the shared (read-only) DevicesService used by the
  // admin device view; HistoryModule adds the dashboard & history endpoints.
  imports: [HistoryModule, DevicesModule],
  controllers: [AuthController, AdminDevicesController],
  providers: [
    AuthService,
    AuthRepository,
    PocketIdService,
    AdminDevicesService,
    PrintTemplateService, // Story 6.5: PDF print template generation
  ],
  exports: [AuthService],
})
export class AdminModule {}
