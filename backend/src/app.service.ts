import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly mailerService: MailerService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async sendInviteEmail(targetEmail: string, inviteCode: string) {
    const orgName = 'SATIVA Klinik Kecantikan';
    const emailSubject = `Undangan Bergabung ke ${orgName} — Kode Login & Presensi SATIVA`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #102636; color: #ffffff; border-radius: 16px;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <h1 style="color: #a0d4e4; font-size: 24px; margin: 0;">SATIVA</h1>
          <p style="color: #a0d4e4; font-size: 13px; margin-top: 4px;">Sistem Absensi & Kesehatan Tim — ${orgName}</p>
        </div>

        <div style="padding: 24px 0;">
          <h2 style="font-size: 18px; color: #ffffff;">Halo ${targetEmail},</h2>
          <p style="color: #a0d4e4; font-size: 14px; line-height: 1.6;">
            Anda telah ditambahkan oleh Tim HR ke dalam sistem <strong>${orgName}</strong>.
          </p>

          <div style="background: rgba(160,212,228,0.1); border: 1px solid rgba(160,212,228,0.3); padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0;">
            <p style="color: #a0d4e4; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0; font-weight: bold;">KODE UNDANGAN & KATA SANDI AWAL</p>
            <span style="font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: 4px; font-family: monospace;">${inviteCode}</span>
          </div>

          <h3 style="font-size: 14px; color: #ffffff; margin-top: 20px;">Cara Masuk / Login ke Sistem:</h3>
          <ol style="color: #a0d4e4; font-size: 13px; line-height: 1.8; padding-left: 20px;">
            <li>Buka halaman aplikasi SATIVA di browser Anda.</li>
            <li>Pada halaman Login, masukkan Email: <code>${targetEmail}</code>.</li>
            <li>Masukkan Kata Sandi / Kode Undangan: <code>${inviteCode}</code>.</li>
            <li>Anda akan langsung diarahkan ke halaman Absensi Presensi & Kesehatan Tim.</li>
          </ol>
        </div>

        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; text-align: center;">
          <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">
            Email ini dikirim secara resmi oleh Superadmin HR (${process.env.EMAIL_ADMIN || 'rindimia79@gmail.com'}) kepada ${targetEmail}.
          </p>
        </div>
      </div>
    `.trim();

    const emailText = `
============================================================
UNDANGAN KARYAWAN - KLINIK KECANTIKAN SATIVA
============================================================
Kepada Yth. ${targetEmail},

Anda telah ditambahkan oleh Tim HR ke sistem presensi klinik:
- Organisasi  : ${orgName}
- Divisi      : Staf Klinik
- Email Login : ${targetEmail}

KODE UNDANGAN / SANDI AWAL: ${inviteCode}

Cara Masuk:
1. Buka halaman aplikasi SATIVA di browser Anda.
2. Masukkan Email (${targetEmail}) dan Kata Sandi/Kode Undangan (${inviteCode}).
3. Selesai! Anda siap mencatat presensi masuk dan kesehatan harian Anda.
============================================================
    `.trim();

    try {
      const response = await this.mailerService.sendMail({
        to: targetEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });

      this.logger.log(`Email undangan presensi berhasil dikirim ke ${targetEmail}`);
      return response;
    } catch (error: any) {
      this.logger.error(`Gagal mengirim email undangan ke ${targetEmail}: ${error.message}`);
      throw error;
    }
  }
}
