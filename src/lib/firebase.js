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

// Only initialize if config is present
if (firebaseConfig.apiKey) {
  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
}

export const requestNotificationPermission = async (userId) => {
  if (!messaging) {
    console.error("Firebase is not initialized. Check your environment variables.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      
      // We pass the config to the Service Worker via URL params so it doesn't need to be hardcoded
      const swUrl = `/firebase-messaging-sw.js?apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}&projectId=${firebaseConfig.projectId}&storageBucket=${firebaseConfig.storageBucket}&senderId=${firebaseConfig.messagingSenderId}&appId=${firebaseConfig.appId}`;
      const registration = await navigator.serviceWorker.register(swUrl);

      const currentToken = await getToken(messaging, { 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration 
      });

      if (currentToken) {
        // Save the token to Supabase so we can send notifications to this user
        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: currentToken })
            .eq('id', userId);
            
          if (error) console.error("Error saving FCM token:", error);
        }
        return true;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return false;
      }
    } else {
      console.log('Notification permission not granted.');
      return false;
    }
  } catch (error) {
    console.error('An error occurred while requesting permission. ', error);
    return false;
  }
};

export const setupMessageListener = () => {
  if (!messaging) return null;
  
  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground: ', payload);
    // You could show a custom toast notification here if you want
    // even when the app is open!
  });
};
