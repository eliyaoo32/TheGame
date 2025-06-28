import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing config and provide a clear error message.
const missingConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value || value.includes('YOUR_'))
  .map(([key]) => key);

if (missingConfigKeys.length > 0) {
  // This error will be caught by the app and displayed to the user.
  // It's crucial for debugging setup issues.
  throw new Error(`Firebase configuration is missing or incomplete. Please create a .env file and add the following keys: ${missingConfigKeys.join(', ')}. Refer to .env.example for a template. Remember to restart your development server after creating the .env file.`);
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
