import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      include: { organization: true },
    });

    if (user) {
      const isPasswordMatch = bcrypt.compareSync(pass, user.passwordHash);
      const isUniqueInviteCodeMatch = Boolean(user.inviteCode && user.inviteCode === pass);
      const isOrgInviteCodeMatch = Boolean(user.organization && user.organization.inviteCode === pass);

      if (isPasswordMatch || isUniqueInviteCodeMatch || isOrgInviteCodeMatch) {
        // Otomatis tandai karyawan sebagai 'joined' saat pertama kali login dan simpan waktu login terakhir
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

  async login(user: any) {
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

  /**
   * Register — only for role 'karyawan' (employee).
   * Requires a valid organization invite code.
   * HR and Owner accounts are created via invitation (separate endpoint).
   */
  async register(data: {
    fullName: string;
    email: string;
    password: string;
    inviteCode: string;
    divisionId?: string;
    role?: 'karyawan' | 'hr' | 'owner';
  }) {
    // 1. Check if user exists
    const existing = await this.prisma.user.findFirst({
      where: { email: data.email },
    });
    if (existing) {
      throw new BadRequestException('Email sudah terdaftar');
    }

    // 2. Validate invite code
    const org = await this.prisma.organization.findFirst({
      where: { inviteCode: data.inviteCode },
    });
    if (!org) {
      throw new BadRequestException('Kode undangan tidak valid');
    }

    // 3. Validate division if provided
    if (data.divisionId && data.role === 'karyawan') {
      const division = await this.prisma.division.findFirst({
        where: { id: data.divisionId, organizationId: org.id },
      });
      if (!division) {
        throw new BadRequestException('Divisi tidak ditemukan dalam organisasi ini');
      }
    }

    const hashedPassword = bcrypt.hashSync(data.password, 10);

    // 4. Create user with role
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

  /**
   * Validate an invite code and return org info + divisions.
   */
  async validateInviteCode(code: string) {
    const org = await this.prisma.organization.findFirst({
      where: { inviteCode: code },
      include: {
        divisions: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!org) {
      throw new BadRequestException('Kode undangan tidak valid');
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

  /**
   * Get all organizations.
   */
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

  /**
   * Update Profile (HR or current logged in user)
   */
  async updateProfile(
    userId: string,
    data: { fullName?: string; email?: string; password?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Pengguna tidak ditemukan');
    }

    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: data.email },
      });
      if (existing) {
        throw new BadRequestException('Email sudah digunakan oleh pengguna lain');
      }
    }

    const updateData: any = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.email) updateData.email = data.email;
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

  /**
   * Add new HR Admin for the current organization
   */
  async addAdmin(
    currentUserId: string,
    data: { fullName: string; email: string; password: string },
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });
    if (!currentUser) {
      throw new BadRequestException('Pengguna tidak ditemukan');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: data.email },
    });
    if (existing) {
      throw new BadRequestException('Email sudah terdaftar');
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

  /**
   * Helper untuk membuat kode undangan unik per karyawan
   * Format: STV-XXXXXX (contoh: STV-9K8J2F)
   * Parameter excludeCode memastikan kode baru yang dibuat BERBEDA dari kode sebelumnya saat dikirim ulang.
   */
  private async generateUniqueInviteCode(excludeCode?: string | null): Promise<string> {
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
      if (!exists) return code;
    }
    return `STV-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Mengundang karyawan baru dengan kode undangan unik tersendiri
   * Status: 'sent' jika dikirim langsung, 'pending' jika draft
   */
  async inviteEmployee(
    currentUserId: string,
    data: { fullName: string; email: string; divisionId: string; sendEmailNow?: boolean },
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { organization: true },
    });
    if (!currentUser) {
      throw new BadRequestException('Pengguna tidak ditemukan');
    }

    const division = await this.prisma.division.findFirst({
      where: {
        id: data.divisionId,
        organizationId: currentUser.organizationId,
      },
    });
    if (!division) {
      throw new BadRequestException('Divisi tidak ditemukan');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: data.email },
      include: { division: true },
    });
    if (existing) {
      if (existing.inviteStatus === 'joined') {
        throw new BadRequestException(
          `Karyawan dengan email ${data.email} sudah aktif terdaftar dan bergabung sebagai "${existing.fullName}". Silakan gunakan tombol "Kirim Ulang Kode" pada tabel data karyawan.`
        );
      }

      // Karyawan sudah ada dan statusnya pending/sent: update dan kirimkan ulang dengan kode baru
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

      let emailRes: any = null;
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

    // 1. Generate kode undangan unik khusus untuk karyawan ini
    const uniqueInviteCode = await this.generateUniqueInviteCode();

    // 2. Hash kata sandi awal menggunakan kode undangan unik
    const initialPasswordHash = bcrypt.hashSync(uniqueInviteCode, 10);

    const shouldSendEmail = data.sendEmailNow !== false;

    // 3. Simpan data karyawan baru dengan status awal
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

    let emailResult: any = {
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

  /**
   * Mengambil data seluruh karyawan klinik beserta status undangannya
   */
  async getEmployees(
    currentUserId: string,
    query?: { status?: string; divisionId?: string; search?: string },
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });
    if (!currentUser) {
      throw new BadRequestException('Pengguna tidak ditemukan');
    }

    const whereClause: any = {
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

    // Statistik seluruh karyawan di organisasi
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
        inviteStatus: emp.inviteStatus, // 'pending' | 'sent' | 'joined'
        invitedAt: emp.invitedAt,
        lastLoginAt: emp.lastLoginAt,
        createdAt: emp.createdAt,
        isActive: emp.isActive,
        lastCheckIn: emp.attendanceCheckins?.[0]?.checkInTime || null,
      })),
    };
  }

  /**
   * Mengirim / mengirim ulang undangan email ke karyawan tertentu.
   * Kode undangan dijamin berubah dan unik (tidak ada yang sama),
   * lalu dikirimkan langsung ke email karyawan target via Gmail Superadmin.
   */
  async resendEmployeeInvite(currentUserId: string, employeeId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { organization: true },
    });
    if (!currentUser) {
      throw new BadRequestException('Pengguna tidak ditemukan');
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
      throw new BadRequestException('Karyawan tidak ditemukan');
    }

    // 1. Buat kode undangan baru yang UNIK dan BERUBAH (berbeda dari kode lama)
    const newInviteCode = await this.generateUniqueInviteCode(employee.inviteCode);
    const newHash = bcrypt.hashSync(newInviteCode, 10);

    // 2. Kirim email via Gmail SMTP Superadmin (rindimia79@gmail.com) ke email target karyawan
    let emailResult: any;
    try {
      emailResult = await this.emailService.sendEmployeeInviteEmail({
        toEmail: employee.email,
        employeeName: employee.fullName,
        organizationName: currentUser.organization.name,
        divisionName: employee.division?.name || 'Klinik',
        inviteCode: newInviteCode,
      });
    } catch (err: any) {
      throw new BadRequestException(`Gagal mengirim email undangan ke ${employee.email}: ${err.message}`);
    }

    // 3. Setelah email terkirim, update database dengan kode baru, hash baru, dan status 'sent'
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

  /**
   * Create a new division under the current user's organization
   */
  async createDivision(currentUserId: string, name: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });
    if (!currentUser) {
      throw new BadRequestException('Pengguna tidak ditemukan');
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new BadRequestException('Nama divisi tidak boleh kosong');
    }

    const existing = await this.prisma.division.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        name: trimmedName,
      },
    });
    if (existing) {
      throw new BadRequestException('Divisi dengan nama ini sudah ada');
    }

    const division = await this.prisma.division.create({
      data: {
        organizationId: currentUser.organizationId,
        name: trimmedName,
      },
    });

    return division;
  }

  /**
   * Get divisions for current organization
   */
  async getDivisions(currentUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });
    if (!currentUser) {
      throw new BadRequestException('Pengguna tidak ditemukan');
    }

    return this.prisma.division.findMany({
      where: { organizationId: currentUser.organizationId },
      orderBy: { name: 'asc' },
    });
  }
}

