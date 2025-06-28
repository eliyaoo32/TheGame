
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserProfile, DietTargets } from '@/lib/types';
import { calculateTDEE } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

const targetsSchema = z.object({
  calories: z.coerce.number().min(1, 'Calories are required'),
  protein: z.coerce.number().min(1, 'Protein is required'),
  carbs: z.coerce.number().min(1, 'Carbs are required'),
  fat: z.coerce.number().min(1, 'Fat is required'),
});

type TargetsFormValues = z.infer<typeof targetsSchema>;

interface StepTargetsProps {
  profile: UserProfile;
  onNext: (data: { targets: DietTargets }) => void;
  onBack: () => void;
}

export function StepTargets({ profile, onNext, onBack }: StepTargetsProps) {
  const tdee = calculateTDEE(profile);
  
  const form = useForm<TargetsFormValues>({
    resolver: zodResolver(targetsSchema),
    defaultValues: {
      calories: tdee,
      protein: Math.round((tdee * 0.3) / 4), // Default to 30% from protein
      carbs: Math.round((tdee * 0.4) / 4), // Default to 40% from carbs
      fat: Math.round((tdee * 0.3) / 9), // Default to 30% from fat
    },
  });

  useEffect(() => {
    form.reset({
      calories: tdee,
      protein: Math.round((tdee * 0.3) / 4),
      carbs: Math.round((tdee * 0.4) / 4),
      fat: Math.round((tdee * 0.3) / 9),
    });
  }, [tdee, form]);


  const onSubmit = (values: TargetsFormValues) => {
    onNext({ targets: values });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Step 2: Define Your Targets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-4">
            <Info className="h-5 w-5 text-primary mt-1" />
            <div>
                <h3 className="font-semibold text-primary">Suggested Daily Calories</h3>
                <p className="text-sm text-muted-foreground">
                    Based on your profile, we suggest about <strong className="text-foreground">{tdee} kcal</strong> per day to maintain your current weight. Adjust this and the macronutrients below to match your goals.
                </p>
            </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField name="calories" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Daily Calories (kcal)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField name="protein" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Protein (g)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="carbs" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Carbohydrates (g)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="fat" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Fat (g)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
              <Button type="submit">Next: Structure Meals</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
