import { ErrorHandler, Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ErrorLoggerService } from '../services/error-logger.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private injector = inject(Injector);
    private platformId = inject(PLATFORM_ID);
    private isHandlingError = false;

    handleError(error: any): void {
        // Print error to browser console as usual
        console.error('[GlobalErrorHandler] Uncaught Exception:', error);

        // Only process browser-side runtime errors
        if (!isPlatformBrowser(this.platformId)) return;

        // Prevent infinite recursion loops
        if (this.isHandlingError) return;
        this.isHandlingError = true;

        try {
            const errorLogger = this.injector.get(ErrorLoggerService);
            const authService = this.injector.get(AuthService);
            const router = this.injector.get(Router);

            const user = authService.userProfile();
            const extracted = this.extractErrorDetails(error);

            // Ignore benign browser capability limitations (e.g. iOS Safari without push support)
            if (
                extracted.message.includes('messaging/unsupported-browser') ||
                extracted.message.includes("This browser doesn't support the API's required to use the Firebase SDK")
            ) {
                return;
            }

            errorLogger.logError({
                message: extracted.message,
                name: extracted.name,
                stack: extracted.stack,
                url: router.url || window.location.pathname,
                userAgent: navigator.userAgent,
                severity: extracted.severity,
                user: user
                    ? {
                          uid: user.uid,
                          displayName: user.displayName,
                          roles: user.roles,
                      }
                    : null,
            });

            // Auto-recover from stale dynamic chunk deployment errors
            if (
                extracted.name === 'ChunkLoadError' ||
                extracted.message.includes('Failed to fetch dynamically imported module') ||
                extracted.message.includes('Importing a module script failed')
            ) {
                const lastReload = sessionStorage.getItem('last_chunk_reload_ts');
                const now = Date.now();
                if (!lastReload || now - Number(lastReload) > 15000) {
                    sessionStorage.setItem('last_chunk_reload_ts', String(now));
                    console.warn('[GlobalErrorHandler] Stale chunk detected after deployment. Auto-reloading application...');
                    window.location.reload();
                }
            }

            // Auto-recover from fatal browser-level IndexedDB backing store lock/corruption
            if (
                extracted.name === 'IndexedDbTransactionError' ||
                extracted.message.includes('Internal error opening backing store') ||
                extracted.message.includes('Allocate target')
            ) {
                const lastIdbReload = sessionStorage.getItem('last_idb_recovery_reload_ts');
                const now = Date.now();
                if (!lastIdbReload || now - Number(lastIdbReload) > 30000) {
                    sessionStorage.setItem('last_idb_recovery_reload_ts', String(now));
                    console.warn('[GlobalErrorHandler] IndexedDB backing store failure detected. Reloading page tab to reset transaction allocation...');
                    window.location.reload();
                }
            }
        } catch (loggingErr) {
            console.error('[GlobalErrorHandler] Error while sending log to Firestore:', loggingErr);
        } finally {
            this.isHandlingError = false;
        }
    }

    private extractErrorDetails(error: any): {
        message: string;
        name: string;
        stack: string;
        severity: 'FATAL' | 'ERROR' | 'WARNING';
    } {
        if (!error) {
            return {
                message: 'Unknown error occurred (null/undefined)',
                name: 'UnknownError',
                stack: '',
                severity: 'ERROR',
            };
        }

        // Handle unwrapped Promise rejections
        const errObj = error.rejection || error.originalError || error;

        const message = errObj.message || errObj.statusText || String(errObj);
        const name = errObj.name || (errObj.constructor ? errObj.constructor.name : 'Error');
        const stack = errObj.stack || '';

        let severity: 'FATAL' | 'ERROR' | 'WARNING' = 'ERROR';
        if (name === 'ChunkLoadError' || message.includes('Loading chunk')) {
            severity = 'WARNING';
        } else if (name === 'TypeError' || name === 'ReferenceError' || name === 'NullPointerException') {
            severity = 'FATAL';
        }

        return { message, name, stack, severity };
    }
}
