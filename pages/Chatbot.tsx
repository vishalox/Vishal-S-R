import React, { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, Bot, Loader2, Mic, MicOff, Activity, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { useLanguage, useAuth } from '../App';

export default function Chatbot() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  
  // Initialize state from localStorage if available
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`hg_chat_history_${user?.email || 'guest'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Rehydrate Date objects
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  // Image State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageInlineData, setImageInlineData] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // Save history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`hg_chat_history_${user?.email || 'guest'}`, JSON.stringify(messages));
    }
  }, [messages, user]);

  // Initialize welcome message when language changes OR if history is empty
  useEffect(() => {
    setMessages(prev => {
        if(prev.length === 0) {
            return [{ id: '1', role: 'model', text: t.chat.initial, timestamp: new Date() }];
        }
        return prev;
    });
  }, [t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimText, selectedImage]);

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your chat history?")) {
      const initialMsg: ChatMessage = { 
        id: Date.now().toString(), 
        role: 'model', 
        text: t.chat.initial, 
        timestamp: new Date() 
      };
      setMessages([initialMsg]);
      localStorage.removeItem(`hg_chat_history_${user?.email || 'guest'}`);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimText('');
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setInput((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
        setInterimText('');
      } else {
        setInterimText(currentInterim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
         isListeningRef.current = false;
         setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
         try {
           recognition.start();
         } catch (e) {
           setIsListening(false);
           isListeningRef.current = false;
         }
      } else {
        setIsListening(false);
        setInterimText('');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setImageInlineData(result.split(',')[1]);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageInlineData(null);
    setImageMimeType('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim() && !imageInlineData) return;

    if (isListening) {
        stopListening();
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input + (imageInlineData ? ' (Image attached)' : ''),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      if (process.env.API_KEY) {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const parts: any[] = [];
          if (input.trim()) {
            parts.push({ text: input });
          }
          
          if (imageInlineData) {
             parts.push({
                 inlineData: {
                     mimeType: imageMimeType,
                     data: imageInlineData
                 }
             });
          }
          
          const targetLang = language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : 'English';

          const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [{
                role: 'user',
                parts: parts
            }],
            config: {
                systemInstruction: `You are a helpful and cautious medical assistant. Answer in ${targetLang}. 
                If an image is provided, analyze it carefully for medical relevance (e.g., skin issues, lab reports, medicinal labels). 
                If the image is unrelated to health, politely decline to analyze it.
                Always include a disclaimer that you are an AI and not a doctor.`
            }
          });
          
          const text = response.text;
          
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: text || "I'm sorry, I couldn't generate a response.",
            timestamp: new Date()
          }]);
      } else {
         await new Promise(r => setTimeout(r, 1000));
         setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "Demo mode: Please configure API_KEY to enable AI responses.",
            timestamp: new Date()
          }]);
      }

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Service Error. Please check your connection or API Key.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
      clearImage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center">
            <Bot className="mr-2 text-blue-600 dark:text-blue-400" />
            <h2 className="font-bold text-gray-900 dark:text-white">{t.chat.title}</h2>
        </div>
        <div className="flex items-center gap-3">
            {isListening && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded animate-pulse">
                    <Activity size={14} />
                    <span className="hidden sm:inline">{t.chat.listening}</span>
                </div>
            )}
            <button 
                onClick={clearHistory} 
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-red-500 transition"
                title="Clear History"
            >
                <Trash2 size={18} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 shadow-sm text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {msg.role === 'model' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                     <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
              ) : (
                  <p>{msg.text}</p>
              )}
              <span className="text-[10px] block mt-1 text-right opacity-70">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Loader2 className="animate-spin h-4 w-4 text-blue-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        {selectedImage && (
            <div className="mb-2 flex items-start">
                <div className="relative group">
                    <img src={selectedImage} alt="Selected" className="h-20 w-auto rounded border border-gray-300 dark:border-gray-600" />
                    <button onClick={clearImage} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-500 transition">
                        <X size={12} />
                    </button>
                </div>
            </div>
        )}

        <div className="relative">
            {interimText && (
                <div className="absolute bottom-full left-0 mb-2 w-full">
                     <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="italic">"{interimText}..."</span>
                     </div>
                </div>
            )}
            
            <div className="flex space-x-2 items-end">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition bg-white dark:bg-gray-900"
                    title="Upload Image"
                >
                    <ImageIcon size={20} />
                </button>

                <button
                    onClick={toggleListening}
                    className={`p-3 rounded-md transition border ${
                    isListening 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' 
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <textarea
                    className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-gray-400 resize-none text-sm"
                    placeholder={t.chat.placeholder}
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                
                <button
                    onClick={handleSend}
                    disabled={loading || (!input.trim() && !imageInlineData)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}