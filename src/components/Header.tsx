import React, { useState } from 'react';
import { Globe, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/TranslationContext';
import { cn } from '../lib/utils';

interface HeaderProps {
  roomNumber: string;
  weather: { temp: number; condition: string };
  isAdminRoute: boolean;
  user: any;
  logout: () => void;
  navigateToGuest: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  roomNumber, 
  weather, 
  isAdminRoute, 
  user, 
  logout, 
  navigateToGuest 
}) => {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const languages: { id: any; label: string }[] = [
    { id: 'English', label: 'English 🇺🇸' },
    { id: 'Arabic', label: 'العربية 🇦🇪' },
    { id: 'Russian', label: 'Русский 🇷🇺' },
    { id: 'Mandarin', label: '普通话 🇨🇳' },
    { id: 'Turkish', label: 'Türkçe 🇹🇷' },
    { id: 'German', label: 'Deutsch 🇩🇪' },
    { id: 'French', label: 'Français 🇫🇷' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting_morning');
    if (hour < 17) return t('greeting_afternoon');
    return t('greeting_evening');
  };

  return (
    <nav className="sticky-header px-4 sm:px-12 flex justify-between items-center">
      <div className="header-top-row flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-6">
        <h1 className="text-lg sm:text-xl font-serif tracking-[0.2em] uppercase text-gold cursor-pointer luxury-text-shadow" onClick={navigateToGuest}>
          Sentinel<span className="text-white">Pro</span>
        </h1>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="relative">
            <button 
              onClick={() => setShowLanguageSelector(!showLanguageSelector)}
              className="p-2 text-gold hover:text-champagne transition-colors flex items-center gap-2"
            >
              <Globe size={18} strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-widest hidden sm:block">
                {t('lang_native')}
              </span>
            </button>
            <AnimatePresence>
              {showLanguageSelector && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={cn(
                    "absolute mt-2 w-48 bg-zinc-900 border border-gold/20 rounded-2xl overflow-hidden shadow-2xl z-50",
                    isRTL ? "left-0" : "right-0"
                  )}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setLanguage(lang.id);
                        setShowLanguageSelector(false);
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-left text-xs hover:bg-gold/10 transition-colors flex items-center justify-between",
                        language === lang.id ? "text-gold bg-gold/5" : "text-zinc-400",
                        isRTL && "text-right flex-row-reverse"
                      )}
                    >
                      <span>{lang.label}</span>
                      {language === lang.id && <div className="w-1 h-1 bg-gold rounded-full" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAdminRoute && user && (
            <button onClick={logout} className="p-2 text-zinc-400 hover:text-white transition-colors">
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Centered Greeting (Visible on Desktop) */}
      <div className="hidden md:block absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <p className="text-[8px] sm:text-sm lg:text-xl font-serif tracking-wide text-zinc-300 italic whitespace-nowrap opacity-80 sm:opacity-100">
          {getGreeting()}, <span className="text-gold not-italic font-normal">{t('welcome_sanctuary')}</span>
        </p>
      </div>

      {/* Info Row (Visible on Mobile) */}
      <div className="header-info-row flex items-center justify-around w-full sm:w-auto gap-6">
        <div className="flex items-center gap-1 sm:gap-2 text-zinc-400 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-gold/10">
          <span className="text-[10px] sm:text-xs">☀️</span>
          <span className="text-[8px] sm:text-[10px] font-bold tracking-tighter">{weather.temp}°C</span>
          <span className="text-[6px] sm:text-[8px] uppercase tracking-widest opacity-50 hidden xs:block">{t('abu_dhabi')}</span>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] sm:text-xs font-medium text-zinc-200 whitespace-nowrap">{t('room')} {roomNumber || '402'}</p>
          <p className="text-[6px] sm:text-[8px] text-gold/60 uppercase tracking-[0.2em] font-bold hidden xs:block">
            Sanctuary Guest
          </p>
        </div>
      </div>
    </nav>
  );
};
