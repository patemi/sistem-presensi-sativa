import { MailerService } from '@nestjs-modules/mailer';
export declare class AppService {
    private readonly mailerService;
    private readonly logger;
    constructor(mailerService: MailerService);
    getHello(): string;
    sendInviteEmail(targetEmail: string, inviteCode: string): Promise<any>;
}
