// Firebase Messaging Service Worker
// This file is served statically and uses importScripts to load Firebase SDK
// The Firebase config is injected at build time via Vite's define feature

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config injected at build time from environment variables
// These are replaced by Vite during build
const firebaseConfig = {
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: '__FIREBASE_AUTH_DOMAIN__',
  projectId: '__FIREBASE_PROJECT_ID__',
  storageBucket: '__FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__FIREBASE_APP_ID__',
};

// Only initialize if we have valid config (non-empty values)
if (firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== '') {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message:', payload);
      const notificationTitle = payload.notification?.title || 'IOTHINC';
      const notificationOptions = {
        body: payload.notification?.body,
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        tag: 'iothinc-notification',
        renotify: true,
        requireInteraction: true,
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log('[firebase-messaging-sw.js] Firebase messaging initialized successfully');
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Failed to initialize Firebase:', error);
  }
} else {
  console.warn('[firebase-messaging-sw.js] Firebase config not available - push notifications disabled');
}