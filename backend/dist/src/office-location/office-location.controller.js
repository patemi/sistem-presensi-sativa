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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficeLocationController = void 0;
const common_1 = require("@nestjs/common");
const office_location_service_1 = require("./office-location.service");
const jwt_guard_1 = require("../common/guards/jwt.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_decorator_1 = require("../common/decorators/user.decorator");
let OfficeLocationController = class OfficeLocationController {
    officeLocationService;
    constructor(officeLocationService) {
        this.officeLocationService = officeLocationService;
    }
    async getAll(user) {
        return this.officeLocationService.getAll(user.organizationId);
    }
    async create(user, body) {
        return this.officeLocationService.create(user.organizationId, body);
    }
    async update(id, user, body) {
        return this.officeLocationService.update(id, user.organizationId, body);
    }
    async delete(id, user) {
        return this.officeLocationService.delete(id, user.organizationId);
    }
};
exports.OfficeLocationController = OfficeLocationController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('karyawan', 'hr', 'owner'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OfficeLocationController.prototype, "getAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('hr'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OfficeLocationController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('hr'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OfficeLocationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('hr'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OfficeLocationController.prototype, "delete", null);
exports.OfficeLocationController = OfficeLocationController = __decorate([
    (0, common_1.Controller)('office-locations'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [office_location_service_1.OfficeLocationService])
], OfficeLocationController);
//# sourceMappingURL=office-location.controller.js.map