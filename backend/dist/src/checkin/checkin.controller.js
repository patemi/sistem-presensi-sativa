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
exports.CheckinController = void 0;
const common_1 = require("@nestjs/common");
const checkin_service_1 = require("./checkin.service");
const jwt_guard_1 = require("../common/guards/jwt.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_decorator_1 = require("../common/decorators/user.decorator");
let CheckinController = class CheckinController {
    checkinService;
    constructor(checkinService) {
        this.checkinService = checkinService;
    }
    async createCheckin(user, body) {
        return this.checkinService.checkIn(user.id, body.latitude, body.longitude);
    }
    async createCheckout(user, body) {
        return this.checkinService.checkOut(user.id, user.divisionId, user.organizationId, body.latitude, body.longitude, body.moodScore, body.noteText);
    }
    async getTodayStatus(user) {
        return this.checkinService.getTodayStatus(user.id);
    }
    async getMyHistory(user) {
        return this.checkinService.getMyAttendanceHistory(user.id);
    }
};
exports.CheckinController = CheckinController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CheckinController.prototype, "createCheckin", null);
__decorate([
    (0, common_1.Post)('checkout'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CheckinController.prototype, "createCheckout", null);
__decorate([
    (0, common_1.Get)('today-status'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckinController.prototype, "getTodayStatus", null);
__decorate([
    (0, common_1.Get)('my-history'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckinController.prototype, "getMyHistory", null);
exports.CheckinController = CheckinController = __decorate([
    (0, common_1.Controller)('checkin'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('karyawan', 'hr'),
    __metadata("design:paramtypes", [checkin_service_1.CheckinService])
], CheckinController);
//# sourceMappingURL=checkin.controller.js.map