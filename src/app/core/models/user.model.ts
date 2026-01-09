export interface UserProfile {
    phone?: string;
    address?: string;
    [key: string]: any;
}

export interface User {
    uid: string;
    email: string;
    displayName: string;
    roles: string[];
    photoURL?: string;
    createdAt?: any; // Firestore Timestamp
    lastLoginAt?: any;
    phone?: string;
    address?: string;
}

export interface CreateUserDto {
    email: string;
    password: string; // Required for creation
    displayName: string;
    roles: string[];
    profileData?: UserProfile;
}
