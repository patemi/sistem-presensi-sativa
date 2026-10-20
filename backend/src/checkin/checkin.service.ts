import { Injectable, BadRequestException, UnprocessableEntityException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateGeofence } from '../common/utils/haversine.util';
import { encrypt } from '../common/utils/crypto.util';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * STEP 1: Check-in (Morning) — Attendance only, no feedback.
   * Validates geofence, records check-in time, sets status "belum_lengkap".
   */
  async checkIn(
    userId: string,
    latitude: number,
    longitude: number,
  ) {
    // 1. Enforce once-per-day check-in
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const alreadyCheckedIn = await this.prisma.attendanceCheckin.findFirst({
      where: {
        userId,
        checkInTime: { gte: todayStart, lte: todayEnd },
      },
    });

    if (alreadyCheckedIn) {
      throw new BadRequestException('Anda sudah melakukan absen masuk hari ini');
    }

    // 2. Get user's organization and find nearest office location
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { include: { officeLocations: true } } },
    });

    if (!user) throw new BadRequestException('User tidak ditemukan');

    const officeLocations = user.organization.officeLocations;
    if (officeLocations.length === 0) {
      throw new BadRequestException('Tidak ada lokasi kantor terdaftar');
    }

    // 3. Find nearest office and validate geofence
    let nearestOffice = officeLocations[0];
    let nearestResult = validateGeofence(
      latitude, longitude,
      nearestOffice.latitude, nearestOffice.longitude,
      nearestOffice.radiusMeters,
    );

    for (const loc of officeLocations.slice(1)) {
      const result = validateGeofence(
        latitude, longitude,
        loc.latitude, loc.longitude,
        loc.radiusMeters,
      );
      if (result.distance < nearestResult.distance) {
        nearestOffice = loc;
        nearestResult = result;
      }
    }

    // 4. Reject if outside geofence (unless DISABLE_GEOFENCE is enabled)
    const disableGeofence = process.env.DISABLE_GEOFENCE === 'true';
    if (!nearestResult.isWithin && !disableGeofence) {
      throw new UnprocessableEntityException(
        `Lokasi Anda di luar radius kantor (${nearestResult.distance.toFixed(0)}m dari ${nearestOffice.label}, maks ${nearestOffice.radiusMeters}m). Presensi ditolak.`,
      );
    }

    // 5. Calculate late minutes based on user's shift
    const checkInTime = new Date();
    const [shiftHour, shiftMin] = (user.shiftStart || '08:00').split(':').map(Number);
    const shiftStartTime = new Date(checkInTime);
    shiftStartTime.setHours(shiftHour, shiftMin, 0, 0);

    const lateMinutes = checkInTime > shiftStartTime
      ? Math.floor((checkInTime.getTime() - shiftStartTime.getTime()) / 60000)
      : 0;

    // 6. Create attendance check-in record with status "belum_lengkap"
    const checkin = await this.prisma.attendanceCheckin.create({
      data: {
        userId,
        officeLocationId: nearestOffice.id,
        checkInTime,
        latitude,
        longitude,
        distanceMeters: nearestResult.distance,
        isWithinGeofence: true,
        lateMinutes,
        attendanceStatus: 'belum_lengkap', // Will become 'hadir' after checkout + feedback
      },
    });

    return {
      success: true,
      checkinId: checkin.id,
      checkInTime,
      lateMinutes,
      attendanceStatus: 'belum_lengkap',
      officeLabel: nearestOffice.label,
      distanceMeters: nearestResult.distance,
    };
  }

  /**
   * STEP 2: Check-out (Afternoon) — Attendance + Mandatory Feedback.
   * Validates geofence, records check-out, collects anonymous feedback,
   * and updates status to "hadir".
   */
  async checkOut(
    userId: string,
    divisionId: string | null,
    organizationId: string,
    latitude: number,
    longitude: number,
    moodScore: number,
    noteText?: string,
  ) {
    // 1. Find today's check-in
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const checkin = await this.prisma.attendanceCheckin.findFirst({
      where: {
        userId,
        checkInTime: { gte: todayStart, lte: todayEnd },
      },
      include: { checkout: true },
    });

    if (!checkin) {
      throw new BadRequestException('Anda belum melakukan absen masuk hari ini');
    }

    if (checkin.checkout) {
      throw new BadRequestException('Anda sudah melakukan absen pulang hari ini');
    }

    // 2. Validate mood score
    if (!moodScore || moodScore < 1 || moodScore > 5) {
      throw new BadRequestException('Skor mood wajib diisi (1-5)');
    }

    // 3. Geofence validation for checkout
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { include: { officeLocations: true } } },
    });

    if (!user) throw new BadRequestException('User tidak ditemukan');

    const officeLocations = user.organization.officeLocations;
    let nearestOffice = officeLocations[0];
    let nearestResult = validateGeofence(
      latitude, longitude,
      nearestOffice.latitude, nearestOffice.longitude,
      nearestOffice.radiusMeters,
    );

    for (const loc of officeLocations.slice(1)) {
      const result = validateGeofence(
        latitude, longitude,
        loc.latitude, loc.longitude,
        loc.radiusMeters,
      );
      if (result.distance < nearestResult.distance) {
        nearestOffice = loc;
        nearestResult = result;
      }
    }

    const disableGeofence = process.env.DISABLE_GEOFENCE === 'true';
    if (!nearestResult.isWithin && !disableGeofence) {
      throw new UnprocessableEntityException(
        `Lokasi Anda di luar radius kantor (${nearestResult.distance.toFixed(0)}m dari ${nearestOffice.label}, maks ${nearestOffice.radiusMeters}m). Presensi pulang ditolak.`,
      );
    }

    const checkOutTime = new Date();

    // 4. Create checkout record (PATH 1: identifikatif)
    const checkout = await this.prisma.attendanceCheckout.create({
      data: {
        checkinId: checkin.id,
        userId,
        checkOutTime,
        latitude,
        longitude,
        distanceMeters: nearestResult.distance,
        isWithinGeofence: true,
      },
    });

    // 5. Update check-in status to "hadir"
    await this.prisma.attendanceCheckin.update({
      where: { id: checkin.id },
      data: { attendanceStatus: 'hadir' },
    });

    // 6. Store anonymous wellbeing feedback (PATH 2: ANONIM — NO user_id!)
    if (divisionId) {
      const encryptedNote = noteText ? encrypt(noteText) : null;
      await this.prisma.wellbeingFeedback.create({
        data: {
          divisionId,
          organizationId,
          submittedDate: checkOutTime,
          moodScore,
          noteText: encryptedNote,
          processed: false,
        },
      });
    }

    return {
      success: true,
      checkInTime: checkin.checkInTime,
      checkOutTime,
      attendanceStatus: 'hadir',
      distanceMeters: nearestResult.distance,
    };
  }

  /**
   * Get today's attendance status for the current user.
   */
  async getTodayStatus(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const checkin = await this.prisma.attendanceCheckin.findFirst({
      where: {
        userId,
        checkInTime: { gte: todayStart, lte: todayEnd },
      },
      include: { checkout: true, officeLocation: true },
    });

    if (!checkin) {
      return {
        hasCheckedIn: false,
        hasCheckedOut: false,
        checkin: null,
      };
    }

    return {
      hasCheckedIn: true,
      hasCheckedOut: !!checkin.checkout,
      checkin: {
        id: checkin.id,
        checkInTime: checkin.checkInTime,
        lateMinutes: checkin.lateMinutes,
        attendanceStatus: checkin.attendanceStatus,
        officeLabel: checkin.officeLocation?.label || '-',
        distanceMeters: checkin.distanceMeters,
        checkOutTime: checkin.checkout?.checkOutTime || null,
      },
    };
  }

  /**
   * Get personal attendance history (identifikatif — own data only).
   * NOTE: Does NOT include mood/feedback data since that is anonymous.
   */
  async getMyAttendanceHistory(userId: string) {
    const checkins = await this.prisma.attendanceCheckin.findMany({
      where: { userId },
      orderBy: { checkInTime: 'desc' },
      take: 30,
      include: {
        checkout: true,
        officeLocation: true,
      },
    });

    return checkins.map((c) => ({
      id: c.id,
      checkInTime: c.checkInTime,
      checkOutTime: c.checkout?.checkOutTime || null,
      lateMinutes: c.lateMinutes,
      attendanceStatus: c.attendanceStatus,
      officeLabel: c.officeLocation?.label || '-',
      distanceMeters: c.distanceMeters,
    }));
  }
}
