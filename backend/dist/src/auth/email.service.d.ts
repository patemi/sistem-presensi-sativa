export interface SendInviteEmailOptions {
    toEmail: string;
    employeeName: string;
    organizationName: string;
    divisionName: string;
    inviteCode: string;
}
export declare class EmailService {
    private readonly logger;
    private getTransporter;
    sendEmployeeInviteEmail(options: SendInviteEmailOptions): Promise<{
        success: boolean;
        message: string;
        emailContent: string;
        previewUrl?: string;
    }>;
}
