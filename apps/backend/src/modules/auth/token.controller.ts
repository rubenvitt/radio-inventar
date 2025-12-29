import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, MinLength } from 'class-validator';
import { BypassApiToken } from '@/common/decorators';
import { API_TOKEN_ERROR_MESSAGES, API_TOKEN_CONFIG } from '@radio-inventar/shared';

class VerifyTokenDto {
  @IsString()
  @MinLength(API_TOKEN_CONFIG.MIN_LENGTH)
  token!: string;
}

interface TokenVerifyResponseDto {
  valid: boolean;
}

@Controller('auth')
export class TokenController {
  constructor(private readonly configService: ConfigService) {}

  @Post('verify-token')
  @BypassApiToken()
  @HttpCode(HttpStatus.OK)
  verifyToken(@Body() dto: VerifyTokenDto): TokenVerifyResponseDto {
    const apiToken = this.configService.get<string>('API_TOKEN')!;

    if (!dto.token || !this.constantTimeCompare(dto.token, apiToken)) {
      throw new UnauthorizedException(API_TOKEN_ERROR_MESSAGES.INVALID_TOKEN);
    }

    return { valid: true };
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
