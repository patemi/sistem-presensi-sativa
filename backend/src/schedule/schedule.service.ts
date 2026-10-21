import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Schedule, ShiftType, SHIFT_DETAILS } from './entities/schedule.entity';
import { ShiftSwapRequest, ShiftSwapStatus } from './entities/shift-swap-request.entity';
import { ScheduleItemDto } from './dto/create-schedule.dto';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(ShiftSwapRequest)
    private readonly swapRequestRepo: Repository<ShiftSwapRequest>,
    private readonly dataSource: DataSource,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * FITUR HR SETUP JADWAL (NEST.JS):
   * Endpoint POST /schedule/bulk-create
   * Menerima array of object dari HR yang berisi user_id, date, dan shift_type
   * untuk melakukan bulk insert atau generate jadwal karyawan selama satu bulan penuh.
   */
  async bulkCreate(payload: ScheduleItemDto[] | { schedules: ScheduleItemDto[] }) {
    const items: ScheduleItemDto[] = Array.isArray(payload)
      ? payload
      : payload?.schedules || [];

    if (!items || items.length === 0) {
      throw new BadRequestException('Data jadwal (array of schedules) tidak boleh kosong');
    }

    // Validasi format tiap baris
    for (const item of items) {
      if (!item.user_id || !item.date || !item.shift_type) {
        throw new BadRequestException(
          'Setiap item jadwal wajib menyertakan user_id, date (YYYY-MM-DD), dan shift_type (PAGI / SIANG)',
        );
      }
      if (item.shift_type !== ShiftType.PAGI && item.shift_type !== ShiftType.SIANG) {
        throw new BadRequestException(
          `shift_type "${item.shift_type}" tidak valid. Hanya menerima "PAGI" atau "SIANG"`,
        );
      }
    }

    const savedRecords: Schedule[] = [];

    // Proses upsert menggunakan transaksi agar atomik
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of items) {
        let record = await queryRunner.manager.findOne(Schedule, {
          where: {
            user_id: item.user_id,
            date: item.date,
          },
        });

        if (record) {
          record.shift_type = item.shift_type;
        } else {
          record = queryRunner.manager.create(Schedule, {
            user_id: item.user_id,
            date: item.date,
            shift_type: item.shift_type,
          });
        }

        const saved = await queryRunner.manager.save(Schedule, record);
        savedRecords.push(saved);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Berhasil bulk-insert/update ${savedRecords.length} jadwal karyawan`);

      return {
        success: true,
        message: `Berhasil menyimpan ${savedRecords.length} jadwal kerja karyawan`,
        count: savedRecords.length,
        schedules: savedRecords,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Gagal melakukan bulk create jadwal', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Ambil semua jadwal dengan filter opsional (bulan, tanggal, user_id).
   * Karyawan: read-only akses untuk melihat jadwal shift.
   * HR: melihat dan memonitor jadwal shift klinik.
   */
  async findAll(filters?: { month?: string; date?: string; user_id?: string }) {
    const qb = this.scheduleRepo.createQueryBuilder('schedule');

    if (filters?.date) {
      qb.andWhere('schedule.date = :date', { date: filters.date });
    } else if (filters?.month) {
      // filters.month format 'YYYY-MM'
      qb.andWhere('schedule.date LIKE :month', { month: `${filters.month}%` });
    }

    if (filters?.user_id) {
      qb.andWhere('schedule.user_id = :userId', { userId: filters.user_id });
    }

    qb.orderBy('schedule.date', 'ASC');

    const schedules = await qb.getMany();

    // Enrich dengan data nama user dan divisi dari Prisma
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        division: { select: { name: true } },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return schedules.map((sch) => {
      const u = userMap.get(sch.user_id);
      const details = SHIFT_DETAILS[sch.shift_type] || SHIFT_DETAILS[ShiftType.PAGI];
      return {
        ...sch,
        shift_start: details.start,
        shift_end: details.end,
        shift_label: details.label,
        user_name: u?.fullName || 'Karyawan',
        user_email: u?.email || '',
        user_role: u?.role || 'karyawan',
        division_name: u?.division?.name || 'Staf Medis',
      };
    });
  }

  /**
   * FITUR TUKAR SHIFT / LIBUR (NEST.JS):
   * 1. Pengajuan tukar shift oleh karyawan
   */
  async createSwapRequest(requesterId: string, dto: CreateSwapRequestDto) {
    if (requesterId === dto.target_user_id) {
      throw new BadRequestException('Tidak dapat mengajukan tukar shift dengan diri sendiri');
    }

    if (!dto.requester_date || !dto.target_date || !dto.reason) {
      throw new BadRequestException('Tanggal pemohon, tanggal target, dan alasan wajib diisi');
    }

    // Pastikan requester memiliki jadwal di requester_date
    const reqSchedule = await this.scheduleRepo.findOne({
      where: { user_id: requesterId, date: dto.requester_date },
    });
    if (!reqSchedule) {
      throw new BadRequestException(
        `Anda tidak memiliki jadwal shift pada tanggal ${dto.requester_date}`,
      );
    }

    // Pastikan target memiliki jadwal di target_date
    const targetSchedule = await this.scheduleRepo.findOne({
      where: { user_id: dto.target_user_id, date: dto.target_date },
    });
    if (!targetSchedule) {
      throw new BadRequestException(
        `Rekan kerja target tidak memiliki jadwal shift pada tanggal ${dto.target_date}`,
      );
    }

    const swapRequest = this.swapRequestRepo.create({
      requester_id: requesterId,
      target_user_id: dto.target_user_id,
      requester_date: dto.requester_date,
      target_date: dto.target_date,
      reason: dto.reason,
      status: ShiftSwapStatus.PENDING,
    });

    const saved = await this.swapRequestRepo.save(swapRequest);
    return {
      success: true,
      message: 'Permohonan tukar shift berhasil diajukan dan menunggu persetujuan HR',
      data: saved,
    };
  }

  /**
   * FITUR TUKAR SHIFT / LIBUR (NEST.JS):
   * logic di Service menggunakan TypeORM Transaction (QueryRunner).
   * Saat sebuah data ShiftSwapRequest di-update statusnya menjadi 'HR_APPROVED',
   * sistem harus otomatis mencari 2 baris data di tabel Schedule berdasarkan
   * requester_date & target_date, lalu menukar nilai user_id di antara kedua jadwal tersebut secara real-time di database.
   */
  async approveSwapByHr(requestId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const swapRequest = await queryRunner.manager.findOne(ShiftSwapRequest, {
        where: { id: requestId },
      });

      if (!swapRequest) {
        throw new NotFoundException(`Data ShiftSwapRequest dengan ID "${requestId}" tidak ditemukan`);
      }

      if (swapRequest.status === ShiftSwapStatus.HR_APPROVED) {
        throw new BadRequestException('Pengajuan tukar shift ini sudah disetujui sebelumnya');
      }

      // 1. Cari jadwal requester pada requester_date
      const scheduleRequester = await queryRunner.manager.findOne(Schedule, {
        where: {
          user_id: swapRequest.requester_id,
          date: swapRequest.requester_date,
        },
      });

      // 2. Cari jadwal target pada target_date
      const scheduleTarget = await queryRunner.manager.findOne(Schedule, {
        where: {
          user_id: swapRequest.target_user_id,
          date: swapRequest.target_date,
        },
      });

      if (!scheduleRequester) {
        throw new BadRequestException(
          `Jadwal requester pada tanggal ${swapRequest.requester_date} tidak ditemukan di tabel Schedule`,
        );
      }

      if (!scheduleTarget) {
        throw new BadRequestException(
          `Jadwal target pada tanggal ${swapRequest.target_date} tidak ditemukan di tabel Schedule`,
        );
      }

      this.logger.log(
        `Menukar user_id: ${scheduleRequester.user_id} (${scheduleRequester.date}) <--> ${scheduleTarget.user_id} (${scheduleTarget.date})`,
      );

      // 3. Tukar nilai user_id di antara kedua jadwal tersebut secara real-time
      const tempUserId = scheduleRequester.user_id;
      scheduleRequester.user_id = scheduleTarget.user_id;
      scheduleTarget.user_id = tempUserId;

      await queryRunner.manager.save(Schedule, scheduleRequester);
      await queryRunner.manager.save(Schedule, scheduleTarget);

      // 4. Update status ShiftSwapRequest menjadi 'HR_APPROVED'
      swapRequest.status = ShiftSwapStatus.HR_APPROVED;
      const updatedSwapRequest = await queryRunner.manager.save(ShiftSwapRequest, swapRequest);

      // 5. Commit transaction atomik
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Pertukaran shift berhasil disetujui HR dan jadwal berhasil ditukar di database.',
        swapRequest: updatedSwapRequest,
        swappedSchedules: {
          requester_date_now_assigned_to: scheduleRequester.user_id,
          target_date_now_assigned_to: scheduleTarget.user_id,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error transaksi swap shift HR_APPROVED', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tolak pertukaran shift oleh HR
   */
  async rejectSwap(requestId: string, reason?: string) {
    const swap = await this.swapRequestRepo.findOne({ where: { id: requestId } });
    if (!swap) {
      throw new NotFoundException(`Data ShiftSwapRequest dengan ID "${requestId}" tidak ditemukan`);
    }

    swap.status = ShiftSwapStatus.REJECTED;
    if (reason) {
      swap.reason = `${swap.reason} [Ditolak HR: ${reason}]`;
    }

    const saved = await this.swapRequestRepo.save(swap);
    return {
      success: true,
      message: 'Permohonan tukar shift ditolak',
      data: saved,
    };
  }

  /**
   * Ambil daftar semua permohonan tukar shift
   */
  async findAllSwapRequests(userId?: string) {
    const whereClause = userId
      ? [{ requester_id: userId }, { target_user_id: userId }]
      : {};

    const requests = await this.swapRequestRepo.find({
      where: whereClause,
      order: { created_at: 'DESC' },
    });

    const users = await this.prisma.user.findMany({
      select: { id: true, fullName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return requests.map((req) => ({
      ...req,
      requester_name: userMap.get(req.requester_id)?.fullName || 'Pemohon',
      requester_email: userMap.get(req.requester_id)?.email || '',
      target_user_name: userMap.get(req.target_user_id)?.fullName || 'Rekan Target',
      target_user_email: userMap.get(req.target_user_id)?.email || '',
    }));
  }
}
