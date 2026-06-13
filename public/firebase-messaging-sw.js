importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAhF7a2tBc_97v1_sUcWJ6gI__UuAYUMMo",
  authDomain: "epicenter-app.firebaseapp.com",
  projectId: "epicenter-app",
  storageBucket: "epicenter-app.firebasestorage.app",
  messagingSenderId: "190360788968",
  appId: "1:190360788968:web:cd81299c5a956b0f480e5d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  const notificationTitle = payload.notification.title || "Epicenter Alert";
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/icons/icon-192.png',
    badge: '/favicon.ico',
    data: {
      actionUrl: payload.data ? payload.data.actionUrl : '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.actionUrl || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
