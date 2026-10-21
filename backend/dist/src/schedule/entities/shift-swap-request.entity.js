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
exports.ShiftSwapRequest = exports.ShiftSwapStatus = void 0;
const typeorm_1 = require("typeorm");
var ShiftSwapStatus;
(function (ShiftSwapStatus) {
    ShiftSwapStatus["PENDING"] = "PENDING";
    ShiftSwapStatus["PEER_APPROVED"] = "PEER_APPROVED";
    ShiftSwapStatus["HR_APPROVED"] = "HR_APPROVED";
    ShiftSwapStatus["REJECTED"] = "REJECTED";
})(ShiftSwapStatus || (exports.ShiftSwapStatus = ShiftSwapStatus = {}));
let ShiftSwapRequest = class ShiftSwapRequest {
    id;
    requester_id;
    target_user_id;
    requester_date;
    target_date;
    reason;
    status;
    created_at;
    updated_at;
};
exports.ShiftSwapRequest = ShiftSwapRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ShiftSwapRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requester_id', type: 'varchar' }),
    __metadata("design:type", String)
], ShiftSwapRequest.prototype, "requester_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_user_id', type: 'varchar' }),
    __metadata("design:type", String)
], ShiftSwapRequest.prototype, "target_user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requester_date', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], ShiftSwapRequest.prototype, "requester_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_date', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], ShiftSwapRequest.prototype, "target_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ShiftSwapRequest.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 30,
        default: ShiftSwapStatus.PENDING,
    }),
    __metadata("design:type", String)
], ShiftSwapRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ShiftSwapRequest.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ShiftSwapRequest.prototype, "updated_at", void 0);
exports.ShiftSwapRequest = ShiftSwapRequest = __decorate([
    (0, typeorm_1.Entity)('shift_swap_requests')
], ShiftSwapRequest);
//# sourceMappingURL=shift-swap-request.entity.js.map