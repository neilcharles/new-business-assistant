import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { OutputPanel } from './components/OutputPanel';
import { findApproaches, generateBusinessEmail } from './services/geminiService';
import { EmailTone, Source, DocumentState, User } from './types';
import { UploadIcon } from './components/icons/UploadIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { LoginScreen } from './components/LoginScreen';

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 ${
            isActive
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
    >
        {children}
    </button>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  const [emailContext, setEmailContext] = useState<string>('');
  const [documentContent, setDocumentContent] = useState<DocumentState | null>(null);
  const [clientInfo, setClientInfo] = useState<string>('');
  const [tone, setTone] = useState<EmailTone>(EmailTone.PROFESSIONAL);

  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('client');
  
  const [approaches, setApproaches] = useState<string[]>([]);
  const [isFindingApproaches, setIsFindingApproaches] = useState<boolean>(false);
  const [findApproachesError, setFindApproachesError] = useState<string | null>(null);
  const [selectedApproach, setSelectedApproach] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Check for a persisted user session in local storage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);
  
  const handleLogin = () => {
    // In a real app, this would involve an OAuth flow.
    // Here, we'll simulate a successful login.
    const mockUser: User = {
        name: 'Demo User',
        picture: 'https://lh3.googleusercontent.com/a/ACg8ocJ-2a_h-3cKysx5L43n3-b78beSCdxI-3Pn3w_1qBro=s96-c' // A generic user avatar
    };
    localStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

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
        setError("There was an error reading the uploaded file.");
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

  const handleFindApproaches = useCallback(async () => {
    if (!clientInfo.trim()) {
      setFindApproachesError('Please describe your client and goal on the first tab before finding approaches.');
      setActiveTab('client');
      return;
    }
    
    setIsFindingApproaches(true);
    setFindApproachesError(null);
    setApproaches([]);
    setSelectedApproach(null);

    try {
      const result = await findApproaches({ clientInfo, tone });
      setApproaches(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setFindApproachesError(`Failed to find approaches. Please try again. Error: ${errorMessage}`);
      console.error(e);
    } finally {
      setIsFindingApproaches(false);
    }
  }, [clientInfo, tone]);

  const handleGenerateEmail = useCallback(async () => {
    if (!clientInfo.trim()) {
      setError('Please provide information about the client and your goal on the first tab.');
      setActiveTab('client');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedEmail('');
    setSources([]);

    try {
      const result = await generateBusinessEmail({
        emailContext,
        documentContent,
        clientInfo,
        tone,
        selectedApproach: selectedApproach || undefined,
      });
      setGeneratedEmail(result.text);
      setSources(result.sources);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate email. Please try again. Error: ${errorMessage}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [clientInfo, emailContext, documentContent, tone, selectedApproach]);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200">
      <Header user={user} onLogout={handleLogout} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="flex space-x-1 md:space-x-2 border-b border-slate-200 dark:border-slate-700 pb-4 mb-6 overflow-x-auto">
            <TabButton isActive={activeTab === 'client'} onClick={() => setActiveTab('client')}>
                1. Client & Goal
            </TabButton>
            <TabButton isActive={activeTab === 'emails'} onClick={() => setActiveTab('emails')}>
                2. Supporting Emails
            </TabButton>
            <TabButton isActive={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
                3. Supporting Documents
            </TabButton>
            <TabButton isActive={activeTab === 'approach'} onClick={() => setActiveTab('approach')}>
                4. Choose an approach
            </TabButton>
            <TabButton isActive={activeTab === 'generate'} onClick={() => setActiveTab('generate')}>
                5. Generated Email
            </TabButton>
        </div>

        <div>
            {activeTab === 'client' && (
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Client & Goal</h2>
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="client-info" className="font-medium text-slate-600 dark:text-slate-400">Describe your client and objective</label>
                        <textarea
                            id="client-info"
                            rows={15}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                            placeholder="Describe the prospective client, their business, and what you want to achieve with this email..."
                            value={clientInfo}
                            onChange={(e) => setClientInfo(e.target.value)}
                        />
                    </div>
                </div>
            )}
            {activeTab === 'emails' && (
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Supporting Emails</h2>
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="email-context" className="font-medium text-slate-600 dark:text-slate-400">Email Thread</label>
                        <textarea
                            id="email-context"
                            rows={15}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                            placeholder="Paste relevant email thread here for context..."
                            value={emailContext}
                            onChange={(e) => setEmailContext(e.target.value)}
                        />
                    </div>
                </div>
            )}
            {activeTab === 'documents' && (
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Supporting Documents</h2>
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
            )}
            {activeTab === 'approach' && (
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col space-y-6">
                    <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Choose an Approach</h2>
                    
                    <button
                        onClick={handleFindApproaches}
                        disabled={isFindingApproaches}
                        className="w-full flex items-center justify-center space-x-2 p-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                    >
                        {isFindingApproaches ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Searching...</span>
                        </>
                        ) : (
                        <>
                            <SparklesIcon className="w-5 h-5" />
                            <span>Find relevant news stories</span>
                        </>
                        )}
                    </button>

                    {findApproachesError && <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">{findApproachesError}</div>}

                    {isFindingApproaches && (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-full"></div>
                            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-full"></div>
                            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-full"></div>
                        </div>
                    )}
                    
                    {!isFindingApproaches && approaches.length > 0 && (
                        <div className="flex flex-col space-y-3">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Select an angle for your email:</p>
                            {approaches.map((approach, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedApproach(approach)}
                                    className={`text-left p-4 rounded-lg border transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 ${
                                        selectedApproach === approach
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-500 ring-2 ring-indigo-500'
                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    {approach}
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            )}
            {activeTab === 'generate' && (
                <OutputPanel
                    generatedEmail={generatedEmail}
                    sources={sources}
                    isLoading={isLoading}
                    error={error}
                    tone={tone}
                    setTone={setTone}
                    onGenerate={handleGenerateEmail}
                />
            )}
        </div>
      </main>
    </div>
  );
};

export default App;