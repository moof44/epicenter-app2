import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from '@angular/fire/auth';
import { DashboardService } from '../core/services/dashboard.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none animate-fade-in-up">
      
      <!-- Top Title Section -->
      <div class="border-b border-bg-surface-alt pb-4">
        <h1 class="text-2xl font-black font-oswald text-gold-primary tracking-wide uppercase">My Profile Settings</h1>
        <p class="text-xs text-text-secondary mt-0.5">Manage your gym profile details and portal credentials</p>
      </div>

      @if (dashboardService.loading()) {
        <!-- Skeleton Loader -->
        <div class="flex flex-col gap-6 animate-pulse mt-6">
          <div class="h-48 bg-bg-surface border border-bg-surface-alt rounded-2xl"></div>
          <div class="h-48 bg-bg-surface border border-bg-surface-alt rounded-2xl"></div>
        </div>
      } @else {
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          
          <!-- Personal Info Card -->
          <div class="card-surface flex flex-col gap-5">
            <div class="border-b border-bg-surface-alt pb-3">
              <h2 class="text-lg font-bold font-oswald text-gold-light uppercase tracking-wider">Gym Registration Info</h2>
              <p class="text-[10px] text-text-secondary mt-0.5">Official details registered at Epicenter Gym</p>
            </div>

            @if (memberData()) {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                <div class="flex flex-col gap-1">
                  <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Full Name</span>
                  <span class="font-bold text-text-primary text-sm">{{ memberData().name }}</span>
                </div>
                
                <div class="flex flex-col gap-1">
                  <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Mobile Number</span>
                  <span class="font-bold text-text-primary text-sm">{{ memberData().contactNumber }}</span>
                </div>
                
                <div class="flex flex-col gap-1 col-span-1 sm:col-span-2">
                  <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Residential Address</span>
                  <span class="font-medium text-text-primary">{{ memberData().address }}</span>
                </div>

                <div class="flex flex-col gap-1">
                  <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Birthdate</span>
                  <span class="font-medium text-text-primary">{{ birthdayText() }}</span>
                </div>

                <div class="flex flex-col gap-1">
                  <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Gender</span>
                  <span class="font-medium text-text-primary">{{ memberData().gender }}</span>
                </div>

                <div class="flex flex-col gap-1 col-span-1 sm:col-span-2">
                  <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Target Goals</span>
                  <span class="font-medium text-gold-primary">{{ memberData().goal || 'No goal set yet' }}</span>
                </div>

                @if (memberData().remarks) {
                  <div class="flex flex-col gap-1 col-span-1 sm:col-span-2">
                    <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Trainer Remarks</span>
                    <span class="font-medium text-text-secondary italic">"{{ memberData().remarks }}"</span>
                  </div>
                }

              </div>
            }

            <div class="bg-bg-surface-alt/50 border border-bg-surface-alt/30 p-3.5 rounded-xl text-[10px] text-text-secondary leading-relaxed">
              💡 <strong>Note:</strong> To modify your registered phone number, address, or target goals, please request assistance at the gym reception desk.
            </div>

          </div>

          <!-- Account Security / Change Password Card -->
          <div class="card-surface flex flex-col gap-5">
            <div class="border-b border-bg-surface-alt pb-3">
              <h2 class="text-lg font-bold font-oswald text-gold-light uppercase tracking-wider">Account Credentials</h2>
              <p class="text-[10px] text-text-secondary mt-0.5">Update password pin for remote logins</p>
            </div>

            <!-- Login Credentials details -->
            <div class="flex flex-col gap-2.5 text-xs bg-bg-surface-alt/25 border border-bg-surface-alt/30 p-3.5 rounded-xl">
              <div class="flex justify-between items-center">
                <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Username Phone</span>
                <span class="font-mono text-text-primary font-bold">{{ usernamePhone() }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Portal Email Address</span>
                <span class="font-mono text-text-secondary">{{ emailAddress() }}</span>
              </div>
            </div>

            <!-- Status Alerts -->
            @if (successMessage()) {
              <div class="bg-emerald-950/20 border border-emerald-800 text-emerald-400 text-xs font-bold p-3.5 rounded-xl">
                ✔️ {{ successMessage() }}
              </div>
            }
            @if (errorMessage()) {
              <div class="bg-red-950/20 border border-red-800 text-red-400 text-xs font-bold p-3.5 rounded-xl">
                ⚠️ {{ errorMessage() }}
              </div>
            }

            <!-- Change PIN Form -->
            <form (submit)="onChangePassword()" class="flex flex-col gap-4">
              <!-- Current Password/PIN -->
              <div class="flex flex-col gap-1.5">
                <label for="current-pin" class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Current Birthday PIN / Password</label>
                <input 
                  id="current-pin"
                  type="password" 
                  [(ngModel)]="currentPin" 
                  name="currentPin" 
                  placeholder="Enter current PIN"
                  required
                  class="w-full h-11 px-4 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary placeholder-text-muted focus:border-gold-primary focus:outline-none text-xs transition-colors"
                />
              </div>

              <!-- New Password/PIN -->
              <div class="flex flex-col gap-1.5">
                <label for="new-pin" class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">New Password PIN (Min 6 chars)</label>
                <input 
                  id="new-pin"
                  type="password" 
                  [(ngModel)]="newPin" 
                  name="newPin" 
                  placeholder="Enter new Password / PIN"
                  required
                  class="w-full h-11 px-4 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary placeholder-text-muted focus:border-gold-primary focus:outline-none text-xs transition-colors"
                />
              </div>

              <!-- Confirm New Password/PIN -->
              <div class="flex flex-col gap-1.5">
                <label for="confirm-pin" class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Confirm New Password PIN</label>
                <input 
                  id="confirm-pin"
                  type="password" 
                  [(ngModel)]="confirmPin" 
                  name="confirmPin" 
                  placeholder="Confirm new Password / PIN"
                  required
                  class="w-full h-11 px-4 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary placeholder-text-muted focus:border-gold-primary focus:outline-none text-xs transition-colors"
                />
              </div>

              <button 
                type="submit" 
                [disabled]="isSubmitting()"
                class="w-full btn-primary font-bold text-xs tracking-wider uppercase mt-2 flex items-center justify-center gap-2"
              >
                @if (isSubmitting()) {
                  <svg class="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating Security Settings...
                } @else {
                  Update Password PIN
                }
              </button>
            </form>

          </div>

        </div>

      }

    </div>
  `,
  styles: [``]
})
export class ProfileComponent {
  readonly dashboardService = inject(DashboardService);
  private auth = inject(Auth);

  memberData = computed(() => this.dashboardService.memberData());

  currentPin = '';
  newPin = '';
  confirmPin = '';

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  usernamePhone = computed(() => {
    const data = this.memberData();
    if (!data || !data.contactNumber) return 'N/A';
    // Clean to 11 digits
    let phone = data.contactNumber.replace(/\D/g, '');
    if (phone.startsWith('63')) {
      phone = '0' + phone.substring(2);
    } else if (phone.length === 10 && phone.startsWith('9')) {
      phone = '0' + phone;
    }
    return phone;
  });

  emailAddress = computed(() => {
    const phone = this.usernamePhone();
    return phone !== 'N/A' ? `${phone}@epicentergym.ph` : 'N/A';
  });

  birthdayText = computed(() => {
    const data = this.memberData();
    if (!data || !data.birthday) return 'N/A';
    const date = data.birthday.toDate ? data.birthday.toDate() : new Date(data.birthday);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  });

  async onChangePassword() {
    if (this.isSubmitting()) return;
    
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.newPin.length < 6) {
      this.errorMessage.set('New Password PIN must be at least 6 characters long.');
      return;
    }

    if (this.newPin !== this.confirmPin) {
      this.errorMessage.set('New password confirmation does not match.');
      return;
    }

    const user = this.auth.currentUser;
    if (!user || !user.email) {
      this.errorMessage.set('Session error: No logged in user found.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      // 1. Re-authenticate the user first (required by Firebase for password updates)
      const credential = EmailAuthProvider.credential(user.email, this.currentPin);
      await reauthenticateWithCredential(user, credential);
      
      // 2. Perform the update
      await updatePassword(user, this.newPin);
      
      this.successMessage.set('Password PIN updated successfully! Use your new PIN for future sign ins.');
      
      // Reset form
      this.currentPin = '';
      this.newPin = '';
      this.confirmPin = '';
    } catch (error: any) {
      console.error('Failed to change password:', error);
      let msg = error.message || 'Error updating password PIN.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = 'Current password PIN is incorrect.';
      }
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
