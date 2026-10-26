"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    logger = new common_1.Logger(EmailService_1.name);
    async getTransporter() {
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpUser = process.env.EMAIL_ADMIN || process.env.SMTP_USER || 'rindimia79@gmail.com';
        const smtpPass = (process.env.EMAIL_PASSWORD || process.env.SMTP_PASS)?.trim();
        if ((smtpHost === 'smtp.gmail.com' || (smtpUser && smtpUser.includes('@gmail.com'))) && smtpPass) {
            this.logger.log(`Using Gmail SMTP with Superadmin account: ${smtpUser}`);
            const cleanPass = smtpPass.replace(/\s+/g, '');
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: smtpUser,
                    pass: cleanPass,
                },
            });
            const fromAddress = `"SATIVA Klinik Kecantikan" <${smtpUser}>`;
            return { transporter, fromAddress, isTestAccount: false };
        }
        if (smtpHost && smtpUser && smtpPass && smtpHost !== 'smtp.gmail.com') {
            const port = Number(process.env.SMTP_PORT) || 587;
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port,
                secure: port === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });
            const fromAddress = `"SATIVA Klinik Kecantikan" <${smtpUser}>`;
            return { transporter, fromAddress, isTestAccount: false };
        }
        this.logger.warn(`⚠️ SMTP_PASS belum diisi untuk ${smtpUser}. Menggunakan Ethereal test inbox online.`);
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        const fromAddress = `"SATIVA Klinik Kecantikan" <${testAccount.user}>`;
        return { transporter, fromAddress, isTestAccount: true };
    }
    async sendEmployeeInviteEmail(options) {
        const { toEmail, employeeName, organizationName, divisionName, inviteCode } = options;
        const orgName = organizationName && !organizationName.includes('Corp')
            ? organizationName
            : 'SATIVA Klinik Kecantikan';
        const divName = divisionName && divisionName !== 'Tanpa Divisi' ? divisionName : 'Staf Klinik';
        const smtpSender = process.env.EMAIL_ADMIN || process.env.SMTP_USER || 'rindimia79@gmail.com';
        const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
        const loginLink = `${frontendUrl}/login?email=${encodeURIComponent(toEmail)}&code=${encodeURIComponent(inviteCode)}`;
        const emailSubject = `Undangan Akun Presensi SATIVA - ${orgName}`;
        const emailHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Undangan Akun Presensi SATIVA</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); border-radius: 12px; padding: 8px 16px; margin-bottom: 8px;">
                <span style="color: #ffffff; font-weight: 800; font-size: 20px; letter-spacing: 2px;">SATIVA</span>
              </div>
              <h1 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                Sistem Presensi & Monitoring Tim Klinik
              </h1>
              <p style="color: #e0f2fe; font-size: 13px; margin: 6px 0 0 0;">
                ${orgName}
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="font-size: 18px; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
                Halo ${employeeName || toEmail},
              </h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
                Anda telah resmi ditambahkan oleh Manajemen HR ke sistem presensi <strong>${orgName}</strong> pada divisi <strong>${divName}</strong>.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin: 0 0 6px 0;">
                  Akun Login Karyawan
                </p>
                <p style="font-size: 14px; color: #1e293b; margin: 4px 0 12px 0;">
                  Email: <strong>${toEmail}</strong>
                </p>
                <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px;">
                  <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #4f46e5; margin: 0 0 6px 0;">
                    KODE UNDANGAN & KATA SANDI AWAL
                  </p>
                  <div style="background-color: #ffffff; border: 2px solid #818cf8; border-radius: 8px; padding: 12px; text-align: center;">
                    <span style="font-size: 26px; font-weight: 800; color: #312e81; letter-spacing: 4px; font-family: 'Courier New', Courier, monospace;">
                      ${inviteCode}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${loginLink}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">
                  Masuk ke Sistem SATIVA &rarr;
                </a>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                  (Atau salin tautan: <a href="${loginLink}" style="color: #4f46e5; text-decoration: underline;">${loginLink}</a>)
                </p>
              </div>

              <!-- Steps List -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 14px 16px; margin: 24px 0;">
                <p style="font-size: 13px; font-weight: 700; color: #1e40af; margin: 0 0 6px 0;">
                  Petunjuk Aktivasi Pertama Kali:
                </p>
                <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                  <li>Klik tombol di atas untuk membuka halaman login.</li>
                  <li>Email dan kode undangan Anda akan terisi secara otomatis.</li>
                  <li>Lakukan registrasi biometrik wajah Anda (cukup 1 kali) saat check-in awal.</li>
                </ol>
              </div>

              <!-- Deliverability Tip -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
                <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin: 0;">
                  💡 <strong>Tips Email:</strong> Jika pesan ini masuk ke folder <em>Spam</em> atau tab <em>Promosi/Pembaruan</em>, silakan klik tombol <strong>"Bukan Spam" (Report not spam)</strong> agar seluruh notifikasi presensi & shift klinik selalu langsung masuk ke Kotak Masuk utama Anda.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center;">
              <p style="color: #64748b; font-size: 11px; margin: 0;">
                Email resmi dikirimkan oleh HR Administrator (${smtpSender}) untuk ${toEmail}.
              </p>
              <p style="color: #94a3b8; font-size: 10px; margin: 4px 0 0 0;">
                © 2026 ${orgName} • Didukung oleh SATIVA Clinic Management System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
        const emailText = `
============================================================
UNDANGAN KARYAWAN - ${orgName}
============================================================
Kepada Yth. ${employeeName || toEmail},

Anda telah didaftarkan oleh Tim HR ke sistem presensi klinik:
- Organisasi  : ${orgName}
- Divisi      : ${divName}
- Email Login : ${toEmail}

KODE UNDANGAN / KATA SANDI AWAL:
${inviteCode}

Tautan Login Langsung:
${loginLink}

Petunjuk Masuk:
1. Buka tautan di atas pada browser HP / Komputer Anda.
2. Masukkan Email (${toEmail}) dan Kode Undangan (${inviteCode}).
3. Daftarkan master wajah Anda saat check-in perdana.

Tips: Jika email ini masuk ke folder Spam/Promosi, silakan tandai "Bukan Spam" agar email operasional shift selanjutnya lancar.
============================================================
    `.trim();
        try {
            const { transporter, fromAddress, isTestAccount } = await this.getTransporter();
            const info = await transporter.sendMail({
                from: fromAddress,
                to: toEmail,
                replyTo: smtpSender,
                subject: emailSubject,
                text: emailText,
                html: emailHtml,
                headers: {
                    'X-Priority': '1 (Highest)',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'High',
                },
            });
            let previewUrl;
            if (isTestAccount) {
                const url = nodemailer.getTestMessageUrl(info);
                if (url) {
                    previewUrl = url.toString();
                    this.logger.log(`🔗 Pratinjau email online (Ethereal Sandbox): ${previewUrl}`);
                }
            }
            this.logger.log(`✅ Email berhasil dikirim ke ${toEmail}. Message ID: ${info.messageId}`);
            return {
                success: true,
                message: isTestAccount
                    ? `Undangan disiapkan untuk ${toEmail} (Ethereal Sandbox Mode).`
                    : `Undangan resmi berhasil dikirimkan ke email ${toEmail} via Gmail (${smtpSender})`,
                emailContent: emailText,
                previewUrl,
            };
        }
        catch (error) {
            this.logger.error(`❌ Gagal mengirim email via SMTP ke ${toEmail}: ${error.message}`);
            throw new Error(error.message || 'Gagal mengirim email');
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)()
], EmailService);
//# sourceMappingURL=email.service.js.map