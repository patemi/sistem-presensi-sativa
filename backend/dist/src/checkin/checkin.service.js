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
var CheckinService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckinService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const haversine_util_1 = require("../common/utils/haversine.util");
const crypto_util_1 = require("../common/utils/crypto.util");
let CheckinService = CheckinService_1 = class CheckinService {
    prisma;
    logger = new common_1.Logger(CheckinService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkIn(userId, latitude, longitude) {
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
            throw new common_1.BadRequestException('Anda sudah melakukan absen masuk hari ini');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { organization: { include: { officeLocations: true } } },
        });
        if (!user)
            throw new common_1.BadRequestException('User tidak ditemukan');
        const officeLocations = user.organization.officeLocations;
        if (officeLocations.length === 0) {
            throw new common_1.BadRequestException('Tidak ada lokasi kantor terdaftar');
        }
        let nearestOffice = officeLocations[0];
        let nearestResult = (0, haversine_util_1.validateGeofence)(latitude, longitude, nearestOffice.latitude, nearestOffice.longitude, nearestOffice.radiusMeters);
        for (const loc of officeLocations.slice(1)) {
            const result = (0, haversine_util_1.validateGeofence)(latitude, longitude, loc.latitude, loc.longitude, loc.radiusMeters);
            if (result.distance < nearestResult.distance) {
                nearestOffice = loc;
                nearestResult = result;
            }
        }
        const disableGeofence = process.env.DISABLE_GEOFENCE === 'true';
        if (!nearestResult.isWithin && !disableGeofence) {
            throw new common_1.UnprocessableEntityException(`Lokasi Anda di luar radius kantor (${nearestResult.distance.toFixed(1)}m dari ${nearestOffice.label}, batas maksimal < ${nearestOffice.radiusMeters}m). Presensi ditolak.`);
        }
        const checkInTime = new Date();
        const [shiftHour, shiftMin] = (user.shiftStart || '08:00').split(':').map(Number);
        const shiftStartTime = new Date(checkInTime);
        shiftStartTime.setHours(shiftHour, shiftMin, 0, 0);
        const lateMinutes = checkInTime > shiftStartTime
            ? Math.floor((checkInTime.getTime() - shiftStartTime.getTime()) / 60000)
            : 0;
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
                attendanceStatus: 'belum_lengkap',
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
    async checkOut(userId, divisionId, organizationId, latitude, longitude, moodScore, noteText) {
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
            throw new common_1.BadRequestException('Anda belum melakukan absen masuk hari ini');
        }
        if (checkin.checkout) {
            throw new common_1.BadRequestException('Anda sudah melakukan absen pulang hari ini');
        }
        if (!moodScore || moodScore < 1 || moodScore > 5) {
            throw new common_1.BadRequestException('Skor mood wajib diisi (1-5)');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { organization: { include: { officeLocations: true } } },
        });
        if (!user)
            throw new common_1.BadRequestException('User tidak ditemukan');
        const officeLocations = user.organization.officeLocations;
        let nearestOffice = officeLocations[0];
        let nearestResult = (0, haversine_util_1.validateGeofence)(latitude, longitude, nearestOffice.latitude, nearestOffice.longitude, nearestOffice.radiusMeters);
        for (const loc of officeLocations.slice(1)) {
            const result = (0, haversine_util_1.validateGeofence)(latitude, longitude, loc.latitude, loc.longitude, loc.radiusMeters);
            if (result.distance < nearestResult.distance) {
                nearestOffice = loc;
                nearestResult = result;
            }
        }
        const disableGeofence = process.env.DISABLE_GEOFENCE === 'true';
        if (!nearestResult.isWithin && !disableGeofence) {
            throw new common_1.UnprocessableEntityException(`Lokasi Anda di luar radius kantor (${nearestResult.distance.toFixed(1)}m dari ${nearestOffice.label}, batas maksimal < ${nearestOffice.radiusMeters}m). Presensi pulang ditolak.`);
        }
        const checkOutTime = new Date();
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
        await this.prisma.attendanceCheckin.update({
            where: { id: checkin.id },
            data: { attendanceStatus: 'hadir' },
        });
        if (divisionId) {
            const encryptedNote = noteText ? (0, crypto_util_1.encrypt)(noteText) : null;
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
    async getTodayStatus(userId) {
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
    async getMyAttendanceHistory(userId) {
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
};
exports.CheckinService = CheckinService;
exports.CheckinService = CheckinService = CheckinService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CheckinService);
//# sourceMappingURL=checkin.service.js.map