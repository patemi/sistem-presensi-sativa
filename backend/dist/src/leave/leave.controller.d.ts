import { LeaveService, CreateLeaveDto, ReviewLeaveDto } from './leave.service';
export declare class LeaveController {
    private readonly leaveService;
    constructor(leaveService: LeaveService);
    getAllLeaves(user: any, status?: string, divisionId?: string, search?: string): Promise<{
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
    createLeave(user: any, dto: CreateLeaveDto): Promise<{
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
    reviewLeave(user: any, id: string, dto: ReviewLeaveDto): Promise<{
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
    getMyLeaves(user: any): Promise<({
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
}
