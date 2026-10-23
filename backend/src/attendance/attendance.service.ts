import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Schedule, ShiftType } from '../schedule/entities/schedule.entity';
import { CheckoutAttendanceDto } from './dto/checkout-attendance.dto';
import { CheckInAttendanceDto } from './dto/checkin-attendance.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CLINIC_LOCATION, validateGeofence, updateClinicCoordinates } from '../common/utils/haversine.util';
import {
  parseFaceDescriptor,
  calculateEuclideanDistance,
  calculateSimilarityPercent,
  FACE_MATCH_MAX_DISTANCE,
} from '../common/utils/biometric.util';

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
   * ALUR PRESENSI DATANG (NEST.JS):
   * Endpoint POST /attendance/check-in
   * Memvalidasi lokasi (< 1 meter dari Orella Aesthetic Clinic),
   * mencatat jam check-in, dan mengembalikan target_check_out untuk mengunci tombol pulang.
   */
  async checkIn(userId: string, dto: CheckInAttendanceDto) {
    if (dto.latitude === undefined || dto.longitude === undefined) {
      throw new BadRequestException('Koordinat GPS (latitude & longitude) wajib disertakan');
    }

    // 1. Validasi Geofence ketat: < 1 meter dari lokasi klinik
    const geo = validateGeofence(
      dto.latitude,
      dto.longitude,
      CLINIC_LOCATION.latitude,
      CLINIC_LOCATION.longitude,
      CLINIC_LOCATION.maxRadiusMeters,
    );

    const disableGeofence = process.env.DISABLE_GEOFENCE === 'true';
    if (!geo.isWithin && !disableGeofence) {
      throw new BadRequestException(
        `Lokasi Anda terdeteksi ${geo.distance.toFixed(2)} meter dari klinik. Batas maksimal presensi adalah ${CLINIC_LOCATION.maxRadiusMeters} meter dari titik klinik.`,
      );
    }

    const checkInDate = dto.check_in_time ? new Date(dto.check_in_time) : new Date();
    const dateStr = dto.date || this.formatDateStr(checkInDate);

    // 2. Validasi Biometrik Wajah & Anti-Joki (Wajah harus cocok dengan master biometrik akun)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, faceDescriptor: true, role: true },
    });

    if (!user) {
      throw new BadRequestException('Pengguna tidak ditemukan.');
    }

    if (!user.faceDescriptor) {
      throw new BadRequestException(
        'Master biometrik wajah Anda belum terdaftar. Silakan klik tombol "Daftarkan" master wajah terlebih dahulu sebelum melakukan presensi.',
      );
    }

    // Jika live face descriptor dikirim dari kamera, verifikasi kecocokannya dengan master wajah pengguna
    if (dto.face_descriptor) {
      try {
        const liveVector = parseFaceDescriptor(dto.face_descriptor);
        const masterVector = parseFaceDescriptor(user.faceDescriptor);
        const distance = calculateEuclideanDistance(liveVector, masterVector);

        // Ambang batas ketat: jika jarak > 0.50, wajah tidak cocok (bukan karyawan yang bersangkutan)
        if (distance > FACE_MATCH_MAX_DISTANCE) {
          const similarity = calculateSimilarityPercent(distance);
          throw new BadRequestException(
            `Verifikasi Wajah Gagal: Wajah yang tampil di kamera tidak cocok dengan master biometrik Anda (${similarity}% kemiripan, minimal 85%). Presensi harus dilakukan langsung oleh karyawan pemilik akun asli!`,
          );
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException('Gagal memverifikasi data biometrik wajah: ' + err.message);
      }
    } else if (!dto.face_verified) {
      throw new BadRequestException('Verifikasi biometrik wajah wajib dilakukan melalui pemindaian kamera.');
    }

    // 3. Cek apakah sudah pernah check-in hari ini
    let attendance = await this.attendanceRepo.findOne({
      where: { user_id: userId, date: dateStr },
    });

    if (attendance && attendance.check_in_time) {
      throw new BadRequestException('Anda sudah melakukan presensi datang hari ini.');
    }

    // 3. Simpan atau perbarui data Attendance
    if (!attendance) {
      attendance = this.attendanceRepo.create({
        user_id: userId,
        date: dateStr,
        check_in_time: checkInDate,
      });
    } else {
      attendance.check_in_time = checkInDate;
    }

    const saved = await this.attendanceRepo.save(attendance);

    // 4. Cari jadwal shift karyawan untuk hari ini
    const schedule = await this.scheduleRepo.findOne({
      where: { user_id: userId, date: dateStr },
    });

    // Default target_check_out jika belum diset
    let targetCheckOut = '17:00';
    let targetCheckIn = '08:30';
    if (schedule?.target_check_out && schedule.target_check_out !== '-') {
      targetCheckOut = schedule.target_check_out;
    } else if (schedule?.shift_type === ShiftType.SIANG) {
      targetCheckOut = '19:00';
    } else if (schedule?.shift_type === ShiftType.LONG) {
      targetCheckOut = '20:00';
    } else if (schedule?.shift_type === ShiftType.OFF) {
      targetCheckOut = '-';
    }

    if (schedule?.target_check_in && schedule.target_check_in !== '-') {
      targetCheckIn = schedule.target_check_in;
    } else if (schedule?.shift_type === ShiftType.SIANG) {
      targetCheckIn = '10:30';
    } else if (schedule?.shift_type === ShiftType.LONG) {
      targetCheckIn = '08:30';
    } else if (schedule?.shift_type === ShiftType.OFF) {
      targetCheckIn = '-';
    }

    // 5. Cek apakah waktu sekarang sudah melewati target_check_out
    let canCheckout = false;
    if (targetCheckOut === '-') {
      canCheckout = true;
    } else {
      const [outH, outM] = targetCheckOut.split(':').map(Number);
      const targetOutTime = new Date(checkInDate);
      targetOutTime.setHours(outH, outM, 0, 0);
      canCheckout = checkInDate.getTime() >= targetOutTime.getTime();
    }

    // 6. Sinkronisasi ke attendance_checkins Prisma jika ada
    try {
      const todayStart = new Date(checkInDate);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(checkInDate);
      todayEnd.setHours(23, 59, 59, 999);

      const existingCheckin = await this.prisma.attendanceCheckin.findFirst({
        where: { userId, checkInTime: { gte: todayStart, lte: todayEnd } },
      });

      if (!existingCheckin) {
        await this.prisma.attendanceCheckin.create({
          data: {
            userId,
            checkInTime: checkInDate,
            latitude: dto.latitude,
            longitude: dto.longitude,
            distanceMeters: geo.distance,
            isWithinGeofence: geo.isWithin,
            lateMinutes: 0,
            attendanceStatus: 'belum_lengkap',
          },
        });
      }
    } catch (e) {
      this.logger.warn('Prisma attendance_checkin sync skipped', e);
    }

    return {
      success: true,
      status: 'Kehadiran Berhasil',
      message: 'Presensi datang berhasil diverifikasi dan dicatat!',
      attendance: saved,
      schedule: schedule || {
        date: dateStr,
        target_check_in: targetCheckIn,
        target_check_out: targetCheckOut,
      },
      target_check_in: targetCheckIn,
      target_check_out: targetCheckOut,
      can_checkout: canCheckout,
    };
  }

  /**
   * FITUR KEPULANGAN & DETEKSI STRES (NEST.JS):
   * Endpoint PATCH /attendance/checkout atau PATCH /attendance/check-out.
   * Menerima check_out_time, latitude, longitude, dan mental_health_log (teks unek-unek).
   * Validasi radius < 1m dan jam >= target_check_out.
   */
  async checkout(userId: string, dto: CheckoutAttendanceDto) {
    if (!dto.mental_health_log || dto.mental_health_log.trim().length === 0) {
      throw new BadRequestException(
        'Teks unek-unek / cerita harimu (mental_health_log) wajib diisi.',
      );
    }

    // Validasi lokasi < 1m jika koordinat dikirim
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      const geo = validateGeofence(
        dto.latitude,
        dto.longitude,
        CLINIC_LOCATION.latitude,
        CLINIC_LOCATION.longitude,
        CLINIC_LOCATION.maxRadiusMeters,
      );
      const disableGeofence = process.env.DISABLE_GEOFENCE === 'true';
      if (!geo.isWithin && !disableGeofence) {
        throw new BadRequestException(
          `Lokasi Anda terdeteksi ${geo.distance.toFixed(2)} meter dari klinik. Presensi kepulangan hanya dapat dilakukan di dalam area klinik (< ${CLINIC_LOCATION.maxRadiusMeters} meter).`,
        );
      }
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

    // Validasi Biometrik Wajah Kepulangan
    if (user.faceDescriptor && dto.face_descriptor) {
      try {
        const liveVector = parseFaceDescriptor(dto.face_descriptor);
        const masterVector = parseFaceDescriptor(user.faceDescriptor);
        const distance = calculateEuclideanDistance(liveVector, masterVector);

        if (distance > FACE_MATCH_MAX_DISTANCE) {
          const similarity = calculateSimilarityPercent(distance);
          throw new BadRequestException(
            `Verifikasi Wajah Gagal: Wajah yang tampil di kamera tidak cocok dengan master biometrik Anda (${similarity}% kemiripan). Presensi kepulangan harus dilakukan langsung oleh pemilik akun asli!`,
          );
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException('Gagal memverifikasi data biometrik wajah kepulangan: ' + err.message);
      }
    }

    // 2. Tentukan jam selesai shift:
    // PAGI -> 17:00 (08:30 - 17:00)
    // SIANG -> 19:00 (10:30 - 19:00)
    // LONG -> 20:00 (08:30 - 20:00 / Closing)
    // OFF -> Libur
    let shiftEndHour = 17;
    let shiftEndMinute = 0;
    let shiftTypeLabel = 'PAGI (08:30 - 17:00)';

    if (schedule) {
      if (schedule.shift_type === ShiftType.SIANG) {
        shiftEndHour = 19;
        shiftEndMinute = 0;
        shiftTypeLabel = 'SIANG (10:30 - 19:00)';
      } else if (schedule.shift_type === ShiftType.LONG) {
        shiftEndHour = 20;
        shiftEndMinute = 0;
        shiftTypeLabel = 'LONG SHIFT (08:30 - 20:00 / Closing)';
      } else if (schedule.shift_type === ShiftType.OFF) {
        shiftEndHour = 17;
        shiftEndMinute = 0;
        shiftTypeLabel = 'LIBUR (OFF)';
      } else {
        shiftEndHour = 17;
        shiftEndMinute = 0;
        shiftTypeLabel = 'PAGI (08:30 - 17:00)';
      }

      if (schedule.target_check_out && schedule.target_check_out.includes(':')) {
        const [h, m] = schedule.target_check_out.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          shiftEndHour = h;
          shiftEndMinute = m;
        }
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
    let shiftEndHour = 17;
    let shiftEndMinute = 0;
    let shiftStart = '08:30';

    if (shiftType === ShiftType.SIANG) {
      shiftStart = '10:30';
      shiftEndHour = 19;
    } else if (shiftType === ShiftType.LONG) {
      shiftStart = '08:30';
      shiftEndHour = 20;
    } else if (shiftType === ShiftType.OFF) {
      shiftStart = '-';
      shiftEndHour = 17;
    }

    if (schedule?.target_check_in && schedule.target_check_in !== '-') {
      shiftStart = schedule.target_check_in;
    }
    if (schedule?.target_check_out && schedule.target_check_out.includes(':')) {
      const [h, m] = schedule.target_check_out.split(':').map(Number);
      if (!isNaN(h)) shiftEndHour = h;
      if (!isNaN(m)) shiftEndMinute = m;
    }

    let shiftEnd = shiftType === ShiftType.OFF
      ? '-'
      : `${String(shiftEndHour).padStart(2, '0')}:${String(shiftEndMinute).padStart(2, '0')}`;

    const shiftEndTime = new Date(now);
    shiftEndTime.setHours(shiftEndHour, shiftEndMinute, 0, 0);

    const isPastShiftEnd = shiftType === ShiftType.OFF ? true : now.getTime() >= shiftEndTime.getTime();

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

  /**
   * Kalibrasi titik pusat klinik Orella sesuai koordinat meja kerja aktual pengguna
   */
  async calibrateClinicLocation(latitude: number, longitude: number, radiusMeters: number = 25.0) {
    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException('Latitude dan longitude wajib diisi');
    }

    updateClinicCoordinates(latitude, longitude, radiusMeters);

    try {
      await this.prisma.officeLocation.updateMany({
        where: { label: { contains: 'Orella' } },
        data: {
          latitude,
          longitude,
          radiusMeters,
        },
      });
    } catch (e) {
      this.logger.warn('Failed to update officeLocation table in prisma', e);
    }

    this.logger.log(`Titik klinik Orella dikalibrasi ke: Lat=${latitude}, Lng=${longitude}, Radius=${radiusMeters}m`);

    return {
      success: true,
      message: 'Titik pusat koordinat klinik berhasil dikalibrasi ke posisi meja Anda!',
      location: CLINIC_LOCATION,
    };
  }

  getClinicLocation() {
    return CLINIC_LOCATION;
  }
}
