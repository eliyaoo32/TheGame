
'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Meal } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';

const mealsSchema = z.object({
  meals: z.array(z.object({
    name: z.string().min(1, 'Meal name cannot be empty.'),
  })).min(1, 'You must have at least one meal.'),
});

type MealsFormValues = z.infer<typeof mealsSchema>;

interface StepMealsProps {
  onFinish: (data: { meals: Meal[] }) => void;
  onBack: () => void;
}

export function StepMeals({ onFinish, onBack }: StepMealsProps) {
  const form = useForm<MealsFormValues>({
    resolver: zodResolver(mealsSchema),
    defaultValues: {
      meals: [{ name: 'Breakfast' }, { name: 'Lunch' }, { name: 'Dinner' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'meals',
  });

  const onSubmit = (values: MealsFormValues) => {
    const mealsWithIds = values.meals.map((meal, index) => ({
      id: `meal_${index}_${Date.now()}`,
      name: meal.name,
      foods: [],
    }));
    onFinish({ meals: mealsWithIds });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Step 3: Structure Your Meals</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`meals.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal {index + 1}</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input {...field} placeholder="e.g., Breakfast" />
                        </FormControl>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            
            <Button type="button" variant="outline" onClick={() => append({ name: '' })}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Meal
            </Button>
            
            <div className="flex justify-between pt-4">
              <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
              <Button type="submit">Finish & Start Planning</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
