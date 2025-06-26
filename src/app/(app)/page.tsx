'use client';

import { useState } from 'react';
import { placeholderHabits } from '@/lib/placeholder-data';
import { HabitCard } from '@/components/dashboard/habit-card';
import { ChatReporter } from '@/components/dashboard/chat-reporter';
import { DashboardSummary } from '@/components/dashboard/dashboard-summary';
import type { Habit } from '@/lib/types';

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>(placeholderHabits);

  const dailyHabits = habits.filter((habit) => habit.frequency === 'daily');
  const weeklyHabits = habits.filter((habit) => habit.frequency === 'weekly');

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl font-headline">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">{currentDate}</p>
          </div>
        </div>

        <DashboardSummary habits={habits} />

        {habits.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
            <h3 className="text-lg font-semibold">No habits yet!</h3>
            <p className="text-muted-foreground mt-2">
              Go to "Manage Habits" to get started on your journey.
            </p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold md:text-xl font-headline mb-4">
                Daily Goals
              </h2>
              {dailyHabits.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {dailyHabits.map((habit) => (
                    <HabitCard key={habit.id} habit={habit} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No daily habits to show.
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold md:text-xl font-headline mb-4">
                Weekly Goals
              </h2>
              {weeklyHabits.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {weeklyHabits.map((habit) => (
                    <HabitCard key={habit.id} habit={habit} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No weekly habits to show.
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <ChatReporter />
    </>
  );
}
