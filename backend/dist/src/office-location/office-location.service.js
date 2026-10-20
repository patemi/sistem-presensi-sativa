"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficeLocationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OfficeLocationService = class OfficeLocationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAll(organizationId) {
        return this.prisma.officeLocation.findMany({
            where: { organizationId },
            orderBy: { label: 'asc' },
        });
    }
    async create(organizationId, data) {
        const radius = Math.min(data.radiusMeters || 100, 100);
        return this.prisma.officeLocation.create({
            data: {
                organizationId,
                label: data.label,
                latitude: data.latitude,
                longitude: data.longitude,
                radiusMeters: radius,
            },
        });
    }
    async update(id, organizationId, data) {
        const location = await this.prisma.officeLocation.findFirst({
            where: { id, organizationId },
        });
        if (!location) {
            throw new common_1.BadRequestException('Lokasi kantor tidak ditemukan');
        }
        return this.prisma.officeLocation.update({
            where: { id },
            data: {
                label: data.label ?? location.label,
                latitude: data.latitude ?? location.latitude,
                longitude: data.longitude ?? location.longitude,
                radiusMeters: data.radiusMeters ? Math.min(data.radiusMeters, 100) : location.radiusMeters,
            },
        });
    }
    async delete(id, organizationId) {
        const location = await this.prisma.officeLocation.findFirst({
            where: { id, organizationId },
        });
        if (!location) {
            throw new common_1.BadRequestException('Lokasi kantor tidak ditemukan');
        }
        return this.prisma.officeLocation.delete({ where: { id } });
    }
};
exports.OfficeLocationService = OfficeLocationService;
exports.OfficeLocationService = OfficeLocationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OfficeLocationService);
//# sourceMappingURL=office-location.service.js.map