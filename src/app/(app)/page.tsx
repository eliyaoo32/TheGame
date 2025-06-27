'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { HabitCard } from '@/components/dashboard/habit-card';
import { ChatReporter } from '@/components/dashboard/chat-reporter';
import type { Habit, HabitReport } from '@/lib/types';
import { getHabits, addHabitReport, deleteHabitReportsForPeriod } from '@/services/habits';
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
        description: 'Could not fetch your habits. Please ensure your Firebase configuration in .env is correct and check your Firestore security rules. After fixing, you may need to refresh the page.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  useEffect(() => {
    // This runs only on the client, after hydration
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
      // Create a temporary new report for optimistic update
      const newReport: HabitReport = {
        id: `temp-${Date.now()}`,
        value: value,
        reportedAt: new Date(),
      };

      const updatedReports = [...habit.reports, newReport];
      
      let newProgress = 0;
      if (habit.type === 'number' || habit.type === 'duration') {
        newProgress = updatedReports.reduce((sum, report) => sum + Number(report.value || 0), 0);
      } else { // boolean, time, options
        newProgress = updatedReports.length;
      }

      const goalValue = (habit.type === 'boolean' || habit.type === 'time' || habit.type === 'options')
          ? 1
          : parseInt(habit.goal.match(/\d+/)?.[0] || '1', 10);
      
      const newCompleted = newProgress >= goalValue;

      const optimisticallyUpdatedHabit: Habit = {
        ...habit,
        reports: updatedReports,
        progress: newProgress,
        completed: newCompleted,
        lastReportedValue: String(value),
      };
      
      // Optimistically update the UI
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? optimisticallyUpdatedHabit : h)));
      setReportingHabit(null);
      
      try {
        await addHabitReport(habit.id, value);
        toast({ title: "Progress saved!", description: `Your progress for "${habit.name}" has been updated.`});
      } catch (error) {
         console.error("Failed to update habit:", error);
         toast({ variant: 'destructive', title: 'Error', description: 'Could not save your progress.' });
         // Revert optimistic update by refetching everything
         fetchHabits();
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
      const updatedHabit = { ...habit, reports: [], progress: 0, completed: false, lastReportedValue: undefined };
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? updatedHabit : h)));

      try {
        await deleteHabitReportsForPeriod(habit.id, habit.frequency);
        toast({ title: "Habit restarted!", description: `Progress for "${habit.name}" has been reset for this period.` });
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
