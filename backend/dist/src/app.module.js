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
const leave_module_1 = require("./leave/leave.module");
const path = __importStar(require("path"));
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("./auth/entities/user.entity");
const schedule_entity_1 = require("./schedule/entities/schedule.entity");
const shift_swap_request_entity_1 = require("./schedule/entities/shift-swap-request.entity");
const attendance_entity_1 = require("./attendance/entities/attendance.entity");
const schedule_module_1 = require("./schedule/schedule.module");
const attendance_module_1 = require("./attendance/attendance.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'better-sqlite3',
                database: path.resolve(process.cwd(), 'prisma/dev.db'),
                entities: [user_entity_1.User, schedule_entity_1.Schedule, shift_swap_request_entity_1.ShiftSwapRequest, attendance_entity_1.Attendance],
                synchronize: false,
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
            leave_module_1.LeaveModule,
            schedule_module_1.ScheduleModule,
            attendance_module_1.AttendanceModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map