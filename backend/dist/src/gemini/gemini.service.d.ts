export declare class GeminiService {
    private readonly logger;
    private ai;
    constructor();
    analyzeJournal(text: string): Promise<{
        sentimentScore: number;
        themes: string[];
        riskFlag: boolean;
    }>;
    private runMockSentimentAnalysis;
}
