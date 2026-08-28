import { Component, inject, OnInit, signal, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService, UserPayslip } from '../../../../core/services/user.service';
import { User, EmployeeDocument, DocumentCategory } from '../../../../core/models/user.model';
import { PayslipViewDialogComponent } from '../../components/payslip-view-dialog/payslip-view-dialog';
import { DocumentViewerDialogComponent } from '../../components/document-viewer-dialog/document-viewer-dialog';
import { Subscription } from 'rxjs';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatTabsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatChipsModule, MatDialogModule,
    MatSnackBarModule, MatTooltipModule, MatProgressSpinnerModule
  ],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
  animations: [fadeIn]
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  currentUser = signal<User | null>(null);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  selectedTabIndex = signal<number>(0);

  payslips = signal<UserPayslip[]>([]);
  isLoadingPayslips = signal<boolean>(true);

  targetUid = '';
  isOwnProfile = true;

  profileForm!: FormGroup;
  selectedDocCategory: DocumentCategory = 'GOVERNMENT_ID';

  private userSub?: Subscription;
  private payslipSub?: Subscription;

  get isCurrentAdmin(): boolean {
    return this.authService.hasAnyRole(['ADMIN']);
  }

  get isCurrentManager(): boolean {
    return this.authService.hasAnyRole(['MANAGER']);
  }

  get isManagementOrAdmin(): boolean {
    return this.isCurrentAdmin || this.isCurrentManager;
  }

  /**
   * Permission Hierarchy:
   * 1. Admin can modify ALL profiles.
   * 2. User can modify their own profile.
   * 3. Manager can modify profiles of users below them (non-Admins).
   * 4. Manager CANNOT modify Admin profiles (Read-Only).
   */
  canEditProfile = computed(() => {
    const target = this.currentUser();
    if (!target) return false;
    if (this.isCurrentAdmin) return true;
    if (this.isOwnProfile) return true;
    if (this.isCurrentManager) {
      return !target.roles?.includes('ADMIN');
    }
    return false;
  });

  /**
   * True if current user is a Manager viewing an Admin's profile (view only).
   */
  isReadOnlyAdminProfile = computed(() => {
    const target = this.currentUser();
    if (!target) return false;
    return this.isCurrentManager && !this.isCurrentAdmin && !this.isOwnProfile && !!target.roles?.includes('ADMIN');
  });

  ngOnInit(): void {
    const loggedInUser = this.authService.userProfile();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.targetUid = params['id'];
        this.isOwnProfile = (loggedInUser?.uid === this.targetUid);
      } else {
        this.targetUid = loggedInUser?.uid || '';
        this.isOwnProfile = true;
      }

      if (this.targetUid) {
        this.initForm();
        this.loadUserData(this.targetUid);
      } else {
        this.isLoading.set(false);
      }
    });
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      displayName: [''],
      phone: [''],
      contactEmail: [''],
      address: [''],
      birthDate: [''],
      gender: ['PREFER_NOT_TO_SAY'],
      emergencyName: [''],
      emergencyRelationship: [''],
      emergencyPhone: [''],
      sssNumber: [''],
      philHealthNumber: [''],
      pagIbigNumber: [''],
      tinNumber: [''],
      jobTitle: [''],
      employmentType: ['FULL_TIME'],
      hireDate: [''],
      bankName: [''],
      bankAccountName: [''],
      bankAccountNumber: [''],
      gcashNumber: ['']
    });
    this.profileForm.disable();
  }

  private loadUserData(uid: string): void {
    this.isLoading.set(true);
    this.userSub?.unsubscribe();

    this.userSub = this.userService.getUser(uid).subscribe({
      next: (user) => {
        if (user) {
          this.currentUser.set(user);
          this.populateForm(user);
          this.loadPayslips(user);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading user profile:', err);
        this.snackBar.open('Failed to load profile details', 'Close', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }

  private populateForm(user: User): void {
    this.profileForm.patchValue({
      displayName: user.displayName || '',
      phone: user.phone || '',
      contactEmail: user.contactEmail || '',
      address: user.address || '',
      birthDate: user.birthDate ? this.formatDateForInput(user.birthDate) : '',
      gender: user.gender || 'PREFER_NOT_TO_SAY',
      emergencyName: user.emergencyContact?.name || '',
      emergencyRelationship: user.emergencyContact?.relationship || '',
      emergencyPhone: user.emergencyContact?.phone || '',
      sssNumber: user.governmentIds?.sssNumber || '',
      philHealthNumber: user.governmentIds?.philHealthNumber || '',
      pagIbigNumber: user.governmentIds?.pagIbigNumber || '',
      tinNumber: user.governmentIds?.tinNumber || '',
      jobTitle: user.employmentDetails?.jobTitle || '',
      employmentType: user.employmentDetails?.employmentType || 'FULL_TIME',
      hireDate: user.employmentDetails?.hireDate ? this.formatDateForInput(user.employmentDetails.hireDate) : '',
      bankName: user.employmentDetails?.bankName || '',
      bankAccountName: user.employmentDetails?.bankAccountName || '',
      bankAccountNumber: user.employmentDetails?.bankAccountNumber || '',
      gcashNumber: user.employmentDetails?.gcashNumber || ''
    });

    this.applyFieldLocks();
  }

  private applyFieldLocks(): void {
    if (this.isEditMode()) {
      this.profileForm.enable();
      // Job Title, Employment Type, and Date Hired can ONLY be edited by Management / Admin
      if (!this.isManagementOrAdmin) {
        this.profileForm.get('jobTitle')?.disable();
        this.profileForm.get('employmentType')?.disable();
        this.profileForm.get('hireDate')?.disable();
      }
    } else {
      this.profileForm.disable();
    }
  }

  private loadPayslips(user: User): void {
    this.isLoadingPayslips.set(true);
    this.payslipSub?.unsubscribe();

    this.payslipSub = this.userService.getEmployeePaidPayslips(user.uid, user.displayName).subscribe({
      next: (list) => {
        this.payslips.set(list);
        this.isLoadingPayslips.set(false);
      },
      error: (err) => {
        console.error('Error loading employee payslips:', err);
        this.isLoadingPayslips.set(false);
      }
    });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    if (this.isEditMode() && index !== 0) {
      this.isEditMode.set(false);
      const target = this.currentUser();
      if (target) {
        this.populateForm(target);
      }
      this.profileForm.disable();
    }
  }

  toggleEdit(): void {
    if (!this.canEditProfile()) {
      this.snackBar.open('You do not have permission to edit this profile.', 'Close', { duration: 3000 });
      return;
    }

    const nextState = !this.isEditMode();
    this.isEditMode.set(nextState);

    if (nextState) {
      this.selectedTabIndex.set(0);
      this.applyFieldLocks();
    } else {
      const target = this.currentUser();
      if (target) {
        this.populateForm(target);
      }
      this.profileForm.disable();
    }
  }

  async saveProfile(): Promise<void> {
    if (!this.canEditProfile() || !this.targetUid || this.profileForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.profileForm.getRawValue();
    const current = this.currentUser();

    try {
      const updateData: Partial<User> = {
        displayName: formVal.displayName,
        phone: formVal.phone,
        contactEmail: formVal.contactEmail || '',
        address: formVal.address,
        gender: formVal.gender,
        birthDate: formVal.birthDate || null,
        emergencyContact: {
          name: formVal.emergencyName,
          relationship: formVal.emergencyRelationship,
          phone: formVal.emergencyPhone
        },
        governmentIds: {
          sssNumber: formVal.sssNumber,
          philHealthNumber: formVal.philHealthNumber,
          pagIbigNumber: formVal.pagIbigNumber,
          tinNumber: formVal.tinNumber
        },
        employmentDetails: {
          jobTitle: this.isManagementOrAdmin ? formVal.jobTitle : (current?.employmentDetails?.jobTitle || formVal.jobTitle),
          employmentType: this.isManagementOrAdmin ? formVal.employmentType : (current?.employmentDetails?.employmentType || formVal.employmentType),
          hireDate: this.isManagementOrAdmin ? (formVal.hireDate || null) : (current?.employmentDetails?.hireDate ? this.formatDateForInput(current.employmentDetails.hireDate) : null),
          bankName: formVal.bankName,
          bankAccountName: formVal.bankAccountName,
          bankAccountNumber: formVal.bankAccountNumber,
          gcashNumber: formVal.gcashNumber
        }
      };

      await this.userService.updateUserProfile(this.targetUid, updateData);
      this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
      this.isEditMode.set(false);
      this.profileForm.disable();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      this.snackBar.open(err.message || 'Failed to update profile', 'Close', { duration: 4000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  // Document Upload
  async onFileSelected(event: Event): Promise<void> {
    if (!this.canEditProfile()) {
      this.snackBar.open('You do not have permission to upload documents for this account.', 'Close', { duration: 3000 });
      return;
    }

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const loggedIn = this.authService.userProfile();
    const uploader = loggedIn?.displayName || loggedIn?.email || 'User';

    this.isUploading.set(true);
    try {
      await this.userService.uploadEmployeeDocument(
        this.targetUid,
        file,
        this.selectedDocCategory,
        uploader
      );
      this.snackBar.open('Document "' + file.name + '" uploaded successfully!', 'Close', { duration: 3500 });
      input.value = '';
    } catch (err: any) {
      console.error('Upload failed:', err);
      this.snackBar.open(err.message || 'Failed to upload document', 'Close', { duration: 4000 });
    } finally {
      this.isUploading.set(false);
    }
  }

  viewDocument(doc: EmployeeDocument): void {
    this.dialog.open(DocumentViewerDialogComponent, {
      data: doc,
      maxWidth: '95vw',
      maxHeight: '95vh'
    });
  }

  async deleteDocument(doc: EmployeeDocument): Promise<void> {
    if (!this.canEditProfile()) {
      this.snackBar.open('You do not have permission to delete documents for this account.', 'Close', { duration: 3000 });
      return;
    }

    if (!confirm('Are you sure you want to delete document "' + doc.name + '"?')) return;

    try {
      await this.userService.deleteEmployeeDocument(this.targetUid, doc.id);
      this.snackBar.open('Document deleted', 'Close', { duration: 3000 });
    } catch (err: any) {
      console.error('Delete failed:', err);
      this.snackBar.open('Failed to delete document', 'Close', { duration: 3000 });
    }
  }

  openPayslip(payslip: UserPayslip): void {
    this.dialog.open(PayslipViewDialogComponent, {
      data: payslip,
      maxWidth: '95vw',
      maxHeight: '95vh'
    });
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'ADMIN': return 'warn';
      case 'MANAGER': return 'accent';
      case 'TRAINER': return 'primary';
      default: return 'basic';
    }
  }

  private formatDateForInput(dateVal: any): string {
    if (!dateVal) return '';
    const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.payslipSub?.unsubscribe();
  }
}
