import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCHH7UueoE0XR12O3jYZLhQN0cB_6uEy5Q",
  authDomain: "purr-fish.firebaseapp.com",
  projectId: "purr-fish",
  storageBucket: "purr-fish.firebasestorage.app",
  messagingSenderId: "623194300083",
  appId: "1:623194300083:web:9c32f839b84ccfa82a1ac6",
  measurementId: "G-YJ3QF7BW1E",
};

// Initialize or reuse Firebase App instance
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
