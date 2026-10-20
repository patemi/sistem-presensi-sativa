import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { decrypt } from '../common/utils/crypto.util';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private geminiService: GeminiService,
  ) {}

  /**
   * Nightly cron: runs at midnight.
   * 1. Mark incomplete check-ins (no checkout) as 'tidak_lengkap'
   * 2. Process unprocessed wellbeing feedback with AI
   * 3. Aggregate division wellbeing insights
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleNightlyJobs() {
    this.logger.log('🌙 Starting nightly SATIVA cron jobs...');

    await this.markIncompleteAttendance();
    await this.processWellbeingFeedbackAI();
    const result = await this.aggregateDivisionWellbeing();

    this.logger.log(`🌙 Nightly cron completed: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Mark attendance check-ins without checkout as 'tidak_lengkap'.
   * Runs for yesterday's entries (today's entries are still in progress).
   */
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

    this.logger.log(
      `Marked ${incompleteCheckins.length} incomplete attendance records as 'tidak_lengkap'.`,
    );

    return { markedIncomplete: incompleteCheckins.length };
  }

  /**
   * Process unprocessed wellbeing feedback with AI (Gemini).
   * Extracts themes from note_text for later aggregation.
   * Note: This runs on anonymous feedback — no user_id is ever linked.
   */
  async processWellbeingFeedbackAI() {
    const unprocessed = await this.prisma.wellbeingFeedback.findMany({
      where: { processed: false, noteText: { not: null } },
      take: 100, // Process in batches
    });

    let processedCount = 0;

    for (const feedback of unprocessed) {
      try {
        if (feedback.noteText) {
          // Decrypt the note for AI processing
          const plainText = decrypt(feedback.noteText);

          // Process with Gemini AI
          const aiResult = await this.geminiService.analyzeJournal(plainText);

          // Mark as processed (we don't store AI results per-feedback to maintain anonymity;
          // the themes will be aggregated at division level)
          this.logger.debug(
            `AI processed feedback ${feedback.id}: themes=${JSON.stringify(aiResult.themes)}, sentiment=${aiResult.sentimentScore}`,
          );
        }

        await this.prisma.wellbeingFeedback.update({
          where: { id: feedback.id },
          data: { processed: true },
        });
        processedCount++;
      } catch (err) {
        this.logger.error(`Failed to process feedback ${feedback.id}: ${err.message}`);
      }
    }

    this.logger.log(`Processed ${processedCount} wellbeing feedback entries with AI.`);
    return { processedCount };
  }

  /**
   * Aggregate division wellbeing insights from anonymous feedback.
   * Groups by division, calculates avg mood, extracts themes, determines trend.
   * Exposed publicly so HR can trigger it manually for demo.
   */
  async aggregateDivisionWellbeing() {
    const today = new Date();
    const periodStart = new Date(today);
    periodStart.setDate(today.getDate() - 7); // Last 7 days
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

      // 1. Fetch anonymous feedback for this division in the period
      const feedbacks = await this.prisma.wellbeingFeedback.findMany({
        where: {
          divisionId: division.id,
          submittedDate: { gte: periodStart, lte: periodEnd },
        },
      });

      const respondentCount = feedbacks.length;

      // 2. PRIVACY GUARD: minimum 5 respondents
      if (respondentCount < 5) {
        this.logger.log(
          `Skipped division "${division.name}" — insufficient respondents (${respondentCount}/5).`,
        );
        summary.skippedDivisions++;
        continue;
      }

      // 3. Calculate average mood score
      const avgMoodScore =
        feedbacks.reduce((sum, f) => sum + f.moodScore, 0) / respondentCount;

      // 4. Extract themes from note_text using AI (or mock)
      const themeCounts: Record<string, number> = {};
      for (const feedback of feedbacks) {
        if (feedback.noteText) {
          try {
            const plainText = decrypt(feedback.noteText);
            const aiResult = await this.geminiService.analyzeJournal(plainText);
            for (const theme of aiResult.themes) {
              themeCounts[theme] = (themeCounts[theme] || 0) + 1;
            }
          } catch {
            // Silently skip decryption/AI failures for individual feedback
          }
        }
      }

      const dominantThemes = Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([theme]) => theme)
        .slice(0, 3);

      // 5. Determine trend direction by comparing with latest insight
      const latestInsight = await this.prisma.divisionWellbeingInsight.findFirst({
        where: { divisionId: division.id },
        orderBy: { periodEnd: 'desc' },
      });

      let trendDirection = 'stabil';
      if (latestInsight) {
        const diff = avgMoodScore - Number(latestInsight.avgMoodScore);
        if (diff > 0.3) trendDirection = 'membaik';
        else if (diff < -0.3) trendDirection = 'menurun';
      }

      // 6. Determine risk level
      let riskLevel = 'aman';
      if (avgMoodScore <= 2.0) riskLevel = 'kritis';
      else if (avgMoodScore <= 3.0) riskLevel = 'perlu_perhatian';

      // 7. Save Division Wellbeing Insight
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

      this.logger.log(
        `Aggregated division "${division.name}" (Respondents: ${respondentCount}, Mood: ${avgMoodScore.toFixed(2)}, Risk: ${riskLevel})`,
      );
      summary.aggregatedDivisions++;
    }

    return summary;
  }
}
