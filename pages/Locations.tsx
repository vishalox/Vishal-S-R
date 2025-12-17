import React, { useState } from 'react';
import { Search, Map as MapIcon } from 'lucide-react';
import { useLanguage } from '../App';

export default function Locations() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [searchTopic, setSearchTopic] = useState('Hospitals and Pharmacies');
  
  // We use the 'output=embed' format which provides a simple map without requiring 
  // a billing-enabled API key, resolving the previous errors while keeping the map "in-system".
  const getMapUrl = (topic: string) => {
    const encodedQuery = encodeURIComponent(topic);
    return `https://maps.google.com/maps?q=${encodedQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchTopic(query);
  };

  return (
    <div className="h-[calc(100vh-6rem)] w-full flex flex-col gap-4 max-w-7xl mx-auto">
      
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full text-blue-600 dark:text-blue-400">
             <MapIcon size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold text-gray-900 dark:text-white">Find Locations</h1>
             <p className="text-xs text-gray-500 dark:text-gray-400">Search for medical assistance nearby</p>
           </div>
        </div>

        <div className="flex-1 w-full md:max-w-xl">
            <form onSubmit={handleSearch} className="relative flex items-center">
                <Search className="absolute left-3 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search e.g. 'Cardiologist near New York'..." 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button 
                    type="submit"
                    className="absolute right-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition"
                >
                    Search
                </button>
            </form>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden relative">
         <iframe
            title="Google Map"
            width="100%"
            height="100%"
            frameBorder="0"
            src={getMapUrl(searchTopic)}
            allowFullScreen
            className="w-full h-full bg-gray-100 dark:bg-gray-800"
         ></iframe>
         
         <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-1.5 rounded text-xs text-gray-500 border border-gray-200 dark:border-gray-700 pointer-events-none">
             Showing results for: <span className="font-bold text-gray-900 dark:text-white">{searchTopic}</span>
         </div>
      </div>
    </div>
  );
}