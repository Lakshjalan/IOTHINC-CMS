import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { supabase } from '../supabaseClient';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let messaging = null;
let swRegistration = null;

// Only initialize if config is present
if (firebaseConfig.apiKey) {
  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
}

export const requestNotificationPermission = async (userId) => {
  if (!messaging) {
    return { success: false, error: "Firebase is not initialized. Check your environment variables." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Register the static service worker file (no query params)
      // This avoids issues with service worker caching and scope on desktop browsers
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('Service worker registered successfully:', swRegistration.scope);
      } catch (swError) {
        console.error('Service worker registration failed:', swError);
        return { success: false, error: `Service worker registration failed: ${swError.message}` };
      }

      // Wait for service worker to be ready
      if (swRegistration) {
        await swRegistration.ready;
        console.log('Service worker is ready');
      }

      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swRegistration
      });

      if (currentToken) {
        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: currentToken })
            .eq('id', userId);

          if (error) return { success: false, error: "Failed to save token to database: " + error.message };
        }
        console.log('FCM token obtained:', currentToken.substring(0, 20) + '...');
        return { success: true, token: currentToken };
      } else {
        return { success: false, error: 'No registration token available. Request permission to generate one.' };
      }
    } else {
      return { success: false, error: 'Notification permission not granted by the user.' };
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { success: false, error: error.message || 'An error occurred while requesting permission.' };
  }
};

export const setupMessageListener = () => {
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);

    // Show a native pop-up notification even when the app is open
    if (Notification.permission === 'granted') {
      const notificationTitle = payload.notification?.title || 'IOTHINC Update';
      const notificationOptions = {
        body: payload.notification?.body,
        icon: '/logo.jpg',
        tag: 'iothinc-notification',
        renotify: true,
        requireInteraction: true,
      };
      new Notification(notificationTitle, notificationOptions);
    }
  });
};

// Export for debugging
export const getMessagingInstance = () => messaging;
export const getSWRegistration = () => swRegistration;