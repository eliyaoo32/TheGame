
'use client';

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
import { RotateCcw } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn, formatDuration } from '@/lib/utils';
import { HabitIcon } from '@/components/habit-icon';

interface HabitCardProps {
  habit: Habit;
  onReport: (habit: Habit) => void;
  onRestart: (habit: Habit) => void;
  isUpdating?: boolean;
}

export function HabitCard({ habit, onReport, onRestart, isUpdating }: HabitCardProps) {

  const handleReport = () => {
    if (!isUpdating) {
        onReport(habit);
    }
  };

  const handleRestart = () => {
    if (!isUpdating) {
        onRestart(habit);
    }
  };

  const getStatusText = () => {
    const goal = habit.goal;
    switch (habit.type) {
      case 'time':
        if (habit.lastReportedValue) {
          return `Reported at ${habit.lastReportedValue}${goal ? ` (Goal: ${goal})` : ''}`;
        }
        return goal ? `Goal: ${goal}` : 'Log a time';
      case 'options':
        if (habit.lastReportedValue) {
          return `Last choice: ${habit.lastReportedValue}`;
        }
        return goal ? `Goal: ${goal}` : 'Make a choice';
      case 'boolean':
        if (habit.completed) {
            return `Completed${goal ? `: ${goal}` : ''}`;
        }
        return goal ? `Goal: ${goal}` : 'Mark as done';
      case 'number': {
        const currentValue = habit.progress || 0;
        if (!goal) return `Progress: ${currentValue}`;
        const goalValue = parseInt(goal.match(/\d+/)?.[0] || '0', 10);
        const goalUnit = goal.replace(/^\d+\s*/, '');
        return `Progress: ${currentValue} / ${goalValue} ${goalUnit.trim()}`;
      }
      case 'duration': {
        const currentValue = habit.progress || 0;
        if (!goal) return `Progress: ${formatDuration(currentValue)}`;
        const goalValue = parseInt(goal, 10); // Goal is already normalized to minutes string by service
        return `Progress: ${formatDuration(currentValue)} / ${formatDuration(goalValue)}`;
      }
      default:
        return goal ? `Goal: ${goal}` : '';
    }
  };

  const getProgressPercentage = () => {
    const goal = habit.goal;
    if (habit.type === 'boolean' || habit.type === 'time' || habit.type === 'options') {
        const goalValue = 1;
        const percentage = ((habit.progress || 0) / goalValue) * 100;
        return Math.min(100, percentage);
    }
    
    if (!goal) {
        return habit.progress > 0 ? 100 : 0; // If no goal, any progress is 100%
    }
    
    const goalValue = parseInt(goal.match(/\d+/)?.[0] || '1', 10);
    if (goalValue <= 0) return 0;
    
    const percentage = ((habit.progress || 0) / goalValue) * 100;
    return Math.min(100, percentage);
  };
  

  return (
    <Card className={cn("flex flex-col transition-shadow duration-200 hover:shadow-lg", habit.completed && "bg-muted/60")}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <HabitIcon name={habit.icon} className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-lg font-medium">{habit.name}</CardTitle>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={habit.frequency === 'daily' ? 'secondary' : 'outline'} className="capitalize">{habit.frequency}</Badge>
            {habit.completed && <Badge variant="secondary">Done!</Badge>}
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
            <CardDescription>{getStatusText()}</CardDescription>
            {habit.categoryName && (
                <Badge variant="outline" className="font-normal">{habit.categoryName}</Badge>
            )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <Progress value={getProgressPercentage()} aria-label={`${habit.name} progress`} />
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          onClick={handleReport}
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? 'Saving...' : 'Report Progress'}
        </Button>
        {habit.progress > 0 && (
            <Button
                onClick={handleRestart}
                disabled={isUpdating}
                variant="outline"
                size="icon"
                aria-label="Restart habit progress"
            >
                <RotateCcw className="h-4 w-4" />
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
