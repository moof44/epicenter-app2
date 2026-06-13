import { inject, Injectable, signal } from '@angular/core';
import { Auth, authState, signInWithEmailAndPassword, signInWithCustomToken, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  // Expose the raw Firebase User authState as a signal
  readonly user = toSignal(authState(this.auth), { initialValue: null });

  // Hold the member's custom profile from the `/users/{uid}` document
  readonly memberProfile = signal<any | null>(null);
  readonly isLoadingProfile = signal<boolean>(false);

  constructor() {
    // Automatically load/clear Firestore profile when Auth user changes
    authState(this.auth).subscribe(user => {
      if (user) {
        this.loadProfile(user.uid);
      } else {
        this.memberProfile.set(null);
      }
    });
  }

  /**
   * Fetch user details from `users/{uid}`
   */
  private async loadProfile(uid: string): Promise<void> {
    this.isLoadingProfile.set(true);
    try {
      const docRef = doc(this.firestore, `users/${uid}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        this.memberProfile.set(snap.data());
      } else {
        console.warn('No Firestore user document found for UID:', uid);
        this.memberProfile.set(null);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      this.memberProfile.set(null);
    } finally {
      this.isLoadingProfile.set(false);
    }
  }

  /**
   * Helper to normalize 11-digit PH phone number: e.g. converts +639171234567 to 09171234567, strips symbols
   */
  normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('63')) {
      digits = '0' + digits.substring(2);
    } else if (digits.length === 10 && digits.startsWith('9')) {
      digits = '0' + digits;
    }
    return digits;
  }

  /**
   * Helper to format birthdate as MMDDYYYY PIN
   * Converts YYYY-MM-DD or standard inputs to 8 digits
   */
  formatBirthdayPin(pin: string): string {
    if (!pin) return '';
    return pin.replace(/\D/g, ''); // just strip non-digits
  }

  /**
   * Normal credential login using phone number (formatted as fake email) and birthday pin (password)
   */
  async loginWithCredentials(phone: string, birthdayPin: string): Promise<any> {
    const cleanPhone = this.normalizePhoneNumber(phone);
    const cleanPin = this.formatBirthdayPin(birthdayPin);

    if (cleanPhone.length !== 11) {
      throw new Error('Please enter a valid 11-digit phone number (e.g. 09171234567).');
    }
    if (cleanPin.length !== 8) {
      throw new Error('Birthday PIN must be exactly 8 digits (MMDDYYYY).');
    }

    const email = `${cleanPhone}@epicentergym.ph`;
    return signInWithEmailAndPassword(this.auth, email, cleanPin);
  }

  /**
   * Custom token login (QR Code)
   */
  async loginWithCustomToken(token: string): Promise<any> {
    return signInWithCustomToken(this.auth, token);
  }

  /**
   * Logout session
   */
  async logout(): Promise<void> {
    return signOut(this.auth);
  }
}
