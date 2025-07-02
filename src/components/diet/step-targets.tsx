
'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserProfile, DietTargets, DietObjective } from '@/lib/types';
import { calculateTDEE } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  objective: DietObjective;
  onNext: (data: { targets: DietTargets }) => void;
  onBack: () => void;
}

export function StepTargets({ profile, objective, onNext, onBack }: StepTargetsProps) {
  const { bmr, tdee, suggestedGoalCalories } = useMemo(() => {
    const { bmr, tdee } = calculateTDEE(profile);
    let goalCalories = tdee;
    if (objective === 'lose_weight') {
      goalCalories -= 500;
    } else if (objective === 'gain_weight') {
      goalCalories += 500;
    }
    return { bmr, tdee, suggestedGoalCalories: goalCalories };
  }, [profile, objective]);

  const form = useForm<TargetsFormValues>({
    resolver: zodResolver(targetsSchema),
    defaultValues: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  });
  
  // Set initial values based on profile and objective
  useEffect(() => {
    const initialProtein = Math.round(profile.weight * 1.7);
    const initialFat = Math.round(profile.weight);
    const initialCarbs = Math.round((suggestedGoalCalories - (initialProtein * 4) - (initialFat * 9)) / 4);
    const initialCalories = Math.round((initialProtein * 4) + (initialCarbs * 4) + (initialFat * 9));

    form.reset({
      calories: initialCalories,
      protein: initialProtein,
      carbs: initialCarbs,
      fat: initialFat,
    });
  }, [suggestedGoalCalories, profile.weight, form]);

  // Watch for changes in macro fields and update calories
  const protein = form.watch('protein');
  const carbs = form.watch('carbs');
  const fat = form.watch('fat');

  useEffect(() => {
      const p = Number(protein) || 0;
      const c = Number(carbs) || 0;
      const f = Number(fat) || 0;
      
      const totalCalories = Math.round((p * 4) + (c * 4) + (f * 9));
      
      if (totalCalories !== (Number(form.getValues('calories')) || 0)) {
          form.setValue('calories', totalCalories, { shouldValidate: true });
      }

  }, [protein, carbs, fat, form]);

  const onSubmit = (values: TargetsFormValues) => {
    onNext({ targets: values });
  };

  const objectiveTextMap: Record<DietObjective, string> = {
    lose_weight: 'a 500 calorie deficit to lose weight',
    gain_weight: 'a 500 calorie surplus to gain weight',
    maintain_weight: 'your maintenance level to maintain weight',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Step 2: Define Your Targets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-primary">Your Caloric Needs</h3>
              <p className="text-sm text-muted-foreground">
                Here's a breakdown based on your profile. These are estimates, so feel free to adjust them.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Basal Metabolic Rate (BMR)</p>
              <p className="text-lg font-bold text-foreground">{bmr} kcal</p>
              <p className="text-xs text-muted-foreground">Calories you burn at rest.</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Burn (TDEE)</p>
              <p className="text-lg font-bold text-foreground">{tdee} kcal</p>
              <p className="text-xs text-muted-foreground">BMR x 1.3 activity factor.</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Suggested Goal</p>
              <p className="text-lg font-bold text-primary">{suggestedGoalCalories} kcal</p>
              <p className="text-xs text-muted-foreground">Based on {objectiveTextMap[objective]}.</p>
            </div>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            <FormField name="calories" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Daily Calories Goal (kcal)</FormLabel>
                <FormControl><Input type="number" {...field} disabled /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
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
