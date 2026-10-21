import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeaveService, CreateLeaveDto, ReviewLeaveDto } from './leave.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  /**
   * Mengambil semua pengajuan izin/cuti dalam organisasi (HR & Owner)
   */
  @Get()
  @Roles('hr', 'owner')
  async getAllLeaves(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('divisionId') divisionId?: string,
    @Query('search') search?: string,
  ) {
    // Pastikan jika database belum punya data awal cuti, buatkan sampel realistik klinik
    await this.leaveService.seedInitialLeavesIfEmpty(user.organizationId, user.id);

    return this.leaveService.getAllLeaveRequests(user, {
      status,
      divisionId,
      search,
    });
  }

  /**
   * Membuat permohonan izin/cuti baru (bisa diajukan sendiri atau oleh HR)
   */
  @Post()
  async createLeave(
    @CurrentUser() user: any,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.leaveService.createLeaveRequest(user, dto);
  }

  /**
   * Endpoint khusus Admin/HR untuk meng-ACC (Approve) atau Menolak (Reject) beserta catatan
   */
  @Patch(':id/review')
  @Roles('hr', 'owner')
  async reviewLeave(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.leaveService.reviewLeaveRequest(user, id, dto);
  }

  /**
   * Mengambil permohonan izin/cuti milik karyawan yang sedang login
   */
  @Get('my')
  async getMyLeaves(@CurrentUser() user: any) {
    return this.leaveService.getMyLeaveRequests(user);
  }
}
