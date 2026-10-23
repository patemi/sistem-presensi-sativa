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
        faceDescriptor: string | null;
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
        faceDescriptor: string | null;
        divisionId: string | null;
    }>;
    changePassword(req: any, body: {
        currentPassword?: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    updateFaceDescriptor(req: any, body: {
        faceDescriptor: string;
        userId?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getFaceDescriptor(req: any, queryUserId?: string): Promise<{
        hasFaceDescriptor: boolean;
        faceDescriptor: string | null;
        user: {
            id: string;
            fullName: string;
            role: string;
        };
    }>;
    resetFaceDescriptor(req: any, targetUserId: string): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            fullName: string;
            role: string;
            hasFaceDescriptor: boolean;
        };
    }>;
    deleteFaceDescriptor(req: any, targetUserId: string): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            fullName: string;
            role: string;
            hasFaceDescriptor: boolean;
        };
    }>;
    resetMyFace(req: any): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            fullName: string;
            role: string;
            hasFaceDescriptor: boolean;
        };
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
        faceDescriptor: string | null;
        divisionId: string | null;
    }>;
    getEmployees(req: any, status?: string, divisionId?: string, search?: string, role?: string): Promise<{
        stats: {
            total: number;
            joined: number;
            sent: number;
            pending: number;
            withFace: number;
        };
        employees: {
            id: string;
            fullName: string;
            email: string;
            role: string;
            hasFaceDescriptor: boolean;
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
        userCount: number;
        users: {
            id: string;
            fullName: string;
            email: string;
            role: string;
            hasFace: boolean;
        }[];
        hasMinimumEmployees: boolean;
    }[]>;
    createDivision(req: any, body: {
        name: string;
    }): Promise<{
        id: string;
        name: string;
        organizationId: string;
    }>;
    updateDivision(req: any, id: string, body: {
        name: string;
    }): Promise<{
        success: boolean;
        message: string;
        division: {
            id: string;
            name: string;
            organizationId: string;
        };
    }>;
    deleteDivision(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateEmployeeDivision(req: any, id: string, body: {
        divisionId: string | null;
    }): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            fullName: string;
            divisionId: string | null;
            divisionName: string;
        };
    }>;
    deleteEmployee(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
