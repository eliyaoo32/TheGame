'use server';

import { habitAgent } from '@/ai/flows/habit-agent-flow';
import { z } from 'zod';

const agentInputSchema = z.object({
  query: z.string().optional(),
  audioDataUri: z.string().optional(),
  userId: z.string().min(1),
}).refine(data => data.query || data.audioDataUri, {
  message: "Either query or audioDataUri must be provided",
});

export async function invokeHabitAgent(input: z.infer<typeof agentInputSchema>): Promise<{success: boolean, message?: string, error?: string}> {
    console.log('[Action: invokeHabitAgent] Received request for userId:', input.userId);
    try {
        const validatedInput = agentInputSchema.parse(input);
        const result = await habitAgent(validatedInput);
        console.log('[Action: invokeHabitAgent] Agent returned successfully.');
        return { success: true, message: result.message };
    } catch(error: any) {
        console.error('[Action: invokeHabitAgent] Failed to invoke agent:', error);
        if (error instanceof z.ZodError) {
          return { success: false, error: 'Invalid input: ' + error.errors[0].message };
        }
        return { success: false, error: error.message || 'The AI agent failed to process your request.' };
    }
}