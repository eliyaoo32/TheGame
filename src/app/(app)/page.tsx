'use client';

import { useState } from 'react';
import { placeholderHabits } from '@/lib/placeholder-data';
import { HabitCard } from '@/components/dashboard/habit-card';
import { ChatReporter } from '@/components/dashboard/chat-reporter';
import { DashboardSummary } from '@/components/dashboard/dashboard-summary';
import type { Habit } from '@/lib/types';

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>(placeholderHabits);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl font-headline">
            Dashboard
          </h1>
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
                <p className="text-muted-foreground mt-2">Go to "Manage Habits" to get started on your journey.</p>
            </div>
          )}
        </div>
      </div>
      <ChatReporter />
    </>
  );
}
