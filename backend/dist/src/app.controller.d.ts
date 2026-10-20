import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    sendInvite(body: {
        email: string;
        kode?: string;
        inviteCode?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
}
