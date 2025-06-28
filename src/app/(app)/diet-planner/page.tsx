
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
    // The AppLayout guarantees a user object is present, so we only need to fetch data when we have a user.
    if (user?.uid) {
      getDietPlan(user.uid).then(plan => {
        setDietPlan(plan);
        setLoading(false);
      });
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
  
  if (!dietPlan) {
    // This case can happen if the diet plan fails to load.
    // Displaying a loader is safer than showing different text to avoid hydration errors.
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
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
