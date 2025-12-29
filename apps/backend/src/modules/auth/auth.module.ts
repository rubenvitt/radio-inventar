import { Module } from '@nestjs/common';
import { TokenController } from './token.controller';

@Module({
  controllers: [TokenController],
})
export class AuthModule {}
