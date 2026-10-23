import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/email.service';
export declare class CreateLeaveDto {
    employeeId?: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays?: number;
    reason: string;
    attachmentUrl?: string;
    adminNotes?: string;
    initialStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
export declare class ReviewLeaveDto {
    action: 'APPROVE' | 'REJECT';
    adminNotes?: string;
}
export declare class LeaveService {
    private readonly prisma;
    private readonly emailService;
    private readonly logger;
    constructor(prisma: PrismaService, emailService: EmailService);
    private calculateDays;
    getAllLeaveRequests(currentUser: any, query?: {
        status?: string;
        divisionId?: string;
        search?: string;
    }): Promise<{
        stats: {
            total: number;
            pending: number;
            approved: number;
            rejected: number;
        };
        leaves: {
            id: string;
            leaveType: string;
            startDate: Date;
            endDate: Date;
            totalDays: number;
            reason: string;
            attachmentUrl: string | null;
            status: string;
            adminNotes: string | null;
            reviewedById: string | null;
            reviewedBy: {
                id: string;
                fullName: string;
                email: string;
            } | null;
            reviewedAt: Date | null;
            createdAt: Date;
            user: {
                id: string;
                fullName: string;
                email: string;
                role: string;
                divisionId: string | null;
                divisionName: string;
            };
        }[];
    }>;
    createLeaveRequest(currentUser: any, dto: CreateLeaveDto): Promise<{
        user: {
            division: {
                id: string;
                name: string;
                organizationId: string;
            } | null;
        } & {
            id: string;
            inviteCode: string | null;
            createdAt: Date;
            organizationId: string;
            role: string;
            fullName: string;
            email: string;
            passwordHash: string;
            shiftStart: string;
            shiftEnd: string;
            isActive: boolean;
            inviteStatus: string;
            invitedAt: Date | null;
            lastLoginAt: Date | null;
            faceDescriptor: string | null;
            divisionId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        organizationId: string;
        userId: string;
        status: string;
        adminNotes: string | null;
        leaveType: string;
        reason: string;
        startDate: Date;
        endDate: Date;
        totalDays: number;
        attachmentUrl: string | null;
        reviewedById: string | null;
        reviewedAt: Date | null;
        updatedAt: Date;
    }>;
    reviewLeaveRequest(currentUser: any, leaveId: string, dto: ReviewLeaveDto): Promise<{
        success: boolean;
        message: string;
        leave: {
            user: {
                division: {
                    id: string;
                    name: string;
                    organizationId: string;
                } | null;
            } & {
                id: string;
                inviteCode: string | null;
                createdAt: Date;
                organizationId: string;
                role: string;
                fullName: string;
                email: string;
                passwordHash: string;
                shiftStart: string;
                shiftEnd: string;
                isActive: boolean;
                inviteStatus: string;
                invitedAt: Date | null;
                lastLoginAt: Date | null;
                faceDescriptor: string | null;
                divisionId: string | null;
            };
            reviewedBy: {
                id: string;
                fullName: string;
                email: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            organizationId: string;
            userId: string;
            status: string;
            adminNotes: string | null;
            leaveType: string;
            reason: string;
            startDate: Date;
            endDate: Date;
            totalDays: number;
            attachmentUrl: string | null;
            reviewedById: string | null;
            reviewedAt: Date | null;
            updatedAt: Date;
        };
    }>;
    getMyLeaveRequests(currentUser: any): Promise<({
        reviewedBy: {
            id: string;
            fullName: string;
            email: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        organizationId: string;
        userId: string;
        status: string;
        adminNotes: string | null;
        leaveType: string;
        reason: string;
        startDate: Date;
        endDate: Date;
        totalDays: number;
        attachmentUrl: string | null;
        reviewedById: string | null;
        reviewedAt: Date | null;
        updatedAt: Date;
    })[]>;
    seedInitialLeavesIfEmpty(organizationId: string, hrUserId: string): Promise<void>;
}
