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
    async checkout(userId, dto) {
        if (!dto.mental_health_log || dto.mental_health_log.trim().length === 0) {
            throw new common_1.BadRequestException('Teks unek-unek / catatan evaluasi hari ini (mental_health_log) wajib diisi.');
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
        let shiftEndHour = 17;
        let shiftEndMinute = 0;
        let shiftTypeLabel = 'PAGI (08:30 - 17:00)';
        if (schedule) {
            if (schedule.shift_type === schedule_entity_1.ShiftType.SIANG) {
                shiftEndHour = 19;
                shiftEndMinute = 0;
                shiftTypeLabel = 'SIANG (10:30 - 19:00)';
            }
            else {
                shiftEndHour = 17;
                shiftEndMinute = 0;
                shiftTypeLabel = 'PAGI (08:30 - 17:00)';
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
        let shiftEndHour = shiftType === schedule_entity_1.ShiftType.SIANG ? 19 : 17;
        let shiftEndMinute = 0;
        let shiftStart = shiftType === schedule_entity_1.ShiftType.SIANG ? '10:30' : '08:30';
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
            needsCheckoutNotice: isPastShiftEnd && !hasCheckedOut,
        };
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