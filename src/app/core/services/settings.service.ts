import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    doc,
    docData,
    setDoc,
    getDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GeneralSettings } from '../models/settings.model';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private settingsDocRef = doc(this.firestore, 'settings', 'general');

    /**
     * Get settings as an Observable.
     */
    getSettings(): Observable<GeneralSettings> {
        return docData(this.settingsDocRef).pipe(
            map(data => {
                if (!data) {
                    return { monthlyQuota: 0 } as GeneralSettings;
                }
                return data as GeneralSettings;
            })
        );
    }

    /**
     * Get settings once.
     */
    async getSettingsOnce(): Promise<GeneralSettings> {
        const snapshot = await getDoc(this.settingsDocRef);
        if (!snapshot.exists()) {
            return { monthlyQuota: 0 };
        }
        return snapshot.data() as GeneralSettings;
    }

    /**
     * Save/Update general settings.
     */
    saveSettings(settings: Partial<GeneralSettings>): Promise<void> {
        const user = this.authService.userProfile();
        const updateData = {
            ...settings,
            lastUpdated: new Date(),
            updatedBy: user ? {
                uid: user.uid,
                name: user.displayName || 'Anonymous'
            } : undefined
        };

        return setDoc(this.settingsDocRef, updateData, { merge: true });
    }
}
