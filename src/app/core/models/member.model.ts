export interface Member {
    id?: string;
    name: string;
    address: string;
    contactNumber: string;
    gender: 'Male' | 'Female' | 'Other';
    birthday: any; // Timestamp or Date
    expiration?: any; // Timestamp or Date
    goal: string;
    subscription?: string;
    membershipStatus: 'Active' | 'Inactive' | 'Pending';
    createdBy?: { uid: string; name: string; timestamp: any };
    lastModifiedBy?: { uid: string; name: string; timestamp: any };
}
