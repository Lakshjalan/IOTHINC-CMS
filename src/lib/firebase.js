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
    return { success: false, error: "Firebase is not initialized. Check your environment variables." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      
      const swUrl = `/firebase-messaging-sw.js?apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}&projectId=${firebaseConfig.projectId}&storageBucket=${firebaseConfig.storageBucket}&senderId=${firebaseConfig.messagingSenderId}&appId=${firebaseConfig.appId}`;
      const registration = await navigator.serviceWorker.register(swUrl);

      const currentToken = await getToken(messaging, { 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration 
      });

      if (currentToken) {
        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: currentToken })
            .eq('id', userId);
            
          if (error) return { success: false, error: "Failed to save token to database: " + error.message };
        }
        return { success: true };
      } else {
        return { success: false, error: 'No registration token available. Request permission to generate one.' };
      }
    } else {
      return { success: false, error: 'Notification permission not granted by the user.' };
    }
  } catch (error) {
    return { success: false, error: error.message || 'An error occurred while requesting permission.' };
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
