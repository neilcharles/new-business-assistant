export enum EmailTone {
  PROFESSIONAL = 'Professional',
  CASUAL = 'Casual',
  PERSUASIVE = 'Persuasive',
  DIRECT = 'Direct',
  ENTHUSIASTIC = 'Enthusiastic',
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

export interface GenerationParams {
    emailContext: string;
    documentContent: DocumentState | null;
    clientInfo: string;
    tone: EmailTone;
    selectedApproach?: string;
}

export interface User {
  name: string;
  picture: string;
}
