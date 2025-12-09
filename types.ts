

export type EmailTone = string;

export interface ToneOption {
    tone: string;
    description: string;
}

export interface Source {
  uri: string;
  title: string;
}

export interface DocumentState {
  name: string;
  mimeType: string;
  data: string; // base64 encoded data
}

export interface GenerationResult {
    text: string;
    sources: Source[];
}

export interface CaseStudy {
    title: string;
    summary: string;
}

export interface GenerationParams {
    emailContext: string;
    documentContent: DocumentState | null;
    clientInfo: string;
    tone: EmailTone;
    selectedMarketingApproach?: string;
    selectedCompanyNews?: string;
    senderName: string;
    senderTitle: string;
    senderCompany: string;
    senderCompanyDescription?: string;
    recipientName: string;
    recipientCompany: string;
    knowledgeBase?: string;
    previousEmail?: string;
    refinementInstructions?: string;
    selectedCaseStudies?: CaseStudy[];
}

export interface User {
  name: string;
  picture: string;
  jobTitle?: string;
  company?: string;
  email?: string;
  companyDescription?: string;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (parent: HTMLElement, options: any) => void;
                    prompt: () => void;
                    disableAutoSelect: () => void;
                };
            };
        };
    }
}