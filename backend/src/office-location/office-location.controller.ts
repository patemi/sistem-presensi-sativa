import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { OfficeLocationService } from './office-location.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('office-locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfficeLocationController {
  constructor(private officeLocationService: OfficeLocationService) {}

  @Get()
  @Roles('karyawan', 'hr', 'owner')
  async getAll(@CurrentUser() user: any) {
    return this.officeLocationService.getAll(user.organizationId);
  }

  @Post()
  @Roles('hr')
  async create(
    @CurrentUser() user: any,
    @Body() body: {
      label: string;
      latitude: number;
      longitude: number;
      radiusMeters?: number;
    },
  ) {
    return this.officeLocationService.create(user.organizationId, body);
  }

  @Put(':id')
  @Roles('hr')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: {
      label?: string;
      latitude?: number;
      longitude?: number;
      radiusMeters?: number;
    },
  ) {
    return this.officeLocationService.update(id, user.organizationId, body);
  }

  @Delete(':id')
  @Roles('hr')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.officeLocationService.delete(id, user.organizationId);
  }
}
