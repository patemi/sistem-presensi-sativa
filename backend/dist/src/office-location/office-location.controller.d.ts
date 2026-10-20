import { OfficeLocationService } from './office-location.service';
export declare class OfficeLocationController {
    private officeLocationService;
    constructor(officeLocationService: OfficeLocationService);
    getAll(user: any): Promise<{
        id: string;
        label: string;
        latitude: number;
        longitude: number;
        radiusMeters: number;
        organizationId: string;
    }[]>;
    create(user: any, body: {
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
    update(id: string, user: any, body: {
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
    delete(id: string, user: any): Promise<{
        id: string;
        label: string;
        latitude: number;
        longitude: number;
        radiusMeters: number;
        organizationId: string;
    }>;
}
