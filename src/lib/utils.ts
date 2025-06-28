
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { UserProfile } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const calculateTDEE = (profile: UserProfile): number => {
  const { age, weight, weightUnit, height, heightUnit, gender } = profile;

  const weightInKg = weightUnit === 'lbs' ? weight / 2.20462 : weight;
  const heightInCm = heightUnit === 'in' ? height * 2.54 : height;

  let bmr = 0;
  // Mifflin-St Jeor equation for BMR
  if (gender === 'male') {
    bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * age + 5;
  } else {
    bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * age - 161;
  }

  // TDEE = BMR * Activity Factor (1.55 for moderately active)
  const tdee = bmr * 1.55;

  return Math.round(tdee);
};
