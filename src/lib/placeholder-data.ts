import type { Habit, CommunityUser } from './types';
  
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
