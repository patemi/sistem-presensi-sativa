export declare enum ShiftType {
    PAGI = "PAGI",
    SIANG = "SIANG"
}
export declare const SHIFT_DETAILS: {
    PAGI: {
        start: string;
        end: string;
        label: string;
    };
    SIANG: {
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
    created_at: Date;
    updated_at: Date;
}
