'use server';

/**
 * @fileOverview Flow for updating habit progress based on chat reports.
 *
 * - chatReportUpdate - A function that processes chat reports and updates habit progress.
 * - ChatReportInput - The input type for the chatReportUpdate function.
 * - ChatReportOutput - The return type for the chatReportUpdate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatReportInputSchema = z.object({
  reportText: z
    .string()
    .describe('The chat report text containing information about habit completions.'),
  userId: z.string().describe('The ID of the user submitting the report.'),
});
export type ChatReportInput = z.infer<typeof ChatReportInputSchema>;

const ChatReportOutputSchema = z.object({
  updatedHabits: z
    .array(z.string())
    .describe('List of habit IDs that were successfully updated.'),
});
export type ChatReportOutput = z.infer<typeof ChatReportOutputSchema>;

export async function chatReportUpdate(input: ChatReportInput): Promise<ChatReportOutput> {
  return chatReportUpdateFlow(input);
}

const extractHabitInfo = ai.defineTool(
  {
    name: 'extractHabitInfo',
    description: 'Extracts information about completed habits from a chat report and determines if each habit was completed.',
    inputSchema: z.object({
      reportText: z.string().describe('The chat report text.'),
    }),
    outputSchema: z.array(z.object({
      habitId: z.string().describe('The ID of the habit that was completed.'),
      completed: z.boolean().describe('Whether the habit was completed or not.'),
    })),
  },
  async (input) => {
    // Placeholder implementation to extract habit information from the report text
    // In a real implementation, you would use natural language processing to extract the information
    console.log('Tool input', input);
    const reportText = input.reportText.toLowerCase();
    const habitUpdates = [];

    // Example parsing logic, replace with actual NLP extraction
    if (reportText.includes('habit123')) {
      habitUpdates.push({ habitId: 'habit123', completed: reportText.includes('completed') });
    }
    if (reportText.includes('habit456')) {
      habitUpdates.push({ habitId: 'habit456', completed: reportText.includes('completed') });
    }

    return habitUpdates;
  }
);

const prompt = ai.definePrompt({
  name: 'chatReportUpdatePrompt',
  tools: [extractHabitInfo],
  input: {schema: ChatReportInputSchema},
  output: {schema: ChatReportOutputSchema},
  prompt: `You are a habit tracker assistant.  You will receive a chat report from a user and use the extractHabitInfo tool to extract any habit completion data from it.\n
  Based on the extracted habit information, determine which habits need to be updated and return a list of the updated habit IDs.\n\n  Report Text: {{{reportText}}}
`,
});

const chatReportUpdateFlow = ai.defineFlow(
  {
    name: 'chatReportUpdateFlow',
    inputSchema: ChatReportInputSchema,
    outputSchema: ChatReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Placeholder logic to update the habit progress in the database
    // In a real implementation, you would update the database here
    console.log('Flow output', output);
    return output!;
  }
);
