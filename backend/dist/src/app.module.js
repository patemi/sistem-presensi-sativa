"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mailer_1 = require("@nestjs-modules/mailer");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const checkin_module_1 = require("./checkin/checkin.module");
const gemini_module_1 = require("./gemini/gemini.module");
const cron_module_1 = require("./cron/cron.module");
const analytics_module_1 = require("./analytics/analytics.module");
const office_location_module_1 = require("./office-location/office-location.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            mailer_1.MailerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    transport: {
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                            user: configService.get('EMAIL_ADMIN') || configService.get('SMTP_USER'),
                            pass: (configService.get('EMAIL_PASSWORD') || configService.get('SMTP_PASS'))?.replace(/\s+/g, ''),
                        },
                    },
                    defaults: {
                        from: `"SATIVA Klinik Kecantikan" <${configService.get('EMAIL_ADMIN') || configService.get('SMTP_USER')}>`,
                    },
                }),
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            checkin_module_1.CheckinModule,
            gemini_module_1.GeminiModule,
            cron_module_1.CronModule,
            analytics_module_1.AnalyticsModule,
            office_location_module_1.OfficeLocationModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map