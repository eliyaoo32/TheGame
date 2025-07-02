'use client';

import type { DietTargets, Meal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface NutritionSummaryProps {
  targets: DietTargets;
  meals: Meal[];
}

export function NutritionSummary({ targets, meals }: NutritionSummaryProps) {
  const totals = meals.reduce((acc, meal) => {
    meal.foods.forEach(food => {
      acc.calories += food.calories || 0;
      acc.protein += food.protein || 0;
      acc.carbs += food.carbs || 0;
      acc.fat += food.fat || 0;
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const summaryData = [
    { name: 'Calories', target: targets.calories, current: totals.calories },
    { name: 'Protein (g)', target: targets.protein, current: totals.protein },
    { name: 'Carbs (g)', target: targets.carbs, current: totals.carbs },
    { name: 'Fat (g)', target: targets.fat, current: totals.fat },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nutrient</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaryData.map(item => {
              const currentVal = item.current || 0;
              const targetVal = item.target || 0;
              const remaining = targetVal - currentVal;
              const isOver = remaining < 0;
              return (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{currentVal}</TableCell>
                  <TableCell className="text-right">{targetVal}</TableCell>
                  <TableCell className={cn(
                    "text-right font-semibold",
                    isOver ? "text-destructive" : "text-green-600"
                  )}>
                    {isOver ? `${Math.abs(remaining)} over` : `${remaining} left`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
