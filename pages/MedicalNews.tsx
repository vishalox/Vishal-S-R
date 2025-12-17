import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, RefreshCw, Calendar, Tag, ChevronRight, X, FlaskConical, Globe, Pill, ShieldAlert, Search, MapPin, AlertCircle, TrendingUp, Syringe, Activity, Radio, Play, Pause, Bell } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { useLanguage } from '../App';
import ReactMarkdown from 'react-markdown';

interface LocationData {
  country: string;
  state: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: 'New Disease' | 'Outbreak' | 'New Medicine' | 'Vaccine' | 'Research' | 'Health Alert';
  location: LocationData;
  timestamp: number; // Unix timestamp for real-time sorting
  date?: string;
  content: string; 
  severity: 'High' | 'Medium' | 'Low';
  source: string;
  isNew?: boolean; // For animation
}

const CATEGORIES = [
    { id: 'all', labelKey: 'title', icon: Globe },
    { id: 'Outbreak', labelKey: 'catOutbreak', icon: AlertCircle },
    { id: 'New Disease', labelKey: 'catDisease', icon: Activity },
    { id: 'New Medicine', labelKey: 'catMedicine', icon: Pill },
    { id: 'Vaccine', labelKey: 'catVaccine', icon: Syringe },
    { id: 'Research', labelKey: 'catResearch', icon: FlaskConical },
];

const DEMO_NEWS: NewsItem[] = [
  {
    id: 'demo-1',
    title: 'New Malaria Vaccine Shows 77% Efficacy in Early Trials',
    summary: 'A potentially game-changing malaria vaccine has demonstrated high efficacy in Phase 2 trials conducted in West Africa.',
    category: 'Vaccine',
    location: { country: 'Burkina Faso', state: 'Nantou' },
    timestamp: Date.now() - 3600000,
    date: new Date().toISOString().split('T')[0],
    content: `Scientists have reported that a new malaria vaccine, R21/Matrix-M, has become the first to meet the World Health Organization's goal of 75% efficacy against the mosquito-borne disease. 
    
    In a trial involving 450 children in Burkina Faso, the vaccine was found to be 77% effective over 12 months of follow-up. 
    
    The researchers, from the University of Oxford, are now planning final-stage trials. Malaria kills more than 400,000 people a year, mostly children in sub-Saharan Africa.`,
    severity: 'Medium',
    source: 'Global Health Institute'
  },
  {
    id: 'demo-2',
    title: 'Outbreak of Nipah Virus Reported in Kerala',
    summary: 'Health authorities confirm two cases of Nipah virus in Kozhikode district, prompting isolation protocols.',
    category: 'Outbreak',
    location: { country: 'India', state: 'Kerala' },
    timestamp: Date.now() - 7200000,
    date: new Date().toISOString().split('T')[0],
    content: `Local health officials in Kerala have confirmed a localized outbreak of the Nipah virus. Contact tracing has been initiated immediately.
    
    The Nipah virus can be transmitted to humans from animals (such as bats or pigs), or contaminated foods and can also be transmitted directly from human-to-human.
    
    Residents are advised to avoid consuming fruits that may have been bitten by bats and to maintain hygiene.`,
    severity: 'High',
    source: 'CDC India'
  },
  {
    id: 'demo-3',
    title: 'FDA Approves New Treatment for Alzheimer\'s Disease',
    summary: 'The FDA has granted accelerated approval for a new drug targeting amyloid plaques in the brain.',
    category: 'New Medicine',
    location: { country: 'USA', state: 'Maryland' },
    timestamp: Date.now() - 10800000,
    date: new Date().toISOString().split('T')[0],
    content: `The US Food and Drug Administration has approved a new therapy for Alzheimer's disease. This is the first new treatment approved for Alzheimer's since 2003.
    
    The drug works by clearing amyloid beta plaques from the brain, which are thought to play a key role in the pathology of the disease.
    
    Clinical trials showed a reduction in clinical decline, though experts caution that more monitoring is needed for potential side effects.`,
    severity: 'Low',
    source: 'FDA News'
  }
];

export default function MedicalNews() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real-Time State
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission === 'granted');

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'High' | 'Medium'>('All');

  // Initial Fetch
  useEffect(() => {
    fetchInitialNews();
    requestNotificationPermission();
  }, [language]);

  // Live Stream Logic
  useEffect(() => {
    if (isLive) {
      // Simulate receiving a new news packet every 45 seconds
      intervalRef.current = setInterval(() => {
        fetchSingleLiveUpdate();
      }, 45000); 
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive, language, newsItems]);

  const requestNotificationPermission = async () => {
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  const sendNotification = (item: NewsItem) => {
    if (notificationsEnabled && document.hidden) {
       new Notification(`HealthGuardian Alert: ${item.category}`, {
         body: `${item.title} detected in ${item.location.country}`,
         icon: '/vite.svg'
       });
    }
  };

  // 1. Initial Load (Batch)
  const fetchInitialNews = async (customQuery?: string) => {
    setLoading(true);
    const targetLang = language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : 'English';
    const basePrompt = `Act as a real-time medical news aggregator.
    Generate 6 distinct, diverse global medical news items from the last 24 hours.
    Categories: New Diseases, Outbreaks, New Medicines, Vaccine Updates, Research.
    
    CRITICAL: Extract specific Country and State/Region.
    CRITICAL: Assign severity (High for outbreaks, Low for routine).
    
    ${customQuery ? `Focus on: "${customQuery}"` : ""}
    Target Language: ${targetLang}.`;

    try {
        if (process.env.API_KEY) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const data = await callGemini(ai, basePrompt, true);
            if (data.news) {
                const items = data.news.map((item: any, index: number) => ({
                    ...item,
                    id: Date.now().toString() + index,
                    timestamp: Date.now() - (index * 3600000), // Stagger times slightly back
                    isNew: false
                }));
                setNewsItems(items);
                setLastUpdated(new Date());
            }
        } else {
            // Fallback
            await new Promise(r => setTimeout(r, 1000));
            setNewsItems(DEMO_NEWS);
        }
    } catch (e) {
        console.error("Fetch failed", e);
        if (newsItems.length === 0) setNewsItems(DEMO_NEWS);
    } finally {
        setLoading(false);
    }
  };

  // 2. Real-Time Single Item Injection (Stream)
  const fetchSingleLiveUpdate = async () => {
    const targetLang = language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : 'English';
    const prompt = `GENERATE A BREAKING MEDICAL NEWS ALERT.
    Imagine a brand new medical event just happened RIGHT NOW.
    It should be different from previous items.
    Topics: Sudden Disease Outbreak, FDA Emergency Approval, Major Research Breakthrough.
    
    Target Language: ${targetLang}.`;

    try {
       if (process.env.API_KEY) {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const data = await callGemini(ai, prompt, false); // Fetch single item
          
          if (data.news && data.news[0]) {
             const newItem: NewsItem = {
                 ...data.news[0],
                 id: Date.now().toString(),
                 timestamp: Date.now(),
                 isNew: true
             };
             
             // Prepend to list
             setNewsItems(prev => [newItem, ...prev]);
             setLastUpdated(new Date());
             
             // Trigger Alert if High Severity
             if (newItem.severity === 'High') {
                playAlertSound();
                sendNotification(newItem);
             }
             
             // Remove "isNew" flag after animation
             setTimeout(() => {
                 setNewsItems(prev => prev.map(i => i.id === newItem.id ? { ...i, isNew: false } : i));
             }, 3000);
          }
       }
    } catch (e) {
        console.log("Live stream pulse failed", e);
    }
  };

  const callGemini = async (ai: GoogleGenAI, prompt: string, isArray: boolean) => {
      const schema = {
        type: Type.OBJECT,
        properties: {
          news: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    category: { type: Type.STRING, description: "One of: 'New Disease', 'Outbreak', 'New Medicine', 'Vaccine', 'Research', 'Health Alert'" },
                    location: {
                        type: Type.OBJECT,
                        properties: {
                            country: { type: Type.STRING },
                            state: { type: Type.STRING, description: "State, Province, or Region" }
                        },
                        required: ["country", "state"]
                    },
                    date: { type: Type.STRING, description: "YYYY-MM-DD" },
                    content: { type: Type.STRING, description: "Full article text (3 paragraphs)." },
                    severity: { type: Type.STRING, description: "High, Medium, or Low" },
                    source: { type: Type.STRING, description: "Source organization" }
                },
                required: ["title", "summary", "category", "location", "date", "content", "severity", "source"]
            }
          }
        },
        required: ["news"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
      });
      return JSON.parse(response.text || "{}");
  };

  const playAlertSound = () => {
      const audio = new Audio('https://cdn.freesound.org/previews/337/337000_5674468-lq.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio blocked"));
  };

  const formatTimeAgo = (timestamp: number) => {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      if (seconds < 60) return "Just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
  };

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      fetchInitialNews(searchQuery);
  };

  // Client-side filtering
  const filteredNews = newsItems.filter(item => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (severityFilter !== 'All' && item.severity !== severityFilter) return false;
      return true;
  });

  const breakingNews = newsItems.filter(item => item.severity === 'High');

  const getCategoryColor = (cat: string) => {
      switch(cat) {
          case 'Outbreak': 
          case 'Health Alert': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200';
          case 'New Disease': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200';
          case 'New Medicine': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200';
          case 'Vaccine': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200';
          default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200';
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-fade-in pb-12">
      
      {/* 1. Real-Time Dashboard Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Top Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                    <Activity size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {t.news.title}
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className={`relative flex h-2 w-2 ${isLive ? '' : 'hidden'}`}>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span>{isLive ? 'LIVE FEED ACTIVE' : 'FEED PAUSED'}</span>
                        <span>•</span>
                        <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                <button 
                    onClick={() => setIsLive(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${isLive ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    <Play size={14} /> Live
                </button>
                <button 
                    onClick={() => setIsLive(false)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${!isLive ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    <Pause size={14} /> Pause
                </button>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                 <button 
                    onClick={() => fetchSingleLiveUpdate()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Simulate incoming news"
                >
                    <Radio size={14} /> + Event
                </button>
                 <button 
                    onClick={() => fetchInitialNews()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition"
                    title="Refresh full feed"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>

        {/* Search & Filters Toolbar */}
        <div className="p-4 bg-gray-50 dark:bg-gray-950/50 flex flex-col md:flex-row gap-4 items-center">
             <form onSubmit={handleSearch} className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder={t.news.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </form>
            
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                 <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                    {['All', 'High', 'Medium'].map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => setSeverityFilter(lvl as any)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition ${severityFilter === lvl ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {lvl}
                        </button>
                    ))}
                 </div>
            </div>
        </div>
      </div>

      {/* 2. Breaking News Ticker */}
      {breakingNews.length > 0 && (
          <div className="bg-red-600 text-white p-3 rounded-xl shadow-lg flex items-center gap-4 animate-fade-in overflow-hidden relative">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider whitespace-nowrap bg-white/20 px-2 py-1 rounded">
                  <ShieldAlert size={14} /> Breaking
              </div>
              <div className="flex-1 overflow-hidden">
                  <div className="flex gap-8 animate-marquee whitespace-nowrap">
                      {breakingNews.slice(0, 3).map(item => (
                          <div key={item.id} onClick={() => setSelectedArticle(item)} className="cursor-pointer hover:underline text-sm font-medium flex items-center gap-2">
                              <span>{item.title}</span>
                              <span className="text-red-200 text-xs">• {item.location.country}</span>
                              <span className="text-red-200 text-xs">• {formatTimeAgo(item.timestamp)}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* 3. Category Chips */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {CATEGORIES.map((cat) => {
            if (cat.id === 'all') return null;
            const Icon = cat.icon;
            const active = filterCategory === cat.id;
            return (
                <button
                    key={cat.id}
                    onClick={() => setFilterCategory(active ? 'all' : cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap border ${
                        active 
                        ? getCategoryColor(cat.id).replace('bg-', 'bg-white text-').replace('border-', 'border-') + ' shadow-md'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${active ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-900' : ''}`}
                >
                    <Icon size={14} />
                    {t.news[cat.labelKey]}
                </button>
            )
        })}
      </div>

      {/* 4. Live News Stream (List/Grid) */}
      {loading && newsItems.length === 0 ? (
          <div className="space-y-4">
              {[1,2,3].map(i => (
                  <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
              ))}
          </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
            {filteredNews.map((item) => (
                <div 
                    key={item.id} 
                    onClick={() => setSelectedArticle(item)}
                    className={`bg-white dark:bg-gray-900 rounded-xl border p-5 shadow-sm transition-all duration-500 hover:shadow-md relative overflow-hidden group cursor-pointer
                        ${item.isNew ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900 bg-blue-50/30 dark:bg-blue-900/10 transform scale-[1.01]' : 'border-gray-200 dark:border-gray-800'}
                    `}
                >
                    {item.isNew && (
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg animate-pulse z-10">
                            JUST IN
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-5">
                        {/* Severity Indicator Line */}
                        <div className={`hidden md:block w-1.5 rounded-full self-stretch ${
                             item.severity === 'High' ? 'bg-red-500' : 
                             item.severity === 'Medium' ? 'bg-orange-400' : 'bg-green-400'
                        }`}></div>

                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${getCategoryColor(item.category)}`}>
                                    {item.category}
                                </span>
                                {item.severity === 'High' && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 animate-pulse">
                                        <ShieldAlert size={12} /> HIGH SEVERITY
                                    </span>
                                )}
                                <span className="text-[10px] text-gray-400 ml-auto flex items-center gap-1">
                                    <Calendar size={10} /> {formatTimeAgo(item.timestamp)}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                                {item.title}
                            </h3>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                 <div className="flex items-center gap-1">
                                    <MapPin size={12} className="text-gray-400" />
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{item.location.country}</span>
                                    {item.location.state && <span className="opacity-60">, {item.location.state}</span>}
                                 </div>
                                 <div className="flex items-center gap-1">
                                     <Globe size={12} /> {item.source}
                                 </div>
                            </div>

                            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                                {item.summary}
                            </p>
                        </div>

                        <div className="flex md:flex-col justify-between items-end gap-2 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-3 md:pt-0 md:pl-5 mt-2 md:mt-0">
                             <button 
                                className="p-2 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* 5. Article Detail Modal (Same as before but linked to live data) */}
      {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getCategoryColor(selectedArticle.category)}`}>
                                      {selectedArticle.category}
                                  </span>
                                  <span className="text-xs text-gray-500 flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                      <MapPin size={12} /> {selectedArticle.location.country}, {selectedArticle.location.state}
                                  </span>
                                   <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Calendar size={12} /> {new Date(selectedArticle.timestamp).toLocaleString()}
                                  </span>
                              </div>
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                                  {selectedArticle.title}
                              </h2>
                          </div>
                          <button onClick={() => setSelectedArticle(null)} className="p-2 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition shadow-sm z-20">
                              <X size={20} className="text-gray-500" />
                          </button>
                      </div>
                  </div>
                  
                  {/* Modal Content */}
                  <div className="overflow-y-auto p-8">
                      {selectedArticle.severity === 'High' && (
                          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg flex gap-3">
                              <ShieldAlert className="text-red-600 flex-shrink-0" size={24} />
                              <div>
                                  <h4 className="text-red-800 dark:text-red-200 font-bold text-sm">High Severity Alert</h4>
                                  <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                                      This news item is flagged as high severity. Please follow local health guidelines.
                                  </p>
                              </div>
                          </div>
                      )}

                      <div className="prose prose-blue dark:prose-invert max-w-none text-sm md:text-base">
                          <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
                      </div>
                      
                      <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
                          <p><strong>{t.news.source}:</strong> {selectedArticle.source}</p>
                          <p className="mt-1 opacity-70">{t.news.disclaimer}</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}