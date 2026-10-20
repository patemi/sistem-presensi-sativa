import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr', 'owner')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('trigger-cron')
  @Roles('hr')
  async triggerCron() {
    return this.analyticsService.triggerCron();
  }

  @Get('attendance-today')
  async getAttendanceToday(
    @CurrentUser() user: any,
    @Query('divisionId') divisionId?: string,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getDailyAttendanceSummary(
      user.organizationId,
      divisionId,
      period,
    );
  }

  @Get('division-sentiment')
  async getDivisionWellbeing(
    @CurrentUser() user: any,
    @Query('divisionId') divisionId?: string,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getDivisionWellbeingTrends(
      user.organizationId,
      divisionId,
      period,
    );
  }

  @Get('correlation')
  async getCorrelation(
    @CurrentUser() user: any,
    @Query('divisionId') divisionId?: string,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getCorrelationMatrix(
      user.organizationId,
      divisionId,
      period,
    );
  }

  @Get('organization-summary')
  @Roles('owner', 'hr')
  async getOrganizationSummary(@CurrentUser() user: any) {
    return this.analyticsService.getOrganizationSummary(user.organizationId);
  }
}

