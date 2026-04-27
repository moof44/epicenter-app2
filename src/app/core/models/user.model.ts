export interface UserProfile {
    phone?: string;
    address?: string;
}

export interface User {
    uid: string;
    email: string;
    displayName: string;
    roles: string[];
    photoURL?: string;
    createdAt?: Date;
    lastLoginAt?: Date;
    phone?: string;
    address?: string;
    isActive?: boolean;
    monthlyTarget?: number;
}

export interface CreateUserDto {
    email: string;
    password: string;
    displayName: string;
    roles: string[];
    profileData?: UserProfile;
}
