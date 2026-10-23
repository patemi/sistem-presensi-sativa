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
var ScheduleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_entity_1 = require("./entities/schedule.entity");
const shift_swap_request_entity_1 = require("./entities/shift-swap-request.entity");
const prisma_service_1 = require("../prisma/prisma.service");
let ScheduleService = ScheduleService_1 = class ScheduleService {
    scheduleRepo;
    swapRequestRepo;
    dataSource;
    prisma;
    logger = new common_1.Logger(ScheduleService_1.name);
    constructor(scheduleRepo, swapRequestRepo, dataSource, prisma) {
        this.scheduleRepo = scheduleRepo;
        this.swapRequestRepo = swapRequestRepo;
        this.dataSource = dataSource;
        this.prisma = prisma;
    }
    normalizeShiftType(type) {
        const upper = (type || '').toUpperCase().trim();
        if (upper === 'P' || upper === 'PAGI')
            return schedule_entity_1.ShiftType.PAGI;
        if (upper === 'S' || upper === 'SIANG')
            return schedule_entity_1.ShiftType.SIANG;
        if (upper === 'LONG' || upper === 'FULL' || upper === 'L')
            return schedule_entity_1.ShiftType.LONG;
        if (upper === 'OFF' || upper === 'LIBUR')
            return schedule_entity_1.ShiftType.OFF;
        throw new common_1.BadRequestException(`Tipe shift "${type}" tidak valid. Pilihan shift klinik: P (Pagi: 08:30-17:00), S (Siang: 10:30-19:00), LONG (Full: 08:30-20:00), atau OFF (Libur).`);
    }
    validateOffWeekday(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        const day = dateObj.getUTCDay();
        if (day === 0 || day === 5 || day === 6) {
            const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            throw new common_1.BadRequestException(`Aturan Shift Klinik Sativa: Hari libur (OFF) hanya boleh diambil di weekday (Senin s.d. Kamis). Tanggal ${dateStr} adalah hari ${dayNames[day]}, dilarang mengambil libur di hari Jumat, Sabtu, atau Minggu!`);
        }
    }
    getTargetTimes(shiftType, customIn, customOut) {
        if (shiftType === schedule_entity_1.ShiftType.OFF) {
            return { targetIn: '-', targetOut: '-' };
        }
        if (shiftType === schedule_entity_1.ShiftType.LONG) {
            return {
                targetIn: customIn || '08:30',
                targetOut: customOut || '20:00',
            };
        }
        if (shiftType === schedule_entity_1.ShiftType.SIANG) {
            return {
                targetIn: customIn || '10:30',
                targetOut: customOut || '19:00',
            };
        }
        return {
            targetIn: customIn || '08:30',
            targetOut: customOut || '17:00',
        };
    }
    async bulkCreate(payload) {
        const items = Array.isArray(payload)
            ? payload
            : payload?.schedules || [];
        if (!items || items.length === 0) {
            throw new common_1.BadRequestException('Data jadwal (array of schedules) tidak boleh kosong');
        }
        const normalizedItems = items.map((item) => {
            if (!item.user_id || !item.date || !item.shift_type) {
                throw new common_1.BadRequestException('Setiap item jadwal wajib menyertakan user_id, date (YYYY-MM-DD), dan shift_type (P, S, LONG, atau OFF)');
            }
            const shiftType = this.normalizeShiftType(item.shift_type);
            if (shiftType === schedule_entity_1.ShiftType.OFF) {
                this.validateOffWeekday(item.date);
            }
            return {
                ...item,
                shift_type: shiftType,
            };
        });
        const userMonthOffMap = new Map();
        for (const item of normalizedItems) {
            if (item.shift_type === schedule_entity_1.ShiftType.OFF) {
                const month = item.date.slice(0, 7);
                const key = `${item.user_id}_${month}`;
                if (!userMonthOffMap.has(key)) {
                    userMonthOffMap.set(key, { userId: item.user_id, month, dates: new Set() });
                }
                userMonthOffMap.get(key).dates.add(item.date);
            }
        }
        for (const [key, data] of userMonthOffMap.entries()) {
            const payloadDateSet = new Set(normalizedItems.filter((i) => i.user_id === data.userId && i.date.startsWith(data.month)).map((i) => i.date));
            const existingOffs = await this.scheduleRepo
                .createQueryBuilder('sch')
                .where('sch.user_id = :userId', { userId: data.userId })
                .andWhere('sch.date LIKE :month', { month: `${data.month}%` })
                .andWhere('sch.shift_type = :offType', { offType: schedule_entity_1.ShiftType.OFF })
                .getMany();
            const existingUnreplacedOffCount = existingOffs.filter((sch) => !payloadDateSet.has(sch.date)).length;
            const totalOffCount = data.dates.size + existingUnreplacedOffCount;
            if (totalOffCount > 4) {
                const user = await this.prisma.user.findUnique({ where: { id: data.userId }, select: { fullName: true } });
                const name = user?.fullName || data.userId;
                throw new common_1.BadRequestException(`Aturan Shift Klinik Sativa: Karyawan "${name}" memiliki total ${totalOffCount} hari libur pada bulan ${data.month}. Karyawan hanya diperbolehkan mengambil libur maksimal 4x dalam 1 bulan!`);
            }
        }
        const savedRecords = [];
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            for (const item of normalizedItems) {
                let record = await queryRunner.manager.findOne(schedule_entity_1.Schedule, {
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
                }
                else {
                    record = queryRunner.manager.create(schedule_entity_1.Schedule, {
                        user_id: item.user_id,
                        date: item.date,
                        shift_type: item.shift_type,
                        target_check_in: targetIn,
                        target_check_out: targetOut,
                    });
                }
                const saved = await queryRunner.manager.save(schedule_entity_1.Schedule, record);
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
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Gagal melakukan bulk create jadwal', err);
            throw err;
        }
        finally {
            await queryRunner.release();
        }
    }
    async createSchedule(dto) {
        if (!dto.user_id || !dto.date) {
            throw new common_1.BadRequestException('user_id dan date wajib diisi');
        }
        const shiftType = this.normalizeShiftType(dto.shift_type || schedule_entity_1.ShiftType.PAGI);
        if (shiftType === schedule_entity_1.ShiftType.OFF) {
            this.validateOffWeekday(dto.date);
            const month = dto.date.slice(0, 7);
            const existingOffs = await this.scheduleRepo
                .createQueryBuilder('sch')
                .where('sch.user_id = :userId', { userId: dto.user_id })
                .andWhere('sch.date LIKE :month', { month: `${month}%` })
                .andWhere('sch.date != :currentDate', { currentDate: dto.date })
                .andWhere('sch.shift_type = :offType', { offType: schedule_entity_1.ShiftType.OFF })
                .getCount();
            if (existingOffs >= 4) {
                const user = await this.prisma.user.findUnique({ where: { id: dto.user_id }, select: { fullName: true } });
                const name = user?.fullName || 'Karyawan';
                throw new common_1.BadRequestException(`Aturan Shift Klinik Sativa: Karyawan "${name}" telah mencapai kuota maksimal 4 hari libur pada bulan ${month}!`);
            }
        }
        const { targetIn, targetOut } = this.getTargetTimes(shiftType, dto.target_check_in, dto.target_check_out);
        let schedule = await this.scheduleRepo.findOne({
            where: { user_id: dto.user_id, date: dto.date },
        });
        if (schedule) {
            schedule.target_check_in = targetIn;
            schedule.target_check_out = targetOut;
            schedule.shift_type = shiftType;
            await this.scheduleRepo.save(schedule);
        }
        else {
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
    async findAll(filters) {
        const qb = this.scheduleRepo.createQueryBuilder('schedule');
        if (filters?.date) {
            qb.andWhere('schedule.date = :date', { date: filters.date });
        }
        else if (filters?.month) {
            qb.andWhere('schedule.date LIKE :month', { month: `${filters.month}%` });
        }
        if (filters?.user_id) {
            qb.andWhere('schedule.user_id = :userId', { userId: filters.user_id });
        }
        qb.orderBy('schedule.date', 'ASC');
        const schedules = await qb.getMany();
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
            const details = schedule_entity_1.SHIFT_DETAILS[sch.shift_type] || schedule_entity_1.SHIFT_DETAILS[schedule_entity_1.ShiftType.PAGI];
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
    async createSwapRequest(requesterId, dto) {
        if (requesterId === dto.target_user_id) {
            throw new common_1.BadRequestException('Tidak dapat mengajukan tukar shift dengan diri sendiri');
        }
        if (!dto.requester_date || !dto.target_date || !dto.reason) {
            throw new common_1.BadRequestException('Tanggal pemohon, tanggal target, dan alasan wajib diisi');
        }
        const reqSchedule = await this.scheduleRepo.findOne({
            where: { user_id: requesterId, date: dto.requester_date },
        });
        if (!reqSchedule) {
            throw new common_1.BadRequestException(`Anda tidak memiliki jadwal shift pada tanggal ${dto.requester_date}`);
        }
        const targetSchedule = await this.scheduleRepo.findOne({
            where: { user_id: dto.target_user_id, date: dto.target_date },
        });
        if (!targetSchedule) {
            throw new common_1.BadRequestException(`Rekan kerja target tidak memiliki jadwal shift pada tanggal ${dto.target_date}`);
        }
        const swapRequest = this.swapRequestRepo.create({
            requester_id: requesterId,
            target_user_id: dto.target_user_id,
            requester_date: dto.requester_date,
            target_date: dto.target_date,
            reason: dto.reason,
            status: shift_swap_request_entity_1.ShiftSwapStatus.PENDING,
        });
        const saved = await this.swapRequestRepo.save(swapRequest);
        return {
            success: true,
            message: 'Permohonan tukar shift berhasil diajukan dan menunggu persetujuan HR',
            data: saved,
        };
    }
    async approveSwapByHr(requestId) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const swapRequest = await queryRunner.manager.findOne(shift_swap_request_entity_1.ShiftSwapRequest, {
                where: { id: requestId },
            });
            if (!swapRequest) {
                throw new common_1.NotFoundException(`Data ShiftSwapRequest dengan ID "${requestId}" tidak ditemukan`);
            }
            if (swapRequest.status === shift_swap_request_entity_1.ShiftSwapStatus.HR_APPROVED) {
                throw new common_1.BadRequestException('Pengajuan tukar shift ini sudah disetujui sebelumnya');
            }
            const scheduleRequester = await queryRunner.manager.findOne(schedule_entity_1.Schedule, {
                where: {
                    user_id: swapRequest.requester_id,
                    date: swapRequest.requester_date,
                },
            });
            const scheduleTarget = await queryRunner.manager.findOne(schedule_entity_1.Schedule, {
                where: {
                    user_id: swapRequest.target_user_id,
                    date: swapRequest.target_date,
                },
            });
            if (!scheduleRequester) {
                throw new common_1.BadRequestException(`Jadwal requester pada tanggal ${swapRequest.requester_date} tidak ditemukan di tabel Schedule`);
            }
            if (!scheduleTarget) {
                throw new common_1.BadRequestException(`Jadwal target pada tanggal ${swapRequest.target_date} tidak ditemukan di tabel Schedule`);
            }
            this.logger.log(`Menukar user_id: ${scheduleRequester.user_id} (${scheduleRequester.date}) <--> ${scheduleTarget.user_id} (${scheduleTarget.date})`);
            const tempUserId = scheduleRequester.user_id;
            scheduleRequester.user_id = scheduleTarget.user_id;
            scheduleTarget.user_id = tempUserId;
            await queryRunner.manager.save(schedule_entity_1.Schedule, scheduleRequester);
            await queryRunner.manager.save(schedule_entity_1.Schedule, scheduleTarget);
            swapRequest.status = shift_swap_request_entity_1.ShiftSwapStatus.HR_APPROVED;
            const updatedSwapRequest = await queryRunner.manager.save(shift_swap_request_entity_1.ShiftSwapRequest, swapRequest);
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
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Error transaksi swap shift HR_APPROVED', err);
            throw err;
        }
        finally {
            await queryRunner.release();
        }
    }
    async rejectSwap(requestId, reason) {
        const swap = await this.swapRequestRepo.findOne({ where: { id: requestId } });
        if (!swap) {
            throw new common_1.NotFoundException(`Data ShiftSwapRequest dengan ID "${requestId}" tidak ditemukan`);
        }
        swap.status = shift_swap_request_entity_1.ShiftSwapStatus.REJECTED;
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
    async findAllSwapRequests(userId) {
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
};
exports.ScheduleService = ScheduleService;
exports.ScheduleService = ScheduleService = ScheduleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(schedule_entity_1.Schedule)),
    __param(1, (0, typeorm_1.InjectRepository)(shift_swap_request_entity_1.ShiftSwapRequest)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        prisma_service_1.PrismaService])
], ScheduleService);
//# sourceMappingURL=schedule.service.js.map