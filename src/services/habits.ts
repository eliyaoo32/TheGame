import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Habit } from '@/lib/types';
import { placeholderHabits } from '@/lib/placeholder-data';

// Hardcoded user ID for now, until we have authentication
const userId = 'test-user';

const habitsCollectionRef = collection(db, 'users', userId, 'habits');

const mapDocToHabit = (doc: QueryDocumentSnapshot<DocumentData, DocumentData>): Habit => {
    const data = doc.data();
    // Destructure to remove non-serializable fields like Timestamps before sending to client
    const { createdAt, ...rest } = data;
    return { id: doc.id, ...rest } as Habit;
};

export const getHabits = async (): Promise<Habit[]> => {
  try {
    const snapshot = await getDocs(query(habitsCollectionRef));
    
    // If the database is empty, seed it with placeholder data for the first run.
    if (snapshot.empty && placeholderHabits.length > 0) {
        console.log("No habits found for user, seeding with placeholder data...");
        for (const habit of placeholderHabits) {
            const { id, ...habitData } = habit;
            await addDoc(habitsCollectionRef, { ...habitData, createdAt: Timestamp.now() });
        }
        // Fetch again after seeding
        const seededSnapshot = await getDocs(query(habitsCollectionRef));
        return seededSnapshot.docs.map(mapDocToHabit);
    }

    return snapshot.docs.map(mapDocToHabit);
  } catch (error) {
    console.error("Error fetching habits: ", error);
    if (error instanceof Error && error.message.includes('permission-denied')) {
        console.error("Firestore permission denied. Check your Firestore security rules and ensure the API keys in .env are correct.");
    }
    // Return empty array on error to prevent app crash
    return [];
  }
};

export const addHabit = async (habitData: Omit<Habit, 'id' | 'progress' | 'completed' | 'feedback'>) => {
  const newHabit = {
    ...habitData,
    progress: 0,
    completed: false,
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(habitsCollectionRef, newHabit);
  return docRef.id;
};

export const updateHabit = async (habitId: string, habitData: Partial<Omit<Habit, 'id'>>) => {
  const habitDoc = doc(db, 'users', userId, 'habits', habitId);
  await updateDoc(habitDoc, { ...habitData });
};

export const deleteHabit = async (habitId: string) => {
  const habitDoc = doc(db, 'users', userId, 'habits', habitId);
  await deleteDoc(habitDoc);
};
