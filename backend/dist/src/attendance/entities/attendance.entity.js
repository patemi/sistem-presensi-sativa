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
exports.Attendance = void 0;
const typeorm_1 = require("typeorm");
let Attendance = class Attendance {
    id;
    user_id;
    date;
    check_in_time;
    check_out_time;
    overtime_minutes;
    mental_health_log;
    created_at;
    updated_at;
};
exports.Attendance = Attendance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Attendance.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'varchar' }),
    __metadata("design:type", String)
], Attendance.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], Attendance.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_time', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Attendance.prototype, "check_in_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_time', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Attendance.prototype, "check_out_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'overtime_minutes', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Attendance.prototype, "overtime_minutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mental_health_log', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Attendance.prototype, "mental_health_log", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Attendance.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Attendance.prototype, "updated_at", void 0);
exports.Attendance = Attendance = __decorate([
    (0, typeorm_1.Entity)('attendances')
], Attendance);
//# sourceMappingURL=attendance.entity.js.map