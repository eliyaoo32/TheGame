
'use client';

import { useState } from 'react';
import type { DietPlan, Meal, FoodItem } from '@/lib/types';
import { NutritionSummary } from './nutrition-summary';
import { AICoach } from './ai-coach';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DietDashboardProps {
  initialPlan: DietPlan;
  onPlanUpdate: (updatedPlan: DietPlan) => void;
}

export function DietDashboard({ initialPlan, onPlanUpdate }: DietDashboardProps) {
  const [plan, setPlan] = useState<DietPlan>(initialPlan);
  const [newFood, setNewFood] = useState<Record<string, Omit<FoodItem, 'id'>>>({});
  const [isResetDialogOpen, setResetDialogOpen] = useState(false);

  const handleAddFood = (mealId: string) => {
    const foodToAdd = newFood[mealId];
    if (!foodToAdd || !foodToAdd.name) return;

    const updatedPlan = {
      ...plan,
      meals: plan.meals.map(meal => {
        if (meal.id === mealId) {
          return {
            ...meal,
            foods: [...meal.foods, { ...foodToAdd, id: `food_${Date.now()}` }],
          };
        }
        return meal;
      }),
    };
    setPlan(updatedPlan);
    onPlanUpdate(updatedPlan);
    setNewFood(prev => ({ ...prev, [mealId]: { name: '', calories: 0, protein: 0, carbs: 0, fat: 0 } }));
  };

  const handleRemoveFood = (mealId: string, foodId: string) => {
    const updatedPlan = {
      ...plan,
      meals: plan.meals.map(meal => {
        if (meal.id === mealId) {
          return {
            ...meal,
            foods: meal.foods.filter(food => food.id !== foodId),
          };
        }
        return meal;
      }),
    };
    setPlan(updatedPlan);
    onPlanUpdate(updatedPlan);
  };
  
  const handleFoodInputChange = (mealId: string, field: keyof Omit<FoodItem, 'id'>, value: string) => {
     setNewFood(prev => ({
        ...prev,
        [mealId]: {
            ...prev[mealId],
            [field]: field === 'name' ? value : Number(value)
        }
     }))
  }

  const handleReset = () => {
    onPlanUpdate({ ...plan, isWizardComplete: false });
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold font-headline">Your Diet Dashboard</h1>
            <Button variant="outline" onClick={() => setResetDialogOpen(true)}>
              Start Over
            </Button>
          </div>
          {plan.meals.map(meal => (
            <Card key={meal.id}>
              <CardHeader>
                <CardTitle>{meal.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {meal.foods.map(food => (
                    <div key={food.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <div>
                        <p className="font-semibold">{food.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {food.calories} kcal, {food.protein}g P, {food.carbs}g C, {food.fat}g F
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveFood(meal.id, food.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t space-y-2">
                  <h4 className="font-semibold text-sm">Add New Food</h4>
                  <div className="grid grid-cols-5 gap-2 items-end">
                    <Input placeholder="Food name" value={newFood[meal.id]?.name || ''} onChange={(e) => handleFoodInputChange(meal.id, 'name', e.target.value)} />
                    <Input type="number" placeholder="kcal" value={newFood[meal.id]?.calories || ''} onChange={(e) => handleFoodInputChange(meal.id, 'calories', e.target.value)} />
                    <Input type="number" placeholder="Protein" value={newFood[meal.id]?.protein || ''} onChange={(e) => handleFoodInputChange(meal.id, 'protein', e.target.value)} />
                    <Input type="number" placeholder="Carbs" value={newFood[meal.id]?.carbs || ''} onChange={(e) => handleFoodInputChange(meal.id, 'carbs', e.target.value)} />
                    <Input type="number" placeholder="Fat" value={newFood[meal.id]?.fat || ''} onChange={(e) => handleFoodInputChange(meal.id, 'fat', e.target.value)} />
                  </div>
                   <Button onClick={() => handleAddFood(meal.id)} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="lg:col-span-1 space-y-6">
          <NutritionSummary targets={plan.targets} meals={plan.meals} />
          <AICoach dietPlan={plan} />
        </div>
      </div>
      <AlertDialog open={isResetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset your entire diet plan, including all meals and logged foods. You will have to go through the setup wizard again. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
