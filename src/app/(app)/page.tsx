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
import { ReportProgressDialog } from '@/components/dashboard/report-progress-dialog';

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportingHabit, setReportingHabit] = useState<Habit | null>(null);
  const [updatingHabitId, setUpdatingHabitId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState('');
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
        title: 'Error fetching habits',
        description: 'Could not fetch your habits. Please ensure your Firebase configuration in .env is correct and check your Firestore security rules.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }));
  }, []);

  const handleSaveProgress = (habit: Habit, value: any) => {
    setUpdatingHabitId(habit.id);
    startTransition(async () => {
      let progress = habit.progress || 0;
      let completed = habit.completed;

      const goalValue = parseInt(habit.goal.match(/\d+/)?.[0] || '1', 10);

      if (habit.type === 'boolean' || habit.type === 'time' || habit.type === 'options') {
        progress = goalValue;
      } else if (habit.type === 'number' || habit.type === 'duration') {
        const reportedValue = Number(value);
        if (!isNaN(reportedValue)) {
          progress += reportedValue;
        }
      }

      completed = progress >= goalValue;

      const updatedHabit = { ...habit, progress, completed };
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? updatedHabit : h)));
      setReportingHabit(null);
      
      try {
        await updateHabit(habit.id, { progress, completed });
        toast({ title: "Progress saved!", description: `Your progress for "${habit.name}" has been updated.`});

        // If the habit is now completed and wasn't before, get AI feedback.
        if (completed && !habit.completed) {
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
                toast({ variant: 'destructive', title: 'AI Feedback Error', description: result.error });
            }
        }
      } catch (error) {
         console.error("Failed to update habit:", error);
         toast({ variant: 'destructive', title: 'Error', description: 'Could not save your progress.' });
         // Revert optimistic update
         setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
      } finally {
        setUpdatingHabitId(null);
      }
    });
  };

  const handleRestartHabit = (habit: Habit) => {
    setUpdatingHabitId(habit.id);
    startTransition(async () => {
      const originalHabit = { ...habit };
      // Optimistically update the UI
      const updatedHabit = { ...habit, progress: 0, completed: false, feedback: undefined };
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? updatedHabit : h)));

      try {
        await updateHabit(habit.id, { progress: 0, completed: false, feedback: '' });
        toast({ title: "Habit restarted!", description: `Progress for "${habit.name}" has been reset.` });
      } catch (error) {
        console.error("Failed to restart habit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not restart habit.' });
        // Revert on error
        setHabits((prev) => prev.map((h) => (h.id === habit.id ? originalHabit : h)));
      } finally {
        setUpdatingHabitId(null);
      }
    });
  };

  const dailyHabits = habits.filter((habit) => habit.frequency === 'daily');
  const weeklyHabits = habits.filter((habit) => habit.frequency === 'weekly');

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
                        onReport={() => setReportingHabit(habit)}
                        onRestart={handleRestartHabit}
                        isUpdating={isPending && updatingHabitId === habit.id}
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
                        onReport={() => setReportingHabit(habit)}
                        onRestart={handleRestartHabit}
                        isUpdating={isPending && updatingHabitId === habit.id}
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

      <ReportProgressDialog
        habit={reportingHabit}
        open={!!reportingHabit}
        onOpenChange={(open) => !open && setReportingHabit(null)}
        onSave={handleSaveProgress}
        isSaving={isPending}
       />
    </>
  );
}
