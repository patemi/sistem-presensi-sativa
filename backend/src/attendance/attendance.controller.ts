import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CheckoutAttendanceDto } from './dto/checkout-attendance.dto';
import { CheckInAttendanceDto } from './dto/checkin-attendance.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * ALUR PRESENSI DATANG (NEST.JS):
   * Endpoint POST /attendance/check-in
   * Cocokkan wajah dengan face-api.js (>90% mirip) & radius < 1m dari klinik.
   */
  @Post('check-in')
  async checkIn(
    @CurrentUser() user: any,
    @Body() dto: CheckInAttendanceDto,
  ) {
    return this.attendanceService.checkIn(user.id, dto);
  }

  /**
   * ALUR PRESENSI PULANG & UNEK-UNEK (NEST.JS):
   * Endpoint PATCH /attendance/check-out
   * Diklik saat waktu >= target_check_out, verifikasi wajah & lokasi < 1m,
   * serta mengirimkan mental_health_log (ceritakan harimu / unek-unek hari ini).
   */
  @Patch('check-out')
  async checkOut(
    @CurrentUser() user: any,
    @Body() dto: CheckoutAttendanceDto,
  ) {
    return this.attendanceService.checkout(user.id, dto);
  }

  /**
   * Alias Endpoint PATCH /attendance/checkout untuk backward-compatibility
   */
  @Patch('checkout')
  async checkout(
    @CurrentUser() user: any,
    @Body() dto: CheckoutAttendanceDto,
  ) {
    return this.attendanceService.checkout(user.id, dto);
  }

  /**
   * Status kepulangan & shift hari ini untuk karyawan/HR/Admin
   */
  @Get('today')
  async getTodayStatus(@CurrentUser() user: any) {
    return this.attendanceService.getTodayStatus(user.id);
  }

  /**
   * Kalibrasi titik koordinat klinik Orella sesuai meja kerja aktual
   */
  @Patch('calibrate-clinic-location')
  async calibrateClinicLocation(
    @Body() body: { latitude: number; longitude: number; radiusMeters?: number },
  ) {
    return this.attendanceService.calibrateClinicLocation(body.latitude, body.longitude, body.radiusMeters);
  }

  @Get('clinic-location')
  async getClinicLocation() {
    return this.attendanceService.getClinicLocation();
  }
}

