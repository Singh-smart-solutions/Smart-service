import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { UserProfile, ServiceRequest, Department } from './types';
import { cn } from './lib/utils';
import {
  LogOut, Clock, CheckCircle2, AlertCircle, ChevronRight,
  Shield, Coffee, Key, Sparkles, UtensilsCrossed, Send, X,
  Globe, Home, Plus, Minus, Check, ChevronDown,
  User, ClipboardList, TrendingUp, Star, ShieldCheck,
  Car, MapPin, Briefcase, Zap, FileText, Mail, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, Language } from './contexts/TranslationContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const OCCUPATIONS = [
  'Housekeeping Attendant',
  'Housekeeping Supervisor',
  'F&B Waiter',
  'F&B Supervisor',
  'Chef',
  'Concierge Agent',
  'Concierge Supervisor',
  'Security Officer',
  'Security Supervisor',
  'Front Office Agent',
  'Front Office Supervisor',
  'Maintenance Technician',
  'Maintenance Supervisor',
  'Housekeeping Manager',
  'F&B Manager',
  'Concierge Manager',
  'Security Manager',
  'Front Office Manager',
  'Executive',
];

// These occupations need Executive approval and get manager-level access
const MANAGER_OCCUPATIONS = [
  'Housekeeping Manager',
  'F&B Manager',
  'Concierge Manager',
  'Security Manager',
  'Front Office Manager',
  'Executive',
];

const DEPT_FROM_OCCUPATION: Record<string, Department> = {
  'Housekeeping Manager': 'Housekeeping',
  'F&B Manager': 'F&B',
  'Concierge Manager': 'Concierge',
  'Security Manager': 'Security & Safety',
  'Front Office Manager': 'Front Office',
  'Executive': 'None',
  'Housekeeping Attendant': 'Housekeeping',
  'Housekeeping Supervisor': 'Housekeeping',
  'F&B Waiter': 'F&B',
  'F&B Supervisor': 'F&B',
  'Chef': 'F&B',
  'Concierge Agent': 'Concierge',
  'Concierge Supervisor': 'Concierge',
  'Security Officer': 'Security & Safety',
  'Security Supervisor': 'Security & Safety',
  'Front Office Agent': 'Front Office',
  'Front Office Supervisor': 'Front Office',
  'Maintenance Technician': 'Front Office',
  'Maintenance Supervisor': 'Front Office',
};

const DELAY_REASONS = [
  'High Volume of Requests',
  'Staff Shortage',
  'Technical Issue',
  'Guest Not in Room',
  'Waiting for Supplies',
  'Too Many Simultaneous Requests',
  'Other',
];

const getDeviceId = () => {
  let id = localStorage.getItem('sentinel_device_id');
  if (!id) {
    id = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem('sentinel_device_id', id);
  }
  return id;
};

const queryParams = new URLSearchParams(window.location.search);
const roomNumberFromUrl = queryParams.get('room') || '';
const isRoomLocked = !!roomNumberFromUrl;

const DEFAULT_SLA: Record<string, number> = {
  'Security & Safety': 2,
  'F&B': 5,
  'Housekeeping': 5,
  'Concierge': 5,
  'Front Office': 5,
};

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
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

// ─── LANGUAGE SELECTOR ────────────────────────────────────────────────────────
const GlobalLanguageSelector: React.FC = () => {
  const { language, setLanguage, isRTL } = useLanguage();
  const flags: Record<string, string> = { English: '🇺🇸', Arabic: '🇦🇪', Russian: '🇷🇺', Hindi: '🇮🇳', French: '🇫🇷', Turkish: '🇹🇷', Chinese: '🇨🇳' };
  const labels: Record<string, string> = { English: 'English', Arabic: 'العربية', Russian: 'Русский', Hindi: 'हिन्दी', French: 'Français', Turkish: 'Türkçe', Chinese: '中文' };
  return (
    <div className={cn('fixed top-4 z-[10005]', isRTL ? 'left-4' : 'right-4')}>
      <div className="relative group">
        <button className="flex items-center gap-2 bg-navy/80 backdrop-blur-md text-white/90 hover:text-gold px-4 py-2 border border-gold/30 shadow-2xl">
          <Globe size={16} className="text-gold" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{flags[language]}</span>
          <ChevronDown size={12} className="group-hover:rotate-180 transition-transform" />
        </button>
        <div className={cn('absolute top-full mt-2 w-56 bg-navy border border-gold/30 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[10006]', isRTL ? 'left-0' : 'right-0')}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gold" />
          {(Object.keys(flags) as Language[]).map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)} className={cn('w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-gold/10 flex items-center justify-between border-b border-gold/5 last:border-0', language === lang ? 'text-gold bg-gold/5' : 'text-white/60')}>
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
      <div className={cn('flex items-center gap-1 sm:gap-2 px-4', isRTL && 'flex-row-reverse')}>
        {user && <button onClick={navigateToGuest} className="p-1 sm:p-2 text-gold hover:text-white transition-colors"><Home size={18} strokeWidth={1.5} /></button>}
      </div>
      <div className="logo-container cursor-pointer" onClick={navigateToGuest}>
        <div className="flex flex-col items-center">
          <h1 className="logo-text">Sentinel Pro</h1>
          <span className="text-[7px] sm:text-[8px] font-bold text-gold/60 uppercase tracking-[0.3em] -mt-1">Luxury Hotel & Residences</span>
        </div>
      </div>
      <div className={cn('flex items-center gap-1 sm:gap-2 px-4', isRTL && 'flex-row-reverse')}>
        <div className="flex flex-col items-end mr-2 hidden xs:flex">
          <span className="text-[10px] font-bold text-white tracking-widest uppercase">{t('room')} {roomNumber || '---'}</span>
          <span className="text-[7px] text-gold font-bold uppercase tracking-tighter">Executive Level</span>
        </div>
        {user && <button onClick={logout} className="p-1 sm:p-2 text-gold hover:text-white transition-colors"><LogOut size={18} strokeWidth={1} /></button>}
      </div>
    </nav>
  );
};

// ─── FEEDBACK MODAL ───────────────────────────────────────────────────────────
const FeedbackModal: React.FC<{ request: any; onClose: () => void; onSubmit: (rating: number, comment: string) => void }> = ({ request, onClose, onSubmit }) => {
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
                <Star size={32} className={cn(star <= rating ? 'text-gold fill-gold' : 'text-gold/20')} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t('feedback_placeholder')} className="h-32 resize-none w-full bg-white text-navy border border-gold p-4" />
          <button onClick={() => onSubmit(rating, comment)} className="w-full bg-navy text-white py-4 text-[10px] font-bold uppercase tracking-widest">{t('submit_feedback')}</button>
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
  const total = Object.entries(cart).reduce((acc, [id, qty]) => {
    const item = menuItems.find(m => m.id === id);
    return acc + (item?.price || 0) * qty;
  }, 0);
  return (
    <div className="space-y-8 pb-32 w-full px-4 sm:px-8">
      <div className="flex gap-2 border-b border-gold/20 pb-2">
        {['breakfast', 'all_day', 'beverages'].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={cn('px-4 py-2 text-[10px] font-bold uppercase tracking-widest', activeCategory === cat ? 'text-gold border-b-2 border-gold' : 'text-navy/40')}>{t(cat)}</button>
        ))}
      </div>
      <div className="space-y-1">
        {menuItems.filter(i => i.category === activeCategory).map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 border-b border-navy/5">
            <div>
              <span className="text-navy font-serif text-lg">{item.name}</span>
              {cart[item.id] > 0 && <span className="text-[10px] text-gold font-bold uppercase block">Qty: {cart[item.id]}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-navy font-bold">{item.price} {t('currency_label')}</span>
              <button onClick={() => updateCart(item.id, -1)} className="w-8 h-8 bg-navy/10 flex items-center justify-center"><Minus size={12} /></button>
              <span className="w-4 text-center text-sm font-bold">{cart[item.id] || 0}</span>
              <button onClick={() => updateCart(item.id, 1)} className="w-8 h-8 bg-gold flex items-center justify-center text-white"><Plus size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
      <AnimatePresence>
        {Object.values(cart).some(q => q > 0) && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-4 left-4 right-4 bg-navy p-4 flex items-center justify-between shadow-2xl z-[9999]">
            <div>
              <span className="text-[8px] text-white/50 uppercase tracking-widest block">{t('your_tray')}</span>
              <span className="text-gold font-bold">{total} {t('currency_label')}</span>
            </div>
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
  const [data, setData] = useState({ restaurant: 'turquoise', pax: '2', date: '', time: '', notes: '' });
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
          <button key={r.id} onClick={() => setData({ ...data, restaurant: r.id })} className={cn('p-4 border text-left transition-all', data.restaurant === r.id ? 'border-gold bg-gold/5' : 'border-navy/10')}>
            <p className="text-navy font-bold">{r.name}</p>
            <p className="text-[10px] text-navy/60 italic">{r.desc}</p>
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {[{ label: t('label_pax'), key: 'pax', type: 'number' }, { label: t('label_date'), key: 'date', type: 'date' }, { label: t('label_time'), key: 'time', type: 'time' }].map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{f.label}</label>
            <input type={f.type} value={(data as any)[f.key]} onChange={e => setData({ ...data, [f.key]: e.target.value })} className="w-full bg-white text-navy border border-gold p-4" />
          </div>
        ))}
        <textarea value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
        <button onClick={() => onSubmit({ type: `Restaurant: ${data.restaurant}`, pax: Number(data.pax), preferredTiming: `${data.date} ${data.time}`, notes: data.notes })} className="gold-button w-full m-0">{t('confirm')}</button>
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
  const cars = [
    { id: 'mercedes', name: t('car_mercedes_name'), price: 1200, img: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=400' },
    { id: 'range', name: t('car_range_name'), price: 1800, img: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?auto=format&fit=crop&q=80&w=400' },
    { id: 'lambo', name: t('car_lambo_name'), price: 2500, img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400' },
  ];
  const options = [
    { id: 'rent_a_car', name: t('rent_a_car'), icon: Car },
    { id: 'taxi_limousine', name: t('taxi_limousine'), icon: MapPin },
    { id: 'luggage_service', name: t('luggage_service'), icon: Briefcase },
    { id: 'local_tours', name: t('local_tours'), icon: Globe },
  ];
  return (
    <div className="w-full py-8 space-y-8 px-4 sm:px-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif text-navy">{t('concierge_services')}</h2>
        <p className="text-gold text-[10px] uppercase tracking-widest font-bold">Luxury Assistance</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {options.map(opt => (
          <button key={opt.id} onClick={() => setSelected(opt.id)} className={cn('premium-card', selected === opt.id ? 'border-gold bg-gold/5' : '')}>
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
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-20 resize-none w-full bg-white text-navy border border-gold p-4" />
        </div>
      )}
      {selected === 'taxi_limousine' && (
        <div className="bg-white p-6 shadow-xl border border-gold/10 space-y-6">
          <div className="pill-container">
            <button onClick={() => setSubTab('taxi')} className={cn('pill-btn', subTab === 'taxi' ? 'active' : 'inactive')}>{t('taxi')}</button>
            <button onClick={() => setSubTab('limousine')} className={cn('pill-btn', subTab === 'limousine' ? 'active' : 'inactive')}>{t('limousine')}</button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1"><label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_pickup')}</label><input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full bg-white text-navy border border-gold p-4" /></div>
            <div className="space-y-1"><label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_destination')}</label><input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder={t('drop_off_destination')} className="w-full bg-white text-navy border border-gold p-4" /></div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-20 resize-none w-full bg-white text-navy border border-gold p-4" />
          </div>
          <button onClick={() => onSubmit({ type: `Concierge: ${subTab}`, dept: 'Concierge', pickupTime, destination, notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
      {selected === 'luggage_service' && (
        <div className="bg-white p-6 shadow-xl border border-gold/10 space-y-6">
          <div className="pill-container">
            <button onClick={() => setSubTab('pickup')} className={cn('pill-btn', subTab === 'pickup' ? 'active' : 'inactive')}>{t('pickup')}</button>
            <button onClick={() => setSubTab('delivery')} className={cn('pill-btn', subTab === 'delivery' ? 'active' : 'inactive')}>{t('delivery')}</button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1"><label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('luggage')}</label><input type="number" value={numBags} onChange={e => setNumBags(e.target.value)} min="1" className="w-full bg-white text-navy border border-gold p-4" /></div>
            <div className="space-y-1"><label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_pickup')}</label><input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full bg-white text-navy border border-gold p-4" /></div>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-20 resize-none w-full bg-white text-navy border border-gold p-4" />
          <button onClick={() => onSubmit({ type: `Luggage: ${subTab}`, dept: 'Concierge', numBags, pickupTime, notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
      {selected === 'local_tours' && (
        <div className="bg-white p-6 shadow-xl border border-gold/10 space-y-6">
          <p className="text-navy/60 font-serif italic text-center py-4">Discover Abu Dhabi with our curated local tours.</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-20 resize-none w-full bg-white text-navy border border-gold p-4" />
          <button onClick={() => onSubmit({ type: 'Concierge: Local Tours', dept: 'Concierge', notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
    </div>
  );
};

// ─── GUEST AUTH ───────────────────────────────────────────────────────────────
const Auth: React.FC<{ onLoginSuccess: (profile: UserProfile) => void; initialRoom?: string; isLocked?: boolean; onNavigateToStaff: () => void }> = ({ onLoginSuccess, initialRoom, isLocked, onNavigateToStaff }) => {
  const { t } = useLanguage();
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
      if (!existing) await supabase.from('guests').insert({ id: guestId, name: fullName, email: 'guest@hotel.com', room: roomNumber });
      const profile: UserProfile = { uid: guestId, email: 'guest@hotel.com', displayName: fullName || `Guest ${roomNumber}`, role: 'guest', department: 'None', roomNumber, status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
      onLoginSuccess(profile);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleManagerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    // Executive master password
    if (managerPassword === 'Manager12345') {
      const adminProfile: UserProfile = { uid: 'admin_override', email: 'admin@sentinel.pro', displayName: 'Executive Director', role: 'manager', department: 'None', status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify(adminProfile));
      onLoginSuccess(adminProfile);
      return;
    }
    // Try managers table (legacy)
    const { data: manager } = await supabase.from('managers').select('*').eq('password', managerPassword).single();
    if (manager) {
      const managerProfile: UserProfile = { uid: manager.id, email: manager.email, displayName: manager.name, role: 'manager', department: manager.department as Department, status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify(managerProfile));
      onLoginSuccess(managerProfile);
      return;
    }
    const newCount = failCount + 1;
    setFailCount(newCount);
    if (newCount >= 3) { alert('Too many failed attempts.'); setShowManagerLock(false); setShowSecret(false); setFailCount(0); setManagerPassword(''); }
    else alert(`Invalid password. Attempt ${newCount} of 3.`);
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
            <input type="password" required autoFocus value={managerPassword} onChange={e => setManagerPassword(e.target.value)} className="login-input text-center" placeholder="Enter Executive Password" />
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowManagerLock(false)} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest">{t('back')}</button>
              <button type="submit" className="flex-1 gold-button">Unlock</button>
            </div>
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
            <input type="text" required disabled={isLocked} value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className={cn('login-input', isLocked && 'opacity-50 cursor-not-allowed')} placeholder={t('room_number')} />
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
  const [occupation, setOccupation] = useState('Housekeeping Attendant');
  const [loading, setLoading] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const isManagerOccupation = MANAGER_OCCUPATIONS.includes(occupation);
  const derivedDept = DEPT_FROM_OCCUPATION[occupation] || 'Front Office';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const { data: existing } = await supabase.from('staff').select('id').eq('email', email).single();
        if (existing) { alert('Profile already exists. Please login.'); setMode('login'); setLoading(false); return; }
        const { error } = await supabase.from('staff').insert({
          name: fullName,
          staff_id: staffIdNumber,
          email,
          password,
          department: derivedDept,
          occupation,
          approved: false,
          needs_executive_approval: isManagerOccupation,
          logged_in: false,
          tasks_completed: 0,
          tasks_on_time: 0,
          violations: 0,
        });
        if (error) throw error;
        setPendingMessage(
          isManagerOccupation
            ? `Your ${occupation} profile has been submitted for Executive approval.`
            : `Your profile has been submitted for your Department Manager's approval.`
        );
        setShowPending(true);
      } else {
        // LOGIN
        const { data: staffData, error } = await supabase.from('staff').select('*').eq('email', email).eq('password', password).single();
        if (error || !staffData) { alert('Invalid credentials.'); setLoading(false); return; }
        if (!staffData.approved) { alert('ACCESS DENIED: Your account is pending approval.'); setLoading(false); return; }
        const deviceId = getDeviceId();
        if (staffData.device_id && staffData.device_id !== deviceId) { alert('ACCESS DENIED: This account is active on another device.'); setLoading(false); return; }
        await supabase.from('staff').update({ device_id: deviceId, logged_in: true }).eq('id', staffData.id);
        const isManager = MANAGER_OCCUPATIONS.includes(staffData.occupation || '');
        const profile: UserProfile = {
          uid: staffData.id,
          email: staffData.email,
          displayName: staffData.name,
          role: isManager ? 'manager' : 'staff',
          department: (staffData.department as Department) || 'Front Office',
          staffIdNumber: staffData.staff_id,
          occupation: staffData.occupation,
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
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="bg-[#001c36] p-10 text-center border-2 border-gold max-w-lg shadow-xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gold animate-pulse" />
              <ShieldCheck className="w-20 h-20 text-gold mx-auto mb-8" strokeWidth={1} />
              <h2 className="text-3xl font-serif text-white mb-6">Profile Submitted</h2>
              <p className="text-white/70 text-sm font-serif italic mb-10">{pendingMessage}</p>
              <button onClick={onReturnToGuest} className="gold-button w-full py-5 text-sm tracking-[0.3em]">Close & Return</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8 bg-[#001c36] p-6 sm:p-12 shadow-2xl border border-[#C5A059]">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 border border-gold"><ShieldCheck className="w-10 h-10 text-gold" strokeWidth={1} /></div>
          <h1 className="text-2xl sm:text-5xl font-serif tracking-widest text-white uppercase">Sentinel Pro</h1>
          <p className="text-gold text-[8px] uppercase font-bold">Staff Portal</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'register' && (
            <>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Full Name</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="login-input bg-white text-navy" placeholder="Your full name" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Staff ID Number</label>
                <input type="text" required value={staffIdNumber} onChange={e => setStaffIdNumber(e.target.value)} className="login-input bg-white text-navy" placeholder="e.g. HK-001" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Occupation / Role</label>
                <select value={occupation} onChange={e => setOccupation(e.target.value)} className="login-input bg-white text-navy">
                  <optgroup label="── Housekeeping">
                    <option>Housekeeping Attendant</option>
                    <option>Housekeeping Supervisor</option>
                    <option>Housekeeping Manager</option>
                  </optgroup>
                  <optgroup label="── F&B">
                    <option>F&B Waiter</option>
                    <option>F&B Supervisor</option>
                    <option>Chef</option>
                    <option>F&B Manager</option>
                  </optgroup>
                  <optgroup label="── Concierge">
                    <option>Concierge Agent</option>
                    <option>Concierge Supervisor</option>
                    <option>Concierge Manager</option>
                  </optgroup>
                  <optgroup label="── Security">
                    <option>Security Officer</option>
                    <option>Security Supervisor</option>
                    <option>Security Manager</option>
                  </optgroup>
                  <optgroup label="── Front Office">
                    <option>Front Office Agent</option>
                    <option>Front Office Supervisor</option>
                    <option>Maintenance Technician</option>
                    <option>Maintenance Supervisor</option>
                    <option>Front Office Manager</option>
                  </optgroup>
                  <optgroup label="── Executive">
                    <option>Executive</option>
                  </optgroup>
                </select>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[9px] text-white/40">Department:</span>
                  <span className="text-[9px] text-gold font-bold">{derivedDept === 'None' ? 'All Departments' : derivedDept}</span>
                </div>
                {isManagerOccupation && (
                  <p className="text-[9px] text-gold mt-1 font-bold">⚡ Requires Executive approval</p>
                )}
              </div>
            </>
          )}
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Email</label>
            <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="login-input bg-white text-navy" placeholder={t('email')} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="login-input bg-white text-navy" placeholder={t('password')} />
          </div>
          <button type="submit" disabled={loading} className="gold-button w-full">{loading ? '...' : (mode === 'login' ? t('sign_in') : 'Create Profile')}</button>
        </form>
        <div className="text-center space-y-3">
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[10px] font-bold text-gold uppercase tracking-widest block w-full">
            {mode === 'login' ? "Don't have a profile? Create Profile" : "Already have a profile? Login"}
          </button>
          <button onClick={onReturnToGuest} className="text-[10px] text-white/30 uppercase tracking-widest hover:text-white">← Return to Guest Portal</button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── STAFF PORTAL ─────────────────────────────────────────────────────────────
const StaffPortal: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [now, setNow] = useState(Date.now());
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [delayModalTask, setDelayModalTask] = useState<any | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const slaLimits = DEFAULT_SLA;

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const mapRow = (row: any) => ({
    id: row.id,
    roomNumber: row.guest_room || '',
    type: row.service || '',
    message: row.notes,
    department: row.department,
    status: row.status,
    guestId: row.guest_id || '',
    guestName: row.guest_name,
    timestamp: row.created_at,
    assignedStaffName: row.assigned_to,
    delayReason: row.late_reason,
    rating: row.rating,
  });

  const fetchTasks = async () => {
    const dept = userProfile.department;
    let query = supabase.from('requests').select('*').order('created_at', { ascending: false });

    if (dept === 'Security & Safety') {
      query = query.in('department', ['Security & Safety', 'Security']);
    } else {
      query = query.eq('department', dept);
    }

    const { data, error } = await query;
    if (error) { console.error('Staff fetch error:', error); return; }
    if (data) {
      const mapped = data.map(mapRow);
      setTasks(mapped.filter((t: any) => t.status !== 'Completed'));
      setHistory(mapped.filter((t: any) => t.status === 'Completed').slice(0, 30));
    }
  };

  useEffect(() => {
    fetchTasks();
    const channel = supabase.channel(`staff-${userProfile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const dept = (payload.new as any).department;
          if (dept === userProfile.department || (userProfile.department === 'Security & Safety' && dept === 'Security')) {
            setNewOrderAlert(`New Request: Room #${(payload.new as any).guest_room} - ${(payload.new as any).service}`);
            setTimeout(() => setNewOrderAlert(null), 5000);
          }
        }
        fetchTasks();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile]);

  const getElapsed = (ts: any) => { if (!ts) return 0; return Math.floor((now - new Date(ts).getTime()) / 1000); };

  const handleAccept = async (id: string) => {
    await supabase.from('requests').update({ status: 'In Progress', accepted_at: new Date().toISOString(), assigned_to: userProfile.displayName, assigned_to_email: userProfile.email }).eq('id', id);
  };

  const handleComplete = async (task: any) => {
    const elapsed = getElapsed(task.timestamp);
    const limit = (slaLimits[task.department as keyof typeof slaLimits] || 5) * 60;
    if (elapsed > limit) { setDelayModalTask(task); return; }
    await supabase.from('requests').update({ status: 'Completed', closed_at: new Date().toISOString() }).eq('id', task.id);
    // Increment on-time count
    const { data: staffRow } = await supabase.from('staff').select('tasks_completed,tasks_on_time').eq('id', userProfile.uid).single();
    if (staffRow) await supabase.from('staff').update({ tasks_completed: (staffRow.tasks_completed || 0) + 1, tasks_on_time: (staffRow.tasks_on_time || 0) + 1 }).eq('id', userProfile.uid);
  };

  const handleCompleteWithReason = async () => {
    if (!delayReason || !delayModalTask) return;
    await supabase.from('requests').update({ status: 'Completed', closed_at: new Date().toISOString(), late_reason: delayReason }).eq('id', delayModalTask.id);
    // Increment violations
    const { data: staffRow } = await supabase.from('staff').select('tasks_completed,violations').eq('id', userProfile.uid).single();
    if (staffRow) await supabase.from('staff').update({ tasks_completed: (staffRow.tasks_completed || 0) + 1, violations: (staffRow.violations || 0) + 1 }).eq('id', userProfile.uid);
    setDelayModalTask(null);
    setDelayReason('');
  };

  return (
    <div className="w-full pb-24 relative bg-[#001529] min-h-screen text-white">
      {/* Delay Modal */}
      <AnimatePresence>
        {delayModalTask && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#001c36] p-8 max-w-md w-full border-t-4 border-red-600 shadow-2xl">
              <div className="flex items-center gap-3 mb-4"><AlertCircle className="text-red-500" size={28} /><h2 className="text-xl font-serif text-white">SLA Violation — Reason Required</h2></div>
              <p className="text-sm text-white/60 mb-2">Task: <span className="text-gold font-bold">{delayModalTask.type}</span></p>
              <p className="text-sm text-white/60 mb-6">You cannot close this request without selecting a delay reason.</p>
              <select value={delayReason} onChange={e => setDelayReason(e.target.value)} className="w-full p-4 bg-white border border-red-500 mb-6 text-sm text-navy outline-none">
                <option value="">-- Select Reason (Required) --</option>
                {DELAY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex gap-4">
                <button onClick={() => { setDelayModalTask(null); setDelayReason(''); }} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase">Cancel</button>
                <button disabled={!delayReason} onClick={handleCompleteWithReason} className="flex-1 py-3 bg-red-600 text-white text-[10px] font-bold uppercase disabled:opacity-40">Submit & Close</button>
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

      <header className="p-6 bg-navy text-white flex justify-between items-center border-b border-gold/20">
        <div>
          <h1 className="text-2xl font-serif text-gold">{userProfile.displayName}</h1>
          <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">{userProfile.department} · {userProfile.occupation || 'Staff'}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-navy/50 border border-gold/20 p-1">
            <button onClick={() => setActiveTab('active')} className={cn('px-4 py-2 text-[10px] font-bold uppercase', activeTab === 'active' ? 'bg-gold text-navy' : 'text-gold/60')}>Active ({tasks.length})</button>
            <button onClick={() => setActiveTab('history')} className={cn('px-4 py-2 text-[10px] font-bold uppercase', activeTab === 'history' ? 'bg-gold text-navy' : 'text-gold/60')}>History ({history.length})</button>
          </div>
          <button onClick={async () => { await supabase.from('staff').update({ logged_in: false }).eq('id', userProfile.uid); localStorage.clear(); window.location.replace('/'); }} className="p-2 text-gold hover:text-white flex flex-col items-center gap-1">
            <LogOut size={20} /><span className="text-[8px] uppercase font-bold">Logout</span>
          </button>
        </div>
      </header>

      <div className="staff-grid p-6">
        {activeTab === 'active' ? (
          tasks.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <CheckCircle2 className="w-12 h-12 text-gold/20 mx-auto" strokeWidth={1} />
              <p className="text-white/40 font-serif italic mt-4">No active requests. Standing by.</p>
            </div>
          ) : (
            tasks.map(task => {
              const elapsed = getElapsed(task.timestamp);
              const limit = (slaLimits[task.department as keyof typeof slaLimits] || 5) * 60;
              const isViolated = elapsed > limit;
              return (
                <motion.div key={task.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn('staff-task-card bg-[#001c36]', isViolated ? 'border-red-500 bg-red-900/10' : 'border-gold/10')}>
                  {isViolated && (
                    <div className="w-full py-2 px-3 bg-red-600 text-white text-[10px] font-bold uppercase flex items-center gap-2 mb-2 animate-pulse">
                      <AlertCircle size={14} /> SLA EXCEEDED by {Math.floor((elapsed - limit) / 60)}m
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="bg-navy/50 px-3 py-1 text-gold text-[10px] font-bold border border-gold/20">ROOM #{task.roomNumber}</div>
                    <div className={cn('font-mono text-lg font-bold', isViolated ? 'text-red-400' : 'text-white')}>{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <h3 className="text-lg font-serif text-white">{task.type}</h3>
                    <p className={cn('text-[10px] uppercase tracking-widest font-bold', task.status === 'Pending' ? 'text-gold' : 'text-blue-400')}>{task.status}</p>
                    {task.guestName && <p className="text-[9px] text-white/40">Guest: {task.guestName}</p>}
                  </div>
                  {task.message && <div className="bg-navy/30 p-3 border-l-2 border-gold/20 italic text-xs text-white/60 mt-2">"{task.message}"</div>}
                  <div className="mt-3 h-1.5 bg-navy/50 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', isViolated ? 'bg-red-500' : elapsed / limit > 0.8 ? 'bg-orange-400' : 'bg-green-500')} style={{ width: `${Math.min((elapsed / limit) * 100, 100)}%` }} />
                  </div>
                  <div className="pt-3">
                    {task.status === 'Pending' ? (
                      <button onClick={() => handleAccept(task.id)} className="gold-button w-full m-0 py-3">Accept Task</button>
                    ) : (
                      <button onClick={() => handleComplete(task)} className={cn('w-full py-3 font-bold uppercase tracking-widest text-[10px]', isViolated ? 'bg-red-600 text-white' : 'bg-green-600 text-white')}>
                        {isViolated ? '⚠ Close (Reason Required)' : '✓ Mark Completed'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )
        ) : (
          history.length === 0 ? (
            <div className="col-span-full py-20 text-center text-white/20 italic font-serif">No history yet.</div>
          ) : (
            history.map(task => (
              <div key={task.id} className="bg-[#001c36] border border-gold/10 p-4 opacity-70">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase">ROOM #{task.roomNumber}</span>
                  <span className="text-[10px] font-bold text-green-500 uppercase">COMPLETED</span>
                </div>
                <h3 className="text-sm font-serif text-white">{task.type}</h3>
                {task.guestName && <p className="text-[9px] text-white/40 mt-1">Guest: {task.guestName}</p>}
                {task.delayReason && <p className="text-[9px] text-red-400 mt-1 font-bold">Late Reason: {task.delayReason}</p>}
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

// ─── DEPARTMENT MANAGER DASHBOARD ─────────────────────────────────────────────
// Only sees: their dept requests + SLA violations + can approve/reject their dept staff
const DeptManagerDashboard: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'sla' | 'staff'>('requests');
  const [now, setNow] = useState(Date.now());
  const slaLimits = DEFAULT_SLA;

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);

  const fetchData = async () => {
    const dept = profile.department;

    // Fetch requests for this department only
    let reqQuery = supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (dept === 'Security & Safety') {
      reqQuery = reqQuery.in('department', ['Security & Safety', 'Security']);
    } else {
      reqQuery = reqQuery.eq('department', dept);
    }
    const { data: reqData } = await reqQuery;
    if (reqData) setRequests(reqData);

    // Fetch staff for this department only
    const { data: staffData } = await supabase.from('staff')
      .select('*')
      .eq('department', dept)
      .order('created_at', { ascending: false });
    if (staffData) setStaffList(staffData);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel(`deptmgr-${profile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const getSLAExceeded = (req: any) => {
    if (!req.created_at || req.status === 'Completed') return false;
    const elapsed = (now - new Date(req.created_at).getTime()) / 1000;
    const limit = (slaLimits[req.department as keyof typeof slaLimits] || 5) * 60;
    return elapsed > limit;
  };

  const getElapsedMin = (ts: any) => Math.floor((now - new Date(ts).getTime()) / 60000);

  const violations = requests.filter(r => getSLAExceeded(r));
  const pendingStaff = staffList.filter(s => !s.approved && !MANAGER_OCCUPATIONS.includes(s.occupation || ''));
  const approvedStaff = staffList.filter(s => s.approved);

  const approveStaff = async (id: string) => { await supabase.from('staff').update({ approved: true }).eq('id', id); };
  const rejectStaff = async (id: string) => { if (window.confirm('Reject and delete this profile?')) await supabase.from('staff').delete().eq('id', id); };
  const terminateStaff = async (id: string) => { await supabase.from('staff').update({ approved: false, logged_in: false }).eq('id', id); };

  return (
    <div className="min-h-screen bg-[#001529] text-white p-4 sm:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold/20 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-gold">{profile.department} Manager Dashboard</h1>
          <p className="text-gold/60 text-[10px] uppercase tracking-widest mt-1">{profile.displayName} · {profile.occupation}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs */}
          <div className="flex bg-navy border border-gold/20 p-1">
            {[
              { key: 'requests', label: `Requests (${requests.filter(r => r.status !== 'Completed').length})` },
              { key: 'sla', label: `SLA ${violations.length > 0 ? `(${violations.length})` : ''}` },
              { key: 'staff', label: `Staff ${pendingStaff.length > 0 ? `(${pendingStaff.length})` : ''}` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={cn('px-3 py-2 text-[9px] font-bold uppercase tracking-widest', activeTab === tab.key ? 'bg-gold text-navy' : 'text-gold/60 hover:text-gold')}>
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={() => { localStorage.clear(); window.location.replace('/'); }} className="flex items-center gap-2 text-gold/60 hover:text-gold border border-gold/20 px-4 py-2 text-[9px] font-bold uppercase">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* SLA Alert Banner */}
      {violations.length > 0 && (
        <div className="border border-red-600 p-4 flex items-center gap-4 animate-pulse" style={{ background: 'rgba(220,38,38,0.1)' }}>
          <AlertCircle className="text-red-500" size={24} />
          <div>
            <h3 className="text-red-500 font-bold uppercase text-sm">⚠ {violations.length} SLA VIOLATION{violations.length > 1 ? 'S' : ''} IN {profile.department}</h3>
            <p className="text-red-400/80 text-xs">Immediate attention required</p>
          </div>
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif text-gold">{profile.department} — All Requests</h2>
          {requests.length === 0 && <p className="text-white/20 italic font-serif py-12 text-center">No requests yet.</p>}
          {requests.map(req => {
            const over = getSLAExceeded(req);
            return (
              <div key={req.id} className={cn('border p-5', over ? 'border-red-500 bg-red-900/10 animate-pulse' : 'border-gold/10 bg-[#001c36]')}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <span className={cn('text-[10px] font-bold px-2 py-1 border', req.status === 'Completed' ? 'border-green-500 text-green-400' : over ? 'border-red-500 text-red-400' : 'border-gold text-gold')}>{req.status}</span>
                      {over && <span className="text-[10px] font-bold px-2 py-1 bg-red-600 text-white">⚠ SLA EXCEEDED</span>}
                    </div>
                    <p className="text-base font-serif text-white">{req.service}</p>
                    <p className="text-[10px] text-white/40 mt-1">Room {req.guest_room} · {req.guest_name} · {req.assigned_to ? `Staff: ${req.assigned_to}` : 'Unassigned'}</p>
                    {req.late_reason && <p className="text-[10px] text-red-400 mt-1 font-bold">⚠ Late Reason: {req.late_reason}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-[10px] text-white/40">{new Date(req.created_at).toLocaleTimeString()}</p>
                    {over && <p className="text-red-400 font-bold text-xs mt-1">{getElapsedMin(req.created_at)}m elapsed</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SLA TAB */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          <h2 className="text-xl font-serif text-gold">SLA Monitoring — {profile.department}</h2>
          <div className="bg-[#001c36] border border-gold/10 p-6">
            <h3 className="text-lg font-serif text-white mb-4">Currently Delayed Tasks</h3>
            {violations.length === 0 ? (
              <p className="text-green-400 font-bold">✓ All tasks within SLA limits</p>
            ) : (
              <div className="space-y-3">
                {violations.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-red-900/20 border border-red-500 animate-pulse">
                    <div>
                      <p className="text-white font-bold">{req.assigned_to || 'Unassigned'}</p>
                      <p className="text-[10px] text-red-400 uppercase">Room {req.guest_room} · {req.service}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-bold text-lg">{getElapsedMin(req.created_at)}m</p>
                      <p className="text-[9px] text-white/40">SLA: {slaLimits[req.department as keyof typeof slaLimits] || 5}m</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAFF TAB */}
      {activeTab === 'staff' && (
        <div className="bg-[#001c36] border border-gold/10 p-6 space-y-6">
          <h2 className="text-xl font-serif text-gold">{profile.department} Staff Management</h2>

          {/* Pending approvals */}
          {pendingStaff.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-gold mb-4">Pending Approval ({pendingStaff.length})</h3>
              <div className="space-y-3">
                {pendingStaff.map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-4 bg-navy/50 border border-gold/20">
                    <div>
                      <p className="text-white font-bold">{staff.name}</p>
                      <p className="text-[9px] text-gold uppercase font-bold">{staff.occupation} · ID: {staff.staff_id}</p>
                      <p className="text-[9px] text-white/40">{staff.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveStaff(staff.id)} className="px-4 py-2 bg-gold text-navy text-[9px] font-bold uppercase">Approve ✓</button>
                      <button onClick={() => rejectStaff(staff.id)} className="px-4 py-2 bg-red-600 text-white text-[9px] font-bold uppercase">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved staff */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gold mb-4">Approved Staff ({approvedStaff.length})</h3>
            {approvedStaff.length === 0 ? <p className="text-white/20 italic">No approved staff yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-navy/50 text-gold text-[10px] uppercase tracking-widest border-b border-gold/20">
                    <th className="p-4 text-left">Name</th>
                    <th className="p-4 text-left">ID</th>
                    <th className="p-4 text-left">Occupation</th>
                    <th className="p-4 text-center">Tasks</th>
                    <th className="p-4 text-center">Violations</th>
                    <th className="p-4 text-right">Action</th>
                  </tr></thead>
                  <tbody>
                    {approvedStaff.map(staff => (
                      <tr key={staff.id} className="border-b border-gold/10 hover:bg-gold/5">
                        <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold border border-gold/20 text-xs">{staff.name?.[0]}</div><div><p className="text-sm text-white">{staff.name}</p><p className="text-[8px] text-white/40">{staff.email}</p></div></div></td>
                        <td className="p-4 text-xs font-bold text-gold/80">{staff.staff_id || 'N/A'}</td>
                        <td className="p-4 text-xs text-white/60">{staff.occupation}</td>
                        <td className="p-4 text-center text-sm font-bold text-white">{staff.tasks_completed || 0}</td>
                        <td className="p-4 text-center"><span className={cn('text-sm font-bold', (staff.violations || 0) > 0 ? 'text-red-400' : 'text-green-400')}>{staff.violations || 0}</span></td>
                        <td className="p-4 text-right">
                          <button onClick={() => terminateStaff(staff.id)} className="px-3 py-1 bg-orange-600 text-white text-[8px] font-bold uppercase">Terminate</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── EXECUTIVE DASHBOARD ──────────────────────────────────────────────────────
// Sees everything: all depts, all tabs including analytics + leaderboard
const ExecutiveDashboard: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'requests' | 'sla' | 'leaderboard' | 'staff'>('analytics');
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const slaLimits = DEFAULT_SLA;

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);

  const fetchData = async () => {
    const { data: reqData } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (reqData) setRequests(reqData);
    const { data: staffData } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (staffData) setStaffList(staffData);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('executive-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getSLAExceeded = (req: any) => {
    if (!req.created_at || req.status === 'Completed') return false;
    const elapsed = (now - new Date(req.created_at).getTime()) / 1000;
    const limit = (slaLimits[req.department as keyof typeof slaLimits] || 5) * 60;
    return elapsed > limit;
  };
  const getElapsedMin = (ts: any) => Math.floor((now - new Date(ts).getTime()) / 60000);

  const violations = requests.filter(r => getSLAExceeded(r));
  const completed = requests.filter(r => r.status === 'Completed').length;
  const pending = requests.filter(r => r.status !== 'Completed').length;
  const revenue = requests.reduce((s, r) => s + (r.total_price || 0), 0);

  // Manager profiles needing executive approval
  const pendingManagers = staffList.filter(s => !s.approved && MANAGER_OCCUPATIONS.includes(s.occupation || ''));
  // Regular staff (dept managers will handle these, but exec can see all)
  const allPendingStaff = staffList.filter(s => !s.approved && !MANAGER_OCCUPATIONS.includes(s.occupation || ''));
  const approvedStaff = staffList.filter(s => s.approved);

  // Leaderboard
  const leaderboard = approvedStaff
    .filter(s => (s.tasks_completed || 0) > 0)
    .sort((a, b) => {
      const aRate = (a.tasks_on_time || 0) / (a.tasks_completed || 1);
      const bRate = (b.tasks_on_time || 0) / (b.tasks_completed || 1);
      return bRate - aRate;
    });

  const slaViolators = staffList.filter(s => (s.violations || 0) > 0).sort((a, b) => (b.violations || 0) - (a.violations || 0));

  const approveStaff = async (id: string) => { await supabase.from('staff').update({ approved: true }).eq('id', id); };
  const deleteStaff = async (id: string) => { if (window.confirm('Delete this profile?')) await supabase.from('staff').delete().eq('id', id); };
  const terminateStaff = async (id: string) => { await supabase.from('staff').update({ approved: false, logged_in: false }).eq('id', id); };

  const revenueData = [
    { name: 'Mon', fb: 1200, car: 2500, other: 450 },
    { name: 'Tue', fb: 1800, car: 5000, other: 600 },
    { name: 'Wed', fb: 2200, car: 2500, other: 550 },
    { name: 'Thu', fb: 1600, car: 7500, other: 700 },
    { name: 'Fri', fb: 2800, car: 10000, other: 900 },
    { name: 'Sat', fb: 3200, car: 12500, other: 1100 },
    { name: 'Sun', fb: 2400, car: 5000, other: 800 },
  ];

  const generateReport = (type: 'pdf' | 'email' | 'csv') => {
    setReportMenuOpen(false);
    if (type === 'csv') {
      const headers = `Date,Room,Department,Service,Status,Revenue (AED),Delay Reason,Staff\n`;
      const rows = requests.map(r => `${new Date(r.created_at).toLocaleDateString()},${r.guest_room},${r.department},${r.service},${r.status},${r.total_price || 0},${r.late_reason || 'N/A'},${r.assigned_to || 'Unassigned'}`).join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI('data:text/csv;charset=utf-8,' + headers + rows));
      link.setAttribute('download', `SentinelPro_${reportPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } else if (type === 'pdf') {
      const content = `SENTINEL PRO — ${reportPeriod.toUpperCase()} REPORT\nGenerated: ${new Date().toLocaleString()}\n\nKEY METRICS\nTotal Requests: ${requests.length}\nCompleted: ${completed}\nPending: ${pending}\nSLA Violations: ${violations.length}\nRevenue: AED ${revenue.toLocaleString()}\n\nSLA VIOLATIONS\n${violations.map(v => `${v.service} | Room ${v.guest_room} | ${v.department}`).join('\n') || 'None'}\n\nTOP PERFORMERS\n${leaderboard.slice(0, 5).map((s, i) => `${i + 1}. ${s.name} — ${s.tasks_completed} tasks, ${s.violations || 0} violations`).join('\n') || 'No data'}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `SentinelPro_${reportPeriod}_${new Date().toISOString().split('T')[0]}.txt`;
      link.click(); URL.revokeObjectURL(url);
    } else {
      alert(`✅ ${reportPeriod} report sent to all department managers.\n\nRecipients: Housekeeping, F&B, Concierge, Security, Front Office`);
    }
  };

  const totalPending = pendingManagers.length + allPendingStaff.length;

  return (
    <div className="min-h-screen bg-[#001529] text-white p-4 sm:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold/20 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-serif text-gold">Executive Operations Center</h1>
          <p className="text-gold/60 text-[10px] uppercase tracking-widest mt-1">{profile.displayName} · All Departments</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Report Button */}
          <div className="relative">
            <div className="flex items-center bg-navy border border-gold/20">
              <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value as any)} className="bg-transparent text-gold text-[10px] font-bold uppercase px-3 py-2 outline-none">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button onClick={() => setReportMenuOpen(!reportMenuOpen)} className="flex items-center gap-2 bg-gold text-navy px-4 py-2 text-[10px] font-bold uppercase">
                <FileText size={14} /> Report
              </button>
            </div>
            <AnimatePresence>
              {reportMenuOpen && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-52 bg-navy border border-gold/30 shadow-2xl z-50">
                  <button onClick={() => generateReport('pdf')} className="w-full px-5 py-3 text-left text-[10px] uppercase tracking-widest hover:bg-gold/10 flex items-center gap-3 border-b border-gold/10"><Download size={13} className="text-gold" /> Download PDF</button>
                  <button onClick={() => generateReport('email')} className="w-full px-5 py-3 text-left text-[10px] uppercase tracking-widest hover:bg-gold/10 flex items-center gap-3 border-b border-gold/10"><Mail size={13} className="text-gold" /> Email to Departments</button>
                  <button onClick={() => generateReport('csv')} className="w-full px-5 py-3 text-left text-[10px] uppercase tracking-widest hover:bg-gold/10 flex items-center gap-3"><ClipboardList size={13} className="text-gold" /> Export CSV</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Tabs */}
          <div className="flex bg-navy border border-gold/20 p-1 flex-wrap gap-0.5">
            {[
              { key: 'analytics', label: 'Analytics' },
              { key: 'leaderboard', label: 'Leaderboard' },
              { key: 'sla', label: `SLA${violations.length > 0 ? ` (${violations.length})` : ''}` },
              { key: 'requests', label: 'Requests' },
              { key: 'staff', label: `Staff${totalPending > 0 ? ` (${totalPending})` : ''}` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={cn('px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest', activeTab === tab.key ? 'bg-gold text-navy' : 'text-gold/60 hover:text-gold')}>
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={() => { localStorage.clear(); window.location.replace('/'); }} className="flex items-center gap-2 text-gold/60 hover:text-gold border border-gold/20 px-4 py-2 text-[9px] font-bold uppercase">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {violations.length > 0 && (
        <div className="border border-red-600 p-4 flex items-center gap-4 animate-pulse" style={{ background: 'rgba(220,38,38,0.1)' }}>
          <AlertCircle className="text-red-500" size={24} />
          <div>
            <h3 className="text-red-500 font-bold uppercase text-sm">⚠ {violations.length} SLA VIOLATION{violations.length > 1 ? 'S' : ''} ACROSS ALL DEPARTMENTS</h3>
            <div className="flex gap-2 mt-1 flex-wrap">{violations.slice(0, 5).map(v => <span key={v.id} className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5">RM {v.guest_room}</span>)}</div>
          </div>
        </div>
      )}

      {/* ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Revenue (AED)', value: revenue.toLocaleString(), color: '#C5A059' },
              { label: 'Active Requests', value: pending, color: '#C5A059' },
              { label: 'Completed', value: completed, color: '#4CAF50' },
              { label: 'SLA Violations', value: violations.length, color: violations.length > 0 ? '#EF4444' : '#4CAF50' },
            ].map(k => (
              <div key={k.label} className="bg-[#001c36] border border-gold/10 p-6 text-center">
                <div className="text-4xl font-serif mb-2" style={{ color: k.color }}>{k.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{k.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#001c36] border border-gold/10 p-6">
            <h3 className="text-lg font-serif text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-gold" /> Revenue — {reportPeriod}</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#C5A05920" vertical={false} />
                  <XAxis dataKey="name" stroke="#FFF" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#FFF', fontWeight: 'bold' }} />
                  <YAxis stroke="#FFF" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#FFF', fontWeight: 'bold' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#002349', border: '1px solid #C5A059' }} itemStyle={{ color: '#FFF', fontWeight: 'bold' }} />
                  <Bar dataKey="fb" name="F&B" stackId="a" fill="#C5A059" />
                  <Bar dataKey="car" name="Luxury Car" stackId="a" fill="#FFD700" />
                  <Bar dataKey="other" name="Other" stackId="a" fill="#6B7280" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-[#001c36] border border-gold/10 p-6">
            <h3 className="text-lg font-serif text-white mb-4 flex items-center gap-2"><Star size={18} className="text-gold" /> Guest Feedback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.filter(r => r.rating).map(req => (
                <div key={req.id} className="bg-navy/30 p-4 border border-gold/10">
                  <div className="flex gap-1 mb-2">{[...Array(5)].map((_, i) => <Star key={i} size={12} className={cn(i < (req.rating || 0) ? 'text-gold fill-gold' : 'text-white/10')} />)}</div>
                  <p className="text-xs italic text-white/80 mb-2">"{req.feedback || 'No comment'}"</p>
                  <p className="text-[9px] text-gold font-bold uppercase">Room #{req.guest_room} · {req.service}</p>
                </div>
              ))}
              {requests.filter(r => r.rating).length === 0 && <p className="col-span-full text-white/20 italic font-serif py-8 text-center">No feedback yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-[#001c36] border border-gold/10 p-6 space-y-4">
          <h2 className="text-2xl font-serif text-gold">Staff Performance Leaderboard</h2>
          <p className="text-white/40 text-xs uppercase">Ranked by on-time completion rate · All Departments</p>
          {leaderboard.length === 0 ? <p className="text-white/20 italic font-serif py-12 text-center">No completed tasks yet.</p> : (
            <div className="space-y-3">
              {leaderboard.map((staff, idx) => {
                const rate = Math.round(((staff.tasks_on_time || 0) / (staff.tasks_completed || 1)) * 100);
                return (
                  <div key={staff.id} className={cn('flex items-center gap-4 p-4 border', idx === 0 ? 'border-gold bg-gold/5' : 'border-gold/10 bg-navy/20')}>
                    <div className="text-2xl w-8 text-center">{['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`}</div>
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold border border-gold/20 flex-shrink-0">{staff.name?.[0]}</div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{staff.name}</p>
                      <p className="text-[9px] text-gold uppercase">{staff.occupation} · {staff.department}</p>
                    </div>
                    <div className="text-center px-3"><p className="text-lg font-serif text-green-400">{rate}%</p><p className="text-[8px] text-white/40 uppercase">On Time</p></div>
                    <div className="text-center px-3"><p className="text-lg font-serif text-gold">{staff.tasks_completed || 0}</p><p className="text-[8px] text-white/40 uppercase">Tasks</p></div>
                    <div className="text-center px-3"><p className={cn('text-lg font-serif', (staff.violations || 0) > 0 ? 'text-red-400' : 'text-green-400')}>{staff.violations || 0}</p><p className="text-[8px] text-white/40 uppercase">Violations</p></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SLA */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          <h2 className="text-xl font-serif text-gold">SLA Monitoring — All Departments</h2>
          <div className="bg-[#001c36] border border-gold/10 p-6">
            <h3 className="text-lg font-serif text-white mb-4">Currently Delayed Tasks</h3>
            {violations.length === 0 ? <p className="text-green-400 font-bold">✓ All tasks within SLA</p> : (
              <div className="space-y-3">
                {violations.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-red-900/20 border border-red-500 animate-pulse">
                    <div>
                      <p className="text-white font-bold">{req.assigned_to || 'Unassigned'}</p>
                      <p className="text-[10px] text-red-400 uppercase">{req.department} · Room {req.guest_room}</p>
                      <p className="text-[10px] text-white/60">{req.service}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-bold text-lg">{getElapsedMin(req.created_at)}m</p>
                      <p className="text-[9px] text-red-400 font-bold">+{getElapsedMin(req.created_at) - (slaLimits[req.department as keyof typeof slaLimits] || 5)}m OVER</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#001c36] border border-gold/10 p-6">
            <h3 className="text-lg font-serif text-white mb-4">Staff Violation History</h3>
            {slaViolators.length === 0 ? <p className="text-green-400 font-bold">✓ No violations recorded</p> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-navy/50 text-gold text-[10px] uppercase tracking-widest border-b border-gold/20">
                    <th className="p-4 text-left">Staff</th><th className="p-4 text-left">Dept</th><th className="p-4 text-left">Occupation</th><th className="p-4 text-center">Tasks</th><th className="p-4 text-center">Violations</th><th className="p-4 text-center">Rate</th>
                  </tr></thead>
                  <tbody>
                    {slaViolators.map(staff => {
                      const rate = (staff.tasks_completed || 0) > 0 ? Math.round(((staff.violations || 0) / staff.tasks_completed) * 100) : 0;
                      return (
                        <tr key={staff.id} className="border-b border-gold/10 hover:bg-red-900/10">
                          <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 font-bold border border-red-500/30 text-xs">{staff.name?.[0]}</div><div><p className="text-sm text-white">{staff.name}</p><p className="text-[9px] text-white/40">{staff.email}</p></div></div></td>
                          <td className="p-4 text-xs text-white/60 uppercase">{staff.department}</td>
                          <td className="p-4 text-xs text-white/60">{staff.occupation}</td>
                          <td className="p-4 text-center text-sm font-bold text-white">{staff.tasks_completed || 0}</td>
                          <td className="p-4 text-center"><span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">{staff.violations || 0}</span></td>
                          <td className="p-4 text-center"><span className={cn('text-sm font-bold', rate > 30 ? 'text-red-400' : rate > 15 ? 'text-orange-400' : 'text-yellow-400')}>{rate}%</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif text-gold">All Department Requests</h2>
          {requests.length === 0 && <p className="text-white/20 italic font-serif py-12 text-center">No requests yet.</p>}
          {requests.map(req => {
            const over = getSLAExceeded(req);
            return (
              <div key={req.id} className={cn('border p-5', over ? 'border-red-500 bg-red-900/10 animate-pulse' : 'border-gold/10 bg-[#001c36]')}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <span className={cn('text-[10px] font-bold px-2 py-1 border', req.status === 'Completed' ? 'border-green-500 text-green-400' : over ? 'border-red-500 text-red-400' : 'border-gold text-gold')}>{req.status}</span>
                      <span className="text-[10px] font-bold px-2 py-1 border border-gold/30 text-white/60">{req.department}</span>
                      {over && <span className="text-[10px] font-bold px-2 py-1 bg-red-600 text-white">⚠ SLA EXCEEDED</span>}
                    </div>
                    <p className="text-base font-serif text-white">{req.service}</p>
                    <p className="text-[10px] text-white/40 mt-1">Room {req.guest_room} · {req.guest_name} · {req.assigned_to ? `Staff: ${req.assigned_to}` : 'Unassigned'}</p>
                    {req.late_reason && <p className="text-[10px] text-red-400 mt-1 font-bold">⚠ Late: {req.late_reason}</p>}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-[10px] text-white/40">{new Date(req.created_at).toLocaleTimeString()}</p>
                    {req.total_price && <p className="text-gold font-bold text-sm">{req.total_price} AED</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STAFF */}
      {activeTab === 'staff' && (
        <div className="bg-[#001c36] border border-gold/10 p-6 space-y-8">
          <h2 className="text-xl font-serif text-gold">Executive Staff Approval Center</h2>

          {/* Manager approvals - Executive only sees these */}
          {pendingManagers.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-gold mb-4 flex items-center gap-2"><ShieldCheck size={14} /> Manager Profiles Awaiting Your Approval ({pendingManagers.length})</h3>
              <div className="space-y-3">
                {pendingManagers.map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-4 bg-gold/5 border border-gold/30">
                    <div>
                      <p className="text-white font-bold">{staff.name}</p>
                      <p className="text-[9px] text-gold uppercase font-bold">{staff.occupation} · {staff.department} · ID: {staff.staff_id}</p>
                      <p className="text-[9px] text-white/40">{staff.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveStaff(staff.id)} className="px-4 py-2 bg-gold text-navy text-[9px] font-bold uppercase">Approve ✓</button>
                      <button onClick={() => deleteStaff(staff.id)} className="px-4 py-2 bg-red-600 text-white text-[9px] font-bold uppercase">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All approved staff overview */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gold mb-4">All Approved Staff ({approvedStaff.length})</h3>
            {approvedStaff.length === 0 ? <p className="text-white/20 italic">No approved staff yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-navy/50 text-gold text-[10px] uppercase tracking-widest border-b border-gold/20">
                    <th className="p-4 text-left">Name</th><th className="p-4 text-left">ID</th><th className="p-4 text-left">Occupation</th><th className="p-4 text-left">Dept</th><th className="p-4 text-center">Tasks</th><th className="p-4 text-center">Violations</th><th className="p-4 text-right">Action</th>
                  </tr></thead>
                  <tbody>
                    {approvedStaff.map(staff => (
                      <tr key={staff.id} className="border-b border-gold/10 hover:bg-gold/5">
                        <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold border border-gold/20 text-xs">{staff.name?.[0]}</div><div><p className="text-sm text-white">{staff.name}</p><p className="text-[8px] text-white/40">{staff.email}</p></div></div></td>
                        <td className="p-4 text-xs font-bold text-gold/80">{staff.staff_id || 'N/A'}</td>
                        <td className="p-4 text-xs text-white/60">{staff.occupation}</td>
                        <td className="p-4 text-xs uppercase text-white/60">{staff.department}</td>
                        <td className="p-4 text-center text-sm font-bold text-white">{staff.tasks_completed || 0}</td>
                        <td className="p-4 text-center"><span className={cn('text-sm font-bold', (staff.violations || 0) > 0 ? 'text-red-400' : 'text-green-400')}>{staff.violations || 0}</span></td>
                        <td className="p-4 text-right"><div className="flex justify-end gap-2">
                          <button onClick={() => terminateStaff(staff.id)} className="px-3 py-1 bg-orange-600 text-white text-[8px] font-bold uppercase">Terminate</button>
                          <button onClick={() => deleteStaff(staff.id)} className="px-3 py-1 bg-red-600 text-white text-[8px] font-bold uppercase">Delete</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestTab, setGuestTab] = useState<'services' | 'room-service' | 'restaurant-bookings' | 'concierge'>('services');
  const [requests, setRequests] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [feedbackRequest, setFeedbackRequest] = useState<any | null>(null);
  const [roomNumber] = useState(roomNumberFromUrl || '402');
  const [pathname, setPathname] = useState(window.location.pathname);
  const { language, t, isRTL } = useLanguage();

  useEffect(() => {
    const handlePop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('sentinel_local_session');
    if (saved) { try { setProfile(JSON.parse(saved)); } catch { localStorage.removeItem('sentinel_local_session'); } }
    setLoading(false);
  }, []);

  // Fetch guest requests
  useEffect(() => {
    if (!profile || profile.role !== 'guest') return;
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('guest_id', profile.uid)
        .order('created_at', { ascending: false });

      if (error) { console.error('Guest requests error:', error); return; }
      if (data) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          roomNumber: row.guest_room || '',
          type: row.service || '',
          message: row.notes,
          department: row.department,
          status: row.status,
          guestId: row.guest_id,
          timestamp: row.created_at,
          totalPrice: row.total_price,
          rating: row.rating,
          feedbackComment: row.feedback,
          feedbackDismissed: row.feedback_dismissed,
          assignedStaffName: row.assigned_to,
        }));
        setRequests(mapped);
        const unrated = mapped.find((r: any) => r.status === 'Completed' && !r.rating && !r.feedbackDismissed);
        if (unrated) setFeedbackRequest(unrated);
      }
    };
    fetchRequests();
    const channel = supabase.channel(`guest-${profile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchRequests)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const logout = () => { localStorage.clear(); setProfile(null); window.location.replace('/'); };

  const submitRequest = async (customData?: any) => {
    if (!profile || !roomNumber) return;
    const service = customData?.type ? customData : selectedService;
    if (!service) return;
    const menuPrices: { [k: string]: number } = { b1: 145, b2: 95, a1: 125, a2: 245, a3: 185, d1: 65, d2: 28, d3: 45 };
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
      setShowRequestModal(false);
      setMessage('');
      setSelectedService(null);
      setCart({});
      setDietaryRequirements('');
      setGuestTab('services');
      alert(t('registration_submitted_successfully'));
    } catch (e: any) { alert(e.message); }
  };

  const submitFeedback = async (rating: number, comment: string) => {
    if (!feedbackRequest) return;
    await supabase.from('requests').update({ rating, feedback: comment }).eq('id', feedbackRequest.id);
    setFeedbackRequest(null);
  };

  const navigateToStaff = () => { window.history.pushState({}, '', '/staff-portal'); setPathname('/staff-portal'); };

  // Determine which dashboard to show for manager role
  const isExecutive = profile?.role === 'manager' && profile?.department === 'None';
  const isDeptManager = profile?.role === 'manager' && profile?.department !== 'None';

  if (loading) return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-gold font-serif text-2xl animate-pulse">Loading...</div>
    </div>
  );

  return (
    <div className={cn('main-content', isRTL && 'rtl', profile?.role === 'manager' && 'manager-dark-mode')}>
      <GlobalLanguageSelector />
      {profile && profile.role === 'guest' && (
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

            ) : isExecutive ? (
              <motion.div key="executive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ExecutiveDashboard profile={profile} />
              </motion.div>

            ) : isDeptManager ? (
              <motion.div key="deptmgr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DeptManagerDashboard profile={profile} />
              </motion.div>

            ) : profile.role === 'staff' ? (
              <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <StaffPortal userProfile={profile} />
              </motion.div>

            ) : (
              // GUEST
              <motion.div key="guest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {guestTab === 'services' && (
                  <>
                    <div className="bg-navy p-6 sm:p-12 shadow-2xl mb-8 sm:mb-16">
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

                    {/* Guest request tracker */}
                    {requests.length > 0 && (
                      <section className="mt-12 space-y-4 px-4">
                        <h2 className="text-sm font-bold text-gold uppercase tracking-[0.2em] border-b border-gold/20 pb-2">Your Requests</h2>
                        <div className="divide-y divide-navy/10">
                          {requests.map(req => (
                            <div key={req.id} className="flex items-center justify-between py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn('w-8 h-8 flex items-center justify-center rounded-full', req.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-gold/5 text-gold')}>
                                  {req.status === 'Completed' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                </div>
                                <div>
                                  <span className="text-navy font-bold text-sm font-serif block">{req.type}</span>
                                  {req.status === 'In Progress' && req.assignedStaffName && (
                                    <span className="text-[8px] text-blue-600 font-bold uppercase animate-pulse">{req.assignedStaffName} is on the way!</span>
                                  )}
                                  {req.totalPrice && <span className="text-[9px] text-gold font-bold block">AED {req.totalPrice.toLocaleString()}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn('text-[10px] uppercase tracking-widest font-bold', req.status === 'Completed' ? 'text-green-600' : req.status === 'In Progress' ? 'text-blue-600' : 'text-navy/40')}>{req.status}</span>
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
                  <RoomService
                    cart={cart}
                    updateCart={(id, delta) => setCart(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }))}
                    onSubmit={notes => submitRequest({ type: t('room_service'), serviceKey: 'room_service', dept: 'F&B', notes })}
                  />
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

      <AnimatePresence>
        {feedbackRequest && (
          <FeedbackModal
            request={feedbackRequest}
            onClose={async () => {
              await supabase.from('requests').update({ feedback_dismissed: true }).eq('id', feedbackRequest.id);
              setFeedbackRequest(null);
            }}
            onSubmit={submitFeedback}
          />
        )}
      </AnimatePresence>

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
                        <button key={opt} onClick={() => setMessage(opt)} className={cn('w-full p-4 text-left border transition-all text-sm', message === opt ? 'border-gold bg-gold/5 text-navy' : 'border-navy/10 text-navy/60')}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <textarea value={dietaryRequirements} onChange={e => setDietaryRequirements(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
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
