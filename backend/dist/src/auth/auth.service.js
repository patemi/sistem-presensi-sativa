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
            role: 'karyawan',
        };
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
                role: 'karyawan',
            },
            select: {
                inviteStatus: true,
            },
        });
        const stats = {
            total: allOrgEmployees.length,
            joined: allOrgEmployees.filter((e) => e.inviteStatus === 'joined').length,
            sent: allOrgEmployees.filter((e) => e.inviteStatus === 'sent').length,
            pending: allOrgEmployees.filter((e) => e.inviteStatus === 'pending').length,
        };
        return {
            stats,
            employees: employees.map((emp) => ({
                id: emp.id,
                fullName: emp.fullName,
                email: emp.email,
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
        return this.prisma.division.findMany({
            where: { organizationId: currentUser.organizationId },
            orderBy: { name: 'asc' },
        });
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