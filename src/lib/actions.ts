'use server';

import { habitAgent, type HabitAgentOutput } from '@/ai/flows/habit-agent-flow';
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
