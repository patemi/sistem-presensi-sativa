export declare enum ShiftSwapStatus {
    PENDING = "PENDING",
    PEER_APPROVED = "PEER_APPROVED",
    HR_APPROVED = "HR_APPROVED",
    REJECTED = "REJECTED"
}
export declare class ShiftSwapRequest {
    id: string;
    requester_id: string;
    target_user_id: string;
    requester_date: string;
    target_date: string;
    reason: string;
    status: ShiftSwapStatus;
    created_at: Date;
    updated_at: Date;
}
