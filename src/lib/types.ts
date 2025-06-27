export type HabitType = 'duration' | 'time' | 'boolean' | 'number' | 'options';
export type HabitFrequency = 'daily' | 'weekly';

export type Habit = {
  id: string;
  name: string;
  description: string;
  type: HabitType;
  frequency: HabitFrequency;
  icon: string;
  goal: string;
  options?: string; // For type 'options', e.g., "Healthy, Junky"
  progress: number; // The actual tracked value, NOT a percentage.
  completed: boolean;
  feedback?: string;
  lastReportedValue?: string;
};
