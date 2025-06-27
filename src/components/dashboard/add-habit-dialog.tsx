'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Habit, HabitFrequency, HabitType } from '@/lib/types';

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { HabitIcon } from '@/components/habit-icon';

interface AddHabitDialogProps {
  onSave: (habit: Omit<Habit, 'id' | 'progress' | 'completed' | 'reports' | 'lastReportedValue'> & { id?: string }) => void;
  habitToEdit?: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const addHabitSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  description: z.string().min(1, 'Description is required.'),
  frequency: z.enum(['daily', 'weekly']),
  type: z.enum(['duration', 'time', 'boolean', 'number', 'options']),
  goal: z.string().min(1, 'Goal is required.'),
  icon: z.string().min(1, 'Icon is required.'),
  options: z.string().optional(),
}).refine(data => {
    if (data.type === 'options') {
        return data.options && data.options.trim().length > 0;
    }
    return true;
}, {
    message: 'Options are required for this habit type.',
    path: ['options'],
});

type AddHabitFormValues = z.infer<typeof addHabitSchema>;

const iconNames = ['Dumbbell', 'Leaf', 'Carrot', 'BookOpen', 'GraduationCap', 'Languages', 'FolderKanban', 'Target', 'Clock'];

export function AddHabitDialog({ onSave, habitToEdit, open, onOpenChange }: AddHabitDialogProps) {
  const isEditMode = !!habitToEdit;

  const form = useForm<AddHabitFormValues>({
    resolver: zodResolver(addHabitSchema),
    defaultValues: {
      name: '',
      description: '',
      frequency: 'daily',
      type: 'boolean',
      goal: '',
      icon: '',
      options: '',
    },
  });
  
  const habitType = form.watch('type');

  useEffect(() => {
    if (open && habitToEdit) {
      form.reset({
        ...habitToEdit,
        options: habitToEdit.options || '',
      });
    } else if (open && !habitToEdit) {
      form.reset({
        name: '',
        description: '',
        frequency: 'daily',
        type: 'boolean',
        goal: '',
        icon: '',
        options: '',
      });
    }
  }, [habitToEdit, open, form]);

  const onSubmit = (data: AddHabitFormValues) => {
    onSave({
      ...data,
      id: habitToEdit?.id,
      type: data.type as HabitType,
      frequency: data.frequency as HabitFrequency
    });
    onOpenChange(false);
  };
  
  const goalFieldInfo = {
    boolean: {
        label: 'Goal Description',
        placeholder: 'e.g., Meditate for 10 minutes',
        description: 'A simple "Done/Not Done" habit. The goal is the task itself.'
    },
    time: {
        label: 'Goal (Target Time)',
        placeholder: 'e.g., 18:00',
        description: 'The target time to complete the habit.'
    },
    duration: {
        label: 'Goal (Minutes)',
        placeholder: 'e.g., 30',
        description: 'The target duration in minutes.'
    },
    number: {
        label: 'Goal (Numeric)',
        placeholder: 'e.g., 25',
        description: 'The target number (e.g., pages, glasses of water).'
    },
     options: {
        label: 'Goal',
        placeholder: 'e.g., Eat a non-junky breakfast',
        description: 'Describe the goal you want to achieve through your choices.'
    }
  };

  const currentGoalInfo = goalFieldInfo[habitType as keyof typeof goalFieldInfo];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Make changes to your habit here. Click save when you\'re done.' : 'Define a new habit to start tracking your progress.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Read a book" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why is this habit important?"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iconNames.map(iconName => (
                          <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                               <HabitIcon name={iconName} className="h-4 w-4" />
                               <span>{iconName}</span>
                            </div>
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="duration">Duration</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        <SelectItem value="boolean">Done/Not Done</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="options">Options</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>
                        {currentGoalInfo.label}
                    </FormLabel>
                    <FormControl>
                        <Input
                        placeholder={currentGoalInfo.placeholder}
                        {...field}
                        />
                    </FormControl>
                    {currentGoalInfo.description && (
                        <FormDescription>
                        {currentGoalInfo.description}
                        </FormDescription>
                    )}
                    <FormMessage />
                    </FormItem>
                )}
                />

            {habitType === 'options' && (
                <FormField
                  control={form.control}
                  name="options"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Options (comma-separated)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Healthy, Junky, Skipped"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide the choices for this habit.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">{isEditMode ? 'Save Changes' : 'Save Habit'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
