import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCoSSMPF7eGvIp7dWXukgDv1eb3Ot-q-4A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mycapitalcontrol.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mycapitalcontrol",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mycapitalcontrol.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "257628392788",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:257628392788:web:214a25b0e5641f46b04cc1"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const isFirebaseConfigured = true;
