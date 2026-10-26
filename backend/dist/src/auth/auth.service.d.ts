import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private emailService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, emailService: EmailService);
    validateUser(email: string, pass: string): Promise<any>;
    login(user: any): Promise<{
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
    register(data: {
        fullName: string;
        email: string;
        password: string;
        inviteCode: string;
        divisionId?: string;
        role?: 'karyawan' | 'hr' | 'owner';
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
    validateInviteCode(code: string): Promise<{
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
    updateProfile(userId: string, data: {
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
    addAdmin(currentUserId: string, data: {
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
    private generateUniqueInviteCode;
    inviteEmployee(currentUserId: string, data: {
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
    getEmployees(currentUserId: string, query?: {
        status?: string;
        divisionId?: string;
        search?: string;
        role?: string;
    }): Promise<{
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
    resendEmployeeInvite(currentUserId: string, employeeId: string): Promise<{
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
        emailContent: any;
        previewUrl: any;
    }>;
    createDivision(currentUserId: string, name: string): Promise<{
        id: string;
        name: string;
        organizationId: string;
    }>;
    getDivisions(currentUserId: string): Promise<{
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
    updateDivision(currentUserId: string, divisionId: string, name: string): Promise<{
        success: boolean;
        message: string;
        division: {
            id: string;
            name: string;
            organizationId: string;
        };
    }>;
    deleteDivision(currentUserId: string, divisionId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateUserDivision(currentUserId: string, targetUserId: string, divisionId: string | null): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            fullName: string;
            divisionId: string | null;
            divisionName: string;
        };
    }>;
    deleteEmployee(currentUserId: string, employeeId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    changePassword(userId: string, dto: {
        currentPassword?: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    updateFaceDescriptor(userId: string, faceDescriptor: string, requester?: {
        id: string;
        role: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getFaceDescriptor(userId: string): Promise<{
        hasFaceDescriptor: boolean;
        faceDescriptor: string | null;
        user: {
            id: string;
            fullName: string;
            role: string;
        };
    }>;
    resetFaceDescriptor(targetUserId: string, requester: {
        id: string;
        role: string;
    }): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            fullName: string;
            role: string;
            hasFaceDescriptor: boolean;
        };
    }>;
}
