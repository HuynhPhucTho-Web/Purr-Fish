import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCHH7UueoE0XR12O3jYZLhQN0cB_6uEy5Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "purr-fish.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "purr-fish",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "purr-fish.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "623194300083",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:623194300083:web:9c32f839b84ccfa82a1ac6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YJ3QF7BW1E",
};

// Initialize or reuse Firebase App instance
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const analytics: Analytics | null =
  typeof window !== 'undefined' && firebaseConfig.measurementId
    ? getAnalytics(app)
    : null;
