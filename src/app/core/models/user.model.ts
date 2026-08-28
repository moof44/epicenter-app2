export type DocumentCategory = 'GOVERNMENT_ID' | 'CONTRACT' | 'CERTIFICATION' | 'RESUME' | 'OTHER';

export interface EmployeeDocument {
    id: string;
    name: string;             // e.g. "Gov_ID_Passport.jpg"
    fileType: 'IMAGE' | 'PDF';
    mimeType: string;
    category: DocumentCategory;
    downloadUrl: string;      // Base64 data URL or Storage URL
    storagePath?: string;
    sizeBytes?: number;
    uploadedAt: Date | any;
    uploadedBy: string;
}

export interface UserEmergencyContact {
    name?: string;
    relationship?: string;
    phone?: string;
}

export interface UserGovernmentIds {
    sssNumber?: string;
    philHealthNumber?: string;
    pagIbigNumber?: string;
    tinNumber?: string;
}

export interface UserEmploymentDetails {
    jobTitle?: string;
    employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'COMMISSION_ONLY' | 'SERVICE_PROVIDER';
    hireDate?: Date | string;
    defaultShift?: string;
    bankName?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    gcashNumber?: string;
    hourlyRate?: number;
    dailyRate?: number;
    monthlyTarget?: number;
}

export interface UserProfile {
    phone?: string;
    contactEmail?: string;
    address?: string;
    birthDate?: Date | string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
    emergencyContact?: UserEmergencyContact;
    governmentIds?: UserGovernmentIds;
    employmentDetails?: UserEmploymentDetails;
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
    contactEmail?: string;
    address?: string;
    isActive?: boolean;
    monthlyTarget?: number;
    dailySalaryRate?: number;
    
    // Extended Profile Information
    birthDate?: Date | string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
    emergencyContact?: UserEmergencyContact;
    governmentIds?: UserGovernmentIds;
    employmentDetails?: UserEmploymentDetails;
    documents?: EmployeeDocument[];
}

export interface CreateUserDto {
    email: string;
    password: string;
    displayName: string;
    roles: string[];
    profileData?: UserProfile;
    dailySalaryRate?: number;
}
