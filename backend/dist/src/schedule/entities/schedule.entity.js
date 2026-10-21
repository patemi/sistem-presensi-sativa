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
exports.Schedule = exports.SHIFT_DETAILS = exports.ShiftType = void 0;
const typeorm_1 = require("typeorm");
var ShiftType;
(function (ShiftType) {
    ShiftType["PAGI"] = "PAGI";
    ShiftType["SIANG"] = "SIANG";
})(ShiftType || (exports.ShiftType = ShiftType = {}));
exports.SHIFT_DETAILS = {
    [ShiftType.PAGI]: {
        start: '08:30',
        end: '17:00',
        label: 'Shift Pagi (08:30 - 17:00)',
    },
    [ShiftType.SIANG]: {
        start: '10:30',
        end: '19:00',
        label: 'Shift Siang (10:30 - 19:00)',
    },
};
let Schedule = class Schedule {
    id;
    user_id;
    date;
    shift_type;
    created_at;
    updated_at;
};
exports.Schedule = Schedule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Schedule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'varchar' }),
    __metadata("design:type", String)
], Schedule.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], Schedule.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'shift_type',
        type: 'varchar',
        length: 20,
        default: ShiftType.PAGI,
    }),
    __metadata("design:type", String)
], Schedule.prototype, "shift_type", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Schedule.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Schedule.prototype, "updated_at", void 0);
exports.Schedule = Schedule = __decorate([
    (0, typeorm_1.Entity)('schedules')
], Schedule);
//# sourceMappingURL=schedule.entity.js.map