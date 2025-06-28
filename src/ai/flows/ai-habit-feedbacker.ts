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
  feedback: z.string().describe('Personalized, encouraging, and actionable feedback for the user.'),
});
export type AiHabitFeedbackerOutput = z.infer<typeof AiHabitFeedbackerOutputSchema>;

export async function aiHabitFeedbacker(input: AiHabitFeedbackerInput): Promise<AiHabitFeedbackerOutput> {
  return aiHabitFeedbackerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiHabitFeedbackerPrompt',
  input: { schema: AiHabitFeedbackerInputSchema },
  output: { schema: AiHabitFeedbackerOutputSchema },
  prompt: `You are a friendly and insightful habit coach for the HabitVerse app. Your goal is to provide personalized, encouraging, and actionable feedback to the user based on their habit progress over the last 7 days.

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
Based on all the information above, write one or two paragraphs of feedback for the user. Be insightful and look for patterns.

- Acknowledge the current day and time of day (e.g., "Good morning! It's the start of a new week...").
- If they are doing well on their habits, congratulate them and encourage them to keep up the momentum.
- If they are falling behind on weekly goals, gently remind them and suggest a plan. For example, if a "4 times a week" habit has only been done once by Wednesday, point this out.
- If they haven't reported anything, give them a gentle nudge to get started.
- Be positive, supportive, and motivating. Avoid being judgmental or overly critical.

Example Feedback Points:
- "We are on Wednesday, you have trained only once this week. If you don't train every day until the end of the week, you will not achieve your weekly goal."
- "It's Sunday morning, it's the beginning of the week, let's do our best."
- "You have been following up on all your diet rules in the last week, keep it up!"
- "I noticed you've been consistent with your morning routine. Great job building that foundation for your day!"
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
