import {
  Controller,
  Patch,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CheckoutAttendanceDto } from './dto/checkout-attendance.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * FITUR KEPULANGAN & DETEKSI STRES (NEST.JS):
   * Endpoint PATCH /attendance/checkout
   * Menerima check_out_time (jam aktual saat klik tombol) dan mental_health_log (teks unek-unek).
   * Menghitung overtime_minutes jika check_out_time melewati jam selesai shift karyawan.
   */
  @Patch('checkout')
  async checkout(
    @CurrentUser() user: any,
    @Body() dto: CheckoutAttendanceDto,
  ) {
    return this.attendanceService.checkout(user.id, dto);
  }

  /**
   * Status kepulangan & shift hari ini untuk karyawan
   */
  @Get('today')
  async getTodayStatus(@CurrentUser() user: any) {
    return this.attendanceService.getTodayStatus(user.id);
  }
}
