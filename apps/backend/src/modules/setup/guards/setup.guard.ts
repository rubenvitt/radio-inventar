import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SetupService } from '../setup.service';
import { SETUP_ERROR_MESSAGES } from '@radio-inventar/shared';

/**
 * Guard that blocks access when setup is already complete.
 * Used to prevent admin creation after the first admin exists.
 */
@Injectable()
export class SetupGuard implements CanActivate {
  constructor(private readonly setupService: SetupService) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const isComplete = await this.setupService.isSetupComplete();

    if (isComplete) {
      throw new ForbiddenException(SETUP_ERROR_MESSAGES.ALREADY_COMPLETE);
    }

    return true;
  }
}
