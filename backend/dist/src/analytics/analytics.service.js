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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const cron_service_1 = require("../cron/cron.service");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    prisma;
    cronService;
    logger = new common_1.Logger(AnalyticsService_1.name);
    constructor(prisma, cronService) {
        this.prisma = prisma;
        this.cronService = cronService;
    }
    async triggerCron() {
        return this.cronService.aggregateDivisionWellbeing();
    }
    async getDailyAttendanceSummary(organizationId, divisionId, period = 'today') {
        const now = new Date();
        let dateFilter = undefined;
        if (period === 'today') {
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            dateFilter = { gte: todayStart, lte: todayEnd };
        }
        else if (period === 'month') {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            dateFilter = { gte: monthStart, lte: monthEnd };
        }
        else if (period === 'year') {
            const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            dateFilter = { gte: yearStart, lte: yearEnd };
        }
        const whereUser = {
            organizationId,
            role: { in: ['karyawan', 'hr'] },
            isActive: true,
        };
        if (divisionId && divisionId !== 'all') {
            whereUser.divisionId = divisionId;
        }
        const employees = await this.prisma.user.findMany({
            where: whereUser,
            include: { division: true },
        });
        const totalEmployees = employees.length;
        const whereCheckin = { user: whereUser };
        if (dateFilter) {
            whereCheckin.checkInTime = dateFilter;
        }
        const checkins = await this.prisma.attendanceCheckin.findMany({
            where: whereCheckin,
            include: {
                checkout: true,
                officeLocation: true,
            },
            orderBy: { checkInTime: 'desc' },
        });
        const presentCount = checkins.length;
        const absentCount = totalEmployees - presentCount;
        const lateCount = checkins.filter((c) => c.lateMinutes > 0).length;
        const completedCount = checkins.filter((c) => c.attendanceStatus === 'hadir').length;
        const attendanceRate = totalEmployees > 0 ? (presentCount / totalEmployees) * 100 : 0;
        const lateRate = presentCount > 0 ? (lateCount / presentCount) * 100 : 0;
        const presentList = checkins.map((c) => {
            const emp = employees.find((e) => e.id === c.userId);
            return {
                userId: c.userId,
                fullName: emp?.fullName || 'Karyawan',
                divisionName: emp?.division?.name || 'Umum',
                checkInTime: c.checkInTime,
                checkOutTime: c.checkout?.checkOutTime || null,
                lateMinutes: c.lateMinutes,
                attendanceStatus: c.attendanceStatus,
                distanceMeters: c.distanceMeters,
                officeLabel: c.officeLocation?.label || '-',
            };
        });
        const absentList = employees
            .filter((e) => !checkins.some((c) => c.userId === e.id))
            .map((e) => ({
            userId: e.id,
            fullName: e.fullName,
            divisionName: e.division?.name || 'Umum',
        }));
        return {
            summary: {
                totalEmployees,
                presentCount,
                absentCount,
                lateCount,
                completedCount,
                attendanceRate: Number(attendanceRate.toFixed(1)),
                lateRate: Number(lateRate.toFixed(1)),
            },
            presentList,
            absentList,
        };
    }
    async getDivisionWellbeingTrends(organizationId, divisionId, period) {
        const whereDivision = { organizationId };
        if (divisionId && divisionId !== 'all') {
            whereDivision.id = divisionId;
        }
        const divisions = await this.prisma.division.findMany({
            where: whereDivision,
        });
        const results = [];
        for (const division of divisions) {
            const employeeCount = await this.prisma.user.count({
                where: {
                    divisionId: division.id,
                    role: 'karyawan',
                    isActive: true,
                },
            });
            if (employeeCount < 5) {
                results.push({
                    divisionId: division.id,
                    divisionName: division.name,
                    isRestricted: true,
                    message: '🔒 Data belum cukup untuk ditampilkan (Min. 5 karyawan)',
                    employeeCount,
                    trends: [],
                });
                continue;
            }
            const whereInsights = { divisionId: division.id };
            const now = new Date();
            if (period === 'today') {
                const todayStart = new Date(now);
                todayStart.setHours(0, 0, 0, 0);
                whereInsights.periodEnd = { gte: todayStart };
            }
            else if (period === 'month') {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                whereInsights.periodEnd = { gte: monthStart };
            }
            else if (period === 'year') {
                const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                whereInsights.periodEnd = { gte: yearStart };
            }
            const insights = await this.prisma.divisionWellbeingInsight.findMany({
                where: whereInsights,
                orderBy: { periodEnd: 'asc' },
                take: 20,
            });
            results.push({
                divisionId: division.id,
                divisionName: division.name,
                isRestricted: false,
                employeeCount,
                trends: insights.map((ins) => ({
                    id: ins.id,
                    periodStart: ins.periodStart,
                    periodEnd: ins.periodEnd,
                    avgMoodScore: Number(ins.avgMoodScore),
                    respondentCount: ins.respondentCount,
                    dominantThemes: JSON.parse(ins.dominantThemes),
                    trendDirection: ins.trendDirection,
                    riskLevel: ins.riskLevel,
                })),
            });
        }
        return results;
    }
    async getCorrelationMatrix(organizationId, divisionId, period) {
        const whereDivision = { organizationId };
        if (divisionId && divisionId !== 'all') {
            whereDivision.id = divisionId;
        }
        const divisions = await this.prisma.division.findMany({
            where: whereDivision,
        });
        const correlationData = [];
        for (const division of divisions) {
            const employeeCount = await this.prisma.user.count({
                where: {
                    divisionId: division.id,
                    role: 'karyawan',
                    isActive: true,
                },
            });
            const now = new Date();
            let periodStart = new Date();
            periodStart.setDate(periodStart.getDate() - 30);
            if (period === 'today') {
                periodStart = new Date(now);
                periodStart.setHours(0, 0, 0, 0);
            }
            else if (period === 'month') {
                periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            }
            else if (period === 'year') {
                periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            }
            const totalCheckins = await this.prisma.attendanceCheckin.count({
                where: {
                    user: { divisionId: division.id },
                    checkInTime: { gte: periodStart },
                },
            });
            const lateCheckins = await this.prisma.attendanceCheckin.count({
                where: {
                    user: { divisionId: division.id },
                    checkInTime: { gte: periodStart },
                    lateMinutes: { gt: 0 },
                },
            });
            const daysDiff = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
            const possibleWorkdays = Math.max(1, Math.floor(daysDiff * (5 / 7)));
            const possibleCheckins = employeeCount * possibleWorkdays;
            const attendanceRate = possibleCheckins > 0
                ? Math.min(100, (totalCheckins / possibleCheckins) * 100)
                : 0;
            const lateRate = totalCheckins > 0 ? (lateCheckins / totalCheckins) * 100 : 0;
            if (employeeCount < 5) {
                correlationData.push({
                    divisionId: division.id,
                    divisionName: division.name,
                    employeeCount,
                    monthlyAttendanceRate: Number(attendanceRate.toFixed(1)),
                    tardinessRate: Number(lateRate.toFixed(1)),
                    isRestricted: true,
                    avgMoodScore: null,
                    dominantThemes: [],
                    riskLevel: 'data_kurang',
                    recommendation: `Jumlah anggota Divisi ${division.name} di bawah batas minimum (5 orang) untuk menampilkan analitik kesehatan mental.`,
                });
                continue;
            }
            const latestInsight = await this.prisma.divisionWellbeingInsight.findFirst({
                where: { divisionId: division.id },
                orderBy: { periodEnd: 'desc' },
            });
            const avgMoodScore = latestInsight ? Number(latestInsight.avgMoodScore) : 0;
            const dominantThemes = latestInsight
                ? JSON.parse(latestInsight.dominantThemes)
                : [];
            const riskLevel = latestInsight?.riskLevel || 'aman';
            const trendDirection = latestInsight?.trendDirection || 'stabil';
            let recommendation = `Kondisi Divisi ${division.name} stabil. Pertahankan ritme kerja.`;
            if (riskLevel === 'kritis') {
                recommendation = `⚠️ Bahaya Kejenuhan (Divisi ${division.name}): Skor mood divisi menurun ke zona kritis. AI menyarankan evaluasi beban kerja dan dialog terbuka dengan anggota tim ${division.name}.`;
            }
            else if (riskLevel === 'perlu_perhatian') {
                recommendation = `⚡ Perlu Perhatian (Divisi ${division.name}): Skor mood divisi menunjukkan tanda penurunan. Pertimbangkan untuk mengevaluasi target kerja ${division.name}.`;
            }
            else if (avgMoodScore >= 4) {
                recommendation = `✅ Performa Tinggi (Divisi ${division.name}): Kepuasan dan kehadiran divisi sangat positif.`;
            }
            correlationData.push({
                divisionId: division.id,
                divisionName: division.name,
                employeeCount,
                monthlyAttendanceRate: Number(attendanceRate.toFixed(1)),
                tardinessRate: Number(lateRate.toFixed(1)),
                isRestricted: false,
                avgMoodScore,
                dominantThemes,
                riskLevel,
                trendDirection,
                recommendation,
            });
        }
        return correlationData;
    }
    async getOrganizationSummary(organizationId) {
        const totalEmployees = await this.prisma.user.count({
            where: { organizationId, role: 'karyawan', isActive: true },
        });
        const totalDivisions = await this.prisma.division.count({
            where: { organizationId },
        });
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const todayCheckins = await this.prisma.attendanceCheckin.count({
            where: {
                user: { organizationId },
                checkInTime: { gte: todayStart, lte: todayEnd },
            },
        });
        const attendanceRate = totalEmployees > 0
            ? Number(((todayCheckins / totalEmployees) * 100).toFixed(1))
            : 0;
        const criticalDivisions = await this.prisma.divisionWellbeingInsight.findMany({
            where: {
                division: { organizationId },
                riskLevel: { in: ['kritis', 'perlu_perhatian'] },
            },
            orderBy: { periodEnd: 'desc' },
            distinct: ['divisionId'],
        });
        const latestInsights = await this.prisma.divisionWellbeingInsight.findMany({
            where: {
                division: { organizationId },
            },
            orderBy: { periodEnd: 'desc' },
            distinct: ['divisionId'],
        });
        const avgOrgMood = latestInsights.length > 0
            ? Number((latestInsights.reduce((sum, i) => sum + Number(i.avgMoodScore), 0) / latestInsights.length).toFixed(2))
            : 0;
        return {
            totalEmployees,
            totalDivisions,
            todayAttendanceCount: todayCheckins,
            todayAttendanceRate: attendanceRate,
            divisionsNeedingAttention: criticalDivisions.length,
            avgOrganizationMood: avgOrgMood,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cron_service_1.CronService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map