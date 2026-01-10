'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// A mock user object that matches the Firebase User type shape
const mockUser: User = {
    uid: 'test-user',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: `https://placehold.co/100x100.png`,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
        creationTime: new Date().toUTCString(),
        lastSignInTime: new Date().toUTCString(),
    },
    providerData: [
        {
            providerId: 'password',
            uid: 'test-user',
            displayName: 'Test User',
            email: 'test@example.com',
            phoneNumber: null,
            photoURL: `https://placehold.co/100x100.png`,
        }
    ],
    providerId: 'firebase',
    tenantId: null,
    phoneNumber: null,
    delete: async () => {},
    getIdToken: async () => 'test-token',
    getIdTokenResult: async () => ({
        token: 'test-token',
        expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(),
        authTime: new Date().toISOString(),
        issuedAtTime: new Date().toISOString(),
        signInProvider: 'password',
        signInSecondFactor: null,
        claims: { uid: 'test-user' },
    }),
    reload: async () => {},
    toJSON: () => ({
        uid: 'test-user',
        displayName: 'Test User',
        email: 'test@example.com',
        photoURL: `https://placehold.co/100x100.png`,
        emailVerified: true,
        isAnonymous: false,
    }),
};


type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithTestUser: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithTestUser: () => {},
  signOut: async () => {},
});

// This function will create/update a user document in the 'users' collection
const updateUserProfile = async (user: User) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
        await setDoc(userDocRef, {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            lastLogin: new Date().toISOString(),
        }, { merge: true }); // Use merge to avoid overwriting other fields
    } catch (error) {
        console.error("Error updating user profile in Firestore: ", error);
    }
};


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTestUser, setIsTestUser] = useState(false);

  useEffect(() => {
    if (isTestUser) {
        updateUserProfile(mockUser);
        setLoading(false);
        return;
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        updateUserProfile(user);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isTestUser]);

  const signInWithTestUser = () => {
    setIsTestUser(true);
    setUser(mockUser);
    setLoading(false);
  };
  
  const signOut = async () => {
    if (isTestUser) {
        setUser(null);
        setIsTestUser(false);
    } else {
        await firebaseSignOut(auth);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithTestUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
