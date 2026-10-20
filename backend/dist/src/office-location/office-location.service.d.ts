import { PrismaService } from '../prisma/prisma.service';
export declare class OfficeLocationService {
    private prisma;
    constructor(prisma: PrismaService);
    getAll(organizationId: string): Promise<{
        id: string;
        label: string;
        latitude: number;
        longitude: number;
        radiusMeters: number;
        organizationId: string;
    }[]>;
    create(organizationId: string, data: {
        label: string;
        latitude: number;
        longitude: number;
        radiusMeters?: number;
    }): Promise<{
        id: string;
        label: string;
        latitude: number;
        longitude: number;
        radiusMeters: number;
        organizationId: string;
    }>;
    update(id: string, organizationId: string, data: {
        label?: string;
        latitude?: number;
        longitude?: number;
        radiusMeters?: number;
    }): Promise<{
        id: string;
        label: string;
        latitude: number;
        longitude: number;
        radiusMeters: number;
        organizationId: string;
    }>;
    delete(id: string, organizationId: string): Promise<{
        id: string;
        label: string;
        latitude: number;
        longitude: number;
        radiusMeters: number;
        organizationId: string;
    }>;
}
