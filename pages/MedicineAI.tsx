import React, { useState } from 'react';
import { Search, Info, AlertTriangle, ShieldAlert, Activity, FileText, Loader2, ImageIcon } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { useLanguage } from '../App';

interface MedicineDetails {
  name: string;
  type: string;
  uses: string[];
  sideEffects: string[];
  dosage: string;
  warnings: string[];
  substitutes?: string[];
}

// Fallback images for different medicine forms
const MEDICINE_TYPES: Record<string, string> = {
  'Tablet': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
  'Capsule': 'https://images.unsplash.com/photo-1550572017-4fcdbb5675d4?auto=format&fit=crop&q=80&w=400',
  'Syrup': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=400',
  'Liquid': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=400',
  'Injection': 'https://plus.unsplash.com/premium_photo-1661603955639-661734994d50?auto=format&fit=crop&q=80&w=400',
  'Cream': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400',
  'Ointment': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400',
  'Drops': 'https://images.unsplash.com/photo-1596522354195-e84de8a95616?auto=format&fit=crop&q=80&w=400',
  'Inhaler': 'https://images.unsplash.com/photo-1623157876253-152cb5b610c1?auto=format&fit=crop&q=80&w=400',
  'Gel': 'https://images.unsplash.com/photo-1556228720-1957be83f360?auto=format&fit=crop&q=80&w=400',
  'Spray': 'https://images.unsplash.com/photo-1623157876253-152cb5b610c1?auto=format&fit=crop&q=80&w=400', // Reusing Inhaler/Spray like image
  'Powder': 'https://images.unsplash.com/photo-1626343582627-94770e09214d?auto=format&fit=crop&q=80&w=400'
};

export default function MedicineAI() {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MedicineDetails | null>(null);
  const [externalImages, setExternalImages] = useState<string[]>([]);
  const [error, setError] = useState('');

  const fetchExternalImages = async (searchTerm: string) => {
    const fetched: string[] = [];
    
    // 1. Wikipedia API (for product/generic images)
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchTerm)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
      const wikiRes = await fetch(wikiUrl);
      const wikiData = await wikiRes.json();
      const pages = wikiData.query?.pages;
      if (pages) {
        // Wikipedia returns pages keyed by ID, getting the first one
        const pageId = Object.keys(pages)[0];
        if (pages[pageId]?.thumbnail?.source) {
            fetched.push(pages[pageId].thumbnail.source);
        }
      }
    } catch (e) {
      console.warn("Wiki Image fetch failed", e);
    }

    // 2. PubChem API (for chemical structure)
    fetched.push(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(searchTerm)}/PNG`);
    
    setExternalImages(fetched);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setExternalImages([]);

    const targetLang = language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : 'English';

    const schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        type: { 
            type: Type.STRING, 
            description: "The physical form of the medicine. Analyze the name and description. MUST be one of: 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Gel', 'Spray', 'Powder', 'Other'." 
        },
        uses: { type: Type.ARRAY, items: { type: Type.STRING } },
        sideEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
        dosage: { type: Type.STRING },
        warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        substitutes: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["name", "type", "uses", "sideEffects", "dosage", "warnings"]
    };

    // Trigger Image Fetch in background
    fetchExternalImages(query);

    try {
      if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `Provide detailed medical information for the medicine: "${query}".
                     Target Language: ${targetLang}.
                     
                     CRITICAL: Accurately classify the 'type' (form) of the medicine.
                     - If the name includes 'Gel' or 'Jel', classify as 'Gel'.
                     - If the name includes 'Cream', classify as 'Cream'.
                     - If the name includes 'Syrup', 'Suspension', or 'Liquid', classify as 'Syrup'.
                     - If the name includes 'Inhaler' or 'Respule', classify as 'Inhaler'.
                     - If the name includes 'Injection' or 'Vial', classify as 'Injection'.
                     - If the name includes 'Drops' (Eye/Ear), classify as 'Drops'.
                     - Otherwise, infer the most common form (e.g., Tablet or Capsule).

                     Ensure the information is accurate, professional, and easy to understand.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
          }
        });

        const data = JSON.parse(response.text || "{}");
        setResult(data);
      } else {
        // Fallback demo data
        await new Promise(r => setTimeout(r, 1500));
        const isSyrup = query.toLowerCase().includes('syrup') || query.toLowerCase().includes('liquid');
        const isCream = query.toLowerCase().includes('cream') || query.toLowerCase().includes('gel');
        
        setResult({
          name: query,
          type: isSyrup ? 'Syrup' : isCream ? 'Cream' : 'Tablet',
          uses: ["Pain relief", "Fever reduction", "Inflammation"],
          sideEffects: ["Nausea", "Dizziness", "Stomach upset"],
          dosage: "Typically as recommended by a doctor.",
          warnings: ["Consult doctor if pregnant", "Avoid alcohol", "Keep out of reach of children"],
          substitutes: ["Generic Brand A", "Generic Brand B"]
        });
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      // Detailed error message handling
      let errorMessage = "Failed to fetch medicine details. Please try again.";
      if (err.message?.includes('400') || err.message?.includes('500')) {
        errorMessage = `API Error: ${err.message}. Please check your connection.`;
      } else if (err.toString().includes('xhr error')) {
         errorMessage = "Network connection failed. Please check your internet or API Key.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get all images (AI derived type image + external images)
  const getAllImages = () => {
    const images = [];
    
    // 1. Add Type-based image first
    if (result?.type) {
        // Exact match first
        if (MEDICINE_TYPES[result.type]) {
             images.push(MEDICINE_TYPES[result.type]);
        } else {
             // Partial match fallback
             const normalizedType = Object.keys(MEDICINE_TYPES).find(k => 
                result.type.toLowerCase().includes(k.toLowerCase())
            );
            if (normalizedType) {
                images.push(MEDICINE_TYPES[normalizedType]);
            } else if (result.type.toLowerCase().includes('liquid') || result.type.toLowerCase().includes('suspension')) {
                images.push(MEDICINE_TYPES['Syrup']);
            } else if (result.type.toLowerCase().includes('spray')) {
                images.push(MEDICINE_TYPES['Spray']);
            }
        }
    }

    // 2. Add External images (Wiki, PubChem)
    images.push(...externalImages);

    return images;
  };

  const displayImages = getAllImages();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-lg shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full text-blue-600 dark:text-blue-400">
            <Activity size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.medicine.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">AI-powered drug information database</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
             <Search className="absolute left-3.5 top-3.5 text-gray-400" size={20} />
             <input 
                type="text" 
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 dark:text-white"
                placeholder={t.medicine.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
             />
          </div>
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            <span className="hidden sm:inline">{t.medicine.searchBtn}</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-center gap-2">
            <AlertTriangle size={20} />
            {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-4 rounded-lg flex items-start gap-3 text-amber-800 dark:text-amber-200 text-sm">
                <ShieldAlert className="flex-shrink-0 mt-0.5" size={18} />
                <p>{t.medicine.disclaimer}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Header Card */}
                <div className="md:col-span-2 bg-blue-600 text-white p-6 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">{result.name}</h2>
                            <span className="inline-block bg-white/20 text-white px-2 py-1 rounded text-sm font-medium backdrop-blur-sm mb-2">
                                {result.type}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                         {result.substitutes?.map((sub, i) => (
                             <span key={i} className="bg-blue-700 text-blue-100 px-2 py-1 rounded text-xs">
                                {sub}
                             </span>
                         ))}
                    </div>
                </div>

                {/* Image Gallery */}
                {displayImages.length > 0 && (
                   <div className="md:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-sm">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                          <ImageIcon className="text-purple-500" size={20} />
                          {t.medicine.gallery}
                      </h3>
                      <div className="flex flex-wrap gap-4">
                          {displayImages.map((imgUrl, idx) => (
                              <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-48 w-48 flex items-center justify-center">
                                  <img 
                                    src={imgUrl} 
                                    alt={`Medicine ${idx + 1}`} 
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        // Hide broken images
                                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                    }}
                                  />
                              </div>
                          ))}
                      </div>
                   </div>
                )}

                {/* Uses */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <Activity className="text-emerald-500" size={20} />
                        {t.medicine.uses}
                    </h3>
                    <ul className="space-y-2">
                        {result.uses.map((use, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></span>
                                {use}
                            </li>
                        ))}
                    </ul>
                </div>

                 {/* Side Effects */}
                 <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <AlertTriangle className="text-orange-500" size={20} />
                        {t.medicine.sideEffects}
                    </h3>
                    <ul className="space-y-2">
                        {result.sideEffects.map((effect, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                                {effect}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Dosage */}
                <div className="md:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-sm">
                     <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <FileText className="text-blue-500" size={20} />
                        {t.medicine.dosage}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        {result.dosage}
                    </p>
                </div>

                {/* Warnings */}
                <div className="md:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-sm">
                     <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <ShieldAlert className="text-red-500" size={20} />
                        {t.medicine.warnings}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.warnings.map((warn, i) => (
                             <div key={i} className="flex items-start gap-3 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg text-sm text-red-800 dark:text-red-200">
                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                {warn}
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}