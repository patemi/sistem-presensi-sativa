import { Controller, Get, Post, Body, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('invite')
  async sendInvite(@Body() body: { email: string; kode?: string; inviteCode?: string }) {
    const code = body?.kode || body?.inviteCode;
    if (!body?.email || !code) {
      throw new BadRequestException('Field "email" dan "kode" wajib diisi dalam body request');
    }

    const result = await this.appService.sendInviteEmail(body.email, code);
    return {
      success: true,
      message: `Undangan presensi berhasil dikirim ke ${body.email}`,
      data: result,
    };
  }
}
