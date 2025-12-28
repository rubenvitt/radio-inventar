import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { validateEnv } from './config/env.config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { DevicesModule } from './modules/devices/devices.module';
import { LoansModule } from './modules/loans/loans.module';
import { BorrowersModule } from './modules/borrowers/borrowers.module';
import { AdminModule } from './modules/admin/admin.module';
import { SetupModule } from './modules/setup/setup.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    DevicesModule,
    LoansModule,
    BorrowersModule,
    AdminModule,
    SetupModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule { }
