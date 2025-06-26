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
  progress: number; // 0-100
  completed: boolean;
  feedback?: string;
};

export type CommunityUser = {
  id: string;
  name: string;
  avatarUrl: string;
  habits: Pick<Habit, 'name' | 'icon' | 'progress' | 'completed'>[];
};
