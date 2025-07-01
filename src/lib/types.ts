

export type HabitType = 'duration' | 'time' | 'boolean' | 'number' | 'options';
export type HabitFrequency = 'daily' | 'weekly';

export type Category = {
  id: string;
  name: string;
};

export type HabitReport = {
  id: string;
  value: any;
  reportedAt: Date;
};

export type Habit = {
  id: string;
  name: string;
  description: string;
  type: HabitType;
  frequency: HabitFrequency;
  icon: string;
  goal: string;
  options?: string; // For type 'options', e.g., "Healthy, Junky"
  progress: number; // The actual tracked value for the period, NOT a percentage.
  completed: boolean;
  reports: HabitReport[]; // A list of reports for the current period
  lastReportedValue?: string;
  categoryId?: string;
  categoryName?: string;
};

// Diet Planner Types
export type Gender = 'male' | 'female';
export type DietObjective = 'lose_weight' | 'maintain_weight' | 'gain_weight';
export type WeightUnit = 'kg' | 'lbs';
export type HeightUnit = 'cm' | 'in';

export interface UserProfile {
  age: number;
  weight: number;
  weightUnit: WeightUnit;
  height: number;
  heightUnit: HeightUnit;
  gender: Gender;
}

export interface DietTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  name: string;
  foods: FoodItem[];
}

export interface DietPlan {
  profile: UserProfile;
  objective: DietObjective;
  targets: DietTargets;
  meals: Meal[];
  isWizardComplete: boolean;
}
