import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { GenerationParams, GenerationResult, Source, EmailTone, CaseStudy } from '../types';

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

async function fetchKnowledgeBase(): Promise<string> {
  try {
    const response = await fetch('/knowledge_base/index.json');
    if (!response.ok) return '';
    const files = await response.json();
    const contents = await Promise.all(files.map(async (file: string) => {
        const res = await fetch(`/knowledge_base/${file}`);
        return await res.text();
    }));
    return contents.join('\n\n');
  } catch (e) {
    console.warn("Could not load knowledge base", e);
    return '';
  }
}

export const searchCaseStudies = async (query: string): Promise<CaseStudy[]> => {
    if (!query.trim()) return [];

    const basePrompt = `
      Find case studies relevant to the following client goal/context: "${query}".
      
      Return a list of up to 5 most relevant case studies found in the knowledge base.
      For each case study, provide a 'title' and a brief 'summary' (1-2 sentences) explaining why it is relevant.
      
      Output format: Strictly a JSON array of objects. Each object must have keys "title" and "summary".
      Example:
      [
        {"title": "Retail Transformation Project", "summary": "Helped a major retailer increase footfall by 20% using localized ad targeting."},
        {"title": "Tech Launch Campaign", "summary": "Launched a new SaaS product achieving 3x lead targets via LinkedIn strategy."}
      ]
      
      RETURN ONLY THE JSON ARRAY. Do not add markdown formatting like \`\`\`json.
    `;

    const aiClient = getAiClient();

    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: [{ role: 'user', parts: [{ text: basePrompt }] }],
        config: {
          tools: [{
            fileSearch: {
                fileSearchStoreNames: ["fileSearchStores/awardsknowledgebase-6rvr0bdyitjy"]
            }
          }]
        },
      });
  
      const text = response.text || '';
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      console.error("File search failed:", error);
      throw error;
    }
};

export const findApproaches = async (params: { clientInfo: string, recipientCompany: string }): Promise<{ marketing: string[], company: string[] }> => {
  if (!params.clientInfo.trim()) {
    return { marketing: [], company: [] };
  }

  let prompt = `
    Based on the following client description and goal: "${params.clientInfo}".
    
    TASK 1: MARKETING NEWS
    Find 3 to 5 current and relevant news stories, trends, or topics from the advertising and marketing world that could be used as a compelling angle for a sales email.
    
    ${params.recipientCompany.trim() ? `
    TASK 2: COMPANY NEWS
    Find 3 to 5 news stories specifically about the company "${params.recipientCompany}" from the previous 3 months.
    ` : ''}

    FORMATTING INSTRUCTIONS:
    - Return the results in two distinct sections separated by the headers "MARKETING_NEWS" and "COMPANY_NEWS".
    - List each topic as a concise, single sentence starting with a hyphen (-).
    - Do not include any other intro or outro text.
    
    Example Format:
    MARKETING_NEWS
    - Trend 1
    - Trend 2
    
    COMPANY_NEWS
    - News 1
    - News 2
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

    const text = response.text || '';
    
    const marketing: string[] = [];
    const company: string[] = [];
    
    let currentSection = 'marketing'; // default

    const lines = text.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'MARKETING_NEWS') {
            currentSection = 'marketing';
            continue;
        }
        if (trimmed === 'COMPANY_NEWS') {
            currentSection = 'company';
            continue;
        }
        
        if (trimmed.startsWith('-')) {
            const item = trimmed.substring(1).trim();
            if (currentSection === 'marketing') {
                marketing.push(item);
            } else if (currentSection === 'company') {
                company.push(item);
            }
        }
    }

    return { marketing, company };
  } catch (error) {
    console.error("Error finding approaches with Gemini:", error);
    throw new Error("Failed to find approaches with the AI model.");
  }
};


const buildPrompt = (params: GenerationParams): string => {
  const { 
      emailContext, 
      documentContent, 
      clientInfo, 
      tone, 
      selectedMarketingApproach,
      selectedCompanyNews,
      senderName,
      senderTitle,
      senderCompany,
      senderCompanyDescription,
      recipientName,
      recipientCompany,
      knowledgeBase,
      previousEmail,
      refinementInstructions,
      selectedCaseStudies
  } = params;

  const documentContextMessage = documentContent ? `An external document named '${documentContent.name}' has been provided as additional context. Please analyze it carefully along with other information.` : 'No document context provided.';
  
  let approachMessage = '';
  if (selectedMarketingApproach && selectedCompanyNews) {
      approachMessage = `You MUST incorporate the following two angles into the email seamlessly:\n1. Marketing Trend: "${selectedMarketingApproach}"\n2. Company News: "${selectedCompanyNews}"`;
  } else if (selectedMarketingApproach) {
      approachMessage = `You MUST incorporate the following marketing angle into the email: "${selectedMarketingApproach}"`;
  } else if (selectedCompanyNews) {
      approachMessage = `You MUST incorporate the following company news into the email: "${selectedCompanyNews}"`;
  } else {
      approachMessage = 'Use your expertise to determine the best angle.';
  }

  const senderContext = `You are writing this email from ${senderName}${senderTitle ? `, ${senderTitle}` : ''} at ${senderCompany || 'your company'}.
  ${senderCompanyDescription ? `\n**About the Sender's Company:**\n${senderCompanyDescription}\nUse this context to accurately represent the value proposition and capabilities of the sender's company.` : ''}`;
  
  const recipientContext = `You are writing to ${recipientName || 'the prospect'} at ${recipientCompany || 'their company'}.`;
  
  let caseStudyContext = '';
  if (selectedCaseStudies && selectedCaseStudies.length > 0) {
      caseStudyContext = `
      **Industry Inspiration (Case Studies):**
      The following case studies represent successful strategies/outcomes in the industry.
      
      **IMPORTANT INSTRUCTION:**
      - Use these examples **strictly for inspiration** to craft a compelling value proposition or strategy.
      - **DO NOT** reference these specific case studies, titles, or clients in the email.
      - **DO NOT** claim these projects were carried out by the sender's company.
      - **DO NOT** imply ownership of this work. 

      Inspiration Material:
      ${selectedCaseStudies.map((cs, i) => `${i + 1}. Title: ${cs.title}\n   Summary: ${cs.summary}`).join('\n')}
      `;
  }

  const kbContext = knowledgeBase ? `
    **Internal Sales Methodology & Knowledge Base:**
    The following text contains proven sales techniques and insights from our internal knowledge base. Use these concepts, statistics, or value pillars to make the email more persuasive and authoritative where appropriate.
    ---
    ${knowledgeBase}
    ---
  ` : '';

  const coreInstructions = `
    **Sender Context:** ${senderContext}
    **Recipient Context:** ${recipientContext}
    
    **Chosen Approach/Angle:**
    ${approachMessage}
    
    ${caseStudyContext}

    **Tone:**
    ${tone}

    **Writing Style:**
    - Write in a natural, human, and professional voice.
    - STRICTLY AVOID corporate jargon, buzzwords, and fluff (e.g., "synergy", "paradigm shift", "leverage", "game-changer", "deep dive", "circle back").
    - Be clear, concise, and direct.
    - Present the information plainly, without assuming the reader needs guidance or reassurance. Treat the recipient as a peer who understands their business.
    - Prioritise simple, plain-English conversational language, preferring shorter words to long ones.

    **Supporting Documents (For additional details):**
    ${documentContextMessage}
    
    ${kbContext}
  `;

  // --- REFINEMENT MODE ---
  if (previousEmail && refinementInstructions) {
      return `
        You are an expert sales assistant. You previously generated an email draft, and the user has provided feedback to refine it.

        **YOUR TASK:**
        Rewrite the "Previous Draft" below to address the "User's Refinement Instructions". 
        
        - Keep the original facts, context, and goal accurate unless the instructions say otherwise.
        - Ensure the tone matches the desired setting: ${tone}.
        
        *** PREVIOUS DRAFT ***
        ${previousEmail}
        *** END PREVIOUS DRAFT ***

        *** USER'S REFINEMENT INSTRUCTIONS ***
        ${refinementInstructions}
        *** END INSTRUCTIONS ***

        **Original Goal & Context (For reference):**
        ${clientInfo}

        ${coreInstructions}

        Generate the refined email now.
      `;
  }

  // --- GENERATION MODE ---

  if (emailContext) {
    return `
      You are an AI assistant. Your primary and most critical task is to analyze the following email thread and then draft a new email that seamlessly continues the conversation. This provided thread is the single source of truth for our past conversation.

      **Primary Directive:**
      Deeply analyze the email thread provided below. Your generated email MUST be a direct and relevant continuation of this specific conversation. Reference points, questions, or agreements mentioned in the thread to make the new email feel personal and informed. Do not generate a generic sales email; your response must be grounded in the provided dialogue.
      
      ${coreInstructions}

      **Email Thread for Analysis:**
      ---
      ${emailContext}
      ---

      **My Goal for this New Email:**
      This is what I want to achieve. Use this to guide the call to action and the overall message, while staying true to the conversation history from the thread above.
      ${clientInfo}

      **Web Search (For enrichment):**
      Use web search for current marketing or advertising topics ONLY if it directly supports the goal of this email and fits the context of our conversation. Avoid generic trends.

      Based on your detailed analysis of the provided email thread, generate the new email now. Ensure the sign-off uses the sender's name provided in the context.
    `;
  }

  // Fallback for when no email thread is provided
  return `
    You are a New Business Assistant, an expert in sales and marketing. Your task is to write a compelling and professional email to a prospective client.

    No email thread was pasted. The email will be generated based on your goal and other provided context.

    Please draft a sales email based on the following information. Incorporate best practices for sales outreach and use current information about marketing and advertising trends to make the email relevant and impactful. The email should be clear, concise, and have a strong call to action.

    ${coreInstructions}

    **Goal & Context:**
    ${clientInfo}

    Generate the email now. Ensure the email is addressed correctly to the recipient and signed off by the sender using the names provided in the context.
  `;
};


export const generateBusinessEmail = async (params: GenerationParams): Promise<GenerationResult> => {
  try {
    const aiClient = getAiClient();
    
    // Fetch knowledge base content before building prompt
    const knowledgeBase = await fetchKnowledgeBase();
    
    const prompt = buildPrompt({ ...params, knowledgeBase });

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

    const text = response.text || '';

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