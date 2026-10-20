import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
export declare class CronService {
    private prisma;
    private geminiService;
    private readonly logger;
    constructor(prisma: PrismaService, geminiService: GeminiService);
    handleNightlyJobs(): Promise<{
        processedDivisions: number;
        aggregatedDivisions: number;
        skippedDivisions: number;
    }>;
    markIncompleteAttendance(): Promise<{
        markedIncomplete: number;
    }>;
    processWellbeingFeedbackAI(): Promise<{
        processedCount: number;
    }>;
    aggregateDivisionWellbeing(): Promise<{
        processedDivisions: number;
        aggregatedDivisions: number;
        skippedDivisions: number;
    }>;
}
