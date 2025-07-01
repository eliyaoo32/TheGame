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
  goal: z.string().optional(),
  type: z.string(),
});

const ReportInfoSchema = z.object({
  habitName: z.string(),
  value: z.any(),
  reportedAt: z.string(),
});

const AiHabitFeedbackerInputSchema = z.object({
  habits: z.array(HabitInfoSchema).describe("The user's list of defined habits."),
  reports: z.array(ReportInfoSchema).describe("The user's habit reports from the current week, starting on Sunday."),
  currentDate: z.string().describe("The current date, in ISO format (e.g., 'YYYY-MM-DD')."),
  timeOfDay: z.enum(['morning', 'noon', 'evening']).describe("The current part of the day."),
  dayOfWeek: z.string().describe("The current day of the week (e.g., 'Monday')."),
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
  prompt: `You are an expert habit coach for TheGame app. Your tone should be supportive but firm, like a real coach who wants the user to succeed. Your goal is to provide highly personalized, encouraging, and actionable feedback based on the user's progress for the current week.

**IMPORTANT CONTEXT:**
- Today's Date: {{{currentDate}}}
- Today is a {{{dayOfWeek}}}.
- The week starts on Sunday.
- Time of Day: {{{timeOfDay}}}

**User's Habits:**
{{#each habits}}
- Habit: "{{this.name}}" ({{this.frequency}})
  - Goal: {{#if this.goal}}{{this.goal}}{{else}}Not set{{/if}}
  - Type: {{this.type}}
{{/each}}

**User's Reports (This Week, starting Sunday):**
{{#if reports}}
{{#each reports}}
- On {{this.reportedAt}}, for "{{this.habitName}}", they reported: {{{this.value}}}
{{/each}}
{{else}}
The user has not reported any progress this week.
{{/if}}

**Your Task:**
Generate a concise list of 2-3 bullet points of feedback. Start with a brief, friendly greeting that acknowledges the time of day. Each bullet point should be insightful and actionable.

1.  **Analyze Progress Against Goals:** For each **weekly** habit with a numeric goal (e.g., "go to the gym 4 times"), calculate their current progress. Provide specific, motivating feedback.
    *   **Good Example:** "You've hit the gym 2 out of 4 times this week. With 3 days left, you're right on track. Let's plan to go tomorrow to stay ahead!"
    *   **Bad Example:** "You went to the gym."

2.  **Identify Patterns & Give Advice:** Look for patterns. Are they consistent with daily habits? Are they front-loading their weekly habits? Offer concrete suggestions.
    *   **Good Example:** "You've been consistent with 'Read book' every day. Awesome! To take it to the next level, try doing it before your morning coffee to build a solid routine."
    *   **Bad Example:** "Good job reading."

3.  **Provide a Gentle Nudge:** If a habit is being neglected (especially daily ones), provide a gentle, encouraging reminder. Connect it back to their goals.
    *   **Good Example:** "I noticed you haven't logged 'Meditate' yet today. Just 5 minutes can help clear your mind and reduce stress. You've got this!"
    *   **Bad Example:** "You forgot to meditate."

4.  **Be Positive and Forward-Looking:** Always frame feedback constructively. Focus on what they can do next to succeed. Avoid being judgmental.
- Start each bullet point with a '-' character.

Example Output:
Good morning! Here's your coaching insight for the week:
- You're smashing your "Go to the gym" goal, having gone 3 out of 4 times already this week! Keep that momentum going.
- It looks like you haven't logged your "Arabic Words" review yet today. A few minutes now will make it much easier to stay on track with your daily learning.
- You've been reading every single day. That's fantastic discipline!
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
