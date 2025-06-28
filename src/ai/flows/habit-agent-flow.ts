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

// A base schema for tools that need the userId, to avoid repeating it.
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
    const habitId = await habitService.addHabit(userId, input);
    return { habitId };
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
    await habitService.updateHabit(userId, habitId, data);
    return { success: true };
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
    const habit = await habitService.getHabitById(userId, habitId);
    let parsedValue: string | number | boolean = value;

    if (habit) {
        if (habit.type === 'number' || habit.type === 'duration') {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                parsedValue = num;
            }
        } else if (habit.type === 'boolean') {
            parsedValue = true;
        }
    }
    
    const reportDate = date ? new Date(`${date}T12:00:00Z`) : new Date();

    await habitService.addHabitReport(userId, habitId, parsedValue, reportDate);
    return { success: true };
});


// Main Flow
const HabitAgentOutputSchema = z.object({
  message: z.string().describe("A summary of the actions taken or a question for clarification."),
});
export type HabitAgentOutput = z.infer<typeof HabitAgentOutputSchema>;

export async function habitAgent(query: string, userId: string): Promise<HabitAgentOutput> {
    return habitAgentFlow({ query, userId });
}

const prompt = ai.definePrompt({
    name: 'habitAgentPrompt',
    input: { schema: z.object({
        query: z.string(),
        userId: z.string(),
        habits: z.array(z.any()),
        categories: z.array(z.any()),
        currentDate: z.string()
    }) },
    output: { schema: HabitAgentOutputSchema },
    tools: [addHabitTool, updateHabitTool, addHabitReportTool],
    prompt: `You are a task-oriented AI assistant for a habit tracking app. Your ONLY purpose is to translate the user's natural language request into a function call using the provided tools.

    - Analyze the user's request.
    - Based on the request, decide which tool to use.
    - Extract all necessary parameters for the tool from the request and the context below.
    - **You MUST pass the user ID '{{userId}}' to the 'userId' parameter for every tool call.**
    - **Pay close attention to dates. If the user mentions a specific day like "yesterday", "on Tuesday", or a date like "July 5th", you MUST calculate the correct date in 'YYYY-MM-DD' format and pass it to the 'date' parameter. Today's date is {{currentDate}}. If no date is mentioned, do not pass a date.**
    - If you have all the information, call the tool.
    - If the request is ambiguous or you are missing information, ask the user for clarification. Do not try to guess.
    - After a tool is successfully called, you will receive its output. Summarize this result for the user in a friendly, concise message.

    **CONTEXT**

    Available Habits:
    {{#if habits}}
    {{#each habits}}
    - Name: "{{this.name}}", ID: {{this.id}}, Description: "{{this.description}}"
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

    **TOOL USAGE EXAMPLES**

    - User says: "I read 15 pages today."
    - You should call: \`addHabitReport\` with the ID for the "Reading" habit, a value of "15", and the userId.

    - User says: "Yesterday I meditated for 10 minutes."
    - You should analyze "yesterday" relative to {{currentDate}} and call: \`addHabitReport\` with the ID for "Meditation", value "10", the userId, and the correct date string (e.g., if today is 2024-07-16, the date would be "2024-07-15").

    - User says: "I did my workout"
    - You should call: \`addHabitReport\` with the ID for the "Workout" habit, a value of "true", and the userId.

    - User says: "Add a new daily habit to drink 8 glasses of water."
    - You should call: \`addHabit\` with name="Drink water", frequency="daily", goal="8 glasses of water", description="A new habit to drink water", type="number", a relevant icon, and the userId.

    - User says: "change my reading goal to 20 pages"
    - You should call: \`updateHabit\` with the ID for "Reading", data={goal: "20 pages"}, and the userId.

    **USER REQUEST**
    "{{query}}"`,
});

const habitAgentFlow = ai.defineFlow(
  {
    name: 'habitAgentFlow',
    inputSchema: z.object({ query: z.string(), userId: z.string() }),
    outputSchema: HabitAgentOutputSchema,
  },
  async ({ query, userId }) => {
    // NOTE: Tool definitions have been moved to the top level of the module.

    const [rawHabits, categories] = await Promise.all([
        habitService.getHabitDefinitions(userId),
        habitService.getCategories(userId),
    ]);

    const habits = rawHabits.map(h => ({
        id: h.id,
        name: h.name,
        description: h.description,
    }));
    
    const currentDate = new Date().toISOString().split('T')[0];

    const { output } = await prompt({ query, userId, habits, categories, currentDate });
    return output!;
  }
);
