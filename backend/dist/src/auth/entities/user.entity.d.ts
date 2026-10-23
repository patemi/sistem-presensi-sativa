export declare enum UserRole {
    STAFF = "STAFF",
    HR = "HR",
    ADMIN = "ADMIN"
}
export declare class User {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role: string;
    face_descriptor: string | null;
    organization_id: string;
    created_at: Date;
}
