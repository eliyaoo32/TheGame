
'use client';

import { useState } from 'react';
import type { DietPlan, UserProfile, DietTargets, Meal, DietObjective } from '@/lib/types';
import { StepProfile } from './step-profile';
import { StepTargets } from './step-targets';
import { StepMeals } from './step-meals';
import { Button } from '@/components/ui/button';

interface DietWizardProps {
  onComplete: (plan: DietPlan) => void;
}

export function DietWizard({ onComplete }: DietWizardProps) {
  const [step, setStep] = useState(1);
  const [dietPlan, setDietPlan] = useState<Partial<DietPlan>>({});

  const handleNext = (data: Partial<DietPlan>) => {
    setDietPlan(prev => ({ ...prev, ...data }));
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };
  
  const handleFinish = (data: { meals: Meal[] }) => {
    const finalPlan = { ...dietPlan, ...data } as DietPlan;
    onComplete(finalPlan);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-card rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-2 font-headline">
        Create Your Diet Plan
      </h1>
      <p className="text-center text-muted-foreground mb-8">
        Let's set up your personalized nutrition guide in a few simple steps.
      </p>

      {step === 1 && <StepProfile onNext={(data: { profile: UserProfile, objective: DietObjective }) => handleNext(data)} />}
      {step === 2 && dietPlan.profile && dietPlan.objective && <StepTargets profile={dietPlan.profile} objective={dietPlan.objective} onNext={(data: { targets: DietTargets }) => handleNext(data)} onBack={handleBack} />}
      {step === 3 && <StepMeals onFinish={handleFinish} onBack={handleBack} />}
    </div>
  );
}
