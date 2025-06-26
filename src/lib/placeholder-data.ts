import type { Habit, CommunityUser } from './types';

export const placeholderHabits: Habit[] = [
  {
    id: '1',
    name: 'Morning Workout',
    description: 'A 45-minute workout session to kickstart the day.',
    type: 'duration',
    frequency: 'daily',
    icon: 'Dumbbell',
    progress: 75,
    goal: '45 minutes',
    completed: false,
  },
  {
    id: '2',
    name: 'Read 20 pages',
    description: 'Read at least 20 pages of a book to expand knowledge.',
    type: 'number',
    frequency: 'daily',
    icon: 'BookOpen',
    progress: 100,
    goal: '20 pages',
    completed: true,
    feedback: 'Great job staying consistent with your reading!',
  },
  {
    id: '3',
    name: 'Meditate',
    description: 'A short meditation session to practice mindfulness.',
    type: 'time',
    frequency: 'daily',
    icon: 'Leaf',
    progress: 0,
    goal: 'by 8:00 AM',
    completed: false,
  },
  {
    id: '4',
    name: 'Weekly Review',
    description: 'Review the past week and plan for the next one.',
    type: 'boolean',
    frequency: 'weekly',
    icon: 'Target',
    progress: 0,
    goal: 'Complete weekly review',
    completed: false,
  },
];

export const placeholderCommunityUsers: CommunityUser[] = [
  {
    id: 'user-1',
    name: 'Alice',
    avatarUrl: 'https://placehold.co/100x100.png',
    habits: [
      { name: 'Run 5k', icon: 'Dumbbell', progress: 100, completed: true },
      { name: 'Drink 8 glasses of water', icon: 'Leaf', progress: 80, completed: false },
    ],
  },
  {
    id: 'user-2',
    name: 'Bob',
    avatarUrl: 'https://placehold.co/100x100.png',
    habits: [
      { name: 'Code for 1 hour', icon: 'Clock', progress: 100, completed: true },
      { name: 'Journal', icon: 'BookOpen', progress: 100, completed: true },
    ],
  },
  {
    id: 'user-3',
    name: 'Charlie',
    avatarUrl: 'https://placehold.co/100x100.png',
    habits: [
      { name: 'Eat a healthy meal', icon: 'Leaf', progress: 50, completed: false },
    ],
  },
    {
    id: 'user-4',
    name: 'Diana',
    avatarUrl: 'https://placehold.co/100x100.png',
    habits: [
      { name: 'Morning Walk', icon: 'Dumbbell', progress: 100, completed: true },
      { name: 'Plan the day', icon: 'Target', progress: 100, completed: true },
      { name: 'No social media after 10pm', icon: 'Clock', progress: 70, completed: false },
    ],
  },
];
