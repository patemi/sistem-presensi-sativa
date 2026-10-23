export declare enum ShiftType {
    PAGI = "PAGI",
    SIANG = "SIANG",
    LONG = "LONG",
    OFF = "OFF"
}
export declare const SHIFT_DETAILS: {
    PAGI: {
        code: string;
        start: string;
        end: string;
        label: string;
    };
    SIANG: {
        code: string;
        start: string;
        end: string;
        label: string;
    };
    LONG: {
        code: string;
        start: string;
        end: string;
        label: string;
    };
    OFF: {
        code: string;
        start: string;
        end: string;
        label: string;
    };
};
export declare class Schedule {
    id: string;
    user_id: string;
    date: string;
    shift_type: ShiftType;
    target_check_in: string;
    target_check_out: string;
    created_at: Date;
    updated_at: Date;
}
