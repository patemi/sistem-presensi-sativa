import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            fullName: any;
            role: any;
            divisionId: any;
            organizationId: any;
        };
    }>;
    register(body: {
        fullName: string;
        email: string;
        password: string;
        inviteCode: string;
        divisionId?: string;
    }): Promise<{
        id: string;
        inviteCode: string | null;
        createdAt: Date;
        organizationId: string;
        role: string;
        fullName: string;
        email: string;
        shiftStart: string;
        shiftEnd: string;
        isActive: boolean;
        inviteStatus: string;
        invitedAt: Date | null;
        lastLoginAt: Date | null;
        divisionId: string | null;
    }>;
    validateInvite(code: string): Promise<{
        organizationId: string;
        organizationName: string;
        divisions: {
            id: string;
            name: string;
        }[];
    }>;
    getOrganizations(): Promise<({
        divisions: {
            id: string;
            name: string;
            organizationId: string;
        }[];
    } & {
        id: string;
        name: string;
        inviteCode: string;
        createdAt: Date;
    })[]>;
    getProfile(req: any): any;
    updateProfile(req: any, body: {
        fullName?: string;
        email?: string;
        password?: string;
    }): Promise<{
        id: string;
        inviteCode: string | null;
        createdAt: Date;
        organizationId: string;
        role: string;
        fullName: string;
        email: string;
        shiftStart: string;
        shiftEnd: string;
        isActive: boolean;
        inviteStatus: string;
        invitedAt: Date | null;
        lastLoginAt: Date | null;
        divisionId: string | null;
    }>;
    addAdmin(req: any, body: {
        fullName: string;
        email: string;
        password: string;
    }): Promise<{
        id: string;
        inviteCode: string | null;
        createdAt: Date;
        organizationId: string;
        role: string;
        fullName: string;
        email: string;
        shiftStart: string;
        shiftEnd: string;
        isActive: boolean;
        inviteStatus: string;
        invitedAt: Date | null;
        lastLoginAt: Date | null;
        divisionId: string | null;
    }>;
    getEmployees(req: any, status?: string, divisionId?: string, search?: string): Promise<{
        stats: {
            total: number;
            joined: number;
            sent: number;
            pending: number;
        };
        employees: {
            id: string;
            fullName: string;
            email: string;
            divisionId: string | null;
            divisionName: string;
            division: {
                id: string;
                name: string;
            } | null;
            inviteCode: string | null;
            inviteStatus: string;
            invitedAt: Date | null;
            lastLoginAt: Date | null;
            createdAt: Date;
            isActive: boolean;
            lastCheckIn: Date;
        }[];
    }>;
    inviteEmployee(req: any, body: {
        fullName: string;
        email: string;
        divisionId: string;
        sendEmailNow?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            role: string;
            division: {
                id: string;
                name: string;
                organizationId: string;
            } | null;
            inviteCode: string;
            divisionName?: undefined;
            inviteStatus?: undefined;
            invitedAt?: undefined;
        };
        inviteCode: string;
        emailContent: any;
        previewUrl: any;
        organizationName?: undefined;
        divisionName?: undefined;
    } | {
        success: boolean;
        user: {
            id: string;
            fullName: string;
            email: string;
            role: string;
            divisionName: string;
            inviteCode: string;
            inviteStatus: string;
            invitedAt: Date | null;
            division?: undefined;
        };
        message: any;
        inviteCode: string;
        organizationName: string;
        divisionName: string;
        emailContent: any;
        previewUrl: any;
    }>;
    resendInvite(req: any, employeeId: string): Promise<{
        success: boolean;
        message: string;
        newInviteCode: string;
        employee: {
            id: string;
            fullName: string;
            email: string;
            inviteCode: string;
            inviteStatus: string;
            invitedAt: Date | null;
        };
        previewUrl: any;
    }>;
    getDivisions(req: any): Promise<{
        id: string;
        name: string;
        organizationId: string;
    }[]>;
    createDivision(req: any, body: {
        name: string;
    }): Promise<{
        id: string;
        name: string;
        organizationId: string;
    }>;
}
