import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureClinicData();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Automatically ensure Klinik Kecantikan organization, divisions, and superadmin exist.
   */
  private async ensureClinicData() {
    try {
      // 1. Ensure or find organization
      let org = await this.organization.findFirst();
      if (!org) {
        org = await this.organization.create({
          data: {
            name: 'Klinik Kecantikan BelajarVibe',
            inviteCode: 'KLINIK-SATIVA-2026',
          },
        });
        this.logger.log(`Created default organization: ${org.name}`);
      }

      // 2. Ensure office location exists
      const office = await this.officeLocation.findFirst({
        where: { organizationId: org.id },
      });
      if (!office) {
        await this.officeLocation.create({
          data: {
            organizationId: org.id,
            label: 'Orella Aesthetic Clinic',
            latitude: -7.5603728,
            longitude: 110.7666546,
            radiusMeters: 2,
          },
        });
      }

      // 3. Ensure Klinik Kecantikan Divisions exist: HR, Perawat, Beautician, Front Office
      const requiredDivisions = ['HR', 'Perawat', 'Beautician', 'Front Office'];
      for (const divName of requiredDivisions) {
        const existing = await this.division.findFirst({
          where: { organizationId: org.id, name: divName },
        });
        if (!existing) {
          await this.division.create({
            data: {
              organizationId: org.id,
              name: divName,
            },
          });
          this.logger.log(`Created division: ${divName}`);
        }
      }

      // 4. Ensure Superadmin HR account: rindimia79@gmail.com
      const superadminEmail = 'rindimia79@gmail.com';
      const existingSuperadmin = await this.user.findFirst({
        where: { email: superadminEmail },
      });

      const hrDivision = await this.division.findFirst({
        where: { organizationId: org.id, name: 'HR' },
      });

      const defaultPasswordHash = bcrypt.hashSync('passwordKUAT123', 10);

      if (!existingSuperadmin) {
        await this.user.create({
          data: {
            organizationId: org.id,
            divisionId: hrDivision?.id || null,
            role: 'hr',
            fullName: 'Rindi Superadmin HR',
            email: superadminEmail,
            passwordHash: defaultPasswordHash,
            isActive: true,
          },
        });
        this.logger.log(`✅ Superadmin HR account created: ${superadminEmail}`);
      } else if (existingSuperadmin.role !== 'hr') {
        await this.user.update({
          where: { id: existingSuperadmin.id },
          data: { role: 'hr', isActive: true },
        });
        this.logger.log(`Updated user ${superadminEmail} to role 'hr'`);
      }
    } catch (err: any) {
      this.logger.error(`Error in ensureClinicData: ${err.message}`);
    }
  }
}

