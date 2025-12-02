import React, { useState, useEffect } from 'react';
import { Source, EmailTone } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { LinkIcon } from './icons/LinkIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface OutputPanelProps {
  generatedEmail: string;
  sources: Source[];
  isLoading: boolean;
  error: string | null;
  tone: EmailTone;
  setTone: (value: EmailTone) => void;
  onGenerate: () => void;
}

const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
    </div>
);

export const OutputPanel: React.FC<OutputPanelProps> = ({
  generatedEmail,
  sources,
  isLoading,
  error,
  tone,
  setTone,
  onGenerate,
}) => {
    const [copyButtonText, setCopyButtonText] = useState('Copy');

    useEffect(() => {
        if (copyButtonText === 'Copied!') {
            const timer = setTimeout(() => setCopyButtonText('Copy'), 2000);
            return () => clearTimeout(timer);
        }
    }, [copyButtonText]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedEmail);
        setCopyButtonText('Copied!');
    };

  return (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col space-y-2 md:col-span-2">
                <label htmlFor="tone-select" className="font-medium text-slate-600 dark:text-slate-400">Tone of Voice</label>
                <select
                    id="tone-select"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as EmailTone)}
                    className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                >
                    {Object.values(EmailTone).map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>
            <button
                onClick={onGenerate}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 p-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
                {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

        <div className="border-t border-slate-200 dark:border-slate-700"></div>
        
        <div className="relative min-h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Generated Email</h2>
                {generatedEmail && !isLoading && (
                    <button
                        onClick={handleCopy}
                        className="flex items-center space-x-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition"
                    >
                        <ClipboardIcon className="w-4 h-4" />
                        <span>{copyButtonText}</span>
                    </button>
                )}
            </div>
            <div className="flex-grow p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg prose prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3">
                {isLoading && <LoadingSkeleton />}
                {error && <div className="text-red-500 whitespace-pre-wrap">{error}</div>}
                {!isLoading && !error && !generatedEmail && (
                    <div className="text-slate-500 dark:text-slate-400 h-full flex items-center justify-center">
                        <p>Your generated email will appear here.</p>
                    </div>
                )}
                {generatedEmail && <div className="whitespace-pre-wrap">{generatedEmail}</div>}
            </div>
            {sources.length > 0 && !isLoading && (
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Sources from the web:</h3>
                    <ul className="space-y-2">
                        {sources.map((source, index) => (
                            <li key={index} className="flex items-start space-x-2">
                                <LinkIcon className="w-4 h-4 mt-1 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                                    title={source.uri}
                                >
                                    {source.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </div>
  );
};
