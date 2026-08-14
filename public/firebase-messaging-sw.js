importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Parse query string for config to avoid hardcoding in the public directory
const urlParams = new URLSearchParams(location.search);
const firebaseConfig = {
  apiKey: urlParams.get('apiKey'),
  authDomain: urlParams.get('authDomain'),
  projectId: urlParams.get('projectId'),
  storageBucket: urlParams.get('storageBucket'),
  messagingSenderId: urlParams.get('senderId'),
  appId: urlParams.get('appId'),
};

// Only initialize if we have an API key (meaning it was properly injected)
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'null') {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'IOTHINC';
    const notificationOptions = {
      body: payload.notification?.body,
      icon: '/vite.svg' // You can change this to your actual app logo
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
