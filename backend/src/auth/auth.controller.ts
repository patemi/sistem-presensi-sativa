import { Controller, Post, Patch, Body, Get, Param, Query, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(
    @Body()
    body: {
      fullName: string;
      email: string;
      password: string;
      inviteCode: string;
      divisionId?: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Get('validate-invite/:code')
  async validateInvite(@Param('code') code: string) {
    return this.authService.validateInviteCode(code);
  }

  @Get('organizations')
  async getOrganizations() {
    return this.authService.getOrganizations();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() body: { fullName?: string; email?: string; password?: string },
  ) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Post('add-admin')
  async addAdmin(
    @Request() req,
    @Body() body: { fullName: string; email: string; password: string },
  ) {
    return this.authService.addAdmin(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Get('employees')
  async getEmployees(
    @Request() req,
    @Query('status') status?: string,
    @Query('divisionId') divisionId?: string,
    @Query('search') search?: string,
  ) {
    return this.authService.getEmployees(req.user.id, { status, divisionId, search });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Post('invite-employee')
  async inviteEmployee(
    @Request() req,
    @Body() body: { fullName: string; email: string; divisionId: string; sendEmailNow?: boolean },
  ) {
    return this.authService.inviteEmployee(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Post('resend-invite/:employeeId')
  async resendInvite(
    @Request() req,
    @Param('employeeId') employeeId: string,
  ) {
    return this.authService.resendEmployeeInvite(req.user.id, employeeId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Get('divisions')
  async getDivisions(@Request() req) {
    return this.authService.getDivisions(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Post('divisions')
  async createDivision(
    @Request() req,
    @Body() body: { name: string },
  ) {
    return this.authService.createDivision(req.user.id, body.name);
  }
}

