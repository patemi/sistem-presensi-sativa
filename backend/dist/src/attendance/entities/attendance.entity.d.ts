export declare class Attendance {
    id: string;
    user_id: string;
    date: string;
    check_in_time: Date | null;
    check_out_time: Date | null;
    overtime_minutes: number;
    mental_health_log: string | null;
    created_at: Date;
    updated_at: Date;
}
