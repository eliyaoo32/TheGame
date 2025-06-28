
'use server';
/**
 * @fileOverview Answers general nutrition questions from users.
 * 
 * - dietQAFlow - Answers a nutritional question.
 * - DietQAInput - The input type for the flow.
 * - DietQAOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DietQAInputSchema = z.object({
  question: z.string().describe('The user\'s nutrition-related question.'),
});
export type DietQAInput = z.infer<typeof DietQAInputSchema>;

const DietQAOutputSchema = z.object({
  answer: z.string().describe('A helpful and concise answer to the user\'s question.'),
});
export type DietQAOutput = z.infer<typeof DietQAOutputSchema>;

export async function dietQA(input: DietQAInput): Promise<DietQAOutput> {
  return dietQAFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dietQAPrompt',
  input: { schema: DietQAInputSchema },
  output: { schema: DietQAOutputSchema },
  prompt: `You are a helpful nutritionist AI. Answer the following user question about nutrition and diet in a clear and concise way.

Question: "{{{question}}}"
`,
});

const dietQAFlow = ai.defineFlow(
  {
    name: 'dietQAFlow',
    inputSchema: DietQAInputSchema,
    outputSchema: DietQAOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
