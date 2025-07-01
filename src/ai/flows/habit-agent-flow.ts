
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
    goal: z.string().optional().describe('The specific goal for the habit. Required for types: number, duration, time.'),
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
    const reportDate = date ? new Date(`${date}T12:00:00Z`) : new Date();
    await habitService.addHabitReport(userId, habitId, value, reportDate);
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
    config: {
        safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
    },
    prompt: `You are a task-oriented AI assistant for a habit tracking app. Your ONLY purpose is to translate the user's natural language request into one or more function calls using the provided tools. If the user asks to create multiple items (e.g., habits), you should call the appropriate tool for each one.

- Analyze the user's request.
- Based on the request, decide which tool(s) to use. You can call tools multiple times.
- Extract all necessary parameters for the tool from the request and the context below.
- **You MUST pass the user ID '{{userId}}' to the 'userId' parameter for every tool call.**
- **Pay close attention to dates. If the user mentions a specific day like "yesterday", "on Tuesday", or a date like "July 5th", you MUST calculate the correct date in 'YYYY-MM-DD' format and pass it to the 'date' parameter. Today's date is {{currentDate}}. If no date is mentioned, do not pass a date.**
- If the request is ambiguous or you are missing information, ask the user for clarification. Do not try to guess.
- After a tool is successfully called, you will receive its output. Summarize this result for the user in a friendly, concise message. If multiple tools were called, summarize all the actions taken.

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

**IMPORTANT RULES FOR \`addHabitReport\`:**
- When reporting, you MUST use the correct value based on the habit's type provided in the CONTEXT.
- **Boolean**: If the user confirms doing the habit (e.g., "I did my workout"), use the value "true".
- **Number/Duration**: If the user provides a number (e.g., "read 15 pages", "ran for 30 minutes"), use that number as a string (e.g., "15", "30"). If they just confirm doing it without a number (e.g., "I went to the gym"), you MUST assume the value is "1".
- **Time**: If the user provides a time (e.g., "woke up at 7am"), use the time in HH:MM format (e.g., "07:00").
- **Options**: The user might say something like "I had a healthy lunch". You must look at the available options for the "Lunch" habit (e.g., ["Healthy", "Junky", "Skipped"]) and find the best match. Use that option string as the value (e.g., "Healthy"). Do not use "true" for options-based habits.

**TOOL USAGE EXAMPLES**

- User says: "I read 15 pages today."
- You should call: \`addHabitReport\` with the ID for the "Reading" habit, a value of "15", and the userId.

- User says: "Yesterday I meditated for 10 minutes."
- You should analyze "yesterday" relative to {{currentDate}} and call: \`addHabitReport\` with the ID for "Meditation", value "10", the userId, and the correct date string (e.g., if today is 2024-07-16, the date would be "2024-07-15").

- User says: "I did my workout" and the "Workout" habit is of type "boolean".
- You should call: \`addHabitReport\` with the ID for "Workout", a value of "true", and the userId.

- User says: "I went to the gym today" and "Gym" is a "number" type habit.
- You should call: \`addHabitReport\` with the ID for "Gym", a value of "1", and the userId.

- User says: "My lunch was healthy".
- You check the "Lunch" habit, see its type is "options" with options ["Healthy", "Junky", "Skipped"].
- You should call: \`addHabitReport\` with the ID for "Lunch", value="Healthy", and the userId.

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
    const [habits, categories] = await Promise.all([
        habitService.getHabitDefinitions(userId),
        habitService.getCategories(userId),
    ]);
    
    const currentDate = new Date().toISOString().split('T')[0];

    const { output } = await prompt({ query, userId, habits, categories, currentDate });
    
    if (!output) {
      return {
        message:
          'The AI assistant was unable to process the request. This might be due to safety filters or an overly complex command. Please try simplifying your request.',
      };
    }
    return output;
  }
);
