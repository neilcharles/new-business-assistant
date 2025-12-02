import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { GenerationParams, GenerationResult, Source, EmailTone } from '../types';

let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!ai) {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      throw new Error("API_KEY environment variable not set.");
    }
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
}

const model = "gemini-2.5-flash";

export const findApproaches = async (params: { clientInfo: string, tone: EmailTone }): Promise<string[]> => {
  if (!params.clientInfo.trim()) {
    return [];
  }

  const prompt = `
    Based on the following client description and goal: "${params.clientInfo}", and a desired "${params.tone}" tone.
    Find 3 to 5 current and relevant news stories, trends, or topics from the advertising and marketing world that could be used as a compelling angle for a sales email.
    List each topic as a concise, single sentence.
    Format your response as a simple list, with each item on a new line, starting with a hyphen. Do not include any other text, titles, or explanations.
    For example:
    - A recent study shows a 20% increase in consumer engagement with interactive video ads.
    - The rise of AI-powered personalization is transforming e-commerce marketing strategies.
  `;

  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) {
      return [];
    }

    // Parse the text response into an array of strings
    const approaches = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim()); 

    return approaches;
  } catch (error) {
    console.error("Error finding approaches with Gemini:", error);
    throw new Error("Failed to find approaches with the AI model.");
  }
};


const buildPrompt = (params: GenerationParams): string => {
  const { emailContext, documentContent, clientInfo, tone, selectedApproach } = params;
  const documentContextMessage = documentContent ? `An external document named '${documentContent.name}' has been provided as additional context. Please analyze it carefully along with other information.` : 'No document context provided.';
  const approachMessage = selectedApproach ? `You MUST incorporate the following angle into the email: "${selectedApproach}"` : 'Use your expertise to determine the best angle.';


  if (emailContext) {
    return `
      You are an AI assistant. Your primary and most critical task is to analyze the following email thread and then draft a new email that seamlessly continues the conversation. This provided thread is the single source of truth for our past conversation.

      **Primary Directive:**
      Deeply analyze the email thread provided below. Your generated email MUST be a direct and relevant continuation of this specific conversation. Reference points, questions, or agreements mentioned in the thread to make the new email feel personal and informed. Do not generate a generic sales email; your response must be grounded in the provided dialogue.

      **Chosen Angle:**
      ${approachMessage}

      **Email Thread for Analysis:**
      ---
      ${emailContext}
      ---

      **My Goal for this New Email:**
      This is what I want to achieve. Use this to guide the call to action and the overall message, while staying true to the conversation history from the thread above.
      ${clientInfo}

      **Tone:**
      ${tone}

      **Supporting Documents (For additional details):**
      ${documentContextMessage}

      **Web Search (For enrichment):**
      Use web search for current marketing or advertising topics ONLY if it directly supports the goal of this email and fits the context of our conversation. Avoid generic trends.

      Based on your detailed analysis of the provided email thread, generate the new email now.
    `;
  }

  // Fallback for when no email thread is providedx
  return `
    You are a New Business Assistant, an expert in sales and marketing. Your task is to write a compelling and professional email to a prospective client.

    No email thread was pasted. The email will be generated based on your goal and other provided context.

    Please draft a sales email based on the following information. Incorporate best practices for sales outreach and use current information about marketing and advertising trends to make the email relevant and impactful. The email should be clear, concise, and have a strong call to action.

    **Chosen Angle:**
    ${approachMessage}

    **Tone:**
    ${tone}

    **My Goal & Client Information:**
    ${clientInfo}

    **Relevant context from my uploaded documents (if any):**
    ${documentContextMessage}

    Generate the email now.
  `;
};


export const generateBusinessEmail = async (params: GenerationParams): Promise<GenerationResult> => {
  try {
    const aiClient = getAiClient();
    const prompt = buildPrompt(params);

    const contentParts: Part[] = [{ text: prompt }];

    if (params.documentContent) {
      contentParts.push({
        inlineData: {
          mimeType: params.documentContent.mimeType,
          data: params.documentContent.data,
        },
      });
    }

    const response: GenerateContentResponse = await aiClient.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: contentParts }],
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const text = response.text;

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: Source[] = groundingChunks
        .map((chunk) => {
            if (chunk.web) {
                return {
                    uri: chunk.web.uri || '',
                    title: chunk.web.title || 'Untitled Source'
                };
            }
            return null;
        })
        .filter((source): source is Source => source !== null && source.uri !== '');

    return { text, sources };
  } catch (error) {
    console.error("Error generating content with Gemini:", error);
    throw new Error("Failed to communicate with the AI model.");
  }
};