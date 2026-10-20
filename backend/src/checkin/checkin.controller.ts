import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('karyawan', 'hr') // HR also does presensi like employees
export class CheckinController {
  constructor(private checkinService: CheckinService) {}

  /**
   * STEP 1: Clock-in (morning) — location only, no feedback.
   */
  @Post()
  async createCheckin(
    @CurrentUser() user: any,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.checkinService.checkIn(
      user.id,
      body.latitude,
      body.longitude,
    );
  }

  /**
   * STEP 2: Clock-out (afternoon) — location + mandatory feedback.
   */
  @Post('checkout')
  async createCheckout(
    @CurrentUser() user: any,
    @Body() body: {
      latitude: number;
      longitude: number;
      moodScore: number;
      noteText?: string;
    },
  ) {
    return this.checkinService.checkOut(
      user.id,
      user.divisionId,
      user.organizationId,
      body.latitude,
      body.longitude,
      body.moodScore,
      body.noteText,
    );
  }

  /**
   * Get today's attendance status (checked in? checked out?)
   */
  @Get('today-status')
  async getTodayStatus(@CurrentUser() user: any) {
    return this.checkinService.getTodayStatus(user.id);
  }

  /**
   * Get personal attendance history (no mood/feedback — that's anonymous).
   */
  @Get('my-history')
  async getMyHistory(@CurrentUser() user: any) {
    return this.checkinService.getMyAttendanceHistory(user.id);
  }
}
