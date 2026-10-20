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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    logger = new common_1.Logger(PrismaService_1.name);
    async onModuleInit() {
        await this.$connect();
        await this.ensureClinicData();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
    async ensureClinicData() {
        try {
            let org = await this.organization.findFirst();
            if (!org) {
                org = await this.organization.create({
                    data: {
                        name: 'Klinik Kecantikan BelajarVibe',
                        inviteCode: 'KLINIK-SATIVA-2026',
                    },
                });
                this.logger.log(`Created default organization: ${org.name}`);
            }
            const office = await this.officeLocation.findFirst({
                where: { organizationId: org.id },
            });
            if (!office) {
                await this.officeLocation.create({
                    data: {
                        organizationId: org.id,
                        label: 'Klinik Pusat',
                        latitude: -6.2088,
                        longitude: 106.8456,
                        radiusMeters: 100,
                    },
                });
            }
            const requiredDivisions = ['HR', 'Perawat', 'Beautician', 'Front Office'];
            for (const divName of requiredDivisions) {
                const existing = await this.division.findFirst({
                    where: { organizationId: org.id, name: divName },
                });
                if (!existing) {
                    await this.division.create({
                        data: {
                            organizationId: org.id,
                            name: divName,
                        },
                    });
                    this.logger.log(`Created division: ${divName}`);
                }
            }
            const superadminEmail = 'rindimia79@gmail.com';
            const existingSuperadmin = await this.user.findFirst({
                where: { email: superadminEmail },
            });
            const hrDivision = await this.division.findFirst({
                where: { organizationId: org.id, name: 'HR' },
            });
            const defaultPasswordHash = bcrypt.hashSync('passwordKUAT123', 10);
            if (!existingSuperadmin) {
                await this.user.create({
                    data: {
                        organizationId: org.id,
                        divisionId: hrDivision?.id || null,
                        role: 'hr',
                        fullName: 'Rindi Superadmin HR',
                        email: superadminEmail,
                        passwordHash: defaultPasswordHash,
                        isActive: true,
                    },
                });
                this.logger.log(`✅ Superadmin HR account created: ${superadminEmail}`);
            }
            else if (existingSuperadmin.role !== 'hr') {
                await this.user.update({
                    where: { id: existingSuperadmin.id },
                    data: { role: 'hr', isActive: true },
                });
                this.logger.log(`Updated user ${superadminEmail} to role 'hr'`);
            }
        }
        catch (err) {
            this.logger.error(`Error in ensureClinicData: ${err.message}`);
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map