import type { Habit, CommunityUser } from './types';
  
export const placeholderCommunityUsers: CommunityUser[] = [
  {
    id: 'user-1',
    name: 'Alice',
    avatarUrl: 'https://placehold.co/100x100.png',
    habits: [
      { name: 'Run 5k', icon: 'Dumbbell', progress: 5, completed: true, goal: '5 km' },
      { name: 'Drink 8 glasses of water', icon: 'Leaf', progress: 6, completed: false, goal: '8 glasses' },
    ],
  },
  {
    id: 'user-2',
    name: 'Bob',
    avatarUrl: 'https://placehold.co/100x100.png',
    habits: [
      { name: 'Code for 1 hour', icon: 'Clock', progress: 60, completed: true, goal: '60 minutes' },
      { name: 'Journal', icon: 'BookOpen', progress: 1, completed: true, goal: '1 entry' },
    ],
  },
  {
    id: 'user-3',
    name: 'Charlie',
    avatarUrl: 'https://placehold.co/100x100.png',
    habits: [
      { name: 'Eat a healthy meal', icon: 'Leaf', progress: 1, completed: false, goal: '2 meals' },
    ],
  },
    {
    id: 'user-4',
    name: 'Diana',
    avatarUrl: 'https://placehold.co/100x100.png',
    habits: [
      { name: 'Morning Walk', icon: 'Dumbbell', progress: 1, completed: true, goal: '1 walk' },
      { name: 'Plan the day', icon: 'Target', progress: 1, completed: true, goal: '1 plan' },
      { name: 'No social media after 10pm', icon: 'Clock', progress: 0, completed: false, goal: '1 evening' },
    ],
  },
];
