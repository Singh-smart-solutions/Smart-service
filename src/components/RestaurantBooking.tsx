import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/TranslationContext';
import { Calendar, Clock, Users, Utensils } from 'lucide-react';

interface RestaurantBookingProps {
  onSubmit: (data: any) => void;
}

export const RestaurantBooking: React.FC<RestaurantBookingProps> = ({ onSubmit }) => {
  const { t, language, isRTL } = useLanguage();
  const isArabic = language === 'Arabic';

  const restaurants = [
    {
      id: 'grand_saffron',
      name: t('grand_saffron'),
      dressCode: t('formal'),
      cuisine: 'Indian Fine Dining'
    },
    {
      id: 'azure_blue',
      name: t('azure_blue'),
      dressCode: t('smart_casual'),
      cuisine: 'Mediterranean Seafood'
    }
  ];

  const [bookingData, setBookingData] = useState({
    restaurantId: '',
    date: '',
    time: '',
    pax: '2',
    notes: ''
  });

  const handleBooking = (restaurant: any) => {
    if (!bookingData.date || !bookingData.time) {
      alert(isArabic ? 'يرجى اختيار التاريخ والوقت' : 'Please select date and time');
      return;
    }
    onSubmit({
      type: 'Restaurant Booking',
      details: `${restaurant.name} - ${bookingData.pax} Pax`,
      date: bookingData.date,
      time: bookingData.time,
      notes: bookingData.notes
    });
    // Reset
    setBookingData({ restaurantId: '', date: '', time: '', pax: '2', notes: '' });
  };

  return (
    <div className="space-y-8 p-4">
      <h2 className="text-3xl font-serif text-white mb-8">
        {t('restaurant_bookings')} <span className="text-gold italic">{t('experience')}</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {restaurants.map((res) => (
          <motion.div 
            key={res.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-900/50 rounded-[2.5rem] border border-gold/10 overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-gold/10">
              <h3 className="text-3xl font-serif text-gold luxury-text-shadow">{res.name}</h3>
              <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] mt-2 font-bold">{res.cuisine}</p>
              <div className="mt-4 inline-block bg-gold/5 px-4 py-2 rounded-full border border-gold/10">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                  {t('dress_code')}: <span className="text-gold font-bold">{res.dressCode}</span>
                </p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-gold font-bold flex items-center gap-2">
                    <Calendar size={12} /> {t('label_date')}
                  </label>
                  <input 
                    type="date" 
                    className="w-full bg-black/40 border border-gold/10 rounded-xl p-3 text-sm text-white focus:border-gold outline-none"
                    onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-gold font-bold flex items-center gap-2">
                    <Clock size={12} /> {t('label_time')}
                  </label>
                  <input 
                    type="time" 
                    className="w-full bg-black/40 border border-gold/10 rounded-xl p-3 text-sm text-white focus:border-gold outline-none"
                    onChange={(e) => setBookingData({...bookingData, time: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-gold/10">
                <div className="flex items-center gap-3 text-zinc-300">
                  <Users size={18} className="text-gold" />
                  <span className="text-sm">{t('label_pax')}</span>
                </div>
                <select 
                  className="bg-transparent text-gold font-bold outline-none"
                  value={bookingData.pax}
                  onChange={(e) => setBookingData({...bookingData, pax: e.target.value})}
                >
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <button 
                onClick={() => handleBooking(res)}
                className="w-full py-4 bg-gold text-black rounded-2xl font-bold hover:bg-champagne transition-all shadow-xl shadow-gold/10 uppercase tracking-widest text-xs"
              >
                {t('book_now')}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
