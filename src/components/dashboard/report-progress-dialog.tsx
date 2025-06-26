'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Habit } from '@/lib/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface ReportProgressDialogProps {
  habit: Habit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (habit: Habit, value: any) => void;
  isSaving?: boolean;
}

const reportSchema = z.object({
  value: z.string().min(1, 'A value is required.'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export function ReportProgressDialog({ habit, open, onOpenChange, onSave, isSaving }: ReportProgressDialogProps) {
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  useEffect(() => {
    if (habit) {
      form.reset({ value: '' });
    }
  }, [habit, form]);
  
  if (!habit) return null;

  const onSubmit = (data: ReportFormValues) => {
    onSave(habit, data.value);
  };
  
  const renderFormField = () => {
    const goalParts = habit.goal.match(/(\d+)\s*(.*)/);
    const unit = goalParts?.[2]?.trim() || '';

    switch (habit.type) {
      case 'number':
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{`Value (${unit})`}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder={`Enter ${unit}`} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'duration':
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'time':
         return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Completed</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'options':
        const options = habit.goal.split(',').map(s => s.trim());
        return (
           <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select an Option</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      case 'boolean':
      default:
        return <p className="text-sm">Ready to mark this as complete for the day?</p>;
    }
  };
  
  const needsFormField = habit.type !== 'boolean';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Report Progress: {habit.name}</DialogTitle>
          <DialogDescription>
            Log your progress for this habit. Every step counts!
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             {needsFormField ? (
              renderFormField()
            ) : (
              <p className="text-sm text-muted-foreground">Ready to mark this as complete?</p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Progress'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
