export type Habit = {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'duration' | 'time' | 'boolean' | 'enum';
  icon: string;
  progress: number; // 0-100
  target: string; // e.g., "30 minutes", "8:00 PM", "Completed"
  completed: boolean;
  feedback?: string;
};

export type CommunityUser = {
  id: string;
  name: string;
  avatarUrl: string;
  habits: Pick<Habit, 'name' | 'icon' | 'progress' | 'completed'>[];
};
