import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DevicesRepository } from './devices.repository';
import { PrintTemplateService } from '../admin/services/print-template.service';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository, PrintTemplateService],
  exports: [DevicesService, DevicesRepository], // For cross-module usage
})
export class DevicesModule {}
