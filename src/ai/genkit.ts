import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

if (!process.env.GOOGLE_API_KEY) {
    throw new Error("The GOOGLE_API_KEY environment variable has not been set. Please add it to your .env file. You can get a key from Google AI Studio.");
}

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_API_KEY })],
  model: googleAI.model('gemini-2.5-flash'),
});
