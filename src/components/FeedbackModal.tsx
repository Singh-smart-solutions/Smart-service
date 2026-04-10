import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, Send } from 'lucide-react';
import { useLanguage } from '../contexts/TranslationContext';
import { cn } from '../lib/utils';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  requestType: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, requestType }) => {
  const { t, isRTL } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit(rating, comment);
    setRating(0);
    setComment('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-gold/20 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-8 sm:p-12">
              <button 
                onClick={onClose}
                className={cn(
                  "absolute top-8 text-zinc-500 hover:text-gold transition-colors",
                  isRTL ? "left-8" : "right-8"
                )}
              >
                <X size={24} />
              </button>

              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto text-gold">
                  <Star size={32} fill={rating > 0 ? "currentColor" : "none"} />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-serif text-white">{t('rate_experience')}</h2>
                  <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">{requestType}</p>
                </div>

                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125 active:scale-95"
                    >
                      <Star
                        size={36}
                        className={cn(
                          "transition-colors",
                          (hoveredRating || rating) >= star ? "text-gold fill-gold" : "text-zinc-700"
                        )}
                      />
                    </button>
                  ))}
                </div>

                <div className="space-y-4 pt-4">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('feedback_placeholder')}
                    className="w-full bg-black/40 border border-gold/10 rounded-2xl p-6 text-sm text-zinc-300 focus:border-gold outline-none transition-colors min-h-[120px] resize-none"
                  />
                  
                  <button
                    onClick={handleSubmit}
                    disabled={rating === 0}
                    className={cn(
                      "w-full py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3",
                      rating > 0 
                        ? "bg-gold text-black hover:bg-champagne shadow-lg shadow-gold/20" 
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    )}
                  >
                    <Send size={14} />
                    {t('submit')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackModal;
