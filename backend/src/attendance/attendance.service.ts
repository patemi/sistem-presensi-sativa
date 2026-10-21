import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Schedule, ShiftType } from '../schedule/entities/schedule.entity';
import { CheckoutAttendanceDto } from './dto/checkout-attendance.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Format helper YYYY-MM-DD
   */
  private formatDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * FITUR KEPULANGAN & DETEKSI STRES (NEST.JS):
   * Endpoint PATCH /attendance/checkout.
   * Menerima check_out_time (jam aktual saat klik tombol) dan mental_health_log (teks unek-unek).
   * Logic kalkulasi: Jika check_out_time melewati jam selesai shift karyawan tersebut,
   * otomatis hitung selisihnya dan simpan ke kolom overtime_minutes.
   * Simpan juga teks unek-uneknya.
   */
  async checkout(userId: string, dto: CheckoutAttendanceDto) {
    if (!dto.mental_health_log || dto.mental_health_log.trim().length === 0) {
      throw new BadRequestException(
        'Teks unek-unek / catatan evaluasi hari ini (mental_health_log) wajib diisi.',
      );
    }

    const checkOutDate = dto.check_out_time
      ? new Date(dto.check_out_time)
      : new Date();

    if (isNaN(checkOutDate.getTime())) {
      throw new BadRequestException('Format check_out_time tidak valid');
    }

    const dateStr = this.formatDateStr(checkOutDate);

    // 1. Cari jadwal shift karyawan untuk hari ini dari tabel Schedule
    const schedule = await this.scheduleRepo.findOne({
      where: { user_id: userId, date: dateStr },
    });

    // Ambil data user fallback jika belum ada jadwal spesifik
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User tidak ditemukan');
    }

    // 2. Tentukan jam selesai shift:
    // PAGI -> 17:00 (08:30 - 17:00)
    // SIANG -> 19:00 (10:30 - 19:00)
    let shiftEndHour = 17;
    let shiftEndMinute = 0;
    let shiftTypeLabel = 'PAGI (08:30 - 17:00)';

    if (schedule) {
      if (schedule.shift_type === ShiftType.SIANG) {
        shiftEndHour = 19;
        shiftEndMinute = 0;
        shiftTypeLabel = 'SIANG (10:30 - 19:00)';
      } else {
        shiftEndHour = 17;
        shiftEndMinute = 0;
        shiftTypeLabel = 'PAGI (08:30 - 17:00)';
      }
    } else if (user.shiftEnd) {
      // Fallback ke shift_end di profil user
      const [h, m] = user.shiftEnd.split(':').map(Number);
      if (!isNaN(h)) shiftEndHour = h;
      if (!isNaN(m)) shiftEndMinute = m;
      shiftTypeLabel = `Standar (${user.shiftStart} - ${user.shiftEnd})`;
    }

    // 3. Buat objek waktu target selesai shift pada hari yang sama
    const shiftEndTime = new Date(checkOutDate);
    shiftEndTime.setHours(shiftEndHour, shiftEndMinute, 0, 0);

    // 4. Kalkulasi: Jika check_out_time melewati jam selesai shift,
    // hitung selisihnya dalam menit dan simpan ke kolom overtime_minutes
    let overtimeMinutes = 0;
    const diffMs = checkOutDate.getTime() - shiftEndTime.getTime();
    if (diffMs > 0) {
      overtimeMinutes = Math.floor(diffMs / (1000 * 60));
    }

    this.logger.log(
      `Checkout User ${userId} [${dateStr}]: Checkout=${checkOutDate.toISOString()}, ShiftEnd=${shiftEndTime.toISOString()}, Lembur=${overtimeMinutes} mnt`,
    );

    // 5. Simpan ke tabel Attendance (TypeORM)
    let attendance = await this.attendanceRepo.findOne({
      where: { user_id: userId, date: dateStr },
    });

    if (!attendance) {
      attendance = this.attendanceRepo.create({
        user_id: userId,
        date: dateStr,
        check_out_time: checkOutDate,
        overtime_minutes: overtimeMinutes,
        mental_health_log: dto.mental_health_log.trim(),
      });
    } else {
      attendance.check_out_time = checkOutDate;
      attendance.overtime_minutes = overtimeMinutes;
      attendance.mental_health_log = dto.mental_health_log.trim();
    }

    const savedAttendance = await this.attendanceRepo.save(attendance);

    // 6. Sinkronisasi opsional ke attendance_checkins (jika ada absen masuk hari ini)
    try {
      const todayStart = new Date(checkOutDate);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(checkOutDate);
      todayEnd.setHours(23, 59, 59, 999);

      const checkin = await this.prisma.attendanceCheckin.findFirst({
        where: {
          userId,
          checkInTime: { gte: todayStart, lte: todayEnd },
        },
      });

      if (checkin) {
        await this.prisma.attendanceCheckin.update({
          where: { id: checkin.id },
          data: { attendanceStatus: 'hadir' },
        });

        // Ensure AttendanceCheckout record
        const existingCheckout = await this.prisma.attendanceCheckout.findUnique({
          where: { checkinId: checkin.id },
        });
        if (!existingCheckout) {
          await this.prisma.attendanceCheckout.create({
            data: {
              checkinId: checkin.id,
              userId,
              checkOutTime: checkOutDate,
              latitude: checkin.latitude,
              longitude: checkin.longitude,
              distanceMeters: checkin.distanceMeters,
              isWithinGeofence: true,
            },
          });
        }
      }
    } catch (syncErr) {
      this.logger.warn('Sinkronisasi status hadir prisma opsional di-skip', syncErr);
    }

    return {
      success: true,
      message: 'Presensi kepulangan & catatan unek-unek berhasil disimpan.',
      data: savedAttendance,
      summary: {
        date: dateStr,
        shift_type: schedule?.shift_type || 'PAGI',
        shift_label: shiftTypeLabel,
        shift_end: `${String(shiftEndHour).padStart(2, '0')}:${String(shiftEndMinute).padStart(2, '0')}`,
        check_out_time: checkOutDate,
        overtime_minutes: overtimeMinutes,
        is_overtime: overtimeMinutes > 0,
        mental_health_log: dto.mental_health_log.trim(),
      },
    };
  }

  /**
   * Ambil status kepulangan hari ini untuk user
   */
  async getTodayStatus(userId: string) {
    const now = new Date();
    const dateStr = this.formatDateStr(now);

    const schedule = await this.scheduleRepo.findOne({
      where: { user_id: userId, date: dateStr },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    let shiftType = schedule?.shift_type || ShiftType.PAGI;
    let shiftEndHour = shiftType === ShiftType.SIANG ? 19 : 17;
    let shiftEndMinute = 0;
    let shiftStart = shiftType === ShiftType.SIANG ? '10:30' : '08:30';
    let shiftEnd = `${String(shiftEndHour).padStart(2, '0')}:${String(shiftEndMinute).padStart(2, '0')}`;

    const shiftEndTime = new Date(now);
    shiftEndTime.setHours(shiftEndHour, shiftEndMinute, 0, 0);

    const isPastShiftEnd = now.getTime() >= shiftEndTime.getTime();

    const attendance = await this.attendanceRepo.findOne({
      where: { user_id: userId, date: dateStr },
    });

    const hasCheckedOut = !!attendance?.check_out_time;

    return {
      date: dateStr,
      currentTime: now.toISOString(),
      shiftType,
      shiftStart,
      shiftEnd,
      isPastShiftEnd,
      hasCheckedOut,
      attendance,
      // Status text helper untuk UI
      needsCheckoutNotice: isPastShiftEnd && !hasCheckedOut,
    };
  }
}
