import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [ScheduleModule.forRoot(), GeminiModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
