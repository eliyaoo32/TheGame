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
