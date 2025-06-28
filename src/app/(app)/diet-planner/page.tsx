
'use client';

import { useState, useEffect } from 'react';
import type { DietPlan } from '@/lib/types';
import { useAuth } from '@/context/auth-provider';
import { getDietPlan, saveDietPlan } from '@/services/diet';
import { DietWizard } from '@/components/diet/diet-wizard';
import { DietDashboard } from '@/components/diet/diet-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function DietPlannerPage() {
  const { user } = useAuth();
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      getDietPlan(user.uid).then(plan => {
        setDietPlan(plan);
        setLoading(false);
      });
    } else if (user === null) {
      // Handle logged out state
      setLoading(false);
    }
  }, [user]);

  const handleWizardComplete = async (completedPlan: DietPlan) => {
    if (!user) return;
    const finalPlan = { ...completedPlan, isWizardComplete: true };
    await saveDietPlan(user.uid, finalPlan);
    setDietPlan(finalPlan);
  };
  
  const handlePlanUpdate = async (updatedPlan: DietPlan) => {
     if (!user) return;
     await saveDietPlan(user.uid, updatedPlan);
     setDietPlan(updatedPlan);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (!user) {
    return <p>Please log in to use the Diet Planner.</p>;
  }

  if (!dietPlan) {
    // This case should ideally not be reached if loading completes
    return <p>Could not load diet plan.</p>;
  }

  return (
    <div className="container mx-auto p-4">
      {dietPlan.isWizardComplete ? (
        <DietDashboard initialPlan={dietPlan} onPlanUpdate={handlePlanUpdate} />
      ) : (
        <DietWizard onComplete={handleWizardComplete} />
      )}
    </div>
  );
}
