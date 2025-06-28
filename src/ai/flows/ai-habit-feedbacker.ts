'use server';
/**
 * @fileOverview Provides personalized feedback to users based on their habit progress over the last week.
 *
 * - aiHabitFeedbacker - A function that provides AI-powered feedback for user habits.
 * - AiHabitFeedbackerInput - The input type for the aiHabitFeedbacker function.
 * - AiHabitFeedbackerOutput - The return type for the aiHabitFeedbacker function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const HabitInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  frequency: z.string(),
  goal: z.string(),
  type: z.string(),
});

const ReportInfoSchema = z.object({
  habitName: z.string(),
  value: z.any(),
  reportedAt: z.string(),
});

const AiHabitFeedbackerInputSchema = z.object({
  habits: z.array(HabitInfoSchema).describe("The user's list of defined habits."),
  reports: z.array(ReportInfoSchema).describe("The user's habit reports from the last 7 days."),
  currentDate: z.string().describe("The current date, in ISO format (e.g., 'YYYY-MM-DD')."),
  timeOfDay: z.enum(['morning', 'noon', 'evening']).describe("The current part of the day."),
});
export type AiHabitFeedbackerInput = z.infer<typeof AiHabitFeedbackerInputSchema>;

const AiHabitFeedbackerOutputSchema = z.object({
  feedback: z.string().describe('Personalized, encouraging, and actionable feedback for the user, formatted as a bulleted list.'),
});
export type AiHabitFeedbackerOutput = z.infer<typeof AiHabitFeedbackerOutputSchema>;

export async function aiHabitFeedbacker(input: AiHabitFeedbackerInput): Promise<AiHabitFeedbackerOutput> {
  return aiHabitFeedbackerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiHabitFeedbackerPrompt',
  input: { schema: AiHabitFeedbackerInputSchema },
  output: { schema: AiHabitFeedbackerOutputSchema },
  prompt: `You are a friendly and insightful habit coach for TheGame app. Your goal is to provide personalized, encouraging, and actionable feedback to the user based on their habit progress over the last 7 days.

Current Context:
- Today's Date: {{{currentDate}}}
- Time of Day: {{{timeOfDay}}}

User's Habits:
{{#each habits}}
- Habit: "{{this.name}}" ({{this.frequency}})
  - Goal: {{this.goal}}
  - Type: {{this.type}}
{{/each}}

User's Reports (Last 7 Days):
{{#if reports}}
{{#each reports}}
- On {{this.reportedAt}}, for "{{this.habitName}}", they reported: {{this.value}}
{{/each}}
{{else}}
The user has not reported any progress in the last 7 days.
{{/if}}

Your Task:
Based on all the information above, generate a concise list of 2-4 bullet points of feedback for the user. Start with a brief, friendly greeting that acknowledges the time of day.

- Each bullet point should be a single, insightful observation.
- Look for patterns.
- If they are doing well on their habits, congratulate them and encourage them to keep up the momentum.
- If they are falling behind on weekly goals, gently remind them and suggest a plan. For example, if a "4 times a week" habit has only been done once by Wednesday, point this out.
- If they haven't reported anything for a while, give them a gentle nudge to get started.
- Be positive, supportive, and motivating. Avoid being judgmental or overly critical.
- Start each bullet point with a '-' character.

Example Output:
Good morning! Here are your insights for today:
- Great job staying consistent with your "Read book" habit this week!
- I noticed you've hit the gym once so far. Remember your goal is 4 times this week, so you've got 3 more to go!
- It looks like you haven't logged your "Arabic Words" review yet today. A few minutes is all it takes!
`,
});

const aiHabitFeedbackerFlow = ai.defineFlow(
  {
    name: 'aiHabitFeedbackerFlow',
    inputSchema: AiHabitFeedbackerInputSchema,
    outputSchema: AiHabitFeedbackerOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
