export interface Member {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive';
    dateJoined: any;
    goal?: string;
}
