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
var CronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const gemini_service_1 = require("../gemini/gemini.service");
const crypto_util_1 = require("../common/utils/crypto.util");
let CronService = CronService_1 = class CronService {
    prisma;
    geminiService;
    logger = new common_1.Logger(CronService_1.name);
    constructor(prisma, geminiService) {
        this.prisma = prisma;
        this.geminiService = geminiService;
    }
    async handleNightlyJobs() {
        this.logger.log('🌙 Starting nightly SATIVA cron jobs...');
        await this.markIncompleteAttendance();
        await this.processWellbeingFeedbackAI();
        const result = await this.aggregateDivisionWellbeing();
        this.logger.log(`🌙 Nightly cron completed: ${JSON.stringify(result)}`);
        return result;
    }
    async markIncompleteAttendance() {
        const yesterdayStart = new Date();
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date();
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);
        const incompleteCheckins = await this.prisma.attendanceCheckin.findMany({
            where: {
                checkInTime: { gte: yesterdayStart, lte: yesterdayEnd },
                attendanceStatus: 'belum_lengkap',
            },
        });
        for (const checkin of incompleteCheckins) {
            await this.prisma.attendanceCheckin.update({
                where: { id: checkin.id },
                data: { attendanceStatus: 'tidak_lengkap' },
            });
        }
        this.logger.log(`Marked ${incompleteCheckins.length} incomplete attendance records as 'tidak_lengkap'.`);
        return { markedIncomplete: incompleteCheckins.length };
    }
    async processWellbeingFeedbackAI() {
        const unprocessed = await this.prisma.wellbeingFeedback.findMany({
            where: { processed: false, noteText: { not: null } },
            take: 100,
        });
        let processedCount = 0;
        for (const feedback of unprocessed) {
            try {
                if (feedback.noteText) {
                    const plainText = (0, crypto_util_1.decrypt)(feedback.noteText);
                    const aiResult = await this.geminiService.analyzeJournal(plainText);
                    this.logger.debug(`AI processed feedback ${feedback.id}: themes=${JSON.stringify(aiResult.themes)}, sentiment=${aiResult.sentimentScore}`);
                }
                await this.prisma.wellbeingFeedback.update({
                    where: { id: feedback.id },
                    data: { processed: true },
                });
                processedCount++;
            }
            catch (err) {
                this.logger.error(`Failed to process feedback ${feedback.id}: ${err.message}`);
            }
        }
        this.logger.log(`Processed ${processedCount} wellbeing feedback entries with AI.`);
        return { processedCount };
    }
    async aggregateDivisionWellbeing() {
        const today = new Date();
        const periodStart = new Date(today);
        periodStart.setDate(today.getDate() - 7);
        periodStart.setHours(0, 0, 0, 0);
        const periodEnd = new Date(today);
        periodEnd.setHours(23, 59, 59, 999);
        const divisions = await this.prisma.division.findMany();
        const summary = {
            processedDivisions: 0,
            aggregatedDivisions: 0,
            skippedDivisions: 0,
        };
        for (const division of divisions) {
            summary.processedDivisions++;
            const feedbacks = await this.prisma.wellbeingFeedback.findMany({
                where: {
                    divisionId: division.id,
                    submittedDate: { gte: periodStart, lte: periodEnd },
                },
            });
            const respondentCount = feedbacks.length;
            if (respondentCount < 5) {
                this.logger.log(`Skipped division "${division.name}" — insufficient respondents (${respondentCount}/5).`);
                summary.skippedDivisions++;
                continue;
            }
            const avgMoodScore = feedbacks.reduce((sum, f) => sum + f.moodScore, 0) / respondentCount;
            const themeCounts = {};
            for (const feedback of feedbacks) {
                if (feedback.noteText) {
                    try {
                        const plainText = (0, crypto_util_1.decrypt)(feedback.noteText);
                        const aiResult = await this.geminiService.analyzeJournal(plainText);
                        for (const theme of aiResult.themes) {
                            themeCounts[theme] = (themeCounts[theme] || 0) + 1;
                        }
                    }
                    catch {
                    }
                }
            }
            const dominantThemes = Object.entries(themeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([theme]) => theme)
                .slice(0, 3);
            const latestInsight = await this.prisma.divisionWellbeingInsight.findFirst({
                where: { divisionId: division.id },
                orderBy: { periodEnd: 'desc' },
            });
            let trendDirection = 'stabil';
            if (latestInsight) {
                const diff = avgMoodScore - Number(latestInsight.avgMoodScore);
                if (diff > 0.3)
                    trendDirection = 'membaik';
                else if (diff < -0.3)
                    trendDirection = 'menurun';
            }
            let riskLevel = 'aman';
            if (avgMoodScore <= 2.0)
                riskLevel = 'kritis';
            else if (avgMoodScore <= 3.0)
                riskLevel = 'perlu_perhatian';
            await this.prisma.divisionWellbeingInsight.create({
                data: {
                    divisionId: division.id,
                    periodStart,
                    periodEnd,
                    avgMoodScore,
                    respondentCount,
                    dominantThemes: JSON.stringify(dominantThemes),
                    trendDirection,
                    riskLevel,
                },
            });
            this.logger.log(`Aggregated division "${division.name}" (Respondents: ${respondentCount}, Mood: ${avgMoodScore.toFixed(2)}, Risk: ${riskLevel})`);
            summary.aggregatedDivisions++;
        }
        return summary;
    }
};
exports.CronService = CronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronService.prototype, "handleNightlyJobs", null);
exports.CronService = CronService = CronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gemini_service_1.GeminiService])
], CronService);
//# sourceMappingURL=cron.service.js.map