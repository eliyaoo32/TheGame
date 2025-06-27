'use server';
/**
 * @fileOverview An AI agent for managing habits.
 *
 * - habitAgent - A function that processes natural language commands to manage habits.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as habitService from '@/services/habits';

// Schemas for Tools

const AddHabitInputSchema = z.object({
    name: z.string().describe('The name of the habit.'),
    description: z.string().describe('A description of the habit.'),
    type: z.enum(['duration', 'time', 'boolean', 'number', 'options']).describe('The type of value the habit tracks.'),
    frequency: z.enum(['daily', 'weekly']).describe('How often the habit is tracked.'),
    goal: z.string().describe('The specific goal for the habit.'),
    icon: z.string().describe("An icon name for the habit. Choose from: ['Dumbbell', 'Leaf', 'Carrot', 'BookOpen', 'GraduationCap', 'Languages', 'FolderKanban', 'Target', 'Clock']"),
    categoryId: z.string().optional().describe('The ID of the category this habit belongs to.'),
    options: z.string().optional().describe('Comma-separated list of options for "options" type habits.'),
});

const UpdateHabitInputSchema = z.object({
    habitId: z.string().describe('The ID of the habit to update.'),
    data: AddHabitInputSchema.partial().describe('The fields to update.'),
});

const AddHabitReportInputSchema = z.object({
    habitId: z.string().describe('The ID of the habit to report progress for.'),
    value: z.any().describe('The value to report. Should be boolean for "boolean" type, string for "time", number for "duration" or "number", and a string from the available options for "options" type.'),
});

// Tool Definitions

const getHabitsAndCategoriesTool = ai.defineTool(
  {
    name: 'getHabitsAndCategories',
    description: 'Retrieves a list of all existing habits and categories to understand what the user has already configured.',
    outputSchema: z.object({
        habits: z.array(z.any()),
        categories: z.array(z.any()),
    }),
  },
  async () => {
    const [habits, categories] = await Promise.all([
        habitService.getHabits(),
        habitService.getCategories(),
    ]);
    return { habits, categories };
  }
);

const addHabitTool = ai.defineTool({
    name: 'addHabit',
    description: 'Creates a new habit.',
    inputSchema: AddHabitInputSchema,
    outputSchema: z.object({ habitId: z.string() }),
}, async (input) => {
    const habitId = await habitService.addHabit(input);
    return { habitId };
});

const updateHabitTool = ai.defineTool({
    name: 'updateHabit',
    description: 'Updates an existing habit.',
    inputSchema: UpdateHabitInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
}, async ({ habitId, data }) => {
    await habitService.updateHabit(habitId, data);
    return { success: true };
});

const addHabitReportTool = ai.defineTool({
    name: 'addHabitReport',
    description: 'Reports progress for a specific habit.',
    inputSchema: AddHabitReportInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
}, async ({ habitId, value }) => {
    await habitService.addHabitReport(habitId, value);
    return { success: true };
});


// Main Flow
const HabitAgentOutputSchema = z.object({
  message: z.string().describe("A summary of the actions taken or a question for clarification."),
});
export type HabitAgentOutput = z.infer<typeof HabitAgentOutputSchema>;

export async function habitAgent(query: string): Promise<HabitAgentOutput> {
    return habitAgentFlow({ query });
}

const prompt = ai.definePrompt({
    name: 'habitAgentPrompt',
    input: { schema: z.object({ query: z.string(), habits: z.array(z.any()), categories: z.array(z.any()) }) },
    output: { schema: HabitAgentOutputSchema },
    tools: [getHabitsAndCategoriesTool, addHabitTool, updateHabitTool, addHabitReportTool],
    prompt: `You are an intelligent habit management assistant.
    Your goal is to help users manage their habits by understanding their natural language commands and using the available tools.

    Here are the user's current habits:
    {{json habits}}

    And here are their categories:
    {{json categories}}

    - When a user wants to report progress, find the correct habit ID from the list and use the 'addHabitReport' tool. For boolean habits, the value is just 'true'. If a numeric value is provided (e.g. "read 10 pages"), use that number.
    - When a user wants to create a habit, use the 'addHabit' tool. Infer the parameters from the user's request. Choose an appropriate icon from this list: ['Dumbbell', 'Leaf', 'Carrot', 'BookOpen', 'GraduationCap', 'Languages', 'FolderKanban', 'Target', 'Clock']. If the user specifies a category, find its ID from the categories list.
    - When a user wants to modify a habit, find the habit ID and use the 'updateHabit' tool.
    - If a request is ambiguous (e.g., "update my running habit" when multiple exist), ask for clarification.
    - Always confirm the action you have taken in your response. Keep your responses concise and friendly. For example: "Done! I've logged your gym session." or "I've created a new daily habit 'Drink Water'. Good luck!".

    User's request: "{{query}}"`,
});


const habitAgentFlow = ai.defineFlow(
  {
    name: 'habitAgentFlow',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: HabitAgentOutputSchema,
  },
  async ({ query }) => {
    const [habits, categories] = await Promise.all([
        habitService.getHabits(),
        habitService.getCategories(),
    ]);
    const { output } = await prompt({ query, habits, categories });
    return output!;
  }
);
