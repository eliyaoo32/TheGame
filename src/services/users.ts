'use client';

import { collection, getDocs, doc, getDoc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserSummary } from '@/lib/types';

/**
 * Fetches a list of all users in the system.
 * NOTE: This is not scalable for large numbers of users and lacks pagination.
 * It's suitable for a small-scale friends list feature.
 * The security rules must allow this read operation.
 * @returns A promise that resolves to an array of UserSummary objects.
 */
export const getAllUsers = async (): Promise<UserSummary[]> => {
    try {
        const usersCollectionRef = collection(db, 'users');
        const snapshot = await getDocs(query(usersCollectionRef));

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => ({
            id: doc.id,
            displayName: doc.data().displayName || null,
            email: doc.data().email || null,
            photoURL: doc.data().photoURL || null,
        }));
    } catch (error) {
        console.error("Error fetching all users: ", error);
        // In a real app, you might want to handle this more gracefully
        // For now, re-throwing is fine for development.
        throw error;
    }
};

/**
 * Fetches the profile information for a single user.
 * @param userId The ID of the user to fetch.
 * @returns A promise that resolves to a UserSummary object or null if not found.
 */
export const getUserProfile = async (userId: string): Promise<UserSummary | null> => {
    try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                displayName: data.displayName || null,
                email: data.email || null,
                photoURL: data.photoURL || null,
            };
        } else {
            console.log("No such user document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile: ", error);
        throw error;
    }
};
