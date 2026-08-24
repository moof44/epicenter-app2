import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, withComponentInputBinding } from '@angular/router';
import { initializeApp, provideFirebaseApp, getApp } from '@angular/fire/app';
import { provideFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { firebaseConfig } from './core/firebase.config';
import { GlobalErrorHandler } from './core/handlers/global-error-handler';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => initializeFirestore(getApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })),
    provideFunctions(() => getFunctions()),
    provideAuth(() => getAuth()),
    provideMessaging(() => {
      try {
        return getMessaging();
      } catch (e) {
        console.warn('[Messaging] Push messaging is not supported in this browser environment:', e);
        return null as any;
      }
    }),
    provideAnimationsAsync()
  ]
};
