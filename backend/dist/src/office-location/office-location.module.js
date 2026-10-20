"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficeLocationModule = void 0;
const common_1 = require("@nestjs/common");
const office_location_service_1 = require("./office-location.service");
const office_location_controller_1 = require("./office-location.controller");
let OfficeLocationModule = class OfficeLocationModule {
};
exports.OfficeLocationModule = OfficeLocationModule;
exports.OfficeLocationModule = OfficeLocationModule = __decorate([
    (0, common_1.Module)({
        providers: [office_location_service_1.OfficeLocationService],
        controllers: [office_location_controller_1.OfficeLocationController],
    })
], OfficeLocationModule);
//# sourceMappingURL=office-location.module.js.map