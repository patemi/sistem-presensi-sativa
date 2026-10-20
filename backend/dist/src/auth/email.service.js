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
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: smtpUser,
                    pass: smtpPass.replace(/\s+/g, ''),
                },
            });
            const fromAddress = process.env.SMTP_FROM || `SATIVA Klinik Kecantikan <${smtpUser}>`;
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
            const fromAddress = process.env.SMTP_FROM || `SATIVA Klinik Kecantikan <${smtpUser}>`;
            return { transporter, fromAddress, isTestAccount: false };
        }
        this.logger.warn(`⚠️ SMTP_PASS belum diisi untuk ${smtpUser}. Menggunakan Ethereal test inbox online agar proses penambahan karyawan tetap berhasil.`);
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
        const fromAddress = `SATIVA Klinik Kecantikan <${testAccount.user}>`;
        return { transporter, fromAddress, isTestAccount: true };
    }
    async sendEmployeeInviteEmail(options) {
        const { toEmail, employeeName, organizationName, divisionName, inviteCode } = options;
        const orgName = organizationName && !organizationName.includes('Corp')
            ? organizationName
            : 'SATIVA Klinik Kecantikan';
        const divName = divisionName && divisionName !== 'Tanpa Divisi' ? divisionName : 'Staf Klinik';
        const emailSubject = `Undangan Bergabung ke ${orgName} — Kode Login & Presensi SATIVA`;
        const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #102636; color: #ffffff; border-radius: 16px;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <h1 style="color: #a0d4e4; font-size: 24px; margin: 0;">SATIVA</h1>
          <p style="color: #a0d4e4; font-size: 13px; margin-top: 4px;">Sistem Absensi & Kesehatan Tim — ${orgName}</p>
        </div>

        <div style="padding: 24px 0;">
          <h2 style="font-size: 18px; color: #ffffff;">Halo ${employeeName || toEmail},</h2>
          <p style="color: #a0d4e4; font-size: 14px; line-height: 1.6;">
            Anda telah ditambahkan oleh Tim HR ke dalam sistem <strong>${orgName}</strong> pada divisi <strong>${divName}</strong>.
          </p>

          <div style="background: rgba(160,212,228,0.1); border: 1px solid rgba(160,212,228,0.3); padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0;">
            <p style="color: #a0d4e4; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0; font-weight: bold;">KODE UNDANGAN & KATA SANDI AWAL</p>
            <span style="font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: 4px; font-family: monospace;">${inviteCode}</span>
          </div>

          <h3 style="font-size: 14px; color: #ffffff; margin-top: 20px;">Cara Masuk / Login ke Sistem:</h3>
          <ol style="color: #a0d4e4; font-size: 13px; line-height: 1.8; padding-left: 20px;">
            <li>Buka halaman aplikasi SATIVA di browser Anda.</li>
            <li>Pada halaman Login, masukkan Email: <code>${toEmail}</code>.</li>
            <li>Masukkan Kata Sandi / Kode Undangan: <code>${inviteCode}</code>.</li>
            <li>Anda akan langsung diarahkan ke halaman Absensi Presensi & Kesehatan Tim.</li>
          </ol>
        </div>

        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; text-align: center;">
          <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">
            Email ini dikirim secara resmi oleh Superadmin HR (${process.env.SMTP_USER || 'rindimia79@gmail.com'}) kepada ${toEmail}.
          </p>
        </div>
      </div>
    `.trim();
        const emailText = `
============================================================
UNDANGAN KARYAWAN - KLINIK KECANTIKAN SATIVA
============================================================
Kepada Yth. ${employeeName || toEmail},

Anda telah ditambahkan oleh Tim HR ke sistem presensi klinik:
- Organisasi  : ${orgName}
- Divisi      : ${divName}
- Email Login : ${toEmail}

KODE UNDANGAN / SANDI AWAL: ${inviteCode}

Cara Masuk:
1. Buka halaman aplikasi SATIVA di browser Anda.
2. Masukkan Email (${toEmail}) dan Kata Sandi/Kode Undangan (${inviteCode}).
3. Selesai! Anda siap mencatat presensi masuk dan kesehatan harian Anda.
============================================================
    `.trim();
        try {
            const { transporter, fromAddress, isTestAccount } = await this.getTransporter();
            const info = await transporter.sendMail({
                from: fromAddress,
                to: toEmail,
                subject: emailSubject,
                text: emailText,
                html: emailHtml,
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
                    ? `Undangan disiapkan untuk ${toEmail}. (Untuk kirim langsung via inbox Gmail rindimia79@gmail.com, isi SMTP_PASS di backend/.env)`
                    : `Undangan resmi berhasil dikirim langsung dari Gmail rindimia79@gmail.com ke ${toEmail}`,
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