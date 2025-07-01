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

export function parseDuration(durationStr: string): number | null {
  if (!durationStr) return null;

  // Handles formats like "1h 30m", "2h", "90m"
  const durationRegex = /(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/;
  const matches = durationStr.toLowerCase().trim().match(durationRegex);

  // If no "h" or "m" is found, try to parse as a plain number (assumed minutes)
  if (!matches || (matches[0] === '' && durationStr.match(/[a-z]/i))) {
      const plainMinutes = parseInt(durationStr, 10);
      if (!isNaN(plainMinutes) && String(plainMinutes) === durationStr) {
        return plainMinutes;
      }
      return null;
  }
  
  if (matches[0] === '') return null;

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  
  if (isNaN(hours) || isNaN(minutes)) return null;

  const totalMinutes = hours * 60 + minutes;
  return totalMinutes >= 0 ? totalMinutes : null;
}

export function formatDuration(totalMinutes: number): string {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '';
    if (totalMinutes === 0) return '0m';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let result = '';
    if (hours > 0) {
        result += `${hours}h`;
    }
    if (minutes > 0) {
        result += `${result.length > 0 ? ' ' : ''}${minutes}m`;
    }
    return result;
}
