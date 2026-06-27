import { Global, Module } from '@nestjs/common';
import { RadioAdminService } from './radio-admin.service';

/**
 * Provides the read-only client for radio-admin's loan API. Global so the
 * devices, loans and history modules can inject RadioAdminService without
 * repeating the import.
 */
@Global()
@Module({
  providers: [RadioAdminService],
  exports: [RadioAdminService],
})
export class RadioAdminModule {}
