
'use server';
/**
 * @fileOverview Provides AI-driven analysis of a user's diet plan.
 * 
 * - dietAnalysisFlow - Analyzes a diet plan and provides feedback.
 * - DietAnalysisInput - The input type for the flow.
 * - DietAnalysisOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FoodItemSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

const MealSchema = z.object({
  name: z.string(),
  foods: z.array(FoodItemSchema),
});

const DietAnalysisInputSchema = z.object({
  dietPlan: z.object({
    profile: z.object({
      age: z.number(),
      weight: z.number(),
      height: z.number(),
      gender: z.string(),
    }),
    objective: z.string(),
    targets: z.object({
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    }),
    meals: z.array(MealSchema),
  }),
});
export type DietAnalysisInput = z.infer<typeof DietAnalysisInputSchema>;

const DietAnalysisOutputSchema = z.object({
  feedback: z.string().describe('A helpful, actionable review of the diet plan, formatted as a bulleted list.'),
});
export type DietAnalysisOutput = z.infer<typeof DietAnalysisOutputSchema>;

export async function dietAnalysis(input: DietAnalysisInput): Promise<DietAnalysisOutput> {
  return dietAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dietAnalysisPrompt',
  input: { schema: DietAnalysisInputSchema },
  output: { schema: DietAnalysisOutputSchema },
  prompt: `You are an expert nutritionist and fitness coach. Analyze the following diet plan and provide a helpful, actionable review in 2-4 bullet points.

User Profile:
- Age: {{{dietPlan.profile.age}}}
- Weight: {{{dietPlan.profile.weight}}}
- Height: {{{dietPlan.profile.height}}}
- Gender: {{{dietPlan.profile.gender}}}
- Objective: {{{dietPlan.objective}}}

Daily Targets:
- Calories: {{{dietPlan.targets.calories}}} kcal
- Protein: {{{dietPlan.targets.protein}}}g
- Carbs: {{{dietPlan.targets.carbs}}}g
- Fat: {{{dietPlan.targets.fat}}}g

Meals Plan:
{{#each dietPlan.meals}}
- Meal: {{this.name}}
  {{#each this.foods}}
  - {{this.name}}: {{this.calories}} kcal, {{this.protein}}g P, {{this.carbs}}g C, {{this.fat}}g F
  {{/each}}
{{/each}}

Based on this data, provide a concise review. Identify strengths and weaknesses. Offer specific suggestions for improvement. For example, if protein is low, suggest adding a specific food. If calories are too high for a weight loss goal, point that out. Start each bullet point with a '-'.
`,
});

const dietAnalysisFlow = ai.defineFlow(
  {
    name: 'dietAnalysisFlow',
    inputSchema: DietAnalysisInputSchema,
    outputSchema: DietAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
