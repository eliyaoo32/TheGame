'use server';

import { chatReportUpdate, type ChatReportInput } from '@/ai/flows/chat-report-update';
import { z } from 'zod';

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
