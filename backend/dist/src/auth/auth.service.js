"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const email_service_1 = require("./email.service");
const bcrypt = __importStar(require("bcryptjs"));
const biometric_util_1 = require("../common/utils/biometric.util");
let AuthService = class AuthService {
    prisma;
    jwtService;
    emailService;
    constructor(prisma, jwtService, emailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async validateUser(email, pass) {
        const user = await this.prisma.user.findFirst({
            where: { email, isActive: true },
            include: { organization: true },
        });
        if (user) {
            const isPasswordMatch = bcrypt.compareSync(pass, user.passwordHash);
            const isUniqueInviteCodeMatch = Boolean(user.inviteCode && user.inviteCode === pass);
            const isOrgInviteCodeMatch = Boolean(user.organization && user.organization.inviteCode === pass);
            if (isPasswordMatch || isUniqueInviteCodeMatch || isOrgInviteCodeMatch) {
                if (user.role === 'karyawan') {
                    await this.prisma.user.update({
                        where: { id: user.id },
                        data: {
                            inviteStatus: 'joined',
                            lastLoginAt: new Date(),
                        },
                    });
                }
                const { passwordHash, ...result } = user;
                return {
                    ...result,
                    inviteStatus: user.role === 'karyawan' ? 'joined' : user.inviteStatus,
                    lastLoginAt: new Date(),
                };
            }
        }
        return null;
    }
    async login(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            divisionId: user.divisionId,
            organizationId: user.organizationId,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                divisionId: user.divisionId,
                organizationId: user.organizationId,
            },
        };
    }
    async register(data) {
        const existing = await this.prisma.user.findFirst({
            where: { email: data.email },
        });
        if (existing) {
            throw new common_1.BadRequestException('Email sudah terdaftar');
        }
        const org = await this.prisma.organization.findFirst({
            where: { inviteCode: data.inviteCode },
        });
        if (!org) {
            throw new common_1.BadRequestException('Kode undangan tidak valid');
        }
        if (data.divisionId && data.role === 'karyawan') {
            const division = await this.prisma.division.findFirst({
                where: { id: data.divisionId, organizationId: org.id },
            });
            if (!division) {
                throw new common_1.BadRequestException('Divisi tidak ditemukan dalam organisasi ini');
            }
        }
        const hashedPassword = bcrypt.hashSync(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                passwordHash: hashedPassword,
                role: data.role || 'karyawan',
                organizationId: org.id,
                divisionId: data.role === 'karyawan' ? (data.divisionId || null) : null,
            },
        });
        const { passwordHash, ...result } = user;
        return result;
    }
    async validateInviteCode(code) {
        const org = await this.prisma.organization.findFirst({
            where: { inviteCode: code },
            include: {
                divisions: {
                    orderBy: { name: 'asc' },
                },
            },
        });
        if (!org) {
            throw new common_1.BadRequestException('Kode undangan tidak valid');
        }
        return {
            organizationId: org.id,
            organizationName: org.name,
            divisions: org.divisions.map((d) => ({
                id: d.id,
                name: d.name,
            })),
        };
    }
    async getOrganizations() {
        return this.prisma.organization.findMany({
            include: {
                divisions: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
    async updateProfile(userId, data) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        if (data.email && data.email !== user.email) {
            const existing = await this.prisma.user.findFirst({
                where: { email: data.email },
            });
            if (existing) {
                throw new common_1.BadRequestException('Email sudah digunakan oleh pengguna lain');
            }
        }
        const updateData = {};
        if (data.fullName)
            updateData.fullName = data.fullName;
        if (data.email)
            updateData.email = data.email;
        if (data.password) {
            updateData.passwordHash = bcrypt.hashSync(data.password, 10);
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
        const { passwordHash, ...result } = updatedUser;
        return result;
    }
    async addAdmin(currentUserId, data) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        const existing = await this.prisma.user.findFirst({
            where: { email: data.email },
        });
        if (existing) {
            throw new common_1.BadRequestException('Email sudah terdaftar');
        }
        const hashedPassword = bcrypt.hashSync(data.password, 10);
        const newAdmin = await this.prisma.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                passwordHash: hashedPassword,
                role: 'hr',
                organizationId: currentUser.organizationId,
                divisionId: null,
            },
        });
        const { passwordHash, ...result } = newAdmin;
        return result;
    }
    async generateUniqueInviteCode(excludeCode) {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        for (let attempts = 0; attempts < 100; attempts++) {
            let rand = '';
            for (let i = 0; i < 6; i++) {
                rand += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const code = `STV-${rand}`;
            if (excludeCode && code === excludeCode) {
                continue;
            }
            const exists = await this.prisma.user.findFirst({
                where: { inviteCode: code },
            });
            if (!exists)
                return code;
        }
        return `STV-${Date.now().toString(36).toUpperCase()}`;
    }
    async inviteEmployee(currentUserId, data) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
            include: { organization: true },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        const division = await this.prisma.division.findFirst({
            where: {
                id: data.divisionId,
                organizationId: currentUser.organizationId,
            },
        });
        if (!division) {
            throw new common_1.BadRequestException('Divisi tidak ditemukan');
        }
        const existing = await this.prisma.user.findFirst({
            where: { email: data.email },
            include: { division: true },
        });
        if (existing) {
            if (existing.inviteStatus === 'joined') {
                throw new common_1.BadRequestException(`Karyawan dengan email ${data.email} sudah aktif terdaftar dan bergabung sebagai "${existing.fullName}". Silakan gunakan tombol "Kirim Ulang Kode" pada tabel data karyawan.`);
            }
            const newUniqueCode = await this.generateUniqueInviteCode(existing.inviteCode);
            const newPasswordHash = bcrypt.hashSync(newUniqueCode, 10);
            const shouldSend = data.sendEmailNow !== false;
            const updated = await this.prisma.user.update({
                where: { id: existing.id },
                data: {
                    fullName: data.fullName || existing.fullName,
                    divisionId: data.divisionId || existing.divisionId,
                    inviteCode: newUniqueCode,
                    passwordHash: newPasswordHash,
                    inviteStatus: shouldSend ? 'sent' : 'pending',
                    invitedAt: shouldSend ? new Date() : existing.invitedAt,
                },
                include: { division: true },
            });
            let emailRes = null;
            if (shouldSend) {
                emailRes = await this.emailService.sendEmployeeInviteEmail({
                    toEmail: data.email,
                    employeeName: updated.fullName,
                    organizationName: currentUser.organization.name,
                    divisionName: updated.division?.name || division.name,
                    inviteCode: newUniqueCode,
                });
            }
            return {
                success: true,
                message: shouldSend
                    ? `Undangan berhasil dikirimkan ulang dengan kode unik baru (${newUniqueCode}) ke ${data.email}!`
                    : `Data karyawan ${data.email} berhasil diperbarui dengan kode baru (${newUniqueCode}).`,
                user: {
                    id: updated.id,
                    fullName: updated.fullName,
                    email: updated.email,
                    role: updated.role,
                    division: updated.division,
                    inviteCode: newUniqueCode,
                },
                inviteCode: newUniqueCode,
                emailContent: emailRes?.emailContent,
                previewUrl: emailRes?.previewUrl,
            };
        }
        const uniqueInviteCode = await this.generateUniqueInviteCode();
        const initialPasswordHash = bcrypt.hashSync(uniqueInviteCode, 10);
        const shouldSendEmail = data.sendEmailNow !== false;
        const newEmployee = await this.prisma.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                role: 'karyawan',
                organizationId: currentUser.organizationId,
                divisionId: data.divisionId,
                passwordHash: initialPasswordHash,
                inviteCode: uniqueInviteCode,
                inviteStatus: shouldSendEmail ? 'sent' : 'pending',
                invitedAt: shouldSendEmail ? new Date() : null,
            },
            include: { division: true },
        });
        let emailResult = {
            success: true,
            message: 'Karyawan berhasil didaftarkan sebagai draft (belum dikirimkan email undangan).',
        };
        if (shouldSendEmail) {
            emailResult = await this.emailService.sendEmployeeInviteEmail({
                toEmail: data.email,
                employeeName: data.fullName,
                organizationName: currentUser.organization.name,
                divisionName: division.name,
                inviteCode: uniqueInviteCode,
            });
        }
        return {
            success: true,
            user: {
                id: newEmployee.id,
                fullName: newEmployee.fullName,
                email: newEmployee.email,
                role: newEmployee.role,
                divisionName: division.name,
                inviteCode: uniqueInviteCode,
                inviteStatus: newEmployee.inviteStatus,
                invitedAt: newEmployee.invitedAt,
            },
            message: emailResult.message,
            inviteCode: uniqueInviteCode,
            organizationName: currentUser.organization.name,
            divisionName: division.name,
            emailContent: emailResult.emailContent,
            previewUrl: emailResult.previewUrl,
        };
    }
    async getEmployees(currentUserId, query) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        const whereClause = {
            organizationId: currentUser.organizationId,
        };
        if (query?.role && query.role !== 'all') {
            whereClause.role = query.role;
        }
        if (query?.status && query.status !== 'all') {
            whereClause.inviteStatus = query.status;
        }
        if (query?.divisionId && query.divisionId !== 'all') {
            whereClause.divisionId = query.divisionId;
        }
        if (query?.search && query.search.trim()) {
            const q = query.search.trim();
            whereClause.OR = [
                { fullName: { contains: q } },
                { email: { contains: q } },
                { inviteCode: { contains: q } },
            ];
        }
        const employees = await this.prisma.user.findMany({
            where: whereClause,
            include: {
                division: true,
                attendanceCheckins: {
                    take: 1,
                    orderBy: { checkInTime: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const allOrgEmployees = await this.prisma.user.findMany({
            where: {
                organizationId: currentUser.organizationId,
            },
            select: {
                inviteStatus: true,
                role: true,
                faceDescriptor: true,
            },
        });
        const stats = {
            total: allOrgEmployees.length,
            joined: allOrgEmployees.filter((e) => e.inviteStatus === 'joined' || e.role === 'hr' || e.role === 'owner').length,
            sent: allOrgEmployees.filter((e) => e.inviteStatus === 'sent').length,
            pending: allOrgEmployees.filter((e) => e.inviteStatus === 'pending').length,
            withFace: allOrgEmployees.filter((e) => Boolean(e.faceDescriptor)).length,
        };
        return {
            stats,
            employees: employees.map((emp) => ({
                id: emp.id,
                fullName: emp.fullName,
                email: emp.email,
                role: emp.role,
                hasFaceDescriptor: Boolean(emp.faceDescriptor),
                divisionId: emp.divisionId,
                divisionName: emp.division?.name || 'Tanpa Divisi',
                division: emp.division ? { id: emp.division.id, name: emp.division.name } : null,
                inviteCode: emp.inviteCode,
                inviteStatus: emp.inviteStatus,
                invitedAt: emp.invitedAt,
                lastLoginAt: emp.lastLoginAt,
                createdAt: emp.createdAt,
                isActive: emp.isActive,
                lastCheckIn: emp.attendanceCheckins?.[0]?.checkInTime || null,
            })),
        };
    }
    async resendEmployeeInvite(currentUserId, employeeId) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
            include: { organization: true },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        const employee = await this.prisma.user.findFirst({
            where: {
                id: employeeId,
                organizationId: currentUser.organizationId,
                role: 'karyawan',
            },
            include: { division: true },
        });
        if (!employee) {
            throw new common_1.BadRequestException('Karyawan tidak ditemukan');
        }
        const newInviteCode = await this.generateUniqueInviteCode(employee.inviteCode);
        const newHash = bcrypt.hashSync(newInviteCode, 10);
        let emailResult;
        try {
            emailResult = await this.emailService.sendEmployeeInviteEmail({
                toEmail: employee.email,
                employeeName: employee.fullName,
                organizationName: currentUser.organization.name,
                divisionName: employee.division?.name || 'Klinik',
                inviteCode: newInviteCode,
            });
        }
        catch (err) {
            throw new common_1.BadRequestException(`Gagal mengirim email undangan ke ${employee.email}: ${err.message}`);
        }
        const updated = await this.prisma.user.update({
            where: { id: employee.id },
            data: {
                inviteCode: newInviteCode,
                passwordHash: newHash,
                inviteStatus: 'sent',
                invitedAt: new Date(),
            },
        });
        return {
            success: true,
            message: `Undangan dengan kode baru (${newInviteCode}) berhasil dikirimkan ke email ${employee.email}`,
            newInviteCode,
            employee: {
                id: updated.id,
                fullName: updated.fullName,
                email: updated.email,
                inviteCode: newInviteCode,
                inviteStatus: updated.inviteStatus,
                invitedAt: updated.invitedAt,
            },
            previewUrl: emailResult?.previewUrl,
        };
    }
    async createDivision(currentUserId, name) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        const trimmedName = name.trim();
        if (!trimmedName) {
            throw new common_1.BadRequestException('Nama divisi tidak boleh kosong');
        }
        const existing = await this.prisma.division.findFirst({
            where: {
                organizationId: currentUser.organizationId,
                name: trimmedName,
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Divisi dengan nama ini sudah ada');
        }
        const division = await this.prisma.division.create({
            data: {
                organizationId: currentUser.organizationId,
                name: trimmedName,
            },
        });
        return division;
    }
    async getDivisions(currentUserId) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        const divisions = await this.prisma.division.findMany({
            where: { organizationId: currentUser.organizationId },
            include: {
                _count: {
                    select: { users: true },
                },
                users: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                        faceDescriptor: true,
                    },
                    orderBy: { fullName: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });
        return divisions.map((d) => ({
            id: d.id,
            name: d.name,
            userCount: d._count.users,
            users: d.users.map((u) => ({
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                role: u.role,
                hasFace: Boolean(u.faceDescriptor),
            })),
            hasMinimumEmployees: d._count.users >= 1,
        }));
    }
    async updateDivision(currentUserId, divisionId, name) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new common_1.BadRequestException('Nama divisi tidak boleh kosong');
        }
        const division = await this.prisma.division.findUnique({
            where: { id: divisionId },
        });
        if (!division || division.organizationId !== currentUser.organizationId) {
            throw new common_1.NotFoundException('Divisi tidak ditemukan');
        }
        const duplicate = await this.prisma.division.findFirst({
            where: {
                organizationId: currentUser.organizationId,
                name: trimmedName,
                id: { not: divisionId },
            },
        });
        if (duplicate) {
            throw new common_1.BadRequestException(`Divisi dengan nama "${trimmedName}" sudah ada`);
        }
        const updated = await this.prisma.division.update({
            where: { id: divisionId },
            data: { name: trimmedName },
        });
        return {
            success: true,
            message: `Nama divisi berhasil diperbarui menjadi "${updated.name}"`,
            division: updated,
        };
    }
    async deleteDivision(currentUserId, divisionId) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        const division = await this.prisma.division.findUnique({
            where: { id: divisionId },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });
        if (!division || division.organizationId !== currentUser.organizationId) {
            throw new common_1.NotFoundException('Divisi tidak ditemukan');
        }
        if (division._count.users > 0) {
            throw new common_1.BadRequestException(`Divisi "${division.name}" tidak dapat dihapus karena masih menaungi ${division._count.users} karyawan. Harap pindahkan karyawan ke divisi lain terlebih dahulu.`);
        }
        await this.prisma.wellbeingFeedback.deleteMany({
            where: { divisionId },
        });
        await this.prisma.divisionWellbeingInsight.deleteMany({
            where: { divisionId },
        });
        await this.prisma.division.delete({
            where: { id: divisionId },
        });
        return {
            success: true,
            message: `Divisi "${division.name}" berhasil dihapus`,
        };
    }
    async updateUserDivision(currentUserId, targetUserId, divisionId) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
        });
        if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
            throw new common_1.NotFoundException('Karyawan tidak ditemukan');
        }
        if (divisionId) {
            const division = await this.prisma.division.findUnique({
                where: { id: divisionId },
            });
            if (!division || division.organizationId !== currentUser.organizationId) {
                throw new common_1.BadRequestException('Divisi target tidak valid');
            }
        }
        const updated = await this.prisma.user.update({
            where: { id: targetUserId },
            data: { divisionId },
            include: { division: true },
        });
        return {
            success: true,
            message: `Divisi karyawan "${updated.fullName}" berhasil diubah menjadi "${updated.division?.name || 'Tanpa Divisi'}"`,
            user: {
                id: updated.id,
                fullName: updated.fullName,
                divisionId: updated.divisionId,
                divisionName: updated.division?.name || 'Tanpa Divisi',
            },
        };
    }
    async deleteEmployee(currentUserId, employeeId) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
        });
        if (!currentUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        if (employeeId === currentUserId) {
            throw new common_1.BadRequestException('Anda tidak dapat menghapus akun Anda sendiri');
        }
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
        });
        if (!employee || employee.organizationId !== currentUser.organizationId) {
            throw new common_1.NotFoundException('Karyawan tidak ditemukan');
        }
        await this.prisma.shiftSwapRequest.deleteMany({
            where: {
                OR: [
                    { requesterId: employeeId },
                    { targetUserId: employeeId },
                ],
            },
        });
        await this.prisma.user.delete({
            where: { id: employeeId },
        });
        return {
            success: true,
            message: `Karyawan "${employee.fullName}" berhasil dihapus`,
        };
    }
    async changePassword(userId, dto) {
        if (!dto.newPassword || dto.newPassword.trim().length < 6) {
            throw new common_1.BadRequestException('Password baru minimal 6 karakter');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        if (dto.currentPassword) {
            const isValid = bcrypt.compareSync(dto.currentPassword, user.passwordHash);
            if (!isValid) {
                throw new common_1.BadRequestException('Password lama Anda salah');
            }
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: bcrypt.hashSync(dto.newPassword, 10),
            },
        });
        return {
            success: true,
            message: 'Password berhasil diubah. Silakan gunakan password baru ini untuk login berikutnya.',
        };
    }
    async updateFaceDescriptor(userId, faceDescriptor, requester) {
        if (!faceDescriptor) {
            throw new common_1.BadRequestException('Face descriptor tidak boleh kosong');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        if (user.faceDescriptor) {
            throw new common_1.BadRequestException('Master biometrik wajah sudah terdaftar dan terkunci! Pendaftaran wajah hanya dilakukan satu kali saat pertama kali login. Untuk mendaftarkan ulang wajah, silakan gunakan fitur "Reset Wajah" di dashboard Admin/HR terlebih dahulu.');
        }
        let parsedVector;
        try {
            parsedVector = (0, biometric_util_1.parseFaceDescriptor)(faceDescriptor);
        }
        catch (err) {
            throw new common_1.BadRequestException(err.message || 'Format vektor biometrik wajah tidak valid.');
        }
        const otherUsersWithFace = await this.prisma.user.findMany({
            where: {
                id: { not: userId },
                faceDescriptor: { not: null },
            },
            select: {
                id: true,
                fullName: true,
                role: true,
                faceDescriptor: true,
            },
        });
        for (const other of otherUsersWithFace) {
            if (!other.faceDescriptor)
                continue;
            try {
                const otherVector = (0, biometric_util_1.parseFaceDescriptor)(other.faceDescriptor);
                const distance = (0, biometric_util_1.calculateEuclideanDistance)(parsedVector, otherVector);
                if (distance < biometric_util_1.FACE_UNIQUENESS_MIN_DISTANCE) {
                    const similarity = (0, biometric_util_1.calculateSimilarityPercent)(distance);
                    throw new common_1.BadRequestException(`Registrasi Wajah Ditolak: Wajah ini terdeteksi identik/sangat mirip (${similarity}% kemiripan biometrik) dengan karyawan lain atas nama "${other.fullName}" (${other.role}). Satu wajah fisik hanya boleh didaftarkan untuk 1 akun karyawan demi mencegah kecurangan / joki presensi.`);
                }
            }
            catch (err) {
                if (err instanceof common_1.BadRequestException) {
                    throw err;
                }
            }
        }
        const serialized = JSON.stringify(parsedVector);
        await this.prisma.user.update({
            where: { id: userId },
            data: { faceDescriptor: serialized },
        });
        return {
            success: true,
            message: 'Master wajah (Face Descriptor) berhasil diverifikasi unik dan didaftarkan!',
        };
    }
    async getFaceDescriptor(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                faceDescriptor: true,
                role: true,
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        return {
            hasFaceDescriptor: !!user.faceDescriptor,
            faceDescriptor: user.faceDescriptor,
            user: {
                id: user.id,
                fullName: user.fullName,
                role: user.role,
            },
        };
    }
    async resetFaceDescriptor(targetUserId, requester) {
        const isPrivileged = requester.role === 'hr' || requester.role === 'owner';
        const isSelf = requester.id === targetUserId;
        if (!isPrivileged && !isSelf) {
            throw new common_1.UnauthorizedException('Hanya HR dan Administrator yang memiliki wewenang untuk mereset master wajah.');
        }
        const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        await this.prisma.user.update({
            where: { id: targetUserId },
            data: { faceDescriptor: null },
        });
        return {
            success: true,
            message: `Master biometrik wajah untuk "${targetUser.fullName}" (${targetUser.role}) berhasil di-reset. Pengguna wajib mendaftarkan master wajah baru saat presensi/login berikutnya.`,
            user: {
                id: targetUser.id,
                fullName: targetUser.fullName,
                role: targetUser.role,
                hasFaceDescriptor: false,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map