import { Controller, Post, Patch, Delete, Body, Get, Param, Query, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword?: string; newPassword: string },
  ) {
    return this.authService.changePassword(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('face-descriptor')
  async updateFaceDescriptor(
    @Request() req,
    @Body() body: { faceDescriptor: string; userId?: string },
  ) {
    const targetUserId =
      (req.user.role === 'hr' || req.user.role === 'ADMIN' || req.user.role === 'HR' || req.user.role === 'owner') && body.userId
        ? body.userId
        : req.user.id;
    return this.authService.updateFaceDescriptor(targetUserId, body.faceDescriptor, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('face-descriptor')
  async getFaceDescriptor(
    @Request() req,
    @Query('userId') queryUserId?: string,
  ) {
    const targetUserId =
      (req.user.role === 'hr' || req.user.role === 'ADMIN' || req.user.role === 'HR' || req.user.role === 'owner') && queryUserId
        ? queryUserId
        : req.user.id;
    return this.authService.getFaceDescriptor(targetUserId);
  }

  /**
   * Endpoint HR/Admin untuk mereset master wajah karyawan atau sesama admin
   */
  @UseGuards(JwtAuthGuard)
  @Patch('reset-face/:userId')
  async resetFaceDescriptor(
    @Request() req,
    @Param('userId') targetUserId: string,
  ) {
    return this.authService.resetFaceDescriptor(targetUserId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('face-descriptor/:userId')
  async deleteFaceDescriptor(
    @Request() req,
    @Param('userId') targetUserId: string,
  ) {
    return this.authService.resetFaceDescriptor(targetUserId, req.user);
  }

  /**
   * Endpoint bagi Admin/HR untuk mereset master wajah miliknya sendiri
   */
  @UseGuards(JwtAuthGuard)
  @Patch('reset-my-face')
  async resetMyFace(@Request() req) {
    return this.authService.resetFaceDescriptor(req.user.id, req.user);
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
    @Query('role') role?: string,
  ) {
    return this.authService.getEmployees(req.user.id, { status, divisionId, search, role });
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Patch('divisions/:id')
  async updateDivision(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.authService.updateDivision(req.user.id, id, body.name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Delete('divisions/:id')
  async deleteDivision(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.authService.deleteDivision(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Patch('employees/:id/division')
  async updateEmployeeDivision(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { divisionId: string | null },
  ) {
    return this.authService.updateUserDivision(req.user.id, id, body.divisionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr', 'owner')
  @Delete('employees/:id')
  async deleteEmployee(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.authService.deleteEmployee(req.user.id, id);
  }
}

