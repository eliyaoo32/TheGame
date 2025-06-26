'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { HabitCard } from '@/components/dashboard/habit-card';
import { ChatReporter } from '@/components/dashboard/chat-reporter';
import { DashboardSummary } from '@/components/dashboard/dashboard-summary';
import type { Habit } from '@/lib/types';
import { getHabits, updateHabit } from '@/services/habits';
import { getHabitFeedback } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingHabitId, setCompletingHabitId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedHabits = await getHabits();
      setHabits(fetchedHabits);
    } catch (error) {
      console.error("Failed to fetch habits:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch your habits. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleHabitComplete = (habit: Habit) => {
    startTransition(async () => {
      setCompletingHabitId(habit.id);
      
      const updatedHabit = { ...habit, completed: true, progress: 100 };
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? updatedHabit : h)));
      
      try {
        await updateHabit(habit.id, { completed: true, progress: 100 });
        
        const result = await getHabitFeedback({
          habitName: updatedHabit.name,
          description: updatedHabit.description,
          habitType: updatedHabit.type,
          habitFrequency: updatedHabit.frequency,
          habitGoal: updatedHabit.goal,
          habitStatus: updatedHabit.completed,
        });

        if (result.success && result.feedback) {
          await updateHabit(habit.id, { feedback: result.feedback });
          setHabits((prev) =>
            prev.map((h) =>
              h.id === habit.id ? { ...updatedHabit, feedback: result.feedback } : h
            )
          );
        } else if (!result.success) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
      } catch (error) {
         console.error("Failed to update habit:", error);
         toast({ variant: 'destructive', title: 'Error', description: 'Could not complete habit.' });
         // Revert optimistic update
         setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
      } finally {
        setCompletingHabitId(null);
      }
    });
  };

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

        {loading ? (
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
          </div>
        ) : habits.length === 0 ? (
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
                    <HabitCard 
                        key={habit.id} 
                        habit={habit} 
                        onComplete={handleHabitComplete}
                        isCompleting={isPending && completingHabitId === habit.id}
                    />
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
                     <HabitCard 
                        key={habit.id} 
                        habit={habit} 
                        onComplete={handleHabitComplete}
                        isCompleting={isPending && completingHabitId === habit.id}
                    />
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
