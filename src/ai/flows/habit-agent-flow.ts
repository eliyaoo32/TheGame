'use server';
/**
 * @fileOverview An AI agent for managing habits via text or voice.
 *
 * - habitAgent - A function that processes natural language or audio commands to manage habits.
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
    goal: z.string().optional().describe('The specific goal for the habit. Required for types: number, duration, time.'),
    icon: z.string().describe("An icon name for the habit. Choose from: ['Dumbbell', 'Leaf', 'Carrot', 'BookOpen', 'GraduationCap', 'Languages', 'FolderKanban', 'Target', 'Clock']"),
    categoryId: z.string().optional().describe('The ID of the category this habit belongs to.'),
    options: z.string().optional().describe('Comma-separated list of options for "options" type habits.'),
});

const UserScopedInputSchema = z.object({
    userId: z.string().describe("The user's unique ID."),
});

// Tool Definitions

const addHabitTool = ai.defineTool({
    name: 'addHabit',
    description: 'Creates a new habit for the user.',
    inputSchema: AddHabitInputSchema.merge(UserScopedInputSchema),
    outputSchema: z.object({ habitId: z.string() }),
}, async ({ userId, ...input }) => {
    console.log('[Tool: addHabit] Starting execution:', { userId, ...input });
    try {
        const habitId = await habitService.addHabit(userId, input);
        console.log('[Tool: addHabit] Success! Habit ID:', habitId);
        return { habitId };
    } catch (error) {
        console.error('[Tool: addHabit] Error:', error);
        throw error;
    }
});

const updateHabitTool = ai.defineTool({
    name: 'updateHabit',
    description: 'Updates an existing habit for the user.',
    inputSchema: z.object({
        habitId: z.string().describe('The ID of the habit to update.'),
        data: AddHabitInputSchema.partial().describe('The fields to update.'),
    }).merge(UserScopedInputSchema),
    outputSchema: z.object({ success: z.boolean() }),
}, async ({ userId, habitId, data }) => {
    console.log('[Tool: updateHabit] Starting execution:', { userId, habitId, data });
    try {
        await habitService.updateHabit(userId, habitId, data);
        console.log('[Tool: updateHabit] Success!');
        return { success: true };
    } catch (error) {
        console.error('[Tool: updateHabit] Error:', error);
        throw error;
    }
});

const addHabitReportTool = ai.defineTool({
    name: 'addHabitReport',
    description: 'Reports progress for a specific habit.',
    inputSchema: z.object({
        habitId: z.string().describe('The ID of the habit to report progress for.'),
        value: z.string().describe('The value to report. For "boolean" type, use "true". For "number" or "duration" types, provide the numeric value as a string. For "time", provide the time as a string in HH:MM format. For "options", provide one of the available options as a string.'),
        date: z.string().optional().describe("The date for the report in 'YYYY-MM-DD' format. If not provided, today's date will be used."),
    }).merge(UserScopedInputSchema),
    outputSchema: z.object({ success: z.boolean() }),
}, async ({ userId, habitId, value, date }) => {
    console.log('[Tool: addHabitReport] Starting execution:', { userId, habitId, value, date });
    try {
        const reportDate = date ? new Date(`${date}T12:00:00Z`) : new Date();
        await habitService.addHabitReport(userId, habitId, value, reportDate);
        console.log('[Tool: addHabitReport] Success!');
        return { success: true };
    } catch (error) {
        console.error('[Tool: addHabitReport] Error:', error);
        throw error;
    }
});


// Main Flow
const HabitAgentOutputSchema = z.object({
  message: z.string().describe("A summary of the actions taken or a question for clarification."),
});
export type HabitAgentOutput = z.infer<typeof HabitAgentOutputSchema>;

export async function habitAgent(input: { query?: string, audioDataUri?: string, userId: string }): Promise<HabitAgentOutput> {
    console.log('[HabitAgent] Start process with input type:', input.audioDataUri ? 'AUDIO' : 'TEXT');
    return habitAgentFlow(input);
}

const prompt = ai.definePrompt({
    name: 'habitAgentPrompt',
    input: { schema: z.object({
        query: z.string().optional(),
        audioDataUri: z.string().optional().describe("A data URI of the user's voice command."),
        userId: z.string(),
        habits: z.array(z.any()),
        categories: z.array(z.any()),
        currentDate: z.string()
    }) },
    output: { schema: HabitAgentOutputSchema },
    tools: [addHabitTool, updateHabitTool, addHabitReportTool],
    config: {
        safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are a task-oriented AI assistant for a habit tracking app. Your ONLY purpose is to translate the user's request (either text or audio) into function calls using the provided tools.

- Analyze the user's request. It may be provided in the 'query' text field or as an 'audioDataUri' media part.
- **IMPORTANT**: The user may speak in Hebrew. You must understand Hebrew and perform the corresponding tool calls in English.
- Extract all necessary parameters for the tool from the request and context.
- **You MUST pass the user ID '{{userId}}' to the 'userId' parameter for every tool call.**
- **Dates**: If the user mentions "today", "yesterday", or specific days, calculate the date in 'YYYY-MM-DD' format based on today's date: {{currentDate}}.
- If multiple actions are requested, call the appropriate tools multiple times.

**CONTEXT**

Available Habits:
{{#if habits}}
{{#each habits}}
- Name: "{{this.name}}", ID: {{this.id}}, Type: {{this.type}}{{#if this.options}}, Options: [{{this.options}}]{{/if}}{{#if this.goal}}, Goal: "{{this.goal}}"{{/if}}
{{/each}}
{{else}}
The user has no habits.
{{/if}}

Available Categories:
{{#if categories}}
{{#each categories}}
- Name: "{{this.name}}", ID: {{this.id}}
{{/each}}
{{else}}
The user has no categories.
{{/if}}

**USER REQUEST**
{{#if query}}Text: "{{query}}"{{/if}}
{{#if audioDataUri}}Audio: {{media url=audioDataUri}}{{/if}}`,
});

const habitAgentFlow = ai.defineFlow(
  {
    name: 'habitAgentFlow',
    inputSchema: z.object({ query: z.string().optional(), audioDataUri: z.string().optional(), userId: z.string() }),
    outputSchema: HabitAgentOutputSchema,
  },
  async ({ query, audioDataUri, userId }) => {
    console.log('[HabitAgentFlow] Executing flow for user:', userId);
    
    const [habits, categories] = await Promise.all([
        habitService.getHabitDefinitions(userId),
        habitService.getCategories(userId),
    ]);
    
    console.log(`[HabitAgentFlow] Loaded ${habits.length} habits and ${categories.length} categories for context.`);
    
    const currentDate = new Date().toISOString().split('T')[0];

    try {
        const { output } = await prompt({ query, audioDataUri, userId, habits, categories, currentDate });
        
        if (!output) {
            console.warn('[HabitAgentFlow] AI returned null output.');
            return {
                message: 'The AI assistant was unable to process the request. This might be due to safety filters or an overly complex command.',
            };
        }
        
        console.log('[HabitAgentFlow] AI response message:', output.message);
        return output;
    } catch (err) {
        console.error('[HabitAgentFlow] Fatal error during prompt execution:', err);
        throw err;
    }
  }
);