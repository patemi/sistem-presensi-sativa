import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private ai: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      try {
        // Correct legacy SDK instantiation:
        this.ai = new GoogleGenerativeAI(apiKey);
        this.logger.log('Gemini API initialized successfully.');
      } catch (err) {
        this.logger.error('Failed to initialize Gemini API:', err.message);
      }
    } else {
      this.logger.warn('GEMINI_API_KEY is not configured. AI features will run in Mock Mode.');
    }
  }

  async analyzeJournal(text: string): Promise<{
    sentimentScore: number;
    themes: string[];
    riskFlag: boolean;
  }> {
    if (!text || text.trim().length === 0) {
      return {
        sentimentScore: 0.0,
        themes: [],
        riskFlag: false,
      };
    }

    if (this.ai) {
      try {
        const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `
          Analisis teks jurnal harian karyawan berikut.
          Ekstrak sentimen, tema utama, dan bendera risiko burnout (kelelahan kerja ekstrim/kecemasan berat).
          
          Jurnal: "${text}"
          
          Keluaran HARUS berupa objek JSON dengan struktur persis seperti di bawah ini, tanpa teks pengantar atau penutup lainnya:
          {
            "sentimentScore": <Float antara -1.0 (sangat negatif) sampai 1.0 (sangat positif)>,
            "themes": [<Array string berisi maksimal 3 kata kunci tema masalah, misalnya: "overwork", "stress", "teamwork", "workload", "fatigue">],
            "riskFlag": <Boolean: true jika ada indikasi burnout/stres berat/despair, false jika stabil>
          }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean JSON formatting if Gemini wraps it in ```json ... ```
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        return {
          sentimentScore: Number(parsed.sentimentScore ?? 0.0),
          themes: Array.isArray(parsed.themes) ? parsed.themes : [],
          riskFlag: Boolean(parsed.riskFlag ?? false),
        };
      } catch (error) {
        this.logger.error('Error calling Gemini API, falling back to mock:', error.message);
      }
    }

    // --- MOCK FALLBACK MODE ---
    return this.runMockSentimentAnalysis(text);
  }

  private runMockSentimentAnalysis(text: string): {
    sentimentScore: number;
    themes: string[];
    riskFlag: boolean;
  } {
    const textLower = text.toLowerCase();
    let sentimentScore = 0.1; // default neutral-positive
    const themes: string[] = [];
    let riskFlag = false;

    // Detect negative keywords
    if (textLower.includes('lelah') || textLower.includes('capek') || textLower.includes('fatigue')) {
      sentimentScore -= 0.4;
      themes.push('fatigue');
    }
    if (textLower.includes('lembur') || textLower.includes('overtime') || textLower.includes('malam')) {
      sentimentScore -= 0.3;
      themes.push('overwork');
    }
    if (textLower.includes('stres') || textLower.includes('tekanan') || textLower.includes('stress')) {
      sentimentScore -= 0.5;
      themes.push('stress');
    }
    if (textLower.includes('target') || textLower.includes('kejar') || textLower.includes('tenggat')) {
      themes.push('workload');
    }
    if (textLower.includes('burnout') || textLower.includes('resign') || textLower.includes('menyerah')) {
      sentimentScore -= 0.7;
      themes.push('burnout');
      riskFlag = true;
    }

    // Detect positive keywords
    if (textLower.includes('senang') || textLower.includes('bahagia') || textLower.includes('happy')) {
      sentimentScore += 0.5;
      themes.push('good mood');
    }
    if (textLower.includes('tim') || textLower.includes('solid') || textLower.includes('kompak') || textLower.includes('teman')) {
      sentimentScore += 0.3;
      themes.push('teamwork');
    }
    if (textLower.includes('lancar') || textLower.includes('sukses') || textLower.includes('aman')) {
      sentimentScore += 0.4;
      themes.push('satisfaction');
    }

    // Normalize score between -1.0 and 1.0
    sentimentScore = Math.max(-1.0, Math.min(1.0, sentimentScore));

    // If score is very negative, set riskFlag
    if (sentimentScore <= -0.5) {
      riskFlag = true;
    }

    // Deduplicate themes and limit to max 3
    const uniqueThemes = Array.from(new Set(themes)).slice(0, 3);
    if (uniqueThemes.length === 0) {
      uniqueThemes.push('general');
    }

    return {
      sentimentScore,
      themes: uniqueThemes,
      riskFlag,
    };
  }
}
