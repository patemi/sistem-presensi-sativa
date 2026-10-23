import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { ScheduleItemDto } from './dto/create-schedule.dto';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * FITUR HR SETUP JADWAL SHIFT KARYAWAN:
   * Endpoint POST /schedule
   * HR menginput jadwal shift karyawan (target_check_in dan target_check_out)
   */
  @Post()
  async createSchedule(
    @Body()
    dto: {
      user_id: string;
      date: string;
      target_check_in?: string;
      target_check_out?: string;
      shift_type?: string;
    },
  ) {
    return this.scheduleService.createSchedule(dto);
  }

  /**
   * FITUR HR SETUP JADWAL (NEST.JS):
   * Endpoint POST /schedule/bulk-create
   * Menerima array of object dari HR yang berisi user_id, date, dan shift_type
   * untuk melakukan bulk insert atau generate jadwal karyawan selama satu bulan penuh.
   */
  @Post('bulk-create')
  async bulkCreate(
    @Body() payload: ScheduleItemDto[] | { schedules: ScheduleItemDto[] },
  ) {
    return this.scheduleService.bulkCreate(payload);
  }

  /**
   * Karyawan & HR: Melihat jadwal shift
   * Karyawan membaca jadwal tanpa bisa mengedit
   */
  @Get()
  async getSchedules(
    @Query('month') month?: string,
    @Query('date') date?: string,
    @Query('user_id') userId?: string,
  ) {
    return this.scheduleService.findAll({ month, date, user_id: userId });
  }

  /**
   * Karyawan: Melihat jadwal pribadi saya
   */
  @Get('my')
  async getMySchedules(
    @CurrentUser() user: any,
    @Query('month') month?: string,
  ) {
    return this.scheduleService.findAll({ month, user_id: user.id });
  }

  /**
   * Karyawan: Mengajukan tukar shift
   */
  @Post('swap-request')
  async createSwapRequest(
    @CurrentUser() user: any,
    @Body() dto: CreateSwapRequestDto,
  ) {
    return this.scheduleService.createSwapRequest(user.id, dto);
  }

  /**
   * HR & Karyawan: Melihat daftar permohonan tukar shift
   */
  @Get('swap-requests')
  async getSwapRequests(
    @CurrentUser() user: any,
    @Query('all') all?: string,
  ) {
    // Jika HR/Owner atau minta all, berikan semua; selain itu berikan milik user
    const isHrOrOwner = user.role === 'hr' || user.role === 'owner';
    const filterUserId = (isHrOrOwner && all === 'true') ? undefined : (isHrOrOwner ? undefined : user.id);
    return this.scheduleService.findAllSwapRequests(filterUserId);
  }

  /**
   * FITUR TUKAR SHIFT / LIBUR (NEST.JS):
   * Endpoint PATCH /schedule/swap-request/:id/approve-hr
   * Saat sebuah data ShiftSwapRequest di-update statusnya menjadi 'HR_APPROVED',
   * sistem otomatis mencari 2 baris data di tabel Schedule berdasarkan
   * requester_date & target_date, lalu menukar nilai user_id di antara kedua jadwal tersebut
   * menggunakan TypeORM Transaction (QueryRunner).
   */
  @Patch('swap-request/:id/approve-hr')
  async approveSwapByHr(@Param('id') id: string) {
    return this.scheduleService.approveSwapByHr(id);
  }

  /**
   * HR: Menolak tukar shift
   */
  @Patch('swap-request/:id/reject')
  async rejectSwap(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.scheduleService.rejectSwap(id, reason);
  }
}
