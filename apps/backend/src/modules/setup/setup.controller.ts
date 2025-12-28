import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { SetupService } from './setup.service';
import { SetupGuard } from './guards/setup.guard';
import { CreateAdminDto } from './dto/create-admin.dto';
import { SetupStatusDto } from './dto/setup-status.dto';
import { Public } from '../../common/decorators';
import { SETUP_CONFIG } from '@radio-inventar/shared';
import { SessionResponseDto } from '../admin/auth/dto/session-response.dto';

@ApiTags('setup')
@Controller('setup')
export class SetupController {
  private readonly logger = new Logger(SetupController.name);

  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  @Public()
  @SkipThrottle() // Called frequently by frontend, no rate limiting needed
  @ApiOperation({ summary: 'Check if first-time setup is complete' })
  @ApiResponse({
    status: 200,
    description: 'Setup status',
    type: SetupStatusDto,
  })
  async getSetupStatus(): Promise<SetupStatusDto> {
    this.logger.log('GET /api/setup/status');
    const isSetupComplete = await this.setupService.isSetupComplete();
    return { isSetupComplete };
  }

  @Post()
  @Public()
  @UseGuards(SetupGuard) // Blocks if admin already exists
  @Throttle({
    default: {
      limit: SETUP_CONFIG.RATE_LIMIT_ATTEMPTS,
      ttl: SETUP_CONFIG.RATE_LIMIT_TTL_MS,
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create the first admin user' })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({
    status: 201,
    description: 'Admin created and logged in',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Setup already complete (admin exists)',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many setup attempts',
  })
  async createFirstAdmin(
    @Body() dto: CreateAdminDto,
    @Req() req: Request,
  ): Promise<SessionResponseDto> {
    this.logger.log('POST /api/setup');

    const admin = await this.setupService.createFirstAdmin(
      dto.username,
      dto.password,
      req,
    );

    return {
      username: admin.username,
      isValid: true,
    };
  }
}
