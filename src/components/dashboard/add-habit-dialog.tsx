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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { HabitIcon } from '@/components/habit-icon';

interface AddHabitDialogProps {
  onSave: (habit: Omit<Habit, 'id' | 'progress' | 'completed' | 'feedback'> & { id?: string }) => void;
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
});

type AddHabitFormValues = z.infer<typeof addHabitSchema>;

const iconNames = ['Dumbbell', 'BookOpen', 'Leaf', 'Target', 'Clock'];

export function AddHabitDialog({ onSave, habitToEdit, open, onOpenChange }: AddHabitDialogProps) {
  const { toast } = useToast();
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
    },
  });

  useEffect(() => {
    if (open && habitToEdit) {
      form.reset(habitToEdit);
    } else if (open && !habitToEdit) {
      form.reset({
        name: '',
        description: '',
        frequency: 'daily',
        type: 'boolean',
        goal: '',
        icon: '',
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
    toast({
      title: isEditMode ? 'Habit updated!' : 'Habit added!',
      description: `"${data.name}" has been saved.`,
    });
  };

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
                  <FormLabel>Goal</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 30 minutes, 20 pages" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
