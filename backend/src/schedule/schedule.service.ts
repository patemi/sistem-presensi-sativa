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
   * Helper: Normalisasi tipe shift dari kode singkat (P, S, LONG, OFF) atau nama enum
   */
  private normalizeShiftType(type: string): ShiftType {
    const upper = (type || '').toUpperCase().trim();
    if (upper === 'P' || upper === 'PAGI') return ShiftType.PAGI;
    if (upper === 'S' || upper === 'SIANG') return ShiftType.SIANG;
    if (upper === 'LONG' || upper === 'FULL' || upper === 'L') return ShiftType.LONG;
    if (upper === 'OFF' || upper === 'LIBUR') return ShiftType.OFF;
    throw new BadRequestException(
      `Tipe shift "${type}" tidak valid. Pilihan shift klinik: P (Pagi: 08:30-17:00), S (Siang: 10:30-19:00), LONG (Full: 08:30-20:00), atau OFF (Libur).`,
    );
  }

  /**
   * Helper: Validasi hari libur (OFF) HANYA boleh di weekday (Senin s.d. Kamis).
   * Dilarang libur di Jumat (5), Sabtu (6), atau Minggu (0).
   */
  private validateOffWeekday(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const day = dateObj.getUTCDay(); // 0: Minggu, 1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat, 6: Sabtu
    if (day === 0 || day === 5 || day === 6) {
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      throw new BadRequestException(
        `Aturan Shift Klinik Sativa: Hari libur (OFF) hanya boleh diambil di weekday (Senin s.d. Kamis). Tanggal ${dateStr} adalah hari ${dayNames[day]}, dilarang mengambil libur di hari Jumat, Sabtu, atau Minggu!`,
      );
    }
  }

  /**
   * Helper: Dapatkan jam target_check_in dan target_check_out berdasarkan ShiftType
   */
  private getTargetTimes(shiftType: ShiftType, customIn?: string, customOut?: string) {
    if (shiftType === ShiftType.OFF) {
      return { targetIn: '-', targetOut: '-' };
    }
    if (shiftType === ShiftType.LONG) {
      return {
        targetIn: customIn || '08:30',
        targetOut: customOut || '20:00',
      };
    }
    if (shiftType === ShiftType.SIANG) {
      return {
        targetIn: customIn || '10:30',
        targetOut: customOut || '19:00',
      };
    }
    // PAGI (Default)
    return {
      targetIn: customIn || '08:30',
      targetOut: customOut || '17:00',
    };
  }

  /**
   * FITUR HR SETUP JADWAL (NEST.JS):
   * Endpoint POST /schedule/bulk-create
   * Menerima array of object dari HR yang berisi user_id, date, dan shift_type (P, S, LONG, OFF)
   * Menegakkan:
   * 1. Libur (OFF) hanya boleh di weekday (Senin - Kamis).
   * 2. Maksimal 4x libur (OFF) dalam 1 bulan per karyawan.
   */
  async bulkCreate(payload: ScheduleItemDto[] | { schedules: ScheduleItemDto[] }) {
    const items: ScheduleItemDto[] = Array.isArray(payload)
      ? payload
      : payload?.schedules || [];

    if (!items || items.length === 0) {
      throw new BadRequestException('Data jadwal (array of schedules) tidak boleh kosong');
    }

    // 1. Validasi & normalisasi tiap baris
    const normalizedItems = items.map((item) => {
      if (!item.user_id || !item.date || !item.shift_type) {
        throw new BadRequestException(
          'Setiap item jadwal wajib menyertakan user_id, date (YYYY-MM-DD), dan shift_type (P, S, LONG, atau OFF)',
        );
      }
      const shiftType = this.normalizeShiftType(item.shift_type);

      // Cek aturan weekday untuk libur
      if (shiftType === ShiftType.OFF) {
        this.validateOffWeekday(item.date);
      }

      return {
        ...item,
        shift_type: shiftType,
      };
    });

    // 2. Validasi Kuota Maksimal 4 Hari Libur (OFF) per Bulan per Karyawan
    // Grouping berdasarkan userId & bulan (YYYY-MM)
    const userMonthOffMap = new Map<string, { userId: string; month: string; dates: Set<string> }>();

    for (const item of normalizedItems) {
      if (item.shift_type === ShiftType.OFF) {
        const month = item.date.slice(0, 7);
        const key = `${item.user_id}_${month}`;
        if (!userMonthOffMap.has(key)) {
          userMonthOffMap.set(key, { userId: item.user_id, month, dates: new Set() });
        }
        userMonthOffMap.get(key)!.dates.add(item.date);
      }
    }

    for (const [key, data] of userMonthOffMap.entries()) {
      // Periksa juga hari libur yang ada di DB pada bulan ini yang tidak tertimpa payload
      const payloadDateSet = new Set(
        normalizedItems.filter((i) => i.user_id === data.userId && i.date.startsWith(data.month)).map((i) => i.date),
      );

      const existingOffs = await this.scheduleRepo
        .createQueryBuilder('sch')
        .where('sch.user_id = :userId', { userId: data.userId })
        .andWhere('sch.date LIKE :month', { month: `${data.month}%` })
        .andWhere('sch.shift_type = :offType', { offType: ShiftType.OFF })
        .getMany();

      const existingUnreplacedOffCount = existingOffs.filter((sch) => !payloadDateSet.has(sch.date)).length;
      const totalOffCount = data.dates.size + existingUnreplacedOffCount;

      if (totalOffCount > 4) {
        const user = await this.prisma.user.findUnique({ where: { id: data.userId }, select: { fullName: true } });
        const name = user?.fullName || data.userId;
        throw new BadRequestException(
          `Aturan Shift Klinik Sativa: Karyawan "${name}" memiliki total ${totalOffCount} hari libur pada bulan ${data.month}. Karyawan hanya diperbolehkan mengambil libur maksimal 4x dalam 1 bulan!`,
        );
      }
    }

    const savedRecords: Schedule[] = [];

    // 3. Proses upsert menggunakan transaksi agar atomik
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of normalizedItems) {
        let record = await queryRunner.manager.findOne(Schedule, {
          where: {
            user_id: item.user_id,
            date: item.date,
          },
        });

        const { targetIn, targetOut } = this.getTargetTimes(item.shift_type);

        if (record) {
          record.shift_type = item.shift_type;
          record.target_check_in = targetIn;
          record.target_check_out = targetOut;
        } else {
          record = queryRunner.manager.create(Schedule, {
            user_id: item.user_id,
            date: item.date,
            shift_type: item.shift_type,
            target_check_in: targetIn,
            target_check_out: targetOut,
          });
        }

        const saved = await queryRunner.manager.save(Schedule, record);
        savedRecords.push(saved);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Berhasil bulk-insert/update ${savedRecords.length} jadwal shift klinik`);

      return {
        success: true,
        message: `Berhasil menyimpan ${savedRecords.length} jadwal kerja karyawan klinik`,
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
   * FITUR HR SETUP JADWAL SHIFT KARYAWAN:
   * Endpoint POST /schedule
   * HR menginput jadwal shift karyawan (target_check_in dan target_check_out)
   */
  async createSchedule(dto: {
    user_id: string;
    date: string;
    target_check_in?: string;
    target_check_out?: string;
    shift_type?: string;
  }) {
    if (!dto.user_id || !dto.date) {
      throw new BadRequestException('user_id dan date wajib diisi');
    }

    const shiftType = this.normalizeShiftType(dto.shift_type || ShiftType.PAGI);

    // Cek aturan weekday untuk libur
    if (shiftType === ShiftType.OFF) {
      this.validateOffWeekday(dto.date);

      // Cek kuota libur bulanan (maksimal 4x)
      const month = dto.date.slice(0, 7);
      const existingOffs = await this.scheduleRepo
        .createQueryBuilder('sch')
        .where('sch.user_id = :userId', { userId: dto.user_id })
        .andWhere('sch.date LIKE :month', { month: `${month}%` })
        .andWhere('sch.date != :currentDate', { currentDate: dto.date })
        .andWhere('sch.shift_type = :offType', { offType: ShiftType.OFF })
        .getCount();

      if (existingOffs >= 4) {
        const user = await this.prisma.user.findUnique({ where: { id: dto.user_id }, select: { fullName: true } });
        const name = user?.fullName || 'Karyawan';
        throw new BadRequestException(
          `Aturan Shift Klinik Sativa: Karyawan "${name}" telah mencapai kuota maksimal 4 hari libur pada bulan ${month}!`,
        );
      }
    }

    const { targetIn, targetOut } = this.getTargetTimes(
      shiftType,
      dto.target_check_in,
      dto.target_check_out,
    );

    let schedule = await this.scheduleRepo.findOne({
      where: { user_id: dto.user_id, date: dto.date },
    });

    if (schedule) {
      schedule.target_check_in = targetIn;
      schedule.target_check_out = targetOut;
      schedule.shift_type = shiftType;
      await this.scheduleRepo.save(schedule);
    } else {
      schedule = this.scheduleRepo.create({
        user_id: dto.user_id,
        date: dto.date,
        target_check_in: targetIn,
        target_check_out: targetOut,
        shift_type: shiftType,
      });
      await this.scheduleRepo.save(schedule);
    }

    return {
      success: true,
      message: 'Jadwal shift karyawan berhasil disimpan',
      schedule,
    };
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
        shift_code: details.code,
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
