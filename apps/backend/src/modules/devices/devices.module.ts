import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { PrintTemplateService } from '../admin/services/print-template.service';

@Module({
  controllers: [DevicesController],
  // DevicesService composes radio-admin devices (via the global RadioAdminModule)
  // with local active loans (via the global PrismaModule) — no local repository.
  providers: [DevicesService, PrintTemplateService],
  exports: [DevicesService],
})
export class DevicesModule {}
