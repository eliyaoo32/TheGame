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
    description: 'Creates a new habit for the user. Use this when the user wants to start tracking something new.',
    inputSchema: AddHabitInputSchema.merge(UserScopedInputSchema),
    outputSchema: z.object({ habitId: z.string() }),
}, async ({ userId, ...input }) => {
    console.log('[Tool: addHabit] EXECUTING:', { userId, ...input });
    try {
        const habitId = await habitService.addHabit(userId, input);
        console.log('[Tool: addHabit] SUCCESS:', habitId);
        return { habitId };
    } catch (error) {
        console.error('[Tool: addHabit] ERROR:', error);
        throw error;
    }
});

const updateHabitTool = ai.defineTool({
    name: 'updateHabit',
    description: 'Updates an existing habit definition (name, description, goal, etc.).',
    inputSchema: z.object({
        habitId: z.string().describe('The ID of the habit to update.'),
        data: AddHabitInputSchema.partial().describe('The fields to update.'),
    }).merge(UserScopedInputSchema),
    outputSchema: z.object({ success: z.boolean() }),
}, async ({ userId, habitId, data }) => {
    console.log('[Tool: updateHabit] EXECUTING:', { userId, habitId, data });
    try {
        await habitService.updateHabit(userId, habitId, data);
        console.log('[Tool: updateHabit] SUCCESS');
        return { success: true };
    } catch (error) {
        console.error('[Tool: updateHabit] ERROR:', error);
        throw error;
    }
});

const addHabitReportTool = ai.defineTool({
    name: 'addHabitReport',
    description: 'Reports progress or completion for an existing habit. CRITICAL: Use this whenever the user says they DID something, achieved a goal, or finished a task.',
    inputSchema: z.object({
        habitId: z.string().describe('The ID of the habit to report progress for.'),
        value: z.string().describe('The value to report. For "boolean" type, use "true". For "number" or "duration" types, provide the numeric value as a string. For "time", provide the time as a string in HH:MM format. For "options", provide one of the available options as a string.'),
        date: z.string().optional().describe("The date for the report in 'YYYY-MM-DD' format. If the user refers to 'yesterday' or a past date, you must calculate and provide this."),
    }).merge(UserScopedInputSchema),
    outputSchema: z.object({ success: z.boolean() }),
}, async ({ userId, habitId, value, date }) => {
    console.log('[Tool: addHabitReport] EXECUTING:', { userId, habitId, value, date });
    try {
        const reportDate = date ? new Date(`${date}T12:00:00Z`) : new Date();
        await habitService.addHabitReport(userId, habitId, value, reportDate);
        console.log('[Tool: addHabitReport] SUCCESS');
        return { success: true };
    } catch (error) {
        console.error('[Tool: addHabitReport] ERROR:', error);
        throw error;
    }
});


// Main Flow
const HabitAgentOutputSchema = z.object({
  message: z.string().describe("A summary of the actions taken. Be brief."),
});
export type HabitAgentOutput = z.infer<typeof HabitAgentOutputSchema>;

export async function habitAgent(input: { query?: string, audioDataUri?: string, userId: string }): Promise<HabitAgentOutput> {
    console.log('[HabitAgent] Start process for user:', input.userId);
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
        maxSteps: 10,
        safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are a strict, task-oriented agent for a habit tracking application.

**YOUR PRIMARY MISSION**:
You must translate the user's request into specific tool calls. Do NOT just acknowledge the request in the text message; you MUST call the appropriate tools to update the database.

**GUIDELINES**:
1. **Tool Usage**: If the user says they completed something, you MUST call 'addHabitReport'. If they want to start something new, use 'addHabit'.
2. **Languages**: The user may speak in Hebrew (e.g., "התאמנתי היום" means "I trained today"). You must understand Hebrew and execute tools in English.
3. **User Identification**: Always pass '{{userId}}' as the 'userId' argument to every tool.
4. **Context**: Use the 'Available Habits' list below to find the correct 'habitId' for the user's request. If the user mentions a habit that isn't in the list, you may need to ask for clarification or use 'addHabit' if it sounds like a new one.
5. **Dates**: Today's date is {{currentDate}}. Calculate dates for 'yesterday' or specific weekdays relative to this.

**CONTEXT**
Available Habits:
{{#if habits}}
{{#each habits}}
- "{{this.name}}" (ID: {{this.id}}, Type: {{this.type}})
{{/each}}
{{else}}
User has no habits yet.
{{/if}}

**USER INPUT**
{{#if query}}Text: "{{query}}"{{/if}}
{{#if audioDataUri}}Audio: {{media url=audioDataUri}}{{/if}}

**FINAL INSTRUCTION**: Execute all necessary tool calls FIRST. Then, in your 'message' output, summarize what you DID. Do not claim to have done something unless you successfully called the tool.`,
});

const habitAgentFlow = ai.defineFlow(
  {
    name: 'habitAgentFlow',
    inputSchema: z.object({ query: z.string().optional(), audioDataUri: z.string().optional(), userId: z.string() }),
    outputSchema: HabitAgentOutputSchema,
  },
  async ({ query, audioDataUri, userId }) => {
    console.log('[HabitAgentFlow] Fetching context for user:', userId);
    
    const [habits, categories] = await Promise.all([
        habitService.getHabitDefinitions(userId),
        habitService.getCategories(userId),
    ]);
    
    console.log(`[HabitAgentFlow] Context Loaded: ${habits.length} habits found.`);
    habits.forEach(h => console.log(` - Habit: ${h.name} (${h.id})`));
    
    const currentDate = new Date().toISOString().split('T')[0];

    try {
        const { output } = await prompt({ query, audioDataUri, userId, habits, categories, currentDate });
        
        if (!output) {
            console.error('[HabitAgentFlow] AI returned NO output.');
            return { message: 'I encountered an error and could not process your request.' };
        }
        
        console.log('[HabitAgentFlow] Agent Response:', output.message);
        return output;
    } catch (err) {
        console.error('[HabitAgentFlow] CRITICAL ERROR:', err);
        throw err;
    }
  }
);