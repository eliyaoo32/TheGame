
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserProfile, Gender, DietObjective, WeightUnit, HeightUnit } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const profileSchema = z.object({
  age: z.coerce.number().min(1, "Age is required"),
  weight: z.coerce.number().min(1, "Weight is required"),
  weightUnit: z.enum(['kg', 'lbs']),
  height: z.coerce.number().min(1, "Height is required"),
  heightUnit: z.enum(['cm', 'in']),
  gender: z.enum(['male', 'female']),
  objective: z.enum(['lose_weight', 'maintain_weight', 'gain_weight']),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface StepProfileProps {
  onNext: (data: { profile: UserProfile, objective: DietObjective }) => void;
}

export function StepProfile({ onNext }: StepProfileProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      age: 30,
      weight: 70,
      weightUnit: 'kg',
      height: 175,
      heightUnit: 'cm',
      gender: 'male',
      objective: 'maintain_weight',
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    const { objective, ...profile } = values;
    onNext({ profile, objective });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Step 1: Your Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField name="age" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="gender" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField name="weight" control={form.control} render={({ field }) => (
                 <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <div className="flex gap-2">
                      <FormControl><Input type="number" {...field} className="flex-grow" /></FormControl>
                      <FormField name="weightUnit" control={form.control} render={({ field: unitField }) => (
                         <Select onValueChange={unitField.onChange} defaultValue={unitField.value}>
                            <FormControl><SelectTrigger className="w-24"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="lbs">lbs</SelectItem>
                            </SelectContent>
                         </Select>
                      )} />
                    </div>
                    <FormMessage />
                  </FormItem>
              )} />
               <FormField name="height" control={form.control} render={({ field }) => (
                 <FormItem>
                    <FormLabel>Height</FormLabel>
                    <div className="flex gap-2">
                      <FormControl><Input type="number" {...field} className="flex-grow" /></FormControl>
                      <FormField name="heightUnit" control={form.control} render={({ field: unitField }) => (
                         <Select onValueChange={unitField.onChange} defaultValue={unitField.value}>
                            <FormControl><SelectTrigger className="w-24"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="cm">cm</SelectItem>
                              <SelectItem value="in">in</SelectItem>
                            </SelectContent>
                         </Select>
                      )} />
                    </div>
                    <FormMessage />
                  </FormItem>
              )} />
            </div>
             <FormField name="objective" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Objective</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="lose_weight">Lose Weight</SelectItem>
                      <SelectItem value="maintain_weight">Maintain Weight</SelectItem>
                      <SelectItem value="gain_weight">Gain Weight</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            <div className="flex justify-end pt-4">
              <Button type="submit">Next: Set Targets</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
