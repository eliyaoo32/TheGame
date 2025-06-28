
'use server';

import { habitAgent } from '@/ai/flows/habit-agent-flow';
import { aiHabitFeedbacker } from '@/ai/flows/ai-habit-feedbacker';
import { dietAnalysis } from '@/ai/flows/diet-analysis-flow';
import { dietQA } from '@/ai/flows/diet-qa-flow';
import { getHabitsWithLastWeekReports } from '@/services/habits';
import { z } from 'zod';
import type { DietPlan } from './types';

const agentQuerySchema = z.object({
  query: z.string().min(1),
  userId: z.string().min(1),
});

export async function invokeHabitAgent(input: z.infer<typeof agentQuerySchema>): Promise<{success: boolean, message?: string, error?: string}> {
    try {
        const validatedInput = agentQuerySchema.parse(input);
        const result = await habitAgent(validatedInput.query, validatedInput.userId);
        return { success: true, message: result.message };
    } catch(error) {
        console.error('failed to invoke agent', error);
        if (error instanceof z.ZodError) {
          return { success: false, error: 'Invalid input.' };
        }
        return { success: false, error: 'The AI agent failed to process your request.' };
    }
}

const feedbackerQuerySchema = z.object({
  userId: z.string().min(1),
  timeOfDay: z.enum(['morning', 'noon', 'evening']),
});

export async function invokeAIFeedbacker(input: z.infer<typeof feedbackerQuerySchema>): Promise<{success: boolean, feedback?: string, error?: string}> {
  try {
    const { userId, timeOfDay } = feedbackerQuerySchema.parse(input);

    const { habits, reports } = await getHabitsWithLastWeekReports(userId);

    if (habits.length === 0) {
      return { success: true, feedback: "Welcome! To get started on your journey, create your first habit in the 'Manage Habits' page." };
    }

    const result = await aiHabitFeedbacker({
      habits,
      reports,
      currentDate: new Date().toISOString().split('T')[0],
      timeOfDay,
    });
    
    return { success: true, feedback: result.feedback };
  } catch (error) {
    console.error('Failed to invoke AI feedbacker', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input.' };
    }
    return { success: false, error: 'The AI assistant failed to generate feedback.' };
  }
}

// Diet Planner Actions

const dietAnalysisSchema = z.object({
  dietPlan: z.any(), // Using any() for simplicity, as backend types will handle it
});

export async function invokeDietAnalysis(input: { dietPlan: DietPlan }): Promise<{success: boolean, feedback?: string, error?: string}> {
  try {
    // No need for heavy validation here, it's coming from our own client
    const result = await dietAnalysis({ dietPlan: input.dietPlan });
    return { success: true, feedback: result.feedback };
  } catch (error) {
    console.error('Failed to invoke Diet Analysis flow', error);
    return { success: false, error: 'The AI failed to analyze your diet plan.' };
  }
}

const dietQaSchema = z.object({
  question: z.string().min(1),
});

export async function invokeDietQA(input: z.infer<typeof dietQaSchema>): Promise<{success: boolean, answer?: string, error?: string}> {
  try {
    const { question } = dietQaSchema.parse(input);
    const result = await dietQA({ question });
    return { success: true, answer: result.answer };
  } catch (error) {
    console.error('Failed to invoke Diet QA flow', error);
     if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input.' };
    }
    return { success: false, error: 'The AI failed to answer your question.' };
  }
}
