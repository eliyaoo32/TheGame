'use client';

import { useState } from 'react';
import { placeholderHabits } from '@/lib/placeholder-data';
import { HabitCard } from '@/components/dashboard/habit-card';
import { AddHabitDialog } from '@/components/dashboard/add-habit-dialog';
import { ChatReporter } from '@/components/dashboard/chat-reporter';
import { DashboardSummary } from '@/components/dashboard/dashboard-summary';
import type { Habit } from '@/lib/types';

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>(placeholderHabits);

  const addHabit = (newHabitData: Omit<Habit, 'id' | 'progress' | 'completed' | 'feedback'>) => {
    const newHabit: Habit = {
      ...newHabitData,
      id: crypto.randomUUID(),
      progress: 0,
      completed: false,
    };
    setHabits(prevHabits => [...prevHabits, newHabit]);
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl font-headline">
            Dashboard
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <AddHabitDialog onAddHabit={addHabit} />
          </div>
        </div>

        <DashboardSummary habits={habits} />

        <div>
          <h2 className="text-lg font-semibold md:text-xl font-headline mb-4">
            My Habits
          </h2>
           {habits.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {habits.map((habit) => (
                <HabitCard key={habit.id} habit={habit} />
              ))}
            </div>
          ) : (
             <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
                <h3 className="text-lg font-semibold">No habits yet!</h3>
                <p className="text-muted-foreground mt-2">Click "Add Habit" to get started on your journey.</p>
            </div>
          )}
        </div>
      </div>
      <ChatReporter />
    </>
  );
}
