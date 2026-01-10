'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { notFound } from 'next/navigation';
import { format, isToday } from 'date-fns';
import { Calendar as CalendarIcon, EyeOff, User } from 'lucide-react';
import type { Habit } from '@/lib/types';
import { getHabits } from '@/services/habits';
import { getUserProfile } from '@/services/users';
import { useToast } from '@/hooks/use-toast';
import { useHiddenHabits } from '@/hooks/use-hidden-habits';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { HabitCard } from '@/components/dashboard/habit-card';

export default function FriendDashboardPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const [friend, setFriend] = useState<{ id: string; displayName: string | null } | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const { hiddenHabits, isLoading: isHiddenHabitsLoading } = useHiddenHabits(selectedDate, true); // Read-only

  const { toast } = useToast();

  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  const fetchFriendAndHabits = useCallback(async (dateToFetch: Date) => {
    if (!userId) return;
    setLoading(true);
    try {
      const [fetchedFriend, fetchedHabits] = await Promise.all([
        !friend ? getUserProfile(userId) : Promise.resolve(friend),
        getHabits(userId, dateToFetch)
      ]);
      
      if (!fetchedFriend) {
        return notFound();
      }

      setFriend(fetchedFriend);
      setHabits(fetchedHabits);

    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch friend\'s data. They may not exist or there was a connection issue.',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast, friend]);

  useEffect(() => {
    if (selectedDate) {
      fetchFriendAndHabits(selectedDate);
    }
  }, [fetchFriendAndHabits, selectedDate]);

  const visibleHabits = useMemo(() => {
    if (isHiddenHabitsLoading) return [];
    return habits
      .filter(habit => !hiddenHabits.includes(habit.id))
      .sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }, [habits, hiddenHabits, isHiddenHabitsLoading]);

  const isDashboardLoading = loading || isHiddenHabitsLoading;

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Viewing Friend's Dashboard</span>
            </div>
            <h1 className="text-lg font-semibold md:text-2xl font-headline">
              {friend?.displayName ? `${friend.displayName}'s Dashboard` : 'Friend\'s Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {!selectedDate
                ? "Loading..."
                : isToday(selectedDate)
                ? "Showing progress for today."
                : `Showing progress for ${format(selectedDate, "PPP")}.`
              }
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(day) => day && setSelectedDate(day)}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {isDashboardLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
            <h3 className="text-lg font-semibold">No habits to show.</h3>
            <p className="text-muted-foreground mt-2">
              This user hasn't created any habits yet.
            </p>
          </div>
        ) : visibleHabits.length === 0 && hiddenHabits.length > 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
            <h3 className="text-lg font-semibold">All habits for this day are hidden.</h3>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isReadOnly // This disables all actions
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
