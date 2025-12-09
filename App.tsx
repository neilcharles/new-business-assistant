import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { OutputPanel } from './components/OutputPanel';
import { findApproaches, generateBusinessEmail, searchCaseStudies } from './services/geminiService';
import { EmailTone, Source, DocumentState, User, ToneOption, GenerationResult, CaseStudy } from './types';
import { UploadIcon } from './components/icons/UploadIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { LoginScreen } from './components/LoginScreen';
import { ProfileModal } from './components/ProfileModal';
import { ClockIcon } from './components/icons/ClockIcon';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';

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
                ? 'bg-indigo-500 text-slate-900 shadow font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
    >
        {children}
    </button>
);

// Helper type for History
interface HistoryItem {
    timestamp: number;
    email: string;
    sources: Source[];
    tone: EmailTone;
}

const TONE_OPTIONS: ToneOption[] = [
    {
        tone: 'Assertive and Insight-Driven',
        description: "The email doesn't ask what the customer needs; it tells the customer what they are missing. It delivers a surprising, well-researched reframe to disrupt the status quo, aiming for a referral or a discussion about the insight, not the product."
    },
    {
        tone: 'Empathetic and Value-Focused',
        description: "Used for leads who are \"not yet sales-ready.\" It adopts a helpful, patient tone, providing highly relevant, high-value content for their specific role or pain point, nurturing them through the process without pushing for a sale."
    },
    {
        tone: 'Collaborative and Trust-Building',
        description: "Used after initial engagement, or when reaching multiple stakeholders. The email focuses on tailoring the message to align with the recipient's goals (e.g., \"This helps the CFO achieve X and the VP of Ops achieve Y\"). It positions the seller as an equal partner in achieving a defined business outcome."
    },
    {
        tone: 'Concise and Direct',
        description: "This is the classic Cold Calling 2.0 tone. The email is deliberately short, targeting a high-level executive (e.g., the CEO) with a single, low-commitment request: \"Who is the best person on your team\" to discuss a specific, high-level business problem."
    },
    {
        tone: 'Clear and Action-Oriented',
        description: "Used for late-stage opportunities (Bottom of Funnel). The tone is all about removing friction and providing final-stage content and assurance (e.g., case studies, implementation plans, pricing structure) to drive the final decision and close the deal."
    }
];

const App: React.FC = () => {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Logged in by default for now
  // Initialize with a default user so the Header icon appears even when login is bypassed
  const [user, setUser] = useState<User | null>({
    name: 'Anthony Martin',
    picture: '',
    jobTitle: 'CEO',
    company: 'Bamm',
    companyDescription: `
        Core mission
        BAMM Global helps brands discover and exploit new growth opportunities: entering new markets, reaching new audiences beyond their base, or innovating new products.
        They do that through research-based insight and strategy, combining data, ethnography, cultural analysis, and creative thinking to guide brand positioning, product development, and communications.
        What they do (services & methods)
        Market Opportunity Mapping: sizing and forecasting potential markets, merging external data with internal data; using multivariate approaches and, where needed, machine learning to fill data gaps.
        Audience Profiling: qualitative and quantitative research to probe motivations, beliefs, emotions, behaviours — for example, gauging interest across markets for plant-based beverages.
        Audience Segmentation: defining distinct audience segments based on behaviours, needs or attitudes, to help brands decide which audiences to target — and direct product development, marketing or communications appropriately.
        Cultural & Contextual Analysis: exploring the cultural context, social trends, underlying human emotions — beyond surface demographics — to identify subtle cultural drivers that shape consumer decisions.
        Product / Portfolio Strategy & Innovation: advising brands on which products/offerings to build, which audiences to serve, how to avoid internal overlap or cannibalization, and how to position new offerings.
        Communications Strategy & Customer Experience Mapping: building communications plans grounded in insights about what audiences feel, want, and behave — designing experiences, messaging and campaigns based on real human insight.

        Philosophy / differentiators
        Emphasis on human-led insight: rather than treating markets as abstract demographics, they treat people as individuals with emotions, motivations, cultural backgrounds.
        Integration of qualitative depth (ethnography, photojournalism, cultural research) with quantitative data and analytics — giving nuance plus scalability.
        Ability to work across global markets: offices in London and New York, and network partners in many countries — to support international brand growth.

        Outcome for clients
        New growth pathways: uncovering unmet or latent customer needs, unmet market space.
        Better-targeted brand positioning: relevance to specific segments defined by behaviour, values, emotion rather than just demographics.
        Reduced risk in product/market decisions: data-driven mapping and testing before large investment.
        Stronger brand resonance and communication: rooted in cultural context and human understanding, aiming to build deeper consumer loyalty and differentiated offerings.
    `
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // --- Input State ---
  const [emailContext, setEmailContext] = useState<string>('');
  const [documentContent, setDocumentContent] = useState<DocumentState | null>(null);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientCompany, setRecipientCompany] = useState<string>('');
  const [clientInfo, setClientInfo] = useState<string>('');
  
  // --- Tone State ---
  const [availableTones, setAvailableTones] = useState<ToneOption[]>(TONE_OPTIONS);
  const [tone, setTone] = useState<EmailTone>(TONE_OPTIONS[0].tone);

  // --- Output State ---
  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Tab State ---
  const [activeTab, setActiveTab] = useState<string>('client');
  
  // --- Approaches State ---
  const [marketingApproaches, setMarketingApproaches] = useState<string[]>([]);
  const [companyApproaches, setCompanyApproaches] = useState<string[]>([]);
  const [isFindingApproaches, setIsFindingApproaches] = useState<boolean>(false);
  const [findApproachesError, setFindApproachesError] = useState<string | null>(null);
  
  const [selectedMarketingApproach, setSelectedMarketingApproach] = useState<string | null>(null);
  const [selectedCompanyNews, setSelectedCompanyNews] = useState<string | null>(null);

  // --- Case Study State ---
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [isSearchingCaseStudies, setIsSearchingCaseStudies] = useState(false);
  const [caseStudyError, setCaseStudyError] = useState<string | null>(null);
  const [selectedCaseStudies, setSelectedCaseStudies] = useState<CaseStudy[]>([]);

  // --- History State ---
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Check for a persisted user session in local storage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    
    // Dynamically load Tailwind CSS to avoid FOUC/missing styles in some envs
    // Not using dynamic load as per user request to use index.html
    // but initializing config if needed.
     // @ts-ignore
    if (window.tailwind) {
             // @ts-ignore
            window.tailwind.config = {
                darkMode: 'media',
                theme: {
                  extend: {
                    colors: {
                      indigo: {
                        50: '#fffbeb',
                        100: '#fef3c7',
                        200: '#fde68a',
                        300: '#fcd34d',
                        400: '#fbbf24',
                        500: '#FFCD00', 
                        600: '#e5b800', 
                        700: '#b45309',
                        800: '#92400e',
                        900: '#78350f',
                        950: '#451a03',
                      },
                      slate: {
                        50: '#f8fafc',
                        100: '#f1f5f9',
                        200: '#e2e8f0',
                        300: '#cbd5e1',
                        400: '#94a3b8',
                        500: '#64748b',
                        600: '#475569',
                        700: '#334155',
                        800: '#242E39', 
                        900: '#1A2129', 
                        950: '#0f172a',
                      }
                    }
                  }
                }
            };
    }
  }, []);
  
  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setIsAuthenticated(true);
    if (!user.jobTitle || !user.company) {
        setIsProfileModalOpen(true);
    }
  };

  const handleLogout = () => {
     if (window.google) {
        window.google.accounts.id.disableAutoSelect();
     }
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
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
    setMarketingApproaches([]);
    setCompanyApproaches([]);
    setSelectedMarketingApproach(null);
    setSelectedCompanyNews(null);

    try {
      const result = await findApproaches({ clientInfo, recipientCompany });
      setMarketingApproaches(result.marketing);
      setCompanyApproaches(result.company);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setFindApproachesError(`Failed to find approaches. Please try again. Error: ${errorMessage}`);
      console.error(e);
    } finally {
      setIsFindingApproaches(false);
    }
  }, [clientInfo, recipientCompany]);
  
  const toggleMarketingApproach = (approach: string) => {
      if (selectedMarketingApproach === approach) {
          setSelectedMarketingApproach(null);
      } else {
          setSelectedMarketingApproach(approach);
      }
  };

  const toggleCompanyNews = (news: string) => {
      if (selectedCompanyNews === news) {
          setSelectedCompanyNews(null);
      } else {
          setSelectedCompanyNews(news);
      }
  };

  const handleSearchCaseStudies = useCallback(async () => {
    if (!clientInfo.trim()) {
      setCaseStudyError('Please describe your client and goal on the first tab before searching case studies.');
      return;
    }

    setIsSearchingCaseStudies(true);
    setCaseStudyError(null);
    setCaseStudies([]);
    setSelectedCaseStudies([]);

    try {
        const results = await searchCaseStudies(clientInfo);
        setCaseStudies(results);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setCaseStudyError(`Error searching case studies: ${errorMessage}`);
        console.error(e);
    } finally {
        setIsSearchingCaseStudies(false);
    }
  }, [clientInfo]);

  const toggleCaseStudy = (study: CaseStudy) => {
      if (selectedCaseStudies.find(s => s.title === study.title)) {
          setSelectedCaseStudies(selectedCaseStudies.filter(s => s.title !== study.title));
      } else {
          setSelectedCaseStudies([...selectedCaseStudies, study]);
      }
  };

  const handleGenerateEmail = useCallback(async () => {
    if (!clientInfo.trim()) {
      setError('Please provide information about the client and your goal on the first tab.');
      setActiveTab('client');
      return;
    }
    
    const senderName = user?.name || 'Sender';
    const senderTitle = user?.jobTitle || '';
    const senderCompany = user?.company || '';
    const senderCompanyDescription = user?.companyDescription || '';

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
        selectedMarketingApproach: selectedMarketingApproach || undefined,
        selectedCompanyNews: selectedCompanyNews || undefined,
        senderName,
        senderTitle,
        senderCompany,
        senderCompanyDescription,
        recipientName,
        recipientCompany,
        selectedCaseStudies
      });
      setGeneratedEmail(result.text);
      setSources(result.sources);
      
      // Add to history
      setHistory(prev => [{
          timestamp: Date.now(),
          email: result.text,
          sources: result.sources,
          tone
      }, ...prev]);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate email. Please try again. Error: ${errorMessage}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [clientInfo, emailContext, documentContent, tone, selectedMarketingApproach, selectedCompanyNews, user, recipientName, recipientCompany, selectedCaseStudies]);

  const handleRefineEmail = useCallback(async (instructions: string) => {
      const senderName = user?.name || 'Sender';
      const senderTitle = user?.jobTitle || '';
      const senderCompany = user?.company || '';
      const senderCompanyDescription = user?.companyDescription || '';
  
      setIsLoading(true);
      setError(null);
  
      try {
        const result = await generateBusinessEmail({
          emailContext,
          documentContent,
          clientInfo,
          tone,
          selectedMarketingApproach: selectedMarketingApproach || undefined,
          selectedCompanyNews: selectedCompanyNews || undefined,
          senderName,
          senderTitle,
          senderCompany,
          senderCompanyDescription,
          recipientName,
          recipientCompany,
          previousEmail: generatedEmail, // Pass the current email
          refinementInstructions: instructions, // Pass the user instructions
          selectedCaseStudies
        });
        
        setGeneratedEmail(result.text);
        setSources(result.sources);
        
        // Add to history
        setHistory(prev => [{
            timestamp: Date.now(),
            email: result.text,
            sources: result.sources,
            tone
        }, ...prev]);
  
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(`Failed to refine email. Please try again. Error: ${errorMessage}`);
        console.error(e);
      } finally {
        setIsLoading(false);
      }
  }, [clientInfo, emailContext, documentContent, tone, selectedMarketingApproach, selectedCompanyNews, user, recipientName, recipientCompany, generatedEmail, selectedCaseStudies]);
  
  const restoreHistoryItem = (item: HistoryItem) => {
      setGeneratedEmail(item.email);
      setSources(item.sources);
      setTone(item.tone);
      setIsHistoryPanelOpen(false);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => {}} /* Passing no-op since logic is disabled in LoginScreen for now */ />;
  }

  return (
    <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200">
      <Header user={user} onLogout={handleLogout} onOpenProfile={() => setIsProfileModalOpen(true)} />
      
      {user && (
        <ProfileModal 
            isOpen={isProfileModalOpen} 
            onClose={() => setIsProfileModalOpen(false)} 
            user={user}
            onSave={handleUpdateUser}
        />
      )}

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
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Client & Goal</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex flex-col space-y-2">
                                <label htmlFor="recipient-name" className="font-medium text-slate-600 dark:text-slate-400">Recipient Name</label>
                                <input
                                    id="recipient-name"
                                    type="text"
                                    className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                                    placeholder="e.g. Jane Doe"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col space-y-2">
                                <label htmlFor="recipient-company" className="font-medium text-slate-600 dark:text-slate-400">Recipient Company</label>
                                <input
                                    id="recipient-company"
                                    type="text"
                                    className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                                    placeholder="e.g. Acme Industries"
                                    value={recipientCompany}
                                    onChange={(e) => setRecipientCompany(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                            <label htmlFor="client-info" className="font-medium text-slate-600 dark:text-slate-400">Goal & Context</label>
                            <textarea
                                id="client-info"
                                rows={8}
                                className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                                placeholder="Describe your goal for this email (e.g. schedule a demo, follow up on meeting) and any specific context..."
                                value={clientInfo}
                                onChange={(e) => setClientInfo(e.target.value)}
                            />
                        </div>
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
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-8">
                    {/* Document Upload Section */}
                    <div>
                        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Upload a Document</h2>
                        <div className="flex flex-col space-y-2">
                            <label className="font-medium text-slate-600 dark:text-slate-400">Upload File</label>
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

                    <div className="border-t border-slate-200 dark:border-slate-700"></div>

                    {/* Case Study Search Section */}
                    <div>
                         <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Search Case Study Databank</h2>
                         <button
                            onClick={handleSearchCaseStudies}
                            disabled={isSearchingCaseStudies}
                            className="w-full mb-4 flex items-center justify-center space-x-2 p-3 bg-indigo-500 text-slate-900 font-bold rounded-lg shadow-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                         >
                            {isSearchingCaseStudies ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Searching Databank...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    <span>Search relevant case studies</span>
                                </>
                            )}
                         </button>

                         {caseStudyError && <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">{caseStudyError}</div>}

                         {caseStudies.length > 0 && (
                             <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                 <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                     <thead className="bg-slate-50 dark:bg-slate-800">
                                         <tr>
                                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select</th>
                                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Summary</th>
                                         </tr>
                                     </thead>
                                     <tbody className="bg-white dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700">
                                         {caseStudies.map((study, index) => {
                                             const isSelected = !!selectedCaseStudies.find(s => s.title === study.title);
                                             return (
                                                 <tr 
                                                    key={index} 
                                                    onClick={() => toggleCaseStudy(study)}
                                                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                 >
                                                     <td className="px-6 py-4 whitespace-nowrap">
                                                         {isSelected ? (
                                                             <CheckCircleIcon className="w-6 h-6 text-indigo-500" />
                                                         ) : (
                                                             <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-500" />
                                                         )}
                                                     </td>
                                                     <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-200">
                                                         {study.title}
                                                     </td>
                                                     <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                         {study.summary}
                                                     </td>
                                                 </tr>
                                             );
                                         })}
                                     </tbody>
                                 </table>
                             </div>
                         )}
                         
                         {!isSearchingCaseStudies && caseStudies.length === 0 && caseStudyError === null && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No case studies searched yet. Click the button to find relevant examples based on your client goal.</p>
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
                        className="w-full flex items-center justify-center space-x-2 p-3 bg-indigo-500 text-slate-900 font-bold rounded-lg shadow-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                    >
                        {isFindingApproaches ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    
                    {!isFindingApproaches && (marketingApproaches.length > 0 || companyApproaches.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Marketing Column */}
                            <div className="flex flex-col space-y-3">
                                <h3 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                                    Marketing & Advertising Trends
                                </h3>
                                {marketingApproaches.length === 0 && (
                                    <p className="text-sm text-slate-500 italic">No specific trends found.</p>
                                )}
                                {marketingApproaches.map((approach, index) => (
                                    <button
                                        key={`mkt-${index}`}
                                        onClick={() => toggleMarketingApproach(approach)}
                                        className={`text-left p-4 rounded-lg border transition-all duration-150 ease-in-out text-sm ${
                                            selectedMarketingApproach === approach
                                                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-500 ring-2 ring-indigo-500 shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        {approach}
                                    </button>
                                ))}
                            </div>

                            {/* Company Column */}
                            <div className="flex flex-col space-y-3">
                                <h3 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                                    Company News {recipientCompany ? `(${recipientCompany})` : ''}
                                </h3>
                                {companyApproaches.length === 0 && (
                                    <p className="text-sm text-slate-500 italic">
                                        {recipientCompany 
                                            ? "No recent news found for this company." 
                                            : "Enter a Recipient Company in Step 1 to find specific news."}
                                    </p>
                                )}
                                {companyApproaches.map((news, index) => (
                                    <button
                                        key={`com-${index}`}
                                        onClick={() => toggleCompanyNews(news)}
                                        className={`text-left p-4 rounded-lg border transition-all duration-150 ease-in-out text-sm ${
                                            selectedCompanyNews === news
                                                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-500 ring-2 ring-indigo-500 shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        {news}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'generate' && (
                <div>
                     {history.length > 0 && (
                        <div className="mb-4 flex justify-end">
                             <button
                                onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
                                className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                                <ClockIcon className="w-4 h-4" />
                                <span>{isHistoryPanelOpen ? 'Hide History' : 'Show History'}</span>
                            </button>
                        </div>
                    )}
                    
                    {isHistoryPanelOpen && history.length > 0 && (
                         <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl shadow border border-slate-200 dark:border-slate-700 mb-6 max-h-60 overflow-y-auto">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Generation History</h3>
                            <div className="space-y-2">
                                {history.map((item, idx) => (
                                    <div key={item.timestamp} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer" onClick={() => restoreHistoryItem(item)}>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.timestamp).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-500 truncate max-w-xs">{item.email.substring(0, 50)}...</span>
                                        </div>
                                        <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">{item.tone}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <OutputPanel
                        generatedEmail={generatedEmail}
                        sources={sources}
                        isLoading={isLoading}
                        error={error}
                        tone={tone}
                        setTone={setTone}
                        availableTones={availableTones}
                        onGenerate={handleGenerateEmail}
                        onRefine={handleRefineEmail}
                    />
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;