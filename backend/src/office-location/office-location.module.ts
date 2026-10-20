import { Module } from '@nestjs/common';
import { OfficeLocationService } from './office-location.service';
import { OfficeLocationController } from './office-location.controller';

@Module({
  providers: [OfficeLocationService],
  controllers: [OfficeLocationController],
})
export class OfficeLocationModule {}
