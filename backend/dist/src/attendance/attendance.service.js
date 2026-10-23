"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AttendanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const attendance_entity_1 = require("./entities/attendance.entity");
const schedule_entity_1 = require("../schedule/entities/schedule.entity");
const prisma_service_1 = require("../prisma/prisma.service");
const haversine_util_1 = require("../common/utils/haversine.util");
const biometric_util_1 = require("../common/utils/biometric.util");
let AttendanceService = AttendanceService_1 = class AttendanceService {
    attendanceRepo;
    scheduleRepo;
    prisma;
    logger = new common_1.Logger(AttendanceService_1.name);
    constructor(attendanceRepo, scheduleRepo, prisma) {
        this.attendanceRepo = attendanceRepo;
        this.scheduleRepo = scheduleRepo;
        this.prisma = prisma;
    }
    formatDateStr(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    async checkIn(userId, dto) {
        if (dto.latitude === undefined || dto.longitude === undefined) {
            throw new common_1.BadRequestException('Koordinat GPS (latitude & longitude) wajib disertakan');
        }
        const geo = (0, haversine_util_1.validateGeofence)(dto.latitude, dto.longitude, haversine_util_1.CLINIC_LOCATION.latitude, haversine_util_1.CLINIC_LOCATION.longitude, haversine_util_1.CLINIC_LOCATION.maxRadiusMeters);
        const disableGeofence = process.env.DISABLE_GEOFENCE === 'true';
        if (!geo.isWithin && !disableGeofence) {
            throw new common_1.BadRequestException(`Lokasi Anda terdeteksi ${geo.distance.toFixed(2)} meter dari klinik. Batas maksimal presensi adalah ${haversine_util_1.CLINIC_LOCATION.maxRadiusMeters} meter dari titik klinik.`);
        }
        const checkInDate = dto.check_in_time ? new Date(dto.check_in_time) : new Date();
        const dateStr = dto.date || this.formatDateStr(checkInDate);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, fullName: true, faceDescriptor: true, role: true },
        });
        if (!user) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan.');
        }
        if (!user.faceDescriptor) {
            throw new common_1.BadRequestException('Master biometrik wajah Anda belum terdaftar. Silakan klik tombol "Daftarkan" master wajah terlebih dahulu sebelum melakukan presensi.');
        }
        if (dto.face_descriptor) {
            try {
                const liveVector = (0, biometric_util_1.parseFaceDescriptor)(dto.face_descriptor);
                const masterVector = (0, biometric_util_1.parseFaceDescriptor)(user.faceDescriptor);
                const distance = (0, biometric_util_1.calculateEuclideanDistance)(liveVector, masterVector);
                if (distance > biometric_util_1.FACE_MATCH_MAX_DISTANCE) {
                    const similarity = (0, biometric_util_1.calculateSimilarityPercent)(distance);
                    throw new common_1.BadRequestException(`Verifikasi Wajah Gagal: Wajah yang tampil di kamera tidak cocok dengan master biometrik Anda (${similarity}% kemiripan, minimal 85%). Presensi harus dilakukan langsung oleh karyawan pemilik akun asli!`);
                }
            }
            catch (err) {
                if (err instanceof common_1.BadRequestException)
                    throw err;
                throw new common_1.BadRequestException('Gagal memverifikasi data biometrik wajah: ' + err.message);
            }
        }
        else if (!dto.face_verified) {
            throw new common_1.BadRequestException('Verifikasi biometrik wajah wajib dilakukan melalui pemindaian kamera.');
        }
        let attendance = await this.attendanceRepo.findOne({
            where: { user_id: userId, date: dateStr },
        });
        if (attendance && attendance.check_in_time) {
            throw new common_1.BadRequestException('Anda sudah melakukan presensi datang hari ini.');
        }
        if (!attendance) {
            attendance = this.attendanceRepo.create({
                user_id: userId,
                date: dateStr,
                check_in_time: checkInDate,
            });
        }
        else {
            attendance.check_in_time = checkInDate;
        }
        const saved = await this.attendanceRepo.save(attendance);
        const schedule = await this.scheduleRepo.findOne({
            where: { user_id: userId, date: dateStr },
        });
        let targetCheckOut = '17:00';
        let targetCheckIn = '08:30';
        if (schedule?.target_check_out && schedule.target_check_out !== '-') {
            targetCheckOut = schedule.target_check_out;
        }
        else if (schedule?.shift_type === schedule_entity_1.ShiftType.SIANG) {
            targetCheckOut = '19:00';
        }
        else if (schedule?.shift_type === schedule_entity_1.ShiftType.LONG) {
            targetCheckOut = '20:00';
        }
        else if (schedule?.shift_type === schedule_entity_1.ShiftType.OFF) {
            targetCheckOut = '-';
        }
        if (schedule?.target_check_in && schedule.target_check_in !== '-') {
            targetCheckIn = schedule.target_check_in;
        }
        else if (schedule?.shift_type === schedule_entity_1.ShiftType.SIANG) {
            targetCheckIn = '10:30';
        }
        else if (schedule?.shift_type === schedule_entity_1.ShiftType.LONG) {
            targetCheckIn = '08:30';
        }
        else if (schedule?.shift_type === schedule_entity_1.ShiftType.OFF) {
            targetCheckIn = '-';
        }
        let canCheckout = false;
        if (targetCheckOut === '-') {
            canCheckout = true;
        }
        else {
            const [outH, outM] = targetCheckOut.split(':').map(Number);
            const targetOutTime = new Date(checkInDate);
            targetOutTime.setHours(outH, outM, 0, 0);
            canCheckout = checkInDate.getTime() >= targetOutTime.getTime();
        }
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
        }
        catch (e) {
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
    async checkout(userId, dto) {
        if (!dto.mental_health_log || dto.mental_health_log.trim().length === 0) {
            throw new common_1.BadRequestException('Teks unek-unek / cerita harimu (mental_health_log) wajib diisi.');
        }
        if (dto.latitude !== undefined && dto.longitude !== undefined) {
            const geo = (0, haversine_util_1.validateGeofence)(dto.latitude, dto.longitude, haversine_util_1.CLINIC_LOCATION.latitude, haversine_util_1.CLINIC_LOCATION.longitude, haversine_util_1.CLINIC_LOCATION.maxRadiusMeters);
            const disableGeofence = process.env.DISABLE_GEOFENCE === 'true';
            if (!geo.isWithin && !disableGeofence) {
                throw new common_1.BadRequestException(`Lokasi Anda terdeteksi ${geo.distance.toFixed(2)} meter dari klinik. Presensi kepulangan hanya dapat dilakukan di dalam area klinik (< ${haversine_util_1.CLINIC_LOCATION.maxRadiusMeters} meter).`);
            }
        }
        const checkOutDate = dto.check_out_time
            ? new Date(dto.check_out_time)
            : new Date();
        if (isNaN(checkOutDate.getTime())) {
            throw new common_1.BadRequestException('Format check_out_time tidak valid');
        }
        const dateStr = this.formatDateStr(checkOutDate);
        const schedule = await this.scheduleRepo.findOne({
            where: { user_id: userId, date: dateStr },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.BadRequestException('User tidak ditemukan');
        }
        if (user.faceDescriptor && dto.face_descriptor) {
            try {
                const liveVector = (0, biometric_util_1.parseFaceDescriptor)(dto.face_descriptor);
                const masterVector = (0, biometric_util_1.parseFaceDescriptor)(user.faceDescriptor);
                const distance = (0, biometric_util_1.calculateEuclideanDistance)(liveVector, masterVector);
                if (distance > biometric_util_1.FACE_MATCH_MAX_DISTANCE) {
                    const similarity = (0, biometric_util_1.calculateSimilarityPercent)(distance);
                    throw new common_1.BadRequestException(`Verifikasi Wajah Gagal: Wajah yang tampil di kamera tidak cocok dengan master biometrik Anda (${similarity}% kemiripan). Presensi kepulangan harus dilakukan langsung oleh pemilik akun asli!`);
                }
            }
            catch (err) {
                if (err instanceof common_1.BadRequestException)
                    throw err;
                throw new common_1.BadRequestException('Gagal memverifikasi data biometrik wajah kepulangan: ' + err.message);
            }
        }
        let shiftEndHour = 17;
        let shiftEndMinute = 0;
        let shiftTypeLabel = 'PAGI (08:30 - 17:00)';
        if (schedule) {
            if (schedule.shift_type === schedule_entity_1.ShiftType.SIANG) {
                shiftEndHour = 19;
                shiftEndMinute = 0;
                shiftTypeLabel = 'SIANG (10:30 - 19:00)';
            }
            else if (schedule.shift_type === schedule_entity_1.ShiftType.LONG) {
                shiftEndHour = 20;
                shiftEndMinute = 0;
                shiftTypeLabel = 'LONG SHIFT (08:30 - 20:00 / Closing)';
            }
            else if (schedule.shift_type === schedule_entity_1.ShiftType.OFF) {
                shiftEndHour = 17;
                shiftEndMinute = 0;
                shiftTypeLabel = 'LIBUR (OFF)';
            }
            else {
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
        }
        else if (user.shiftEnd) {
            const [h, m] = user.shiftEnd.split(':').map(Number);
            if (!isNaN(h))
                shiftEndHour = h;
            if (!isNaN(m))
                shiftEndMinute = m;
            shiftTypeLabel = `Standar (${user.shiftStart} - ${user.shiftEnd})`;
        }
        const shiftEndTime = new Date(checkOutDate);
        shiftEndTime.setHours(shiftEndHour, shiftEndMinute, 0, 0);
        let overtimeMinutes = 0;
        const diffMs = checkOutDate.getTime() - shiftEndTime.getTime();
        if (diffMs > 0) {
            overtimeMinutes = Math.floor(diffMs / (1000 * 60));
        }
        this.logger.log(`Checkout User ${userId} [${dateStr}]: Checkout=${checkOutDate.toISOString()}, ShiftEnd=${shiftEndTime.toISOString()}, Lembur=${overtimeMinutes} mnt`);
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
        }
        else {
            attendance.check_out_time = checkOutDate;
            attendance.overtime_minutes = overtimeMinutes;
            attendance.mental_health_log = dto.mental_health_log.trim();
        }
        const savedAttendance = await this.attendanceRepo.save(attendance);
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
        }
        catch (syncErr) {
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
    async getTodayStatus(userId) {
        const now = new Date();
        const dateStr = this.formatDateStr(now);
        const schedule = await this.scheduleRepo.findOne({
            where: { user_id: userId, date: dateStr },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        let shiftType = schedule?.shift_type || schedule_entity_1.ShiftType.PAGI;
        let shiftEndHour = 17;
        let shiftEndMinute = 0;
        let shiftStart = '08:30';
        if (shiftType === schedule_entity_1.ShiftType.SIANG) {
            shiftStart = '10:30';
            shiftEndHour = 19;
        }
        else if (shiftType === schedule_entity_1.ShiftType.LONG) {
            shiftStart = '08:30';
            shiftEndHour = 20;
        }
        else if (shiftType === schedule_entity_1.ShiftType.OFF) {
            shiftStart = '-';
            shiftEndHour = 17;
        }
        if (schedule?.target_check_in && schedule.target_check_in !== '-') {
            shiftStart = schedule.target_check_in;
        }
        if (schedule?.target_check_out && schedule.target_check_out.includes(':')) {
            const [h, m] = schedule.target_check_out.split(':').map(Number);
            if (!isNaN(h))
                shiftEndHour = h;
            if (!isNaN(m))
                shiftEndMinute = m;
        }
        let shiftEnd = shiftType === schedule_entity_1.ShiftType.OFF
            ? '-'
            : `${String(shiftEndHour).padStart(2, '0')}:${String(shiftEndMinute).padStart(2, '0')}`;
        const shiftEndTime = new Date(now);
        shiftEndTime.setHours(shiftEndHour, shiftEndMinute, 0, 0);
        const isPastShiftEnd = shiftType === schedule_entity_1.ShiftType.OFF ? true : now.getTime() >= shiftEndTime.getTime();
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
            needsCheckoutNotice: isPastShiftEnd && !hasCheckedOut,
        };
    }
    async calibrateClinicLocation(latitude, longitude, radiusMeters = 25.0) {
        if (latitude === undefined || longitude === undefined) {
            throw new common_1.BadRequestException('Latitude dan longitude wajib diisi');
        }
        (0, haversine_util_1.updateClinicCoordinates)(latitude, longitude, radiusMeters);
        try {
            await this.prisma.officeLocation.updateMany({
                where: { label: { contains: 'Orella' } },
                data: {
                    latitude,
                    longitude,
                    radiusMeters,
                },
            });
        }
        catch (e) {
            this.logger.warn('Failed to update officeLocation table in prisma', e);
        }
        this.logger.log(`Titik klinik Orella dikalibrasi ke: Lat=${latitude}, Lng=${longitude}, Radius=${radiusMeters}m`);
        return {
            success: true,
            message: 'Titik pusat koordinat klinik berhasil dikalibrasi ke posisi meja Anda!',
            location: haversine_util_1.CLINIC_LOCATION,
        };
    }
    getClinicLocation() {
        return haversine_util_1.CLINIC_LOCATION;
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = AttendanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(attendance_entity_1.Attendance)),
    __param(1, (0, typeorm_1.InjectRepository)(schedule_entity_1.Schedule)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map