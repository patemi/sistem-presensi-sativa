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
exports.ScheduleController = void 0;
const common_1 = require("@nestjs/common");
const schedule_service_1 = require("./schedule.service");
const jwt_guard_1 = require("../common/guards/jwt.guard");
const user_decorator_1 = require("../common/decorators/user.decorator");
const create_swap_request_dto_1 = require("./dto/create-swap-request.dto");
let ScheduleController = class ScheduleController {
    scheduleService;
    constructor(scheduleService) {
        this.scheduleService = scheduleService;
    }
    async createSchedule(dto) {
        return this.scheduleService.createSchedule(dto);
    }
    async bulkCreate(payload) {
        return this.scheduleService.bulkCreate(payload);
    }
    async getSchedules(month, date, userId) {
        return this.scheduleService.findAll({ month, date, user_id: userId });
    }
    async getMySchedules(user, month) {
        return this.scheduleService.findAll({ month, user_id: user.id });
    }
    async createSwapRequest(user, dto) {
        return this.scheduleService.createSwapRequest(user.id, dto);
    }
    async getSwapRequests(user, all) {
        const isHrOrOwner = user.role === 'hr' || user.role === 'owner';
        const filterUserId = (isHrOrOwner && all === 'true') ? undefined : (isHrOrOwner ? undefined : user.id);
        return this.scheduleService.findAllSwapRequests(filterUserId);
    }
    async approveSwapByHr(id) {
        return this.scheduleService.approveSwapByHr(id);
    }
    async rejectSwap(id, reason) {
        return this.scheduleService.rejectSwap(id, reason);
    }
};
exports.ScheduleController = ScheduleController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "createSchedule", null);
__decorate([
    (0, common_1.Post)('bulk-create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('month')),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Query)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "getSchedules", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "getMySchedules", null);
__decorate([
    (0, common_1.Post)('swap-request'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_swap_request_dto_1.CreateSwapRequestDto]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "createSwapRequest", null);
__decorate([
    (0, common_1.Get)('swap-requests'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('all')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "getSwapRequests", null);
__decorate([
    (0, common_1.Patch)('swap-request/:id/approve-hr'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "approveSwapByHr", null);
__decorate([
    (0, common_1.Patch)('swap-request/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ScheduleController.prototype, "rejectSwap", null);
exports.ScheduleController = ScheduleController = __decorate([
    (0, common_1.Controller)('schedule'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [schedule_service_1.ScheduleService])
], ScheduleController);
//# sourceMappingURL=schedule.controller.js.map