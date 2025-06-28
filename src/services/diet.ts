
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DietPlan } from '@/lib/types';

const getDefaultDietPlan = (): Omit<DietPlan, 'isWizardComplete'> & { isWizardComplete: false } => ({
  isWizardComplete: false,
  profile: { age: 0, weight: 0, weightUnit: 'kg', height: 0, heightUnit: 'cm', gender: 'male' },
  objective: 'maintain_weight',
  targets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  meals: [],
});

export async function getDietPlan(userId: string): Promise<DietPlan> {
  if (!userId) return getDefaultDietPlan();
  try {
    const dietPlanRef = doc(db, 'users', userId, 'dietPlan', 'main');
    const docSnap = await getDoc(dietPlanRef);

    if (docSnap.exists()) {
      return docSnap.data() as DietPlan;
    } else {
      return getDefaultDietPlan();
    }
  } catch (error) {
    console.error("Error fetching diet plan: ", error);
    // Return a default plan on error to avoid crashing the UI
    return getDefaultDietPlan();
  }
};

export async function saveDietPlan(userId:string, dietPlan: DietPlan): Promise<void> {
  if (!userId) throw new Error("User ID is required to save a diet plan.");
  try {
    const dietPlanRef = doc(db, 'users', userId, 'dietPlan', 'main');
    // Using set with merge is safer and allows partial updates if needed in the future
    await setDoc(dietPlanRef, dietPlan, { merge: true });
  } catch (error) {
    console.error("Error saving diet plan: ", error);
    throw new Error("Could not save the diet plan to the database.");
  }
};
