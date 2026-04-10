import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/TranslationContext';
import { 
  Briefcase, 
  Car, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  Info,
  Calendar,
  Key
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CarCard } from './CarCard';

interface ConciergeMenuProps {
  onSubmit: (data: any) => void;
  roomNumber: string;
}

type ConciergeTab = 'luggage' | 'taxi' | 'rent-a-car';

export const ConciergeMenu: React.FC<ConciergeMenuProps> = ({ onSubmit, roomNumber }) => {
  const { t, language } = useLanguage();
  const isArabic = language === 'Arabic';
  const [activeTab, setActiveTab] = useState<ConciergeTab>('luggage');
  const [notes, setNotes] = useState('');
  
  // Taxi State
  const [taxiType, setTaxiType] = useState<'standard' | 'luxury'>('standard');
  const [pickupTime, setPickupTime] = useState('');
  const [dropOff, setDropOff] = useState('');
  
  // Car Rental State
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [numDays, setNumDays] = useState('1');

  const cars = [
    { 
      id: 'mercedes', 
      name: t('car_mercedes_name'), 
      price: 1200, 
      desc: t('mercedes_desc'),
      specs: t('car_mercedes_specs')
    },
    { 
      id: 'range', 
      name: t('car_range_name'), 
      price: 1600, 
      desc: t('range_desc'),
      specs: t('car_range_specs')
    },
    { 
      id: 'lambo', 
      name: t('car_lambo_name'), 
      price: 3500, 
      desc: t('lambo_desc'),
      specs: t('car_lambo_specs')
    },
  ];

  const handleLuggageSubmit = () => {
    onSubmit({
      type: 'Luggage Service',
      details: 'Request Pickup',
      notes,
      roomNumber
    });
  };

  const handleTaxiSubmit = () => {
    if (!dropOff.trim()) return;
    onSubmit({
      type: 'Limousine Service',
      details: `${taxiType === 'standard' ? t('standard_taxi') : t('luxury_taxi')} to ${dropOff}`,
      pickupTime,
      dropOff,
      roomNumber
    });
    setDropOff('');
    setPickupTime('');
  };

  const handleCarSubmit = () => {
    const car = cars.find(c => c.id === selectedCar);
    onSubmit({
      type: 'Rent a Car',
      details: car?.name,
      duration: `${numDays} ${t('num_days')}`,
      totalPrice: (car?.price || 0) * parseInt(numDays),
      notes,
      roomNumber
    });
  };

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-4 p-2 bg-black/40 border border-gold/10 rounded-3xl backdrop-blur-md">
        {(['luggage', 'taxi', 'rent-a-car'] as ConciergeTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all duration-500",
              activeTab === tab 
                ? "bg-gold text-black shadow-lg shadow-gold/20" 
                : "text-zinc-500 hover:text-gold hover:bg-gold/5"
            )}
          >
            {t(`${tab.replace(/-/g, '_')}_service` || tab.replace(/-/g, '_'))}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'luggage' && (
          <motion.div
            key="luggage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white/5 border border-gold/10 p-8 rounded-[2.5rem] text-center space-y-6">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center text-gold mx-auto">
                <Briefcase size={32} strokeWidth={1} />
              </div>
              <div>
                <h4 className="text-xl font-serif text-zinc-100">{t('luggage_service')}</h4>
                <p className="text-zinc-500 text-sm font-light mt-2">{t('luggage_desc') || 'Our porters are ready to assist with your belongings.'}</p>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('message_placeholder')}
                className="w-full bg-black/40 border border-gold/10 rounded-2xl p-5 text-sm focus:border-gold outline-none transition-colors h-28 resize-none text-zinc-300"
              />
              <button
                onClick={handleLuggageSubmit}
                className="w-full py-5 bg-gold text-black rounded-2xl font-bold hover:bg-champagne transition-all shadow-xl shadow-gold/10 uppercase tracking-widest text-xs"
              >
                {t('request_pickup')}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'taxi' && (
          <motion.div
            key="taxi"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white/5 border border-gold/10 p-8 rounded-[2.5rem] space-y-8">
              <h4 className="text-xl font-serif text-zinc-100">{t('limousine_service')}</h4>
              
              <div className="grid grid-cols-2 gap-4">
                {(['standard', 'luxury'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTaxiType(type)}
                      className={cn(
                        "relative h-40 rounded-2xl overflow-hidden border transition-all text-start group p-6 flex flex-col justify-center",
                        taxiType === type 
                          ? "bg-gold/10 border-gold shadow-lg shadow-gold/20" 
                          : "bg-black/40 border-gold/10 hover:border-gold/30"
                      )}
                    >
                      <div className="space-y-2">
                        <span className="text-sm font-bold uppercase tracking-widest text-gold">{t(`${type}_taxi`)}</span>
                        <p className="text-[10px] text-zinc-500 font-light">
                          {type === 'luxury' ? 'Premium chauffeur service with luxury fleet.' : 'Reliable and comfortable city transport.'}
                        </p>
                      </div>
                      <div className="absolute top-6 right-6">
                        {taxiType === type && <CheckCircle2 size={20} className="text-gold" />}
                      </div>
                    </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest text-gold font-bold block">{t('drop_off_destination')} *</label>
                  <input
                    type="text"
                    value={dropOff}
                    onChange={(e) => setDropOff(e.target.value)}
                    placeholder={t('abu_dhabi')}
                    className="w-full bg-black/40 border border-gold/10 rounded-2xl p-5 text-sm focus:border-gold outline-none transition-colors text-zinc-300"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest text-gold font-bold block">{t('label_pickup')}</label>
                  <div className="relative">
                    <Clock className="absolute start-5 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full bg-black/40 border border-gold/10 rounded-2xl p-5 ps-14 text-sm focus:border-gold outline-none transition-colors text-zinc-300"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleTaxiSubmit}
                disabled={!dropOff.trim() || !pickupTime}
                className="w-full py-5 bg-gold text-black rounded-2xl font-bold hover:bg-champagne transition-all shadow-xl shadow-gold/10 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {t('request_pickup')}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'rent-a-car' && (
          <motion.div
            key="rent-a-car"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6">
              {cars.map((car) => (
                <CarCard
                  key={car.id}
                  id={car.id}
                  name={car.name}
                  price={car.price}
                  desc={car.desc}
                  specs={car.specs}
                  isSelected={selectedCar === car.id}
                  onSelect={setSelectedCar}
                />
              ))}
            </div>

            {selectedCar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white/5 border border-gold/10 p-8 rounded-[2.5rem] space-y-6"
              >
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('num_days')}</label>
                  <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-gold/10">
                    <button 
                      onClick={() => setNumDays(prev => Math.max(1, parseInt(prev) - 1).toString())}
                      className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gold/10 text-zinc-500 hover:text-gold transition-all"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-zinc-200">{numDays}</span>
                    <button 
                      onClick={() => setNumDays(prev => (parseInt(prev) + 1).toString())}
                      className="w-10 h-10 bg-gold text-black rounded-xl flex items-center justify-center hover:bg-champagne transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gold/10 flex justify-between items-center">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest">{t('label_total')}</span>
                  <span className="text-2xl font-serif text-gold">
                    {((cars.find(c => c.id === selectedCar)?.price || 0) * parseInt(numDays)).toLocaleString()} {isArabic ? 'درهم' : 'AED'}
                  </span>
                </div>

                <button
                  onClick={handleCarSubmit}
                  className="w-full py-5 bg-gold text-black rounded-2xl font-bold hover:bg-champagne transition-all shadow-xl shadow-gold/10 uppercase tracking-widest text-xs"
                >
                  {t('book_now')}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
