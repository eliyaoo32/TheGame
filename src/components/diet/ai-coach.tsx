
'use client';

import { useState, useTransition } from 'react';
import type { DietPlan } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Sparkles } from 'lucide-react';
import { invokeDietAnalysis, invokeDietQA } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

interface AICoachProps {
  dietPlan: DietPlan;
}

const qaSchema = z.object({
  question: z.string().min(5, "Please ask a more detailed question."),
});

export function AICoach({ dietPlan }: AICoachProps) {
  const [analysis, setAnalysis] = useState('');
  const [qaResponse, setQaResponse] = useState('');
  const [isAnalysisPending, startAnalysisTransition] = useTransition();
  const [isQaPending, startQaTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof qaSchema>>({
    resolver: zodResolver(qaSchema),
    defaultValues: { question: '' },
  });

  const handleAnalyze = () => {
    startAnalysisTransition(async () => {
      setAnalysis('');
      const result = await invokeDietAnalysis({ dietPlan });
      if (result.success && result.feedback) {
        setAnalysis(result.feedback);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  const handleQaSubmit = (values: z.infer<typeof qaSchema>) => {
    startQaTransition(async () => {
      setQaResponse('');
      const result = await invokeDietQA({ question: values.question });
      if (result.success && result.answer) {
        setQaResponse(result.answer);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Plan Analysis
          </CardTitle>
          <CardDescription>Get AI-powered feedback on your current diet plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAnalyze} disabled={isAnalysisPending}>
            {isAnalysisPending ? "Analyzing..." : "Analyze My Diet"}
          </Button>
          {isAnalysisPending && 
            <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
          }
          {analysis && <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{analysis}</p>}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Ask your AI Coach
          </CardTitle>
          <CardDescription>Ask a general nutrition question.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleQaSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="e.g., What are some good high-protein, low-carb snacks?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isQaPending}>
                {isQaPending ? "Thinking..." : "Ask Question"}
              </Button>
            </form>
          </Form>
           {isQaPending && 
            <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
          }
          {qaResponse && <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{qaResponse}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
