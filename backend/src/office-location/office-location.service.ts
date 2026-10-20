import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OfficeLocationService {
  constructor(private prisma: PrismaService) {}

  async getAll(organizationId: string) {
    return this.prisma.officeLocation.findMany({
      where: { organizationId },
      orderBy: { label: 'asc' },
    });
  }

  async create(organizationId: string, data: {
    label: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
  }) {
    // Enforce hard limit: radius cannot exceed 100 meters
    const radius = Math.min(data.radiusMeters || 100, 100);

    return this.prisma.officeLocation.create({
      data: {
        organizationId,
        label: data.label,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: radius,
      },
    });
  }

  async update(id: string, organizationId: string, data: {
    label?: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
  }) {
    const location = await this.prisma.officeLocation.findFirst({
      where: { id, organizationId },
    });

    if (!location) {
      throw new BadRequestException('Lokasi kantor tidak ditemukan');
    }

    return this.prisma.officeLocation.update({
      where: { id },
      data: {
        label: data.label ?? location.label,
        latitude: data.latitude ?? location.latitude,
        longitude: data.longitude ?? location.longitude,
        radiusMeters: data.radiusMeters ? Math.min(data.radiusMeters, 100) : location.radiusMeters,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const location = await this.prisma.officeLocation.findFirst({
      where: { id, organizationId },
    });

    if (!location) {
      throw new BadRequestException('Lokasi kantor tidak ditemukan');
    }

    return this.prisma.officeLocation.delete({ where: { id } });
  }
}
