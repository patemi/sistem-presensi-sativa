import { ShiftType } from '../entities/schedule.entity';

export class ScheduleItemDto {
  user_id: string;
  date: string; // 'YYYY-MM-DD'
  shift_type: ShiftType;
}

export class BulkCreateScheduleDto {
  schedules?: ScheduleItemDto[];
}
