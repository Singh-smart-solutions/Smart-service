import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import {
  UserProfile, ServiceRequest, Department, UserRole
} from './types';
import { cn } from './lib/utils';
import {
  LogOut, Clock, CheckCircle2, AlertCircle, ChevronRight,
  Shield, Coffee, Key, Sparkles, UtensilsCrossed, Send, X,
  Globe, Home, ShoppingCart, Plus, Minus, CheckCircle, Check,
  ChevronDown, User, ClipboardList, TrendingUp, Star, ShieldCheck,
  Car, MapPin, Briefcase, Zap, MessageSquare, Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, Language } from './contexts/TranslationContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-navy p-4">
        <div className="bg-white p-8 max-w-md w-full text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif text-navy mb-4">Service Interruption</h2>
          <button onClick={() => window.location.reload()} className="gold-button">Restart</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getDeviceId = () => {
  let id = localStorage.getItem('sentinel_device_id');
  if (!id) { id = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase(); localStorage.setItem('sentinel_device_id', id); }
  return id;
};

const queryParams = new URLSearchParams(window.location.search);
const roomNumberFromUrl = queryParams.get('room') || '';
const isRoomLocked = !!roomNumberFromUrl;

// ─── GLOBAL LANGUAGE SELECTOR ─────────────────────────────────────────────────
const GlobalLanguageSelector: React.FC = () => {
  const { language, setLanguage, isRTL } = useLanguage();
  const flags: Record<string, string> = { English: '🇺🇸', Arabic: '🇦🇪', Russian: '🇷🇺', Hindi: '🇮🇳', French: '🇫🇷', Turkish: '🇹🇷', Chinese: '🇨🇳' };
  const labels: Record<string, string> = { English: 'English', Arabic: 'العربية', Russian: 'Русский', Hindi: 'हिन्दी', French: 'Français', Turkish: 'Türkçe', Chinese: '中文' };
  return (
    <div className={cn("fixed top-4 z-[10005]", isRTL ? "left-4" : "right-4")}>
      <div className="relative group">
        <button className="flex items-center gap-2 bg-navy/80 backdrop-blur-md text-white/90 hover:text-gold px-4 py-2 border border-gold/30 shadow-2xl">
          <Globe size={16} className="text-gold animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{flags[language]}</span>
          <ChevronDown size={12} className="group-hover:rotate-180 transition-transform" />
        </button>
        <div className={cn("absolute top-full mt-2 w-56 bg-navy border border-gold/30 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[10006]", isRTL ? "left-0" : "right-0")}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gold" />
          {(Object.keys(flags) as Language[]).map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)} className={cn("w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-gold/10 flex items-center justify-between border-b border-gold/5 last:border-0", language === lang ? "text-gold bg-gold/5" : "text-white/60")}>
              <span className="flex items-center gap-3"><span className="text-base">{flags[lang]}</span>{labels[lang]}</span>
              {language === lang && <Check size={14} className="text-gold" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── HEADER ───────────────────────────────────────────────────────────────────
const Header: React.FC<{ roomNumber: string; user: any; logout: () => void; navigateToGuest: () => void }> = ({ roomNumber, user, logout, navigateToGuest }) => {
  const { t, isRTL } = useLanguage();
  return (
    <nav className="sticky-header">
      <div className={cn("flex items-center gap-1 sm:gap-2 px-4", isRTL && "flex-row-reverse")}>
        {user && <button onClick={navigateToGuest} className="p-1 sm:p-2 text-gold hover:text-white transition-colors"><Home size={18} strokeWidth={1.5} /></button>}
      </div>
      <div className="logo-container cursor-pointer" onClick={navigateToGuest}>
        <div className="flex flex-col items-center">
          <h1 className="logo-text">Sentinel Pro</h1>
          <span className="text-[7px] sm:text-[8px] font-bold text-gold/60 uppercase tracking-[0.3em] -mt-1">Luxury Hotel & Residences</span>
        </div>
      </div>
      <div className={cn("flex items-center gap-1 sm:gap-2 px-4", isRTL && "flex-row-reverse")}>
        <div className={cn("flex flex-col items-end mr-2 hidden xs:flex", isRTL && "items-start")}>
          <span className="text-[10px] font-bold text-white tracking-widest uppercase">{t('room')} {roomNumber || '---'}</span>
          <span className="text-[7px] text-gold font-bold uppercase tracking-tighter">Executive Level</span>
        </div>
        {user && <button onClick={logout} className="p-1 sm:p-2 text-gold hover:text-white transition-colors"><LogOut size={18} strokeWidth={1} /></button>}
      </div>
    </nav>
  );
};

// ─── FEEDBACK MODAL ───────────────────────────────────────────────────────────
const FeedbackModal: React.FC<{ request: ServiceRequest; onClose: () => void; onSubmit: (rating: number, comment: string) => void }> = ({ request, onClose, onSubmit }) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-[#FCF9F2] w-full max-w-md p-8 relative shadow-2xl border border-gold/20">
        <button onClick={onClose} className="absolute top-4 right-4 text-navy/40 hover:text-navy"><X size={20} /></button>
        <div className="text-center space-y-6">
          <div className="inline-block p-3 bg-gold/10 rounded-full"><Star size={32} className="text-gold fill-gold" /></div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif text-navy">{t('rate_experience')}</h2>
            <p className="text-[10px] uppercase tracking-widest text-gold font-bold">{request.type}</p>
          </div>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                <Star size={32} className={cn(star <= rating ? "text-gold fill-gold" : "text-gold/20")} />
              </button>
            ))}
          </div>
          <div className="space-y-2 text-left">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('tell_us_experience')}</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t('feedback_placeholder')} className="h-32 resize-none w-full bg-white text-navy border border-gold p-4" />
          </div>
          <button onClick={() => onSubmit(rating, comment)} className="w-full bg-navy text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-navy/90 transition-colors font-sans">{t('submit_feedback')}</button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── ROOM SERVICE ─────────────────────────────────────────────────────────────
const RoomService: React.FC<{ cart: { [id: string]: number }; updateCart: (id: string, delta: number) => void; onSubmit: (notes: string) => void }> = ({ cart, updateCart, onSubmit }) => {
  const { t } = useLanguage();
  const [notes, setNotes] = useState('');
  const [activeCategory, setActiveCategory] = useState('breakfast');
  const menuItems = [
    { id: 'b1', name: t('item_classic_wagyu_burger_name'), price: 145, category: 'breakfast' },
    { id: 'b2', name: t('item_lobster_bisque_name'), price: 95, category: 'breakfast' },
    { id: 'a1', name: t('item_caesar_salad_name'), price: 125, category: 'all_day' },
    { id: 'a2', name: t('item_truffle_fries_name'), price: 245, category: 'all_day' },
    { id: 'a3', name: t('item_wild_mushroom_risotto_name'), price: 185, category: 'all_day' },
    { id: 'd1', name: t('item_fresh_orange_juice_name'), price: 65, category: 'beverages' },
    { id: 'd2', name: t('item_signature_espresso_name'), price: 28, category: 'beverages' },
    { id: 'd3', name: t('item_sparkling_mineral_water_name'), price: 45, category: 'beverages' },
  ];
  const categories = ['breakfast', 'all_day', 'beverages'];
  const total = Object.entries(cart).reduce((acc, [id, qty]) => { const item = menuItems.find(m => m.id === id); return acc + (item?.price || 0) * qty; }, 0);
  return (
    <div className="space-y-12 pb-32 w-full px-4 sm:px-8">
      <div className="flex gap-2 border-b border-gold/20 pb-2">
        {categories.map(cat => <button key={cat} onClick={() => setActiveCategory(cat)} className={cn("tab-btn text-[10px] font-bold uppercase tracking-widest px-4 py-2", activeCategory === cat ? "text-gold border-b-2 border-gold" : "text-navy/40")}>{t(cat)}</button>)}
      </div>
      <div className="space-y-1">
        {menuItems.filter(i => i.category === activeCategory).map(item => (
          <div key={item.id} className="menu-list-item flex items-center justify-between p-4 border-b border-navy/5">
            <div><span className="text-navy font-serif text-lg">{item.name}</span>{cart[item.id] > 0 && <span className="text-[10px] text-gold font-bold uppercase block">Qty: {cart[item.id]}</span>}</div>
            <div className="flex items-center gap-3">
              <span className="text-navy font-bold">{item.price} {t('currency_label')}</span>
              <button onClick={() => updateCart(item.id, -1)} className="w-8 h-8 bg-navy/10 flex items-center justify-center text-navy font-bold"><Minus size={12} /></button>
              <span className="w-4 text-center text-sm font-bold">{cart[item.id] || 0}</span>
              <button onClick={() => updateCart(item.id, 1)} className="w-8 h-8 bg-gold flex items-center justify-center text-white font-bold"><Plus size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
      </div>
      <AnimatePresence>
        {Object.keys(cart).length > 0 && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-4 left-4 right-4 bg-navy p-4 flex items-center justify-between shadow-2xl z-[9999]">
            <div><span className="text-[8px] text-white/50 uppercase tracking-widest block">{t('your_tray')}</span><span className="text-gold font-bold">{total} {t('currency_label')}</span></div>
            <button onClick={() => onSubmit(notes)} className="bg-gold text-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest">{t('order_now')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── RESTAURANT BOOKING ───────────────────────────────────────────────────────
const RestaurantBooking: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  const { t } = useLanguage();
  const [bookingData, setBookingData] = useState({ restaurant: 'turquoise', pax: '2', date: '', time: '', notes: '' });
  const restaurants = [
    { id: 'turquoise', name: t('turquoise'), desc: t('international_cuisine') },
    { id: 'mermaid', name: t('mermaid'), desc: t('mediterranean_cuisine') },
    { id: 'lolivo', name: t('lolivo'), desc: t('italian_cuisine') },
  ];
  return (
    <div className="w-full py-8 space-y-8 px-4 sm:px-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif text-navy">{t('restaurant_bookings')}</h2>
        <p className="text-gold text-[10px] uppercase tracking-widest font-bold">{t('reserve_table')}</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {restaurants.map(r => (
          <button key={r.id} onClick={() => setBookingData({ ...bookingData, restaurant: r.id })} className={cn("p-4 border text-left transition-all", bookingData.restaurant === r.id ? "border-gold bg-gold/5" : "border-navy/10")}>
            <p className="text-navy font-bold">{r.name}</p><p className="text-[10px] text-navy/60 italic">{r.desc}</p>
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {[{ label: t('label_pax'), key: 'pax', type: 'number' }, { label: t('label_date'), key: 'date', type: 'date' }, { label: t('label_time'), key: 'time', type: 'time' }].map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{f.label}</label>
            <input type={f.type} value={(bookingData as any)[f.key]} onChange={e => setBookingData({ ...bookingData, [f.key]: e.target.value })} className="w-full bg-white text-navy border border-gold p-4" />
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
          <textarea value={bookingData.notes} onChange={e => setBookingData({ ...bookingData, notes: e.target.value })} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
        </div>
        <button onClick={() => onSubmit({ type: `Restaurant: ${bookingData.restaurant}`, restaurantName: bookingData.restaurant, pax: Number(bookingData.pax), preferredTiming: `${bookingData.date} ${bookingData.time}`, notes: bookingData.notes })} className="gold-button w-full m-0">{t('confirm')}</button>
      </div>
    </div>
  );
};

// ─── CONCIERGE ────────────────────────────────────────────────────────────────
const Concierge: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  const { t } = useLanguage();
  const [selected, setSelected] = useState('rent_a_car');
  const [notes, setNotes] = useState('');
  const [subTab, setSubTab] = useState('taxi');
  const [pickupTime, setPickupTime] = useState('');
  const [destination, setDestination] = useState('');
  const [numBags, setNumBags] = useState('1');
  const options = [
    { id: 'rent_a_car', name: t('rent_a_car'), icon: Car },
    { id: 'taxi_limousine', name: t('taxi_limousine'), icon: MapPin },
    { id: 'luggage_service', name: t('luggage_service'), icon: Briefcase },
    { id: 'local_tours', name: t('local_tours'), icon: Globe },
  ];
  const cars = [
    { id: 'mercedes', name: t('car_mercedes_name'), price: 1200, img: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=400' },
    { id: 'range', name: t('car_range_name'), price: 1800, img: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?auto=format&fit=crop&q=80&w=400' },
    { id: 'lambo', name: t('car_lambo_name'), price: 2500, img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400' },
  ];
  return (
    <div className="w-full py-8 space-y-8 px-4 sm:px-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif text-navy">{t('concierge_services')}</h2>
        <p className="text-gold text-[10px] uppercase tracking-widest font-bold">Luxury Assistance</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {options.map(opt => (
          <button key={opt.id} onClick={() => setSelected(opt.id)} className={cn("premium-card", selected === opt.id ? "border-gold bg-gold/5" : "")}>
            <div className="icon-wrapper"><opt.icon size={20} className="text-gold" strokeWidth={1} /></div>
            <h3>{opt.name}</h3>
          </button>
        ))}
      </div>
      {selected === 'rent_a_car' && (
        <div className="space-y-4">
          {cars.map(car => (
            <div key={car.id} className="flex items-center gap-4 bg-white border border-gold/10 p-3 shadow-sm">
              <img src={car.img} alt={car.name} className="w-24 h-16 object-cover" referrerPolicy="no-referrer" />
              <div className="flex-1"><h4 className="font-serif text-navy">{car.name}</h4><p className="text-gold font-bold text-xs">{car.price} {t('currency_label')}</p></div>
              <button onClick={() => onSubmit({ type: `Rent a Car: ${car.name}`, dept: 'Concierge', totalPrice: car.price, notes: `Car: ${car.name}. ${notes}` })} className="bg-gold text-white px-4 py-2 text-[10px] font-bold uppercase">{t('book_now')}</button>
            </div>
          ))}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
        </div>
      )}
      {selected === 'taxi_limousine' && (
        <div className="bg-white p-6 shadow-xl border border-gold/10 space-y-6">
          <div className="pill-container">
            <button onClick={() => setSubTab('taxi')} className={cn("pill-btn", subTab === 'taxi' ? "active" : "inactive")}>{t('taxi')}</button>
            <button onClick={() => setSubTab('limousine')} className={cn("pill-btn", subTab === 'limousine' ? "active" : "inactive")}>{t('limousine')}</button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1"><label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_pickup')}</label><input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full bg-white text-navy border border-gold p-4" /></div>
            <div className="space-y-1"><label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_destination')}</label><input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder={t('drop_off_destination')} className="w-full bg-white text-navy border border-gold p-4" /></div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
          </div>
          <button onClick={() => onSubmit({ type: `Concierge: ${subTab}`, dept: 'Concierge', pickupTime, destination, notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
      {selected === 'luggage_service' && (
        <div className="bg-white p-6 shadow-xl border border-gold/10 space-y-6">
          <div className="pill-container">
            <button onClick={() => setSubTab('pickup')} className={cn("pill-btn", subTab === 'pickup' ? "active" : "inactive")}>{t('pickup')}</button>
            <button onClick={() => setSubTab('delivery')} className={cn("pill-btn", subTab === 'delivery' ? "active" : "inactive")}>{t('delivery')}</button>
          </div>
          {subTab === 'pickup' && (
            <div className="space-y-4">
              <div className="space-y-1"><label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('luggage')}</label><input type="number" value={numBags} onChange={e => setNumBags(e.target.value)} min="1" className="w-full bg-white text-navy border border-gold p-4" /></div>
              <div className="space-y-1"><label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_pickup')}</label><input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full bg-white text-navy border border-gold p-4" /></div>
            </div>
          )}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
          <button onClick={() => onSubmit({ type: `Luggage: ${subTab}`, dept: 'Concierge', numBags, pickupTime, notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
      {selected === 'local_tours' && (
        <div className="bg-white p-6 shadow-xl border border-gold/10 space-y-6">
          <p className="text-navy/60 font-serif italic text-center py-4">Discover Abu Dhabi with our curated local tours.</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
          <button onClick={() => onSubmit({ type: 'Concierge: Local Tours', dept: 'Concierge', notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
    </div>
  );
};

// ─── GUEST AUTH ───────────────────────────────────────────────────────────────
const Auth: React.FC<{ onLoginSuccess: (profile: UserProfile) => void; initialRoom?: string; isLocked?: boolean; onNavigateToStaff: () => void }> = ({ onLoginSuccess, initialRoom, isLocked, onNavigateToStaff }) => {
  const { t, isRTL } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [roomNumber, setRoomNumber] = useState(initialRoom || '');
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showManagerLock, setShowManagerLock] = useState(false);
  const [managerPassword, setManagerPassword] = useState('');
  const [failCount, setFailCount] = useState(0);

  useEffect(() => { if (initialRoom) setRoomNumber(initialRoom); }, [initialRoom]);

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName === '12345' || roomNumber === '12345') { setShowSecret(true); return; }
    setLoading(true);
    try {
      const guestId = `${fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${roomNumber}`;
      const { data: existing } = await supabase.from('guests').select('*').eq('id', guestId).single();
      if (!existing) {
        await supabase.from('guests').insert({ id: guestId, name: fullName, email: 'guest@hotel.com', room: roomNumber });
      }
      const profile: UserProfile = { uid: guestId, email: 'guest@hotel.com', displayName: fullName || `Guest ${roomNumber}`, role: 'guest', department: 'None', roomNumber, status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
      onLoginSuccess(profile);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleManagerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    // Check if it's the master executive password
    if (managerPassword === 'Manager12345') {
      const adminProfile: UserProfile = { uid: 'admin_override', email: 'admin@sentinel.pro', displayName: 'Executive Director', role: 'manager', department: 'None', status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify(adminProfile));
      onLoginSuccess(adminProfile);
      return;
    }
    // Check department manager credentials from Supabase
    const { data: manager, error } = await supabase.from('managers').select('*').eq('password', managerPassword).single();
    if (manager) {
      const managerProfile: UserProfile = { uid: manager.id, email: manager.email, displayName: manager.name, role: 'manager', department: manager.department as Department, status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify(managerProfile));
      onLoginSuccess(managerProfile);
    } else {
      const newCount = failCount + 1;
      setFailCount(newCount);
      if (newCount >= 3) { alert('Too many failed attempts.'); setShowManagerLock(false); setShowSecret(false); setFailCount(0); setManagerPassword(''); }
      else alert(`Invalid password. Attempt ${newCount} of 3.`);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 relative">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8 sm:space-y-16 bg-[#001c36] p-6 sm:p-12 shadow-2xl border border-[#C5A059]">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="inline-block p-4 sm:p-6 border border-gold mb-2 sm:mb-4"><ShieldCheck className="w-10 h-10 sm:w-16 sm:h-16 text-gold" strokeWidth={1} /></div>
          <h1 className="text-2xl sm:text-5xl font-serif tracking-[0.1em] sm:tracking-[0.3em] text-white uppercase">Sentinel Pro</h1>
          <p className="text-gold text-[8px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.4em] uppercase font-bold">Luxury Management Systems</p>
        </div>
        {showManagerLock ? (
          <form onSubmit={handleManagerAuth} className="space-y-6">
            <p className="text-gold text-[10px] text-center uppercase tracking-widest font-bold">Executive Vault Access</p>
            <input type="password" required autoFocus value={managerPassword} onChange={e => setManagerPassword(e.target.value)} className="login-input text-center" placeholder="Enter Manager Password" />
            <div className={cn("flex gap-4", isRTL && "flex-row-reverse")}>
              <button type="button" onClick={() => setShowManagerLock(false)} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest">{t('back')}</button>
              <button type="submit" className="flex-1 gold-button">Unlock</button>
            </div>
            <p className="text-[9px] text-white/30 text-center">Department managers: use your department password</p>
          </form>
        ) : showSecret ? (
          <div className="space-y-6">
            <p className="text-gold text-[10px] text-center uppercase tracking-widest font-bold">Security Override Detected</p>
            <div className="space-y-4">
              <button onClick={() => setShowManagerLock(true)} className="gold-button w-full flex items-center justify-center gap-3"><ShieldCheck size={18} /> Executive Dashboard</button>
              <button onClick={onNavigateToStaff} className="navy-button w-full border border-gold/30 flex items-center justify-center gap-3"><User size={18} /> Staff Portal</button>
              <button onClick={() => setShowSecret(false)} className="text-[10px] text-white/40 uppercase tracking-widest w-full text-center hover:text-white">{t('cancel')}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGuestLogin} className="space-y-4 w-full">
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="login-input" placeholder={t('full_name') || 'Full Name'} />
            <input type="text" required disabled={isLocked} value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className={cn("login-input", isLocked && "opacity-50 cursor-not-allowed")} placeholder={t('room_number')} />
            <button type="submit" disabled={loading} className="gold-button w-full">{loading ? '...' : t('sign_in')}</button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

// ─── STAFF LOGIN / REGISTER ───────────────────────────────────────────────────
const StaffLogin: React.FC<{ onLoginSuccess: (profile: UserProfile) => void; onReturnToGuest: () => void }> = ({ onLoginSuccess, onReturnToGuest }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [staffIdNumber, setStaffIdNumber] = useState('');
  const [department, setDepartment] = useState<Department>('Housekeeping');
  const [loading, setLoading] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        // Check if already exists
        const { data: existing } = await supabase.from('staff').select('id').eq('email', email).single();
        if (existing) { alert('Profile already exists. Please login.'); setMode('login'); setLoading(false); return; }
        // Create new staff record
        const { error } = await supabase.from('staff').insert({
          name: fullName,
          staff_id: staffIdNumber,
          email,
          password,
          department,
          approved: false,
          logged_in: false,
          tasks_completed: 0,
          tasks_on_time: 0,
          violations: 0,
        });
        if (error) throw error;
        setShowPending(true);
      } else {
        // Login: find staff by email + password
        const { data: staffData, error } = await supabase.from('staff').select('*').eq('email', email).eq('password', password).single();
        if (error || !staffData) { alert('Invalid credentials.'); setLoading(false); return; }
        if (!staffData.approved) { alert('ACCESS DENIED: Your account is pending manager approval.'); setLoading(false); return; }

        // Device check
        const deviceId = getDeviceId();
        if (staffData.device_id && staffData.device_id !== deviceId) { alert('ACCESS DENIED: Account active on another device.'); setLoading(false); return; }
        if (!staffData.device_id) await supabase.from('staff').update({ device_id: deviceId, logged_in: true }).eq('id', staffData.id);
        else await supabase.from('staff').update({ logged_in: true }).eq('id', staffData.id);

        const profile: UserProfile = {
          uid: staffData.id,
          email: staffData.email,
          displayName: staffData.name,
          role: 'staff',
          department: staffData.department as Department,
          staffIdNumber: staffData.staff_id,
          status: 'Approved',
        };
        localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
        onLoginSuccess(profile);
      }
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 relative">
      <AnimatePresence>
        {showPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="bg-[#001c36] p-10 sm:p-16 text-center border-2 border-gold max-w-lg shadow-xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gold animate-pulse" />
              <ShieldCheck className="w-20 h-20 text-gold mx-auto mb-8" strokeWidth={1} />
              <h2 className="text-3xl sm:text-4xl font-serif text-white mb-6">Request Submitted — Awaiting Approval</h2>
              <p className="text-white/70 text-sm font-serif italic mb-10">Your profile has been created and sent to your department manager for approval. You will be able to login once approved.</p>
              <button onClick={onReturnToGuest} className="gold-button w-full py-5 text-sm tracking-[0.3em]">Close & Return</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8 bg-[#001c36] p-6 sm:p-12 shadow-2xl border border-[#C5A059]">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 border border-gold"><ShieldCheck className="w-10 h-10 text-gold" strokeWidth={1} /></div>
          <h1 className="text-2xl sm:text-5xl font-serif tracking-widest text-white uppercase">Sentinel Pro</h1>
          <p className="text-gold text-[8px] uppercase font-bold">Staff Portal Access</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'register' && (
            <>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="login-input bg-white text-navy" placeholder={t('full_name') || 'Full Name'} />
              <input type="text" required value={staffIdNumber} onChange={e => setStaffIdNumber(e.target.value)} className="login-input bg-white text-navy" placeholder={t('staff_id_number') || 'Staff ID Number'} />
              <select value={department} onChange={e => setDepartment(e.target.value as Department)} className="login-input bg-white text-navy">
                <option value="Housekeeping">{t('housekeeping')}</option>
                <option value="F&B">{t('f_b')}</option>
                <option value="Security & Safety">{t('security_safety')}</option>
                <option value="Concierge">{t('concierge')}</option>
              </select>
            </>
          )}
          <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="login-input bg-white text-navy" placeholder={t('email')} />
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="login-input bg-white text-navy" placeholder={t('password')} />
          <button type="submit" disabled={loading} className="gold-button w-full">{loading ? '...' : (mode === 'login' ? t('sign_in') : t('register'))}</button>
        </form>
        <div className="text-center">
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[10px] font-bold text-gold uppercase tracking-widest">
            {mode === 'login' ? "Don't have a profile? Create Profile" : "Already have a profile? Login"}
          </button>
        </div>
        <div className="text-center">
          <button onClick={onReturnToGuest} className="text-[10px] text-white/30 uppercase tracking-widest hover:text-white">← Return to Guest Portal</button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── STAFF PORTAL ─────────────────────────────────────────────────────────────
const StaffPortal: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const { t, isRTL } = useLanguage();
  const [tasks, setTasks] = useState<ServiceRequest[]>([]);
  const [history, setHistory] = useState<ServiceRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [now, setNow] = useState(Date.now());
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [delayModalTask, setDelayModalTask] = useState<ServiceRequest | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [slaLimits] = useState(() => { const saved = localStorage.getItem('sentinel_sla_limits'); return saved ? JSON.parse(saved) : { 'Security & Safety': 2, 'F&B': 5, Housekeeping: 5, Concierge: 5, 'Front Office': 5 }; });

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      let query = supabase.from('requests').select('*').order('created_at', { ascending: false });
      if (userProfile.role !== 'manager') {
        if (userProfile.department === 'Security & Safety') {
          query = query.in('department', ['Security & Safety', 'Security']);
        } else {
          query = query.or(`department.eq.${userProfile.department},department.eq.Front Office`);
        }
      }
      const { data } = await query;
      if (data) {
        const mapped = data.map(mapRow);
        setTasks(mapped.filter(t => t.status !== 'Completed'));
        setHistory(mapped.filter(t => t.status === 'Completed').slice(0, 20));
      }
    };
    fetchRequests();

    // Real-time subscription
    const channel = supabase.channel('requests-staff').on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newReq = mapRow(payload.new);
        setNewOrderAlert(`New Request: Room #${newReq.roomNumber} - ${newReq.type}`);
        setTimeout(() => setNewOrderAlert(null), 5000);
      }
      fetchRequests();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile]);

  const mapRow = (row: any): ServiceRequest => ({
    id: row.id,
    roomNumber: row.guest_room || row.room_number || row.roomNumber || '',
    type: row.service || row.type || '',
    serviceKey: row.service_key || row.serviceKey,
    message: row.message || row.notes,
    department: row.department as Department,
    status: row.status as any,
    guestId: row.guest_id || row.guestId || '',
    guestName: row.guest_name || row.guestName,
    timestamp: row.created_at,
    updatedAt: row.updated_at,
    accepted_time: row.accepted_at,
    completed_time: row.closed_at,
    totalPrice: row.total_price,
    assignedStaffEmail: row.assigned_to_email,
    assignedStaffName: row.assigned_to,
    delayReason: row.late_reason,
    rating: row.rating,
    feedbackComment: row.feedback,
    feedbackDismissed: row.feedback_dismissed,
  });

  const getElapsed = (ts: any) => { if (!ts) return 0; return Math.floor((now - new Date(ts).getTime()) / 1000); };

  const handleAccept = async (id: string) => {
    await supabase.from('requests').update({ status: 'In Progress', accepted_at: new Date().toISOString(), assigned_to: userProfile.displayName, assigned_to_email: userProfile.email }).eq('id', id);
  };

  const handleComplete = async (task: ServiceRequest) => {
    const elapsed = getElapsed(task.timestamp);
    const limit = (slaLimits[task.department as keyof typeof slaLimits] || 5) * 60;
    if (elapsed > limit && !task.delayReason) { setDelayModalTask(task); return; }
    await supabase.from('requests').update({ status: 'Completed', closed_at: new Date().toISOString(), late_reason: delayReason || null }).eq('id', task.id);
    // Update staff stats
    await supabase.from('staff').update({ tasks_completed: (userProfile as any).tasks_completed + 1 }).eq('id', userProfile.uid);
    setDelayModalTask(null); setDelayReason('');
  };

  return (
    <div className="w-full pb-24 relative bg-[#001529] min-h-screen text-white">
      <AnimatePresence>
        {delayModalTask && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#001c36] p-8 max-w-md w-full border-t-4 border-red-600 shadow-2xl">
              <h2 className="text-xl font-serif text-white mb-4">SLA Violation Detected</h2>
              <p className="text-sm text-white/60 mb-6">This task exceeded the SLA limit. Please select a reason for the delay.</p>
              <select value={delayReason} onChange={e => setDelayReason(e.target.value)} className="w-full p-4 bg-white border border-gold mb-6 text-sm text-navy outline-none">
                <option value="">Select Reason...</option>
                <option value="High Volume">High Volume of Requests</option>
                <option value="Staff Shortage">Staff Shortage</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Guest Not in Room">Guest Not in Room</option>
                <option value="Other">Other</option>
              </select>
              <div className="flex gap-4">
                <button onClick={() => setDelayModalTask(null)} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase">Cancel</button>
                <button disabled={!delayReason} onClick={() => handleComplete(delayModalTask)} className="flex-1 py-3 bg-gold text-navy text-[10px] font-bold uppercase disabled:opacity-50">Submit & Complete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-[10002] bg-gold text-navy px-6 py-3 shadow-2xl flex items-center gap-3 border-2 border-white">
            <AlertCircle size={20} /><span className="font-bold uppercase tracking-widest text-xs">{newOrderAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <header className={cn("p-6 bg-navy text-white flex justify-between items-center border-b border-gold/20", isRTL && "flex-row-reverse")}>
        <div>
          <h1 className="text-2xl font-serif text-gold">{userProfile.displayName}</h1>
          <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">{userProfile.department} Command Center</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-navy/50 border border-gold/20 p-1">
            <button onClick={() => setActiveTab('active')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest", activeTab === 'active' ? "bg-gold text-navy" : "text-gold/60")}>Active</button>
            <button onClick={() => setActiveTab('history')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest", activeTab === 'history' ? "bg-gold text-navy" : "text-gold/60")}>History</button>
          </div>
          <button onClick={() => { supabase.from('staff').update({ logged_in: false }).eq('id', userProfile.uid); localStorage.clear(); window.location.replace('/'); }} className="p-2 text-gold hover:text-white flex flex-col items-center gap-1">
            <LogOut size={20} /><span className="text-[8px] uppercase font-bold">Logout</span>
          </button>
        </div>
      </header>
      <div className="staff-grid p-6">
        {activeTab === 'active' ? (
          tasks.length === 0 ? (
            <div className="col-span-full py-20 text-center"><CheckCircle2 className="w-12 h-12 text-gold/20 mx-auto" strokeWidth={1} /><p className="text-white/40 font-serif italic mt-4">All tasks completed. Standing by.</p></div>
          ) : tasks.map(task => {
            const elapsed = getElapsed(task.timestamp);
            const limit = (slaLimits[task.department as keyof typeof slaLimits] || 5) * 60;
            const isViolated = elapsed > limit;
            return (
              <motion.div key={task.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn("staff-task-card bg-[#001c36] border-gold/10", isViolated && "sla-violated border-red-500")}>
                <div className="flex justify-between items-start">
                  <div className="bg-navy/50 px-3 py-1 text-gold text-[10px] font-bold tracking-widest uppercase border border-gold/20">ROOM #{task.roomNumber}</div>
                  <div className={cn("timer-text text-white", isViolated && "text-red-500")}>{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-serif text-white">{task.type}</h3>
                  <p className={cn("text-[10px] uppercase tracking-widest font-bold", task.status === 'Pending' ? "text-gold" : "text-blue-400")}>{task.status}</p>
                  {task.assignedStaffName && <p className="text-[8px] text-white/40 font-bold uppercase">Handled by: {task.assignedStaffName}</p>}
                </div>
                {task.message && <div className="bg-navy/30 p-3 border-l-2 border-gold/20 italic text-xs text-white/60">"{task.message}"</div>}
                {isViolated && <div className="text-red-400 text-[10px] font-bold uppercase animate-pulse">⚠ SLA EXCEEDED by {Math.floor((elapsed - limit) / 60)}m</div>}
                <div className="pt-2">
                  {task.status === 'Pending' ? (
                    <button onClick={() => handleAccept(task.id)} className="gold-button w-full m-0 py-3">Accept Task</button>
                  ) : (
                    <button onClick={() => handleComplete(task)} className="w-full py-3 bg-green-600 text-white font-bold uppercase tracking-widest text-[10px]">Mark Completed</button>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          history.length === 0 ? (
            <div className="col-span-full py-20 text-center text-white/20 italic font-serif">No history available.</div>
          ) : history.map(task => (
            <div key={task.id} className="bg-[#001c36] border border-gold/10 p-4 shadow-sm opacity-70">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-white/40 uppercase">ROOM #{task.roomNumber}</span>
                <span className="text-[10px] font-bold text-green-500 uppercase">COMPLETED</span>
              </div>
              <h3 className="text-sm font-serif text-white">{task.type}</h3>
              {task.delayReason && <p className="text-[9px] text-red-400 mt-1">Late Reason: {task.delayReason}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── MANAGER DASHBOARD ────────────────────────────────────────────────────────
const ManagerDashboard: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const { t, isRTL } = useLanguage();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'staff' | 'requests'>('analytics');
  const [staffFilter, setStaffFilter] = useState<'pending' | 'approved' | 'terminated'>('pending');
  const [slaLimits, setSlaLimits] = useState(() => { const saved = localStorage.getItem('sentinel_sla_limits'); return saved ? JSON.parse(saved) : { 'Security & Safety': 2, 'F&B': 5, Housekeeping: 5, Concierge: 5, 'Front Office': 5 }; });
  const isAllDepts = profile.department === 'None'; // Executive sees all

  const mapRow = (row: any) => ({
    id: row.id, roomNumber: row.guest_room || '', type: row.service || '', department: row.department as Department,
    status: row.status as any, guestId: '', timestamp: row.created_at, updatedAt: row.updated_at,
    assignedStaffName: row.assigned_to, delayReason: row.late_reason, totalPrice: row.total_price,
    rating: row.rating, feedbackComment: row.feedback, guestName: row.guest_name,
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch requests filtered by department unless executive
      let reqQuery = supabase.from('requests').select('*').order('created_at', { ascending: false });
      if (!isAllDepts) reqQuery = reqQuery.eq('department', profile.department);
      const { data: reqData } = await reqQuery;
      if (reqData) setRequests(reqData.map(mapRow));

      // Fetch staff filtered by department unless executive
      let staffQuery = supabase.from('staff').select('*').order('created_at', { ascending: false });
      if (!isAllDepts) staffQuery = staffQuery.eq('department', profile.department);
      const { data: staffData } = await staffQuery;
      if (staffData) setStaffList(staffData);
    };
    fetchData();

    const channel = supabase.channel('manager-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const approveStaff = async (id: string) => { await supabase.from('staff').update({ approved: true }).eq('id', id); };
  const terminateStaff = async (id: string) => { await supabase.from('staff').update({ approved: false, logged_in: false }).eq('id', id); };
  const deleteStaff = async (id: string) => { if (window.confirm('Delete this staff profile permanently?')) await supabase.from('staff').delete().eq('id', id); };

  const getSLAStatus = (req: any) => {
    if (!req.timestamp || req.status === 'Completed') return false;
    const elapsed = (Date.now() - new Date(req.timestamp).getTime()) / 1000;
    const limit = (slaLimits[req.department as keyof typeof slaLimits] || 5) * 60;
    return elapsed > limit;
  };

  const violations = requests.filter(r => getSLAStatus(r));
  const pending = requests.filter(r => r.status !== 'Completed').length;
  const completed = requests.filter(r => r.status === 'Completed').length;
  const revenue = requests.reduce((s, r) => s + (r.totalPrice || 0), 0);

  const revenueData = [
    { name: 'Mon', fb: revenue * 0.1, car: 2500, laundry: 450 },
    { name: 'Tue', fb: revenue * 0.12, car: 5000, laundry: 600 },
    { name: 'Wed', fb: revenue * 0.15, car: 2500, laundry: 550 },
    { name: 'Thu', fb: revenue * 0.13, car: 7500, laundry: 700 },
    { name: 'Fri', fb: revenue * 0.2, car: 10000, laundry: 900 },
    { name: 'Sat', fb: revenue * 0.18, car: 12500, laundry: 1100 },
    { name: 'Sun', fb: revenue * 0.12, car: 5000, laundry: 800 },
  ];

  const pendingStaff = staffList.filter(s => !s.approved);
  const approvedStaff = staffList.filter(s => s.approved);

  return (
    <div className="min-h-screen bg-[#001529] text-white p-4 sm:p-8 space-y-8 overflow-x-hidden">
      <header className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold/20 pb-6", isRTL && "flex-row-reverse")}>
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif text-gold tracking-tight">
            {isAllDepts ? 'Executive Operations Center' : `${profile.department} Department`}
          </h1>
          <p className="text-gold/60 text-[10px] uppercase tracking-[0.3em] font-bold mt-1">
            {profile.displayName} · {isAllDepts ? 'All Departments' : profile.department}
          </p>
        </div>
        <div className="flex bg-navy border border-gold/20 p-1">
          <button onClick={() => setActiveTab('analytics')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest", activeTab === 'analytics' ? "bg-gold text-navy" : "text-gold/60")}>Analytics</button>
          <button onClick={() => setActiveTab('requests')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest", activeTab === 'requests' ? "bg-gold text-navy" : "text-gold/60")}>Requests</button>
          <button onClick={() => setActiveTab('staff')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest", activeTab === 'staff' ? "bg-gold text-navy" : "text-gold/60")}>
            Staff {pendingStaff.length > 0 && <span className="bg-red-500 text-white rounded-full px-1.5 text-[8px] ml-1">{pendingStaff.length}</span>}
          </button>
        </div>
      </header>

      {/* SLA Violations Banner */}
      {violations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-600/10 border border-red-600 p-6 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <AlertCircle className="text-red-600" size={32} />
            <div>
              <h3 className="text-red-600 font-bold uppercase tracking-widest text-sm">SLA VIOLATION ALERT</h3>
              <p className="text-red-600/80 text-xs">{violations.length} tasks currently exceeding SLA limits.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {violations.map(v => <div key={v.id} className="bg-red-600 text-white text-[10px] font-bold px-3 py-1">ROOM {v.roomNumber}</div>)}
          </div>
        </motion.div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Revenue', value: `${revenue.toLocaleString()} AED`, color: '#C5A059' },
              { label: 'Active Requests', value: pending, color: '#C5A059' },
              { label: 'Completed Today', value: completed, color: '#4CAF50' },
              { label: 'SLA Violations', value: violations.length, color: violations.length > 0 ? '#EF4444' : '#4CAF50' },
            ].map(k => (
              <div key={k.label} className="bg-[#001c36] border border-gold/10 p-6 text-center">
                <div className="text-4xl font-serif mb-2" style={{ color: k.color }}>{k.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <div className="bg-[#001c36] border border-gold/10 p-6">
            <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-gold" /> Revenue Streams (AED)</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#C5A05920" vertical={false} />
                  <XAxis dataKey="name" stroke="#FFFFFF" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#FFFFFF', fontWeight: 'bold' }} />
                  <YAxis stroke="#FFFFFF" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#FFFFFF', fontWeight: 'bold' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#002349', border: '1px solid #C5A059' }} itemStyle={{ color: '#FFFFFF', fontWeight: 'bold' }} />
                  <Bar dataKey="fb" name="F&B" stackId="a" fill="#C5A059" />
                  <Bar dataKey="car" name="Luxury Car" stackId="a" fill="#FFD700" />
                  <Bar dataKey="laundry" name="Laundry" stackId="a" fill="#FFFFFF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Guest Feedback */}
          <div className="bg-[#001c36] border border-gold/10 p-6">
            <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2"><Star size={18} className="text-gold" /> Live Guest Feedback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.filter(r => r.rating).map(req => (
                <div key={req.id} className="bg-navy/30 p-4 border border-gold/5">
                  <div className="flex gap-1 mb-2">{[...Array(5)].map((_, i) => <Star key={i} size={12} className={cn(i < (req.rating || 0) ? "text-gold fill-gold" : "text-white/10")} />)}</div>
                  <p className="text-xs italic text-white/80 mb-2">"{req.feedbackComment || 'No comment'}"</p>
                  <p className="text-[9px] text-gold font-bold uppercase">Room #{req.roomNumber} · {req.type}</p>
                </div>
              ))}
              {requests.filter(r => r.rating).length === 0 && (
                <p className="col-span-full text-white/20 italic font-serif py-12 text-center">Waiting for guest feedback...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif text-gold">{isAllDepts ? 'All Department Requests' : `${profile.department} Requests`}</h2>
          {requests.map(req => {
            const over = getSLAStatus(req);
            return (
              <div key={req.id} className={cn("bg-[#001c36] border p-5", over ? "border-red-500 bg-red-900/10" : "border-gold/10")}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <span className={cn("text-[10px] font-bold px-2 py-1 border", req.status === 'Completed' ? "border-green-500 text-green-400" : over ? "border-red-500 text-red-400" : "border-gold text-gold")}>{req.status}</span>
                      <span className="text-[10px] font-bold px-2 py-1 border border-gold/30 text-white/60">{req.department}</span>
                      {over && <span className="text-[10px] font-bold px-2 py-1 border border-red-500 text-red-400 animate-pulse">⚠ SLA EXCEEDED</span>}
                    </div>
                    <p className="text-base font-serif text-white">{req.type}</p>
                    <p className="text-[10px] text-white/40 mt-1">Room {req.roomNumber} · {req.guestName} · {req.assignedStaffName ? `Assigned: ${req.assignedStaffName}` : 'Unassigned'}</p>
                    {req.delayReason && <p className="text-[10px] text-red-400 mt-1">Late Reason: {req.delayReason}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-[10px] text-white/40">{new Date(req.timestamp).toLocaleTimeString()}</p>
                    {req.totalPrice && <p className="text-gold font-bold text-sm mt-1">{req.totalPrice} AED</p>}
                  </div>
                </div>
              </div>
            );
          })}
          {requests.length === 0 && <div className="py-20 text-center text-white/20 italic font-serif">No requests found.</div>}
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="bg-[#001c36] border border-gold/10 p-6">
          <h2 className="text-2xl font-serif text-gold mb-6">
            {isAllDepts ? 'Executive Approval Center' : `${profile.department} Staff Management`}
          </h2>
          <div className="flex border-b border-gold/20 mb-6">
            {(['pending', 'approved'] as const).map(status => (
              <button key={status} onClick={() => setStaffFilter(status)} className={cn("px-6 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all", staffFilter === status ? "border-gold text-gold" : "border-transparent text-white/40")}>
                {status} ({status === 'pending' ? pendingStaff.length : approvedStaff.length})
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy/50 text-gold text-[10px] uppercase tracking-widest border-b border-gold/20">
                  <th className="p-4 text-left">Staff Member</th>
                  <th className="p-4 text-left">ID</th>
                  <th className="p-4 text-left">Department</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(staffFilter === 'pending' ? pendingStaff : approvedStaff).map(staff => (
                  <tr key={staff.id} className="border-b border-gold/10 hover:bg-gold/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold border border-gold/20 text-xs">{staff.name?.[0] || '?'}</div>
                        <div><p className="text-sm font-serif text-white">{staff.name}</p><p className="text-[8px] text-white/40">{staff.email}</p></div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-gold/80">{staff.staff_id || 'N/A'}</td>
                    <td className="p-4 text-xs uppercase tracking-wider text-white/60">{staff.department}</td>
                    <td className="p-4">
                      <span className={cn("text-[9px] font-bold uppercase px-2 py-1 border", staff.approved ? "border-green-500 text-green-400" : "border-gold text-gold")}>{staff.approved ? 'Approved' : 'Pending'}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {!staff.approved && <button onClick={() => approveStaff(staff.id)} className="px-4 py-1.5 bg-gold text-navy text-[8px] font-bold uppercase hover:bg-gold/80">Approve ✓</button>}
                        {staff.approved && <button onClick={() => terminateStaff(staff.id)} className="px-4 py-1.5 bg-orange-600 text-white text-[8px] font-bold uppercase">Terminate</button>}
                        <button onClick={() => deleteStaff(staff.id)} className="px-4 py-1.5 bg-red-600 text-white text-[8px] font-bold uppercase">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(staffFilter === 'pending' ? pendingStaff : approvedStaff).length === 0 && (
              <div className="py-20 text-center text-white/20 italic font-serif">No {staffFilter} staff found.</div>
            )}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="flex justify-end">
        <button onClick={() => { localStorage.clear(); window.location.replace('/'); }} className="ghost-btn flex items-center gap-2 text-gold/60 hover:text-gold border border-gold/20 px-6 py-3 text-[10px] font-bold uppercase tracking-widest">
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestTab, setGuestTab] = useState<'services' | 'room-service' | 'restaurant-bookings' | 'concierge'>('services');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [feedbackRequest, setFeedbackRequest] = useState<ServiceRequest | null>(null);
  const [roomNumber, setRoomNumber] = useState(roomNumberFromUrl || '402');
  const [pathname, setPathname] = useState(window.location.pathname);
  const { language, t, isRTL } = useLanguage();

  useEffect(() => {
    const handlePop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Restore session on load
  useEffect(() => {
    const saved = localStorage.getItem('sentinel_local_session');
    if (saved) { try { setProfile(JSON.parse(saved)); } catch { localStorage.removeItem('sentinel_local_session'); } }
    setLoading(false);
  }, []);

  // Fetch guest requests
  useEffect(() => {
    if (!profile || profile.role !== 'guest') return;
    const fetchRequests = async () => {
      const { data } = await supabase.from('requests').select('*').eq('guest_id', profile.uid).order('created_at', { ascending: false });
      if (data) {
        const mapped = data.map((row: any) => ({
          id: row.id, roomNumber: row.guest_room || '', type: row.service || '', serviceKey: row.service_key,
          message: row.notes, department: row.department as Department, status: row.status as any,
          guestId: row.guest_id, timestamp: row.created_at, updatedAt: row.updated_at,
          totalPrice: row.total_price, rating: row.rating, feedbackComment: row.feedback,
          feedbackDismissed: row.feedback_dismissed, assignedStaffName: row.assigned_to,
        }));
        setRequests(mapped);
        const completedUnrated = mapped.find((r: ServiceRequest) => r.status === 'Completed' && !r.rating && !r.feedbackDismissed);
        if (completedUnrated) setFeedbackRequest(completedUnrated);
      }
    };
    fetchRequests();
    const channel = supabase.channel('guest-requests').on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `guest_id=eq.${profile.uid}` }, fetchRequests).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const logout = () => { localStorage.clear(); setProfile(null); window.location.replace('/'); };

  const submitRequest = async (customData?: any) => {
    if (!profile || !roomNumber) return;
    const service = customData?.type ? customData : selectedService;
    if (!service) return;
    const menuPrices: { [k: string]: number } = { b1: 145, b2: 95, a1: 125, a2: 245, a3: 185, d1: 65, d2: 28, d3: 45 };
    const menuNames: { [k: string]: string } = { b1: 'Classic Wagyu Burger', b2: 'Lobster Bisque', a1: 'Caesar Salad', a2: 'Truffle Fries', a3: 'Wild Mushroom Risotto', d1: 'Fresh Orange Juice', d2: 'Signature Espresso', d3: 'Sparkling Mineral Water' };
    const orderItems = Object.entries(cart).map(([id, qty]) => ({ name: menuNames[id] || 'Unknown', quantity: qty }));
    const totalPrice = Object.entries(cart).reduce((acc, [id, qty]) => acc + (menuPrices[id] || 0) * qty, 0) || customData?.totalPrice || 0;
    try {
      const { error } = await supabase.from('requests').insert({
        guest_room: roomNumber,
        guest_id: profile.uid,
        guest_name: profile.displayName,
        service: service.type || service.name,
        service_key: service.serviceKey,
        notes: customData?.notes || message || dietaryRequirements,
        department: service.dept || customData?.dept || 'Front Office',
        status: 'Pending',
        total_price: totalPrice > 0 ? totalPrice : null,
        language,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setShowRequestModal(false); setMessage(''); setSelectedService(null); setCart({}); setDietaryRequirements(''); setGuestTab('services');
      alert(t('registration_submitted_successfully'));
    } catch (e: any) { alert(e.message); }
  };

  const submitFeedback = async (rating: number, comment: string) => {
    if (!feedbackRequest) return;
    await supabase.from('requests').update({ rating, feedback: comment, feedback_at: new Date().toISOString() }).eq('id', feedbackRequest.id);
    setFeedbackRequest(null);
  };

  const navigateToStaff = () => { window.history.pushState({}, '', '/staff-portal'); setPathname('/staff-portal'); };

  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="text-gold font-serif text-2xl animate-pulse">Loading...</div></div>;

  return (
    <div className={cn("main-content", isRTL && "rtl", profile?.role === 'manager' && "manager-dark-mode")}>
      <GlobalLanguageSelector />
      {profile && (
        <Header roomNumber={profile.roomNumber || roomNumber} user={profile} logout={logout} navigateToGuest={() => { setGuestTab('services'); if (pathname !== '/') { window.history.pushState({}, '', '/'); setPathname('/'); } }} />
      )}
      <main className="w-full flex-1">
        <div className="luxury-container">
          <AnimatePresence mode="wait">
            {!profile ? (
              <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {pathname === '/staff-portal' ? (
                  <StaffLogin onLoginSuccess={p => setProfile(p)} onReturnToGuest={() => { window.history.pushState({}, '', '/'); setPathname('/'); }} />
                ) : (
                  <Auth onLoginSuccess={p => setProfile(p)} initialRoom={roomNumber} isLocked={isRoomLocked} onNavigateToStaff={navigateToStaff} />
                )}
              </motion.div>
            ) : profile.role === 'manager' ? (
              <motion.div key="manager" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ManagerDashboard profile={profile} />
              </motion.div>
            ) : profile.role === 'staff' ? (
              <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <StaffPortal userProfile={profile} />
              </motion.div>
            ) : (
              <motion.div key="guest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {guestTab === 'services' && (
                  <>
                    <div className="bg-navy p-6 sm:p-12 relative overflow-hidden shadow-2xl mb-8 sm:mb-16">
                      <h2 className="text-3xl sm:text-5xl font-serif tracking-tight text-white mb-4 sm:mb-6 leading-tight">
                        {new Date().getHours() < 12 ? t('greeting_morning') : new Date().getHours() < 17 ? t('greeting_afternoon') : t('greeting_evening')}, <span className="text-gold italic">{profile.displayName}</span>
                      </h2>
                      <p className="text-white/70 max-w-2xl font-serif text-base sm:text-lg italic">{t('welcome_sanctuary')}</p>
                    </div>
                    <div className="dashboard-grid">
                      {[
                        { name: t('housekeeping'), icon: Sparkles, dept: 'Housekeeping', serviceKey: 'housekeeping', options: [t('room_cleaning'), t('laundry'), t('extra_blanket')] },
                        { name: t('room_service'), icon: Coffee, dept: 'F&B', serviceKey: 'room_service' },
                        { name: t('restaurant_bookings'), icon: UtensilsCrossed, dept: 'F&B', serviceKey: 'restaurant_bookings' },
                        { name: t('concierge_services'), icon: Key, dept: 'Concierge', serviceKey: 'concierge_services' },
                        { name: t('security'), icon: Shield, dept: 'Security & Safety', serviceKey: 'security', options: [t('emergency'), t('safe_box'), t('medical'), t('escort')] },
                        { name: t('any_other_request'), icon: Send, dept: 'Front Office', serviceKey: 'any_other_request' },
                      ].map(service => (
                        <button key={service.name} onClick={() => {
                          if (service.serviceKey === 'room_service') setGuestTab('room-service');
                          else if (service.serviceKey === 'restaurant_bookings') setGuestTab('restaurant-bookings');
                          else if (service.serviceKey === 'concierge_services') setGuestTab('concierge');
                          else { setSelectedService(service); if (service.options) setMessage(service.options[0]); setShowRequestModal(true); }
                        }} className="premium-card">
                          <div className="icon-wrapper"><service.icon size={28} className="text-gold" strokeWidth={1} /></div>
                          <h3>{service.name}</h3>
                        </button>
                      ))}
                    </div>
                    {requests.length > 0 && (
                      <section className="mt-12 space-y-6">
                        <h2 className="text-sm font-bold text-gold uppercase tracking-[0.2em] border-b border-gold/20 pb-2">{t('sanctuary_requests')}</h2>
                        <div className="divide-y divide-navy/10">
                          {requests.map(req => (
                            <div key={req.id} className="request-list-item flex items-center justify-between py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 flex items-center justify-center rounded-full", req.status === 'Completed' ? "bg-green-50 text-green-600" : "bg-gold/5 text-gold")}>
                                  {req.status === 'Completed' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                </div>
                                <div>
                                  <span className="text-navy font-bold text-sm font-serif block">{req.type}</span>
                                  {req.status === 'In Progress' && req.assignedStaffName && <span className="text-[8px] text-blue-600 font-bold uppercase animate-pulse">{req.assignedStaffName} is on the way!</span>}
                                  {req.totalPrice && <span className="text-[9px] text-gold font-bold block mt-0.5">AED {req.totalPrice.toLocaleString()}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-navy/40 font-bold">{req.status}</span>
                                <ChevronRight size={14} className="text-gold/30" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
                {guestTab === 'room-service' && (
                  <RoomService cart={cart} updateCart={(id, delta) => setCart(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }))} onSubmit={notes => submitRequest({ type: t('room_service'), serviceKey: 'room_service', dept: 'F&B', notes })} />
                )}
                {guestTab === 'restaurant-bookings' && (
                  <RestaurantBooking onSubmit={data => submitRequest({ ...data, serviceKey: 'restaurant_bookings', dept: 'F&B' })} />
                )}
                {guestTab === 'concierge' && (
                  <Concierge onSubmit={data => submitRequest({ ...data, serviceKey: 'concierge_services' })} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackRequest && (
          <FeedbackModal request={feedbackRequest} onClose={async () => { await supabase.from('requests').update({ feedback_dismissed: true }).eq('id', feedbackRequest.id); setFeedbackRequest(null); }} onSubmit={submitFeedback} />
        )}
      </AnimatePresence>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && selectedService && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#FCF9F2] border border-[#C5A059] w-full max-w-md p-10 relative shadow-2xl">
              <button onClick={() => setShowRequestModal(false)} className="absolute top-6 right-6 text-navy/40 hover:text-navy"><X size={24} /></button>
              <h2 className="text-3xl font-serif text-navy mb-8">{selectedService.name}</h2>
              {selectedService.options ? (
                <div className="space-y-6 mb-8">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-widest text-navy/50 font-bold">{t('select_option')}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedService.options.map((opt: string) => (
                        <button key={opt} onClick={() => setMessage(opt)} className={cn("w-full p-4 text-left border transition-all text-sm", message === opt ? "border-gold bg-gold/5 text-navy" : "border-navy/10 text-navy/60")}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
                    <textarea value={dietaryRequirements} onChange={e => setDietaryRequirements(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
                  </div>
                </div>
              ) : (
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t('message_placeholder')} className="h-32 resize-none w-full bg-white text-navy border border-gold p-4 mb-8" />
              )}
              <button onClick={() => submitRequest()} className="gold-button w-full m-0">{t('submit')}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
