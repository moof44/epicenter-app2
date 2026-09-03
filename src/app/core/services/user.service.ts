import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { from, Observable, map } from 'rxjs';
import {
    Firestore,
    collection,
    collectionData,
    doc,
    docData,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp
} from '@angular/fire/firestore';
import { CreateUserDto, User, EmployeeDocument, DocumentCategory } from '../models/user.model';

export const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'];

export interface UserPayslip {
    billId: string;
    title: string;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    paidDate: Date;
    paymentSource: string;
    referenceNumber?: string;
    staffId: string;
    staffName: string;
    daysPresent: number;
    baseCompensation: number; // Gross
    valeDeduction: number;   // Advance
    valeNote?: string;
    adjustmentAmount: number; // Bonus/Commission
    adjustmentReason?: string;
    netAmount: number;        // Take-Home Pay
    notes?: string;
}

export interface UserCommissionPayslip {
    billId: string;
    title: string;
    paidDate: Date;
    paymentSource: string;
    referenceNumber?: string;
    staffId: string;
    staffName: string;
    totalCommission: number;
    itemCount: number;
    commissionIds: string[];
    createdAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private functions = inject(Functions);
    private firestore = inject(Firestore);

    /**
     * Creates a new staff account by calling the Cloud Function.
     */
    createUser(data: CreateUserDto): Observable<any> {
        const callable = httpsCallable(this.functions, 'createStaffAccount');
        return from(callable(data));
    }

    /**
     * Fetches all users from Firestore.
     */
    getUsers(): Observable<User[]> {
        const usersCol = collection(this.firestore, 'users');
        return collectionData(usersCol, { idField: 'uid' }) as Observable<User[]>;
    }

    /**
     * Fetches a single user document real-time.
     */
    getUser(uid: string): Observable<User | null> {
        const userDocRef = doc(this.firestore, 'users', uid);
        return docData(userDocRef, { idField: 'uid' }) as Observable<User | null>;
    }

    /**
     * Checks if a user is an internal staff user (ADMIN, MANAGER, STAFF, TRAINER).
     */
    isStaffUser(user: User): boolean {
        if (!user) return false;
        return !!(user.roles && user.roles.some(role => STAFF_ROLES.includes(role)));
    }

    /**
     * Checks if a user is a member portal user.
     */
    isMemberPortalUser(user: User): boolean {
        if (!user) return false;
        return user.roles?.includes('MEMBER') || !!(user as any).memberId;
    }

    /**
     * Fetches only internal staff users (ADMIN, MANAGER, STAFF, TRAINER).
     */
    getStaffUsers(): Observable<User[]> {
        return this.getUsers().pipe(
            map(users => (users || []).filter(user => this.isStaffUser(user)))
        );
    }

    /**
     * Fetches only member portal users.
     */
    getMemberPortalUsers(): Observable<User[]> {
        return this.getUsers().pipe(
            map(users => (users || []).filter(user => this.isMemberPortalUser(user)))
        );
    }

    /**
     * Updates a staff account authentication or roles by calling the Cloud Function.
     */
    updateUser(uid: string, data: Partial<CreateUserDto>): Observable<any> {
        const callable = httpsCallable(this.functions, 'updateStaffAccount');
        return from(callable({ uid, ...data }));
    }

    /**
     * Updates extended user profile in Firestore (Personal, Emergency, Government, Employment).
     */
    async updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
        const userDocRef = doc(this.firestore, 'users', uid);
        const updates: any = {};

        if (data.displayName !== undefined) updates.displayName = data.displayName;
        if (data.phone !== undefined) updates.phone = data.phone;
        if (data.contactEmail !== undefined) updates.contactEmail = data.contactEmail;
        if (data.address !== undefined) updates.address = data.address;
        if (data.dailySalaryRate !== undefined) updates.dailySalaryRate = Number(data.dailySalaryRate);
        if (data.monthlyTarget !== undefined) updates.monthlyTarget = Number(data.monthlyTarget);
        if (data.birthDate !== undefined) updates.birthDate = data.birthDate;
        if (data.gender !== undefined) updates.gender = data.gender;
        if (data.emergencyContact !== undefined) updates.emergencyContact = data.emergencyContact;
        if (data.governmentIds !== undefined) updates.governmentIds = data.governmentIds;
        if (data.employmentDetails !== undefined) updates.employmentDetails = data.employmentDetails;
        updates.updatedAt = Timestamp.now();

        await updateDoc(userDocRef, updates);
    }

    /**
     * Uploads an employee document (Images or PDFs) and saves metadata to the user's documents array.
     */
    async uploadEmployeeDocument(
        uid: string,
        file: File,
        category: DocumentCategory,
        uploaderName: string
    ): Promise<EmployeeDocument> {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

        if (!isPdf && !isImage) {
            throw new Error('Unsupported file type. Only Images (JPG, PNG, WebP) and PDF documents are allowed.');
        }

        // Convert file to Base64 data URL for fast and secure offline-ready document retrieval
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = err => reject(err);
            reader.readAsDataURL(file);
        });

        const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const docRecord: EmployeeDocument = {
            id: docId,
            name: file.name,
            fileType: isPdf ? 'PDF' : 'IMAGE',
            mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
            category,
            downloadUrl: base64Data,
            sizeBytes: file.size,
            uploadedAt: new Date(),
            uploadedBy: uploaderName
        };

        const userDocRef = doc(this.firestore, 'users', uid);
        const user = await new Promise<User | null>((resolve) => {
            this.getUser(uid).subscribe(u => resolve(u));
        });

        const existingDocs: EmployeeDocument[] = (user?.documents || []);
        const updatedDocs = [...existingDocs, docRecord];

        await updateDoc(userDocRef, {
            documents: updatedDocs
        });

        return docRecord;
    }

    /**
     * Deletes an employee document from the user's document list.
     */
    async deleteEmployeeDocument(uid: string, documentId: string): Promise<void> {
        const userDocRef = doc(this.firestore, 'users', uid);
        const user = await new Promise<User | null>((resolve) => {
            this.getUser(uid).subscribe(u => resolve(u));
        });

        const updatedDocs = (user?.documents || []).filter(d => d.id !== documentId);
        await updateDoc(userDocRef, {
            documents: updatedDocs
        });
    }

    /**
     * Fetches all PAID weekly payslips for an employee where netAmount > 0.
     * Gated strictly to PAID status in Bills & Accounts Payable.
     */
    getEmployeePaidPayslips(uid: string, staffName: string): Observable<UserPayslip[]> {
        const billsCol = collection(this.firestore, 'bills_payables');
        const q = query(
            billsCol,
            where('category', '==', 'SALARY_STAFF'),
            where('status', '==', 'PAID')
        );

        return collectionData(q, { idField: 'id' }).pipe(
            map((bills: any[]) => {
                const payslips: UserPayslip[] = [];
                const targetUid = uid.toLowerCase();
                const targetName = (staffName || '').toLowerCase().trim();

                for (const bill of bills) {
                    // Exclude sales commission payout bills from standard attendance payslips
                    if (bill.metadata?.payoutType === 'COMMISSION') continue;

                    const items = (bill.payrollItems || []) as any[];
                    // Find matching staff entry
                    const staffItem = items.find(item => 
                        (item.staffId && item.staffId.toLowerCase() === targetUid) ||
                        (item.staffName && item.staffName.toLowerCase().trim() === targetName)
                    );

                    // 0 compensation exclusion rule:
                    // If staffItem is found and has netAmount > 0, generate payslip
                    if (staffItem && Number(staffItem.netAmount || 0) > 0) {
                        const lastPayment = (bill.payments && bill.payments.length > 0)
                            ? bill.payments[bill.payments.length - 1]
                            : null;

                        const paidDate = lastPayment?.paymentDate?.toDate
                            ? lastPayment.paymentDate.toDate()
                            : (lastPayment?.paymentDate ? new Date(lastPayment.paymentDate) : (bill.updatedAt?.toDate ? bill.updatedAt.toDate() : new Date()));

                        const periodStart = bill.billingPeriodStart?.toDate
                            ? bill.billingPeriodStart.toDate()
                            : (bill.billingPeriodStart ? new Date(bill.billingPeriodStart) : new Date(bill.dueDate));

                        const periodEnd = bill.billingPeriodEnd?.toDate
                            ? bill.billingPeriodEnd.toDate()
                            : (bill.billingPeriodEnd ? new Date(bill.billingPeriodEnd) : new Date(bill.dueDate));

                        payslips.push({
                            billId: bill.id,
                            title: bill.title,
                            billingPeriodStart: periodStart,
                            billingPeriodEnd: periodEnd,
                            paidDate,
                            paymentSource: lastPayment?.paymentSource || 'OWNER_CASH_ON_HAND',
                            referenceNumber: lastPayment?.referenceNumber || '',
                            staffId: staffItem.staffId,
                            staffName: staffItem.staffName,
                            daysPresent: staffItem.daysPresent || 0,
                            baseCompensation: Number(staffItem.baseCompensation || 0),
                            valeDeduction: Number(staffItem.valeDeduction || 0),
                            valeNote: staffItem.valeNote || '',
                            adjustmentAmount: Number(staffItem.adjustmentAmount || 0),
                            adjustmentReason: staffItem.adjustmentReason || '',
                            netAmount: Number(staffItem.netAmount || 0),
                            notes: bill.notes || ''
                        });
                    }
                }

                // Sort descending (newest payslip first)
                payslips.sort((a, b) => {
                    const timeA = a.paidDate instanceof Date ? a.paidDate.getTime() : new Date(a.paidDate).getTime();
                    const timeB = b.paidDate instanceof Date ? b.paidDate.getTime() : new Date(b.paidDate).getTime();
                    return timeB - timeA;
                });

                return payslips;
            })
        );
    }

    /**
     * Fetches all PAID Sales Commission Payslips for an employee.
     */
    getEmployeePaidCommissionPayslips(uid: string, staffName: string): Observable<UserCommissionPayslip[]> {
        const billsCol = collection(this.firestore, 'bills_payables');
        const q = query(
            billsCol,
            where('category', '==', 'SALARY_STAFF'),
            where('status', '==', 'PAID')
        );

        return collectionData(q, { idField: 'id' }).pipe(
            map((bills: any[]) => {
                const payslips: UserCommissionPayslip[] = [];
                const targetUid = uid.toLowerCase();
                const targetName = (staffName || '').toLowerCase().trim();

                for (const bill of bills) {
                    if (bill.metadata?.payoutType !== 'COMMISSION') continue;

                    const billStaffId = (bill.metadata?.staffId || '').toLowerCase();
                    const billStaffName = (bill.metadata?.staffName || bill.payee || '').toLowerCase().trim();

                    if (billStaffId === targetUid || billStaffName === targetName) {
                        const lastPayment = (bill.payments && bill.payments.length > 0)
                            ? bill.payments[bill.payments.length - 1]
                            : null;

                        const paidDate = lastPayment?.paymentDate?.toDate
                            ? lastPayment.paymentDate.toDate()
                            : (lastPayment?.paymentDate ? new Date(lastPayment.paymentDate) : (bill.updatedAt?.toDate ? bill.updatedAt.toDate() : new Date()));

                        payslips.push({
                            billId: bill.id,
                            title: bill.title,
                            paidDate,
                            paymentSource: lastPayment?.paymentSource || 'OWNER_CASH_ON_HAND',
                            referenceNumber: lastPayment?.referenceNumber || '',
                            staffId: bill.metadata?.staffId || uid,
                            staffName: bill.metadata?.staffName || staffName,
                            totalCommission: Number(bill.amount || 0),
                            itemCount: Number(bill.metadata?.itemCount || (bill.metadata?.commissionIds?.length || 0)),
                            commissionIds: bill.metadata?.commissionIds || [],
                            createdAt: bill.createdAt?.toDate ? bill.createdAt.toDate() : new Date()
                        });
                    }
                }

                return payslips.sort((a, b) => b.paidDate.getTime() - a.paidDate.getTime());
            })
        );
    }

    /**
     * Toggles the active status of a staff account.
     */
    toggleUserStatus(uid: string, isActive: boolean): Observable<any> {
        const callable = httpsCallable(this.functions, 'toggleStaffStatus');
        return from(callable({ uid, isActive }));
    }
}

