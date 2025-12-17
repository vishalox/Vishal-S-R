import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Activity, Pill, MessageSquare, Menu, X, LogOut, FileText, Home, Globe, MapPin, Sun, Moon, Stethoscope, Newspaper } from 'lucide-react';
import { User, Language } from './types';
import { translations } from './translations';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import TreatmentPlan from './pages/TreatmentPlan';
import Reminders from './pages/Reminders';
import Chatbot from './pages/Chatbot';
import Locations from './pages/Locations';
import MedicineAI from './pages/MedicineAI';
import MedicalNews from './pages/MedicalNews';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);
export const useAuth = () => useContext(AuthContext);

// --- Language Context ---
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: any; // Type for the translation object of selected language
}

const LanguageContext = createContext<LanguageContextType>(null!);
export const useLanguage = () => useContext(LanguageContext);

// --- Theme Context ---
type Theme = 'light' | 'dark';
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType>(null!);
export const useTheme = () => useContext(ThemeContext);

// --- Layout Component ---
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: t.nav.dashboard, icon: Home },
    { path: '/treatment-plan', label: t.nav.plan, icon: FileText },
    { path: '/medicine-ai', label: t.nav.medicine, icon: Stethoscope },
    { path: '/medical-news', label: t.nav.news, icon: Newspaper },
    { path: '/reminders', label: t.nav.reminders, icon: Pill },
    { path: '/chatbot', label: t.nav.chat, icon: MessageSquare },
    { path: '/locations', label: t.nav.locations, icon: MapPin },
  ];

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Sidebar - Fixed and Simple */}
      <nav className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 transform
        md:relative md:translate-x-0 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-2 font-bold text-2xl text-blue-600 dark:text-blue-400 font-brand tracking-tight">
            <Activity className="h-7 w-7" />
            <span>{t.appTitle}</span>
          </div>
          <button className="md:hidden ml-auto text-gray-500" onClick={closeMenu}>
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
           <div className="flex items-center space-x-3">
             <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                {user?.username.charAt(0).toUpperCase()}
             </div>
             <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
             </div>
           </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={closeMenu}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          </ul>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2 rounded-md">
                 <button 
                  onClick={toggleTheme}
                  className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="ta">Tamil</option>
                </select>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <LogOut size={16} />
              <span>{t.nav.logout}</span>
            </button>
        </div>
      </nav>

      {/* Mobile Menu Button (Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={closeMenu}></div>
      )}

      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 justify-between">
         <div className="flex items-center space-x-2 font-bold text-xl text-blue-600 dark:text-blue-400 font-brand tracking-tight">
            <Activity className="h-6 w-6" />
            <span>{t.appTitle}</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 dark:text-gray-300">
            <Menu size={24} />
         </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-full pt-16 md:pt-0 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
            {children}
        </div>
        <footer className="py-6 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-200 dark:border-gray-800 mx-6">
            <p>Demo Application • Not for medical use.</p>
        </footer>
      </main>
    </div>
  );
};

// --- Protected Route Wrapper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hg_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Language State
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('hg_lang') as Language) || 'en';
  });

  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('hg_theme') as Theme) || 'dark';
  });

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('hg_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('hg_lang', lang);
  };

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('hg_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hg_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/treatment-plan" element={<ProtectedRoute><TreatmentPlan /></ProtectedRoute>} />
              <Route path="/medicine-ai" element={<ProtectedRoute><MedicineAI /></ProtectedRoute>} />
              <Route path="/medical-news" element={<ProtectedRoute><MedicalNews /></ProtectedRoute>} />
              <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
              <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
              <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
              
              <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
            </Routes>
          </HashRouter>
        </ThemeContext.Provider>
      </LanguageContext.Provider>
    </AuthContext.Provider>
  );
}