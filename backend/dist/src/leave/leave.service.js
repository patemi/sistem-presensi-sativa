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
var LeaveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = exports.ReviewLeaveDto = exports.CreateLeaveDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../auth/email.service");
class CreateLeaveDto {
    employeeId;
    leaveType;
    startDate;
    endDate;
    totalDays;
    reason;
    attachmentUrl;
    adminNotes;
    initialStatus;
}
exports.CreateLeaveDto = CreateLeaveDto;
class ReviewLeaveDto {
    action;
    adminNotes;
}
exports.ReviewLeaveDto = ReviewLeaveDto;
let LeaveService = LeaveService_1 = class LeaveService {
    prisma;
    emailService;
    logger = new common_1.Logger(LeaveService_1.name);
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    calculateDays(start, end) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, diffDays);
    }
    async getAllLeaveRequests(currentUser, query) {
        const organizationId = currentUser.organizationId;
        const whereClause = { organizationId };
        if (query?.status && query.status !== 'all') {
            whereClause.status = query.status.toUpperCase();
        }
        if (query?.divisionId && query.divisionId !== 'all') {
            whereClause.user = {
                divisionId: query.divisionId,
            };
        }
        if (query?.search && query.search.trim()) {
            const q = query.search.trim();
            whereClause.OR = [
                { reason: { contains: q } },
                { leaveType: { contains: q } },
                { adminNotes: { contains: q } },
                { user: { fullName: { contains: q } } },
                { user: { email: { contains: q } } },
            ];
        }
        const leaves = await this.prisma.leaveRequest.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                        divisionId: true,
                        division: {
                            select: { id: true, name: true },
                        },
                    },
                },
                reviewedBy: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const allOrgLeaves = await this.prisma.leaveRequest.findMany({
            where: { organizationId },
            select: { status: true },
        });
        const stats = {
            total: allOrgLeaves.length,
            pending: allOrgLeaves.filter((l) => l.status === 'PENDING').length,
            approved: allOrgLeaves.filter((l) => l.status === 'APPROVED').length,
            rejected: allOrgLeaves.filter((l) => l.status === 'REJECTED').length,
        };
        return {
            stats,
            leaves: leaves.map((l) => ({
                id: l.id,
                leaveType: l.leaveType,
                startDate: l.startDate,
                endDate: l.endDate,
                totalDays: l.totalDays,
                reason: l.reason,
                attachmentUrl: l.attachmentUrl,
                status: l.status,
                adminNotes: l.adminNotes,
                reviewedById: l.reviewedById,
                reviewedBy: l.reviewedBy,
                reviewedAt: l.reviewedAt,
                createdAt: l.createdAt,
                user: {
                    id: l.user.id,
                    fullName: l.user.fullName,
                    email: l.user.email,
                    role: l.user.role,
                    divisionId: l.user.divisionId,
                    divisionName: l.user.division?.name || 'Tanpa Divisi',
                },
            })),
        };
    }
    async createLeaveRequest(currentUser, dto) {
        const targetUserId = dto.employeeId || currentUser.id;
        const targetUser = await this.prisma.user.findFirst({
            where: {
                id: targetUserId,
                organizationId: currentUser.organizationId,
            },
            include: { division: true },
        });
        if (!targetUser) {
            throw new common_1.BadRequestException('Karyawan tidak ditemukan dalam organisasi ini');
        }
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new common_1.BadRequestException('Format tanggal tidak valid');
        }
        if (endDate < startDate) {
            throw new common_1.BadRequestException('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
        }
        const calculatedDays = dto.totalDays && dto.totalDays > 0
            ? dto.totalDays
            : this.calculateDays(startDate, endDate);
        const isHrOrOwner = currentUser.role === 'hr' || currentUser.role === 'owner';
        const status = isHrOrOwner && dto.initialStatus ? dto.initialStatus : 'PENDING';
        const isApprovedInitially = status === 'APPROVED';
        const leave = await this.prisma.leaveRequest.create({
            data: {
                userId: targetUser.id,
                organizationId: currentUser.organizationId,
                leaveType: dto.leaveType || 'cuti_tahunan',
                startDate,
                endDate,
                totalDays: calculatedDays,
                reason: dto.reason,
                attachmentUrl: dto.attachmentUrl || null,
                status,
                adminNotes: isHrOrOwner && dto.adminNotes ? dto.adminNotes : null,
                reviewedById: isApprovedInitially ? currentUser.id : null,
                reviewedAt: isApprovedInitially ? new Date() : null,
            },
            include: {
                user: {
                    include: { division: true },
                },
            },
        });
        return leave;
    }
    async reviewLeaveRequest(currentUser, leaveId, dto) {
        const leave = await this.prisma.leaveRequest.findFirst({
            where: {
                id: leaveId,
                organizationId: currentUser.organizationId,
            },
            include: {
                user: {
                    include: { division: true },
                },
            },
        });
        if (!leave) {
            throw new common_1.BadRequestException('Permohonan izin/cuti tidak ditemukan');
        }
        const newStatus = dto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        const defaultNote = dto.action === 'APPROVE'
            ? 'Permohonan izin/cuti telah disetujui (ACC) oleh HR.'
            : 'Permohonan izin/cuti ditolak oleh HR.';
        const adminNotes = dto.adminNotes?.trim() || defaultNote;
        const updated = await this.prisma.leaveRequest.update({
            where: { id: leave.id },
            data: {
                status: newStatus,
                adminNotes,
                reviewedById: currentUser.id,
                reviewedAt: new Date(),
            },
            include: {
                user: {
                    include: { division: true },
                },
                reviewedBy: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });
        this.logger.log(`Leave request ${leave.id} reviewed: ${newStatus} by ${currentUser.fullName}. Notes: ${adminNotes}`);
        return {
            success: true,
            message: dto.action === 'APPROVE'
                ? `Permohonan izin/cuti ${leave.user.fullName} berhasil di-ACC (Disetujui)!`
                : `Permohonan izin/cuti ${leave.user.fullName} berhasil ditolak.`,
            leave: updated,
        };
    }
    async getMyLeaveRequests(currentUser) {
        const leaves = await this.prisma.leaveRequest.findMany({
            where: {
                userId: currentUser.id,
            },
            include: {
                reviewedBy: {
                    select: { id: true, fullName: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return leaves;
    }
    async seedInitialLeavesIfEmpty(organizationId, hrUserId) {
        const count = await this.prisma.leaveRequest.count({
            where: { organizationId },
        });
        if (count > 0)
            return;
        const employees = await this.prisma.user.findMany({
            where: {
                organizationId,
                role: 'karyawan',
            },
            take: 4,
        });
        if (employees.length === 0)
            return;
        const today = new Date();
        const plusDays = (d) => new Date(today.getTime() + d * 24 * 60 * 60 * 1000);
        await this.prisma.leaveRequest.create({
            data: {
                userId: employees[0].id,
                organizationId,
                leaveType: 'cuti_tahunan',
                startDate: plusDays(2),
                endDate: plusDays(4),
                totalDays: 3,
                reason: 'Keperluan acara keluarga di luar kota dan silaturahmi tahunan.',
                status: 'PENDING',
            },
        });
        if (employees.length > 1) {
            await this.prisma.leaveRequest.create({
                data: {
                    userId: employees[1].id,
                    organizationId,
                    leaveType: 'izin_sakit',
                    startDate: plusDays(1),
                    endDate: plusDays(2),
                    totalDays: 2,
                    reason: 'Demam tinggi dan flu berat, istirahat atas anjuran dokter klinik.',
                    status: 'PENDING',
                },
            });
        }
        if (employees.length > 2) {
            await this.prisma.leaveRequest.create({
                data: {
                    userId: employees[2].id,
                    organizationId,
                    leaveType: 'cuti_tahunan',
                    startDate: plusDays(-5),
                    endDate: plusDays(-4),
                    totalDays: 2,
                    reason: 'Perpanjangan istirahat cuti pasca shift tindakan padat.',
                    status: 'APPROVED',
                    adminNotes: 'Disetujui (ACC). Jadwal shift klinik telah dikoordinasikan dengan tim jaga.',
                    reviewedById: hrUserId,
                    reviewedAt: plusDays(-6),
                },
            });
        }
        if (employees.length > 3) {
            await this.prisma.leaveRequest.create({
                data: {
                    userId: employees[3].id,
                    organizationId,
                    leaveType: 'izin_keperluan_pribadi',
                    startDate: plusDays(7),
                    endDate: plusDays(8),
                    totalDays: 2,
                    reason: 'Keperluan mengurus administrasi keluarga.',
                    status: 'REJECTED',
                    adminNotes: 'Mohon maaf belum dapat di-acc karena pada tanggal tersebut terdapat jadwal tindakan pasien VIP klinik yang padat. Silakan reschedule ke minggu depan.',
                    reviewedById: hrUserId,
                    reviewedAt: plusDays(-1),
                },
            });
        }
    }
};
exports.LeaveService = LeaveService;
exports.LeaveService = LeaveService = LeaveService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], LeaveService);
//# sourceMappingURL=leave.service.js.map