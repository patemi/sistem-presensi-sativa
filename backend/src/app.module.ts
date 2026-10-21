import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CheckinModule } from './checkin/checkin.module';
import { GeminiModule } from './gemini/gemini.module';
import { CronModule } from './cron/cron.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { OfficeLocationModule } from './office-location/office-location.module';
import { LeaveModule } from './leave/leave.module';

import * as path from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './schedule/entities/schedule.entity';
import { ShiftSwapRequest } from './schedule/entities/shift-swap-request.entity';
import { Attendance } from './attendance/entities/attendance.entity';
import { ScheduleModule } from './schedule/schedule.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: path.resolve(process.cwd(), 'prisma/dev.db'),
      entities: [Schedule, ShiftSwapRequest, Attendance],
      synchronize: false,
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: configService.get<string>('EMAIL_ADMIN') || configService.get<string>('SMTP_USER'),
            pass: (configService.get<string>('EMAIL_PASSWORD') || configService.get<string>('SMTP_PASS'))?.replace(/\s+/g, ''),
          },
        },
        defaults: {
          from: `"SATIVA Klinik Kecantikan" <${configService.get<string>('EMAIL_ADMIN') || configService.get<string>('SMTP_USER')}>`,
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    CheckinModule,
    GeminiModule,
    CronModule,
    AnalyticsModule,
    OfficeLocationModule,
    LeaveModule,
    ScheduleModule,
    AttendanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
