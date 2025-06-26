'use server';

import { aiHabitFeedback, type AiHabitFeedbackInput } from '@/ai/flows/ai-habit-feedback';
import { chatReportUpdate, type ChatReportInput } from '@/ai/flows/chat-report-update';
import { z } from 'zod';

const getHabitFeedbackSchema = z.object({
  habitName: z.string(),
  description: z.string(),
  habitType: z.enum(['duration', 'time', 'boolean', 'number', 'options']),
  habitFrequency: z.enum(['daily', 'weekly']),
  habitGoal: z.string(),
  habitStatus: z.boolean(),
});

export async function getHabitFeedback(input: z.infer<typeof getHabitFeedbackSchema>) {
  try {
    const validatedInput: AiHabitFeedbackInput = {
      habitName: input.habitName,
      habitDescription: input.description,
      habitType: input.habitType,
      habitFrequency: input.habitFrequency,
      habitGoal: input.habitGoal,
      habitStatus: input.habitStatus,
      lastCompletionDate: new Date().toISOString(),
    };
    const result = await aiHabitFeedback(validatedInput);
    return { success: true, feedback: result.feedback };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to get AI feedback.' };
  }
}

const processChatReportSchema = z.object({
  reportText: z.string().min(1),
  userId: z.string(),
});

export async function processChatReport(input: z.infer<typeof processChatReportSchema>) {
    try {
        const validatedInput: ChatReportInput = { ...input };
        const result = await chatReportUpdate(validatedInput);
        return { success: true, updatedHabits: result.updatedHabits };
    } catch(error) {
        console.error(error);
        return { success: false, error: 'Failed to process chat report.'}
    }
}
