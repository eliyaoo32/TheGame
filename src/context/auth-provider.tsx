'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

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
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithTestUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTestUser, setIsTestUser] = useState(false);

  useEffect(() => {
    if (isTestUser) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isTestUser]);

  const signInWithTestUser = () => {
    setIsTestUser(true);
    setUser(mockUser);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithTestUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
