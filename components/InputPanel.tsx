import React, { useCallback, useRef } from 'react';
import { EmailTone, DocumentState } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { UploadIcon } from './icons/UploadIcon';

interface InputPanelProps {
  emailContext: string;
  setEmailContext: (value: string) => void;
  documentContent: DocumentState | null;
  setDocumentContent: (value: DocumentState | null) => void;
  clientInfo: string;
  setClientInfo: (value: string) => void;
  tone: EmailTone;
  setTone: (value: EmailTone) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  emailContext,
  setEmailContext,
  documentContent,
  setDocumentContent,
  clientInfo,
  setClientInfo,
  tone,
  setTone,
  onGenerate,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64Data = dataUrl.split(',')[1];
        if (base64Data) {
          setDocumentContent({
            name: file.name,
            mimeType: file.type,
            data: base64Data,
          });
        }
      };
      reader.onerror = () => {
        console.error("Error reading file");
        // Optionally, set an error state to inform the user
      }
      reader.readAsDataURL(file);
    }
  }, [setDocumentContent]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleClearFile = () => {
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    setDocumentContent(null);
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col space-y-6">
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Craft Your Message</h2>
      
      {/* Client Info */}
      <div className="flex flex-col space-y-2">
        <label htmlFor="client-info" className="font-medium text-slate-600 dark:text-slate-400">Client & Goal</label>
        <textarea
          id="client-info"
          rows={5}
          className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
          placeholder="Describe the prospective client, their business, and what you want to achieve with this email..."
          value={clientInfo}
          onChange={(e) => setClientInfo(e.target.value)}
        />
      </div>

      {/* Tone Selector - Simplified for now as dynamic tones are in App.tsx */}
       <div className="flex flex-col space-y-2">
        <label htmlFor="tone-input" className="font-medium text-slate-600 dark:text-slate-400">Tone of Voice</label>
        <input
            id="tone-input"
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value as EmailTone)}
            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
            placeholder="Enter tone (e.g. Professional)"
        />
      </div>

      {/* Optional Context */}
      <div className="flex flex-col space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Add Optional Context</h3>
        
        {/* Email Context */}
        <div className="flex flex-col space-y-2">
            <label htmlFor="email-context" className="font-medium text-slate-600 dark:text-slate-400">Email Thread</label>
            <textarea
              id="email-context"
              rows={6}
              className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
              placeholder="Paste relevant email thread here for context..."
              value={emailContext}
              onChange={(e) => setEmailContext(e.target.value)}
            />
        </div>


        {/* Document Upload */}
        <div className="flex flex-col space-y-2">
            <label className="font-medium text-slate-600 dark:text-slate-400">Upload Document</label>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.md,.pdf,.pptx" 
            />
            {documentContent ? (
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate pr-2">{documentContent.name}</p>
                    <button onClick={handleClearFile} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition flex-shrink-0">
                        Remove
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleUploadClick}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-600 transition"
                >
                    <UploadIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300 text-sm">Upload a file (.txt, .md, .pdf, .pptx)</span>
                </button>
            )}
        </div>
      </div>
      
      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="w-full flex items-center justify-center space-x-2 p-4 bg-indigo-500 text-slate-900 font-bold rounded-lg shadow-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition duration-150 ease-in-out"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generating...</span>
          </>
        ) : (
          <>
            <SparklesIcon className="w-5 h-5" />
            <span>Generate Email</span>
          </>
        )}
      </button>
    </div>
  );
};