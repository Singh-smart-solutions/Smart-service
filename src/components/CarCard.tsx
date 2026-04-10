import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/TranslationContext';

interface CarCardProps {
  id: string;
  name: string;
  price: number;
  desc?: string;
  specs: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const CarCard: React.FC<CarCardProps> = ({
  id,
  name,
  price,
  desc,
  specs,
  isSelected,
  onSelect,
}) => {
  const { t, isRTL, language } = useLanguage();
  const isArabic = language === 'Arabic';

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(id)}
      className={cn(
        "relative w-full rounded-[2rem] overflow-hidden border transition-all group p-8 text-start",
        isSelected 
          ? "bg-gold/10 border-gold shadow-lg shadow-gold/20" 
          : "bg-zinc-900/30 border-gold/10 hover:border-gold/30"
      )}
    >
      <div className={cn(
        "flex flex-col justify-between h-full",
        isRTL && "text-end"
      )}>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h5 className="font-serif text-3xl text-gold luxury-text-shadow">
              {name}
            </h5>
            {desc && (
              <p className="text-sm text-zinc-400 font-light leading-relaxed max-w-md">
                {desc}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] bg-white/5 px-3 py-1 rounded-full border border-white/5">
                {specs}
              </span>
            </div>
          </div>
          
          {isSelected && (
            <div className="bg-gold rounded-full p-1">
              <CheckCircle2 size={24} className="text-black" />
            </div>
          )}
        </div>

        <div className="mt-8 flex items-baseline gap-2">
          <span className="text-3xl font-serif text-zinc-100">
            {price.toLocaleString()}
          </span>
          <span className="text-xs text-gold font-bold uppercase tracking-widest">
            {isArabic ? 'درهم' : 'AED'} / {t('day') || 'Day'}
          </span>
        </div>
      </div>
    </motion.button>
  );
};
