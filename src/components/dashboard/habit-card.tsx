'use client';

import { useState, useTransition } from 'react';
import type { Habit } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { getHabitFeedback } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { HabitIcon } from '@/components/habit-icon';

interface HabitCardProps {
  habit: Habit;
}

export function HabitCard({ habit: initialHabit }: HabitCardProps) {
  const [habit, setHabit] = useState(initialHabit);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleComplete = () => {
    startTransition(async () => {
      const updatedHabit = { ...habit, completed: true, progress: 100 };
      setHabit(updatedHabit);

      const result = await getHabitFeedback({
        habitName: updatedHabit.name,
        habitType: updatedHabit.type,
        habitStatus: updatedHabit.completed,
      });

      if (result.success) {
        setHabit((prev) => ({ ...prev, feedback: result.feedback }));
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
    });
  };

  return (
    <Card className={cn("flex flex-col transition-shadow duration-200 hover:shadow-lg", habit.completed && "bg-muted/60")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HabitIcon name={habit.icon} className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-lg font-medium">{habit.name}</CardTitle>
          </div>
          {habit.completed && <Badge variant="secondary">Done!</Badge>}
        </div>
        <CardDescription>{habit.target}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <Progress value={habit.progress} aria-label={`${habit.name} progress`} />
        {habit.feedback && (
          <div className="mt-4 flex items-start gap-2 text-sm text-primary p-3 bg-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{habit.feedback}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleComplete}
          disabled={habit.completed || isPending}
          className="w-full"
        >
          {isPending ? 'Updating...' : 'Mark as Complete'}
        </Button>
      </CardFooter>
    </Card>
  );
}
