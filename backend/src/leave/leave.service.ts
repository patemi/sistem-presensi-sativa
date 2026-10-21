import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/email.service';

export class CreateLeaveDto {
  employeeId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays?: number;
  reason: string;
  attachmentUrl?: string;
  adminNotes?: string;
  initialStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export class ReviewLeaveDto {
  action: 'APPROVE' | 'REJECT';
  adminNotes?: string;
}

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Helper untuk menghitung jumlah hari kalender antara dua tanggal
   */
  private calculateDays(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  }

  /**
   * Mengambil semua permohonan izin & cuti dalam organisasi (HR / Admin view)
   */
  async getAllLeaveRequests(
    currentUser: any,
    query?: { status?: string; divisionId?: string; search?: string },
  ) {
    const organizationId = currentUser.organizationId;
    const whereClause: any = { organizationId };

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

    // Statistik agregat per status
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

  /**
   * Membuat permohonan izin/cuti baru
   */
  async createLeaveRequest(currentUser: any, dto: CreateLeaveDto) {
    const targetUserId = dto.employeeId || currentUser.id;

    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        organizationId: currentUser.organizationId,
      },
      include: { division: true },
    });

    if (!targetUser) {
      throw new BadRequestException('Karyawan tidak ditemukan dalam organisasi ini');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Format tanggal tidak valid');
    }

    if (endDate < startDate) {
      throw new BadRequestException('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
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

  /**
   * Memproses ACC (Approve) atau Tolak (Reject) permohonan izin/cuti beserta catatan admin
   */
  async reviewLeaveRequest(currentUser: any, leaveId: string, dto: ReviewLeaveDto) {
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
      throw new BadRequestException('Permohonan izin/cuti tidak ditemukan');
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

  /**
   * Mengambil permohonan cuti milik user saat ini (Employee self-service)
   */
  async getMyLeaveRequests(currentUser: any) {
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

  /**
   * Helper seeder: membuat data dummy izin/cuti jika belum ada agar langsung terlihat di dashboard
   */
  async seedInitialLeavesIfEmpty(organizationId: string, hrUserId: string) {
    const count = await this.prisma.leaveRequest.count({
      where: { organizationId },
    });

    if (count > 0) return;

    const employees = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: 'karyawan',
      },
      take: 4,
    });

    if (employees.length === 0) return;

    const today = new Date();
    const plusDays = (d: number) => new Date(today.getTime() + d * 24 * 60 * 60 * 1000);

    // 1. Pending: Sarah/Cece
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

    // 2. Pending: Izin Sakit
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

    // 3. Approved (sudah di-acc)
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

    // 4. Rejected (ditolak dengan catatan)
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
}
