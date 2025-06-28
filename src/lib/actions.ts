'use server';

import { habitAgent, type HabitAgentOutput } from '@/ai/flows/habit-agent-flow';
import { aiHabitFeedbacker } from '@/ai/flows/ai-habit-feedbacker';
import { getHabitsWithLastWeekReports } from '@/services/habits';
import { z } from 'zod';

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
