import React from 'react';
import { useLanguage } from '../contexts/TranslationContext';
import { MenuItem } from '../types';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoomServiceProps {
  cart: { [itemId: string]: number };
  updateCart: (itemId: string, delta: number) => void;
}

export const RoomService: React.FC<RoomServiceProps> = ({ cart, updateCart }) => {
  const { t, language } = useLanguage();
  const isArabic = language === 'Arabic';

  // Hard-coded menu data as requested
  const menuItems = [
    { id: '1', name: 'Wagyu Beef Sliders', description: 'Truffle aioli, caramelized onions, aged cheddar.', price: 125 },
    { id: '2', name: 'Lobster Thermidor', description: 'Cognac cream, gruyère crust, herb salad.', price: 245 },
    { id: '3', name: 'Truffle Tagliatelle', description: 'Fresh black truffle, parmesan reggiano, butter sauce.', price: 185 },
    { id: '4', name: 'Wild Mushroom Risotto', description: 'Porcini mushrooms, mascarpone, chive oil.', price: 145 },
    { id: '5', name: 'Valrhona Chocolate Fondant', description: 'Madagascar vanilla bean gelato, gold leaf.', price: 85 },
    { id: '6', name: 'Signature Caesar Salad', description: 'White anchovies, sourdough croutons, 36-month parmesan.', price: 95 },
    { id: '7', name: 'Beluga Caviar (30g)', description: 'Traditional accompaniments, warm blinis.', price: 1200 },
    { id: '8', name: 'Dom Pérignon Vintage', description: 'Exquisite champagne for the ultimate celebration.', price: 2800 },
  ];

  const subtotal = Object.entries(cart).reduce((acc, [id, qty]) => {
    const item = menuItems.find(m => m.id === id);
    return acc + (item?.price || 0) * qty;
  }, 0);

  const vat = subtotal * 0.05;
  const total = subtotal + vat;

  return (
    <div className="pb-48 max-w-4xl mx-auto px-4">
      <div className="space-y-8">
        {menuItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-8 border-b border-white/5 group hover:border-gold/30 transition-all"
          >
            <div className="flex-1 space-y-2">
              <h3 className="text-2xl font-serif text-gold luxury-text-shadow tracking-wide">
                {item.name}
              </h3>
              <p className="text-sm text-zinc-400 font-light leading-relaxed">
                {item.description}
              </p>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-8">
              <span className="text-xl font-serif text-zinc-200 tracking-wider whitespace-nowrap">
                {item.price} <span className="text-[10px] uppercase tracking-widest text-gold ml-1">AED</span>
              </span>
              
              <div className="flex items-center gap-4 bg-zinc-900/50 p-1.5 rounded-xl border border-white/10">
                {(cart[item.id] || 0) > 0 ? (
                  <>
                    <button 
                      onClick={() => updateCart(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-gold hover:bg-zinc-700 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-serif text-white w-6 text-center">{cart[item.id]}</span>
                    <button 
                      onClick={() => updateCart(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gold text-black hover:bg-champagne transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => updateCart(item.id, 1)}
                    className="px-6 py-2 bg-gold/10 text-gold border border-gold/20 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gold hover:text-black transition-all"
                  >
                    {t('add')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fixed Bottom Checkout Bar */}
      <AnimatePresence>
        {Object.keys(cart).length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-black border-t border-gold/40 p-6 z-[9999] flex flex-col md:flex-row items-center justify-between gap-6 px-6 md:px-24"
          >
            <div className="flex items-center gap-8 md:gap-16">
              <div className="text-center md:text-left">
                <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">{t('total_items')}</p>
                <p className="text-xl font-serif text-zinc-100">
                  {Object.values(cart).reduce((a, b) => a + b, 0)}
                </p>
              </div>
              <div className="w-px h-10 bg-white/10 hidden md:block" />
              <div className="text-center md:text-left">
                <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">Total (AED)</p>
                <div className="flex flex-col">
                  <p className="text-2xl font-serif text-gold tracking-widest">
                    {(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-1">
                    Includes 5% VAT
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                const checkoutBtn = document.getElementById('checkout-trigger');
                if (checkoutBtn) checkoutBtn.click();
              }}
              className="w-full md:w-auto px-12 py-5 bg-gold text-black rounded-xl font-bold hover:bg-champagne transition-all shadow-xl shadow-gold/10 uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3"
            >
              <ShoppingCart size={16} />
              Order Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoomService;
