import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DevicesRepository } from './devices.repository';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository],
  exports: [DevicesService, DevicesRepository], // For cross-module usage
})
export class DevicesModule {}
