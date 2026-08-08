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
