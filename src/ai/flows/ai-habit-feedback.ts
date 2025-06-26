'use server';

/**
 * @fileOverview Provides personalized feedback and reminders to users to help them stick to their habits.
 *
 * - aiHabitFeedback - A function that provides AI-powered feedback and reminders for user habits.
 * - AiHabitFeedbackInput - The input type for the aiHabitFeedback function.
 * - AiHabitFeedbackOutput - The return type for the aiHabitFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiHabitFeedbackInputSchema = z.object({
  habitName: z.string().describe('The name of the habit.'),
  habitType: z.enum(['daily', 'weekly', 'duration', 'time', 'boolean', 'enum']).describe('The type of habit.'),
  habitStatus: z.boolean().describe('Whether the habit has been completed today.'),
  lastCompletionDate: z.string().optional().describe('The date the habit was last completed, in ISO format.'),
  targetCompletionTime: z.string().optional().describe('The time the habit should be completed by, in HH:MM format.'),
  userPreferences: z.string().optional().describe('Any user preferences relevant to the habit or feedback.'),
});
export type AiHabitFeedbackInput = z.infer<typeof AiHabitFeedbackInputSchema>;

const AiHabitFeedbackOutputSchema = z.object({
  feedback: z.string().describe('Personalized feedback and/or reminder message for the user.'),
  shouldRemind: z.boolean().describe('Whether a reminder should be sent to the user.'),
});
export type AiHabitFeedbackOutput = z.infer<typeof AiHabitFeedbackOutputSchema>;

export async function aiHabitFeedback(input: AiHabitFeedbackInput): Promise<AiHabitFeedbackOutput> {
  return aiHabitFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiHabitFeedbackPrompt',
  input: {schema: AiHabitFeedbackInputSchema},
  output: {schema: AiHabitFeedbackOutputSchema},
  prompt: `You are a helpful AI assistant that provides personalized feedback and reminders to users to help them stick to their habits.

  Based on the following information about the user's habit, provide a feedback message and determine if a reminder should be sent.

  Habit Name: {{{habitName}}}
  Habit Type: {{{habitType}}}
  Habit Status: {{{habitStatus}}}
  Last Completion Date: {{#if lastCompletionDate}}{{{lastCompletionDate}}}{{else}}Never{{/if}}
  Target Completion Time: {{#if targetCompletionTime}}{{{targetCompletionTime}}}{{else}}No specific time{{/if}}
  User Preferences: {{#if userPreferences}}{{{userPreferences}}}{{else}}None{{/if}}

  Consider the following when providing feedback and deciding whether to send a reminder:
  - If the habit is already completed, congratulate the user.
  - If the habit is not completed and the target completion time is approaching, send a reminder.
  - Take into account user preferences to tailor the feedback and reminders.
  - Only remind a user if shouldRemind is true.
`,
});

const aiHabitFeedbackFlow = ai.defineFlow(
  {
    name: 'aiHabitFeedbackFlow',
    inputSchema: AiHabitFeedbackInputSchema,
    outputSchema: AiHabitFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
