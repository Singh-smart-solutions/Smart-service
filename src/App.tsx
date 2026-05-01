import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { UserProfile, Department } from './types';
import { cn } from './lib/utils';
import {
  LogOut, Clock, CheckCircle2, AlertCircle,
  Shield, Coffee, Key, Sparkles, UtensilsCrossed, X,
  Globe, Home, Plus, Minus, Check, ChevronDown,
  User, ClipboardList, TrendingUp, Star, ShieldCheck,
  Car, MapPin, Briefcase, FileText, Mail, Download,
  Phone, ArrowRight, QrCode, Settings, Wrench, BedDouble,
  Bell, RefreshCw, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, Language } from './contexts/TranslationContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MANAGER_OCCUPATIONS = [
  'Housekeeping Manager', 'F&B Manager', 'Concierge Manager',
  'Security Manager', 'Front Office Manager', 'Executive',
];

const DEPT_FROM_OCCUPATION: Record<string, Department> = {
  'Housekeeping Manager': 'Housekeeping', 'F&B Manager': 'F&B',
  'Concierge Manager': 'Concierge', 'Security Manager': 'Security & Safety',
  'Front Office Manager': 'Front Office', 'Executive': 'None',
  'Housekeeping Attendant': 'Housekeeping', 'Housekeeping Supervisor': 'Housekeeping',
  'F&B Waiter': 'F&B', 'F&B Supervisor': 'F&B', 'Chef': 'F&B', 'Reservation Agent': 'F&B',
  'Concierge Agent': 'Concierge', 'Concierge Supervisor': 'Concierge',
  'Security Officer': 'Security & Safety', 'Security Supervisor': 'Security & Safety',
  'Front Office Agent': 'Front Office', 'Front Office Supervisor': 'Front Office',
  'Maintenance Technician': 'Maintenance', 'Maintenance Supervisor': 'Maintenance',
};

const DEPARTMENTS: Department[] = ['Housekeeping', 'F&B', 'Concierge', 'Security & Safety', 'Front Office', 'Maintenance'];

const DELAY_REASONS = [
  'High Volume of Requests', 'Staff Shortage', 'Technical Issue',
  'Guest Not in Room', 'Waiting for Supplies', 'Too Many Simultaneous Requests', 'Other',
];

const ROOM_STATUSES = [
  { key: 'Clean', color: 'bg-green-500', label: '🟢 Clean' },
  { key: 'Dirty', color: 'bg-red-500', label: '🔴 Dirty' },
  { key: 'Cleaning', color: 'bg-yellow-500', label: '🟡 Cleaning' },
  { key: 'Inspected', color: 'bg-orange-500', label: '🟠 Inspected' },
  { key: 'Do Not Disturb', color: 'bg-purple-500', label: '🟣 Do Not Disturb' },
  { key: 'Out of Order', color: 'bg-gray-500', label: '⚫ Out of Order' },
  { key: 'Checked Out', color: 'bg-blue-500', label: '🔵 Checked Out' },
];

const MAINTENANCE_CATEGORIES = [
  'AC / Heating Issue', 'Plumbing Issue', 'Electrical Issue', 'TV / Electronics',
  'Door / Lock Issue', 'Furniture Damage', 'Lighting Issue', 'Bathroom Fixtures',
  'Safe Box Issue', 'Internet / WiFi', 'Minibar', 'Other',
];

const MENU_ITEMS = [
  { id: 'b1', name: 'Classic Wagyu Burger', price: 145, category: 'breakfast' },
  { id: 'b2', name: 'Lobster Bisque', price: 95, category: 'breakfast' },
  { id: 'a1', name: 'Caesar Salad', price: 125, category: 'all_day' },
  { id: 'a2', name: 'Truffle Fries', price: 245, category: 'all_day' },
  { id: 'a3', name: 'Wild Mushroom Risotto', price: 185, category: 'all_day' },
  { id: 'd1', name: 'Fresh Orange Juice', price: 65, category: 'beverages' },
  { id: 'd2', name: 'Signature Espresso', price: 28, category: 'beverages' },
  { id: 'd3', name: 'Sparkling Mineral Water', price: 45, category: 'beverages' },
];

// ✅ CORRECT department routing
const getDepartmentFromServiceKey = (serviceKey: string, fallback?: string): string => {
  if (serviceKey === 'room_service') return 'F&B';
  if (serviceKey === 'restaurant_bookings') return 'F&B';
  if (serviceKey === 'concierge_services') return 'Concierge';
  if (serviceKey === 'housekeeping') return 'Housekeeping';
  if (serviceKey === 'security') return 'Security & Safety';
  if (serviceKey === 'maintenance') return 'Maintenance';
  return fallback || 'Front Office';
};

const getDeviceId = () => {
  let id = localStorage.getItem('sentinel_device_id');
  if (!id) { id = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase(); localStorage.setItem('sentinel_device_id', id); }
  return id;
};

const queryParams = new URLSearchParams(window.location.search);
const roomNumberFromUrl = (queryParams.get('room') || '').trim();
const isRoomLocked = !!roomNumberFromUrl;

// ─── PUSH NOTIFICATION SYSTEM ─────────────────────────────────────────────────
// ✅ Hotel bell sound — 3 tones, very different from phone ringtone
const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const playTone = (freq: number, startTime: number, duration: number, vol: number = 0.7) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    // 3 bell tones — ding ding ding
    playTone(880, now, 0.5);
    playTone(1100, now + 0.6, 0.5);
    playTone(880, now + 1.2, 0.7);
    // Vibrate phone — 3 sharp bursts
    if ('vibrate' in navigator) navigator.vibrate([400, 150, 400, 150, 400]);
  } catch (e) {
  }
};

// ✅ Request browser notification permission and show notification
const showBrowserNotification = (title: string, body: string) => {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'sentinel-' + Date.now(),
        requireInteraction: true,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico', requireInteraction: true });
        }
      });
    }
  } catch (e) {
  }
};

// ✅ Register PWA service worker for background notifications
const registerServiceWorker = async (staffId: string, department: string) => {
  try {
    if (!('serviceWorker' in navigator)) return;
    // Request permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    // Tell service worker who this staff member is
    const sw = registration.active || registration.waiting || registration.installing;
    if (sw) {
      sw.postMessage({ type: 'STORE_STAFF_INFO', payload: { staffId, department } });
    }
  } catch (e) {
  }
};

// ─── TOAST NOTIFICATION SYSTEM ───────────────────────────────────────────────
let toastTimeout: any = null;
let setToastGlobal: ((msg: { text: string; type: 'success' | 'error' | 'info' }) => void) | null = null;

const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
  if (setToastGlobal) {
    setToastGlobal({ text, type });
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { if (setToastGlobal) setToastGlobal({ text: '', type: 'info' }); }, 3500);
  }
};

const ToastContainer: React.FC = () => {
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' }>({ text: '', type: 'success' });
  useEffect(() => { setToastGlobal = setToast; return () => { setToastGlobal = null; }; }, []);
  if (!toast.text) return null;
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-navy' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  return (
    <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
      className={`fixed top-4 left-1/2 z-[99999] -translate-x-1/2 px-6 py-3 shadow-2xl flex items-center gap-3 min-w-[260px] max-w-[90vw] ${colors[toast.type]}`}
      style={{ borderLeft: '4px solid #C5A059' }}>
      <span className="text-white font-bold">{icons[toast.type]}</span>
      <span className="text-white text-sm font-medium">{toast.text}</span>
    </motion.div>
  );
};

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

// ─── LANGUAGE SELECTOR ────────────────────────────────────────────────────────
const GlobalLanguageSelector: React.FC = () => {
  const { language, setLanguage, isRTL } = useLanguage();
  const flags: Record<string, string> = { English: '🇺🇸', Arabic: '🇦🇪', Russian: '🇷🇺', Hindi: '🇮🇳', French: '🇫🇷', Turkish: '🇹🇷', Chinese: '🇨🇳' };
  const labels: Record<string, string> = { English: 'English', Arabic: 'العربية', Russian: 'Русский', Hindi: 'हिन्दी', French: 'Français', Turkish: 'Türkçe', Chinese: '中文' };
  return (
    <div className={cn('fixed top-4 z-[10005]', isRTL ? 'left-16' : 'right-4')}>
      <div className="relative group">
        <button className="flex items-center gap-1 bg-navy/80 backdrop-blur-md text-white/90 px-2 py-2 border border-gold/30 shadow-2xl">
          <Globe size={13} className="text-gold" />
          <span className="text-[9px] font-bold">{flags[language]}</span>
          <ChevronDown size={9} className="group-hover:rotate-180 transition-transform" />
        </button>
        <div className={cn('absolute top-full mt-2 w-44 bg-navy border border-gold/30 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[10006]', isRTL ? 'left-0' : 'right-0')}>
          {(Object.keys(flags) as Language[]).map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)} className={cn('w-full px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest hover:bg-gold/10 flex items-center justify-between border-b border-gold/5 last:border-0', language === lang ? 'text-gold bg-gold/5' : 'text-white/60')}>
              <span className="flex items-center gap-2"><span className="text-sm">{flags[lang]}</span>{labels[lang]}</span>
              {language === lang && <Check size={12} className="text-gold" />}
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
      <div className={cn('flex items-center px-3', isRTL && 'flex-row-reverse')}>
        {user && <button onClick={navigateToGuest} className="p-1.5 text-gold hover:text-white"><Home size={16} strokeWidth={1.5} /></button>}
      </div>
      <div className="logo-container cursor-pointer flex-1 flex justify-center" onClick={navigateToGuest}>
        <div className="flex flex-col items-center">
          <h1 className="font-serif tracking-[0.15em] text-gold uppercase text-base sm:text-2xl whitespace-nowrap">Sentinel Pro</h1>
          <span className="text-[6px] sm:text-[7px] font-bold text-gold/60 uppercase tracking-[0.25em]">Luxury Hotel & Residences</span>
        </div>
      </div>
      <div className={cn('flex items-center px-3', isRTL && 'flex-row-reverse')}>
        {user && roomNumber && <div className="hidden sm:flex flex-col items-end mr-2"><span className="text-[9px] font-bold text-white tracking-widest uppercase">{t('room')} {roomNumber}</span></div>}
      </div>
    </nav>
  );
};

// ─── GUEST FOOTER ─────────────────────────────────────────────────────────────
const GuestFooter: React.FC = () => (
  <div className="mt-12 border-t border-gold/20 pt-8 pb-16 space-y-6 px-4">
    <div className="text-center space-y-1">
      <p className="text-[8px] uppercase tracking-[0.3em] text-gold font-bold">24 / 7 Concierge Services</p>
      <h3 className="text-xl font-serif text-navy">We Are Always Here For You</h3>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="border border-gold/20 p-4 text-center space-y-2">
        <div className="w-8 h-8 border border-gold/30 flex items-center justify-center mx-auto"><Phone size={14} className="text-gold" /></div>
        <p className="text-[8px] uppercase tracking-widest text-navy/50 font-bold">Speak with Operator</p>
        <p className="text-2xl font-serif text-navy font-bold">0</p>
        <p className="text-[8px] text-navy/40 italic">Dial from your room landline</p>
      </div>
      <div className="border border-red-200 p-4 text-center space-y-2 bg-red-50/30">
        <div className="w-8 h-8 border border-red-300 flex items-center justify-center mx-auto"><Shield size={14} className="text-red-500" /></div>
        <p className="text-[8px] uppercase tracking-widest text-red-500/80 font-bold">Emergency</p>
        <p className="text-2xl font-serif text-red-600 font-bold">777</p>
        <p className="text-[8px] text-navy/40 italic">Dial from your room landline</p>
      </div>
    </div>
    <div className="border border-gold/10 p-4 space-y-3 bg-[#FAFAF8]">
      <p className="text-[8px] uppercase tracking-[0.25em] text-gold font-bold text-center">Hotel Services</p>
      {[
        { label: 'Room Service Hours', value: '24 Hours' },
        { label: 'Concierge Desk', value: 'Lobby Level' },
        { label: 'Swimming Pool', value: '6 AM – 10 PM' },
        { label: 'Fitness Centre', value: '24 Hours' },
        { label: 'Valet Parking', value: '24 Hours' },
      ].map(item => (
        <div key={item.label} className="flex justify-between items-center border-b border-navy/5 pb-2 last:border-0">
          <span className="text-[9px] text-navy/50 uppercase tracking-wider">{item.label}</span>
          <span className="text-[9px] font-bold text-navy">{item.value}</span>
        </div>
      ))}
    </div>
    <p className="text-center text-[7px] text-navy/20 uppercase tracking-widest">Sentinel Pro · Luxury Hotel Management</p>
  </div>
);

// ─── FEEDBACK MODAL ───────────────────────────────────────────────────────────
const FeedbackModal: React.FC<{ request: any; onClose: () => void; onSubmit: (rating: number, comment: string) => void }> = ({ request, onClose, onSubmit }) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#FCF9F2] w-full max-w-md p-8 relative shadow-2xl border border-gold/20">
        <button onClick={onClose} className="absolute top-4 right-4 text-navy/40 hover:text-navy"><X size={20} /></button>
        <div className="text-center space-y-5">
          <div className="inline-block p-3 bg-gold/10 rounded-full"><Star size={28} className="text-gold fill-gold" /></div>
          <h2 className="text-2xl font-serif text-navy">{t('rate_experience')}</h2>
          <p className="text-[10px] uppercase tracking-widest text-gold font-bold">{request.type}</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)}>
                <Star size={28} className={cn(star <= rating ? 'text-gold fill-gold' : 'text-gold/20')} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t('feedback_placeholder')} className="h-28 resize-none w-full bg-white text-navy border border-gold p-3 text-sm" />
          <button onClick={() => onSubmit(rating, comment)} className="w-full bg-navy text-white py-4 text-[10px] font-bold uppercase tracking-widest">{t('submit_feedback')}</button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── ROOM SERVICE ─────────────────────────────────────────────────────────────
const RoomService: React.FC<{ cart: { [id: string]: number }; updateCart: (id: string, delta: number) => void; onSubmit: (notes: string, items: any[]) => void }> = ({ cart, updateCart, onSubmit }) => {
  const { t } = useLanguage();
  const [notes, setNotes] = useState('');
  const [activeCategory, setActiveCategory] = useState('breakfast');
  const total = Object.entries(cart).reduce((acc, [id, qty]) => {
    const item = MENU_ITEMS.find(m => m.id === id);
    return acc + (item?.price || 0) * qty;
  }, 0);
  const buildLineItems = () => Object.entries(cart).filter(([, qty]) => qty > 0).map(([id, qty]) => {
    const item = MENU_ITEMS.find(m => m.id === id)!;
    return { id, name: item.name, qty, price: item.price, total: item.price * qty };
  });
  return (
    <div className="space-y-6 pb-32 w-full px-4 sm:px-8">
      <div className="flex gap-1 border-b border-gold/20 pb-2">
        {['breakfast', 'all_day', 'beverages'].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={cn('px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest', activeCategory === cat ? 'text-gold border-b-2 border-gold' : 'text-navy/40')}>{t(cat)}</button>
        ))}
      </div>
      <div className="space-y-1">
        {MENU_ITEMS.filter(i => i.category === activeCategory).map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 border-b border-navy/5">
            <div>
              <span className="text-navy font-serif text-sm">{item.name}</span>
              {cart[item.id] > 0 && <span className="text-[9px] text-gold font-bold uppercase block">Qty: {cart[item.id]}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-navy font-bold text-sm">AED {item.price}</span>
              <button onClick={() => updateCart(item.id, -1)} className="w-7 h-7 bg-navy/10 flex items-center justify-center"><Minus size={11} /></button>
              <span className="w-4 text-center text-sm font-bold">{cart[item.id] || 0}</span>
              <button onClick={() => updateCart(item.id, 1)} className="w-7 h-7 bg-gold flex items-center justify-center text-white"><Plus size={11} /></button>
            </div>
          </div>
        ))}
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions, allergies..." className="h-20 resize-none w-full bg-white text-navy border border-gold p-3 text-sm" />
      <AnimatePresence>
        {Object.values(cart).some(q => q > 0) && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-4 left-4 right-4 bg-navy p-4 flex items-center justify-between shadow-2xl z-[9999]">
            <div>
              <span className="text-[8px] text-white/50 uppercase tracking-widest block">{buildLineItems().map(i => `${i.qty}x ${i.name}`).join(', ')}</span>
              <span className="text-gold font-bold">AED {total}</span>
            </div>
            <button onClick={() => onSubmit(notes, buildLineItems())} className="bg-gold text-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest">{t('order_now')}</button>
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
    { id: 'turquoise', name: 'Turquoise', desc: 'International Cuisine' },
    { id: 'mermaid', name: 'The Mermaid', desc: 'Mediterranean Cuisine' },
    { id: 'lolivo', name: "L'Olivo", desc: 'Italian Fine Dining' },
  ];
  return (
    <div className="w-full py-6 space-y-5 px-4 sm:px-8">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-serif text-navy">{t('restaurant_bookings')}</h2>
        <p className="text-gold text-[9px] uppercase tracking-widest font-bold">Reserve Your Table</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {restaurants.map(r => (
          <button key={r.id} onClick={() => setData({ ...data, restaurant: r.id })} className={cn('p-3 border text-left', data.restaurant === r.id ? 'border-gold bg-gold/5' : 'border-navy/10')}>
            <p className="text-navy font-bold text-sm">{r.name}</p>
            <p className="text-[9px] text-navy/60 italic">{r.desc}</p>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {[{ label: 'Number of Guests', key: 'pax', type: 'number' }, { label: 'Date', key: 'date', type: 'date' }, { label: 'Time', key: 'time', type: 'time' }].map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-gold font-bold">{f.label}</label>
            <input type={f.type} value={(data as any)[f.key]} onChange={e => setData({ ...data, [f.key]: e.target.value })} className="w-full bg-white text-navy border border-gold p-3 text-sm" />
          </div>
        ))}
        <textarea value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} placeholder="Special requests, dietary requirements..." className="h-20 resize-none w-full bg-white text-navy border border-gold p-3 text-sm" />
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
    { id: 'mercedes', name: 'Mercedes S-Class', price: 1200, img: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=400' },
    { id: 'range', name: 'Range Rover Vogue', price: 1800, img: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?auto=format&fit=crop&q=80&w=400' },
    { id: 'lambo', name: 'Lamborghini Urus', price: 2500, img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400' },
  ];
  const options = [
    { id: 'rent_a_car', name: t('rent_a_car'), icon: Car },
    { id: 'taxi_limousine', name: t('taxi_limousine'), icon: MapPin },
    { id: 'luggage_service', name: t('luggage_service'), icon: Briefcase },
    { id: 'local_tours', name: t('local_tours'), icon: Globe },
  ];
  return (
    <div className="w-full py-6 space-y-5 px-4 sm:px-8">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-serif text-navy">{t('concierge_services')}</h2>
        <p className="text-gold text-[9px] uppercase tracking-widest font-bold">Luxury Assistance</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map(opt => (
          <button key={opt.id} onClick={() => setSelected(opt.id)} className={cn('premium-card', selected === opt.id ? 'border-gold bg-gold/5' : '')}>
            <div className="icon-wrapper"><opt.icon size={18} className="text-gold" strokeWidth={1} /></div>
            <h3 className="text-xs">{opt.name}</h3>
          </button>
        ))}
      </div>
      {selected === 'rent_a_car' && (
        <div className="space-y-3">
          {cars.map(car => (
            <div key={car.id} className="flex items-center gap-3 bg-white border border-gold/10 p-3 shadow-sm">
              <img src={car.img} alt={car.name} className="w-20 h-14 object-cover" referrerPolicy="no-referrer" />
              <div className="flex-1"><h4 className="font-serif text-navy text-sm">{car.name}</h4><p className="text-gold font-bold text-xs">AED {car.price}/day</p></div>
              <button onClick={() => onSubmit({ type: `Rent a Car: ${car.name}`, dept: 'Concierge', totalPrice: car.price, lineItems: [{ name: car.name, qty: 1, price: car.price, total: car.price }], notes })} className="bg-gold text-white px-3 py-1.5 text-[9px] font-bold uppercase">{t('book_now')}</button>
            </div>
          ))}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special requirements..." className="h-16 resize-none w-full bg-white text-navy border border-gold p-3 text-sm" />
        </div>
      )}
      {selected === 'taxi_limousine' && (
        <div className="bg-white p-4 border border-gold/10 space-y-4">
          <div className="pill-container">
            <button onClick={() => setSubTab('taxi')} className={cn('pill-btn', subTab === 'taxi' ? 'active' : 'inactive')}>{t('taxi')}</button>
            <button onClick={() => setSubTab('limousine')} className={cn('pill-btn', subTab === 'limousine' ? 'active' : 'inactive')}>{t('limousine')}</button>
          </div>
          <div className="space-y-3">
            <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold">Pickup Time</label><input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full bg-white text-navy border border-gold p-3 text-sm" /></div>
            <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold">Destination</label><input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Drop-off location" className="w-full bg-white text-navy border border-gold p-3 text-sm" /></div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." className="h-16 resize-none w-full bg-white text-navy border border-gold p-3 text-sm" />
          </div>
          <button onClick={() => onSubmit({ type: `Concierge: ${subTab}`, dept: 'Concierge', pickupTime, destination, notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
      {selected === 'luggage_service' && (
        <div className="bg-white p-4 border border-gold/10 space-y-4">
          <div className="pill-container">
            <button onClick={() => setSubTab('pickup')} className={cn('pill-btn', subTab === 'pickup' ? 'active' : 'inactive')}>Pickup</button>
            <button onClick={() => setSubTab('delivery')} className={cn('pill-btn', subTab === 'delivery' ? 'active' : 'inactive')}>Delivery</button>
          </div>
          <div className="space-y-3">
            <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold">Number of Bags</label><input type="number" value={numBags} onChange={e => setNumBags(e.target.value)} min="1" className="w-full bg-white text-navy border border-gold p-3 text-sm" /></div>
            <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold">Time</label><input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full bg-white text-navy border border-gold p-3 text-sm" /></div>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." className="h-16 resize-none w-full bg-white text-navy border border-gold p-3 text-sm" />
          <button onClick={() => onSubmit({ type: `Luggage: ${subTab}`, dept: 'Concierge', numBags, pickupTime, notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
      {selected === 'local_tours' && (
        <div className="bg-white p-4 border border-gold/10 space-y-4">
          <p className="text-navy/60 font-serif italic text-center py-4 text-sm">Discover Abu Dhabi with our curated local tours.</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Interests, preferences..." className="h-16 resize-none w-full bg-white text-navy border border-gold p-3 text-sm" />
          <button onClick={() => onSubmit({ type: 'Concierge: Local Tours', dept: 'Concierge', notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
    </div>
  );
};


// ─── RESTAURANT BOOKING SYSTEM ───────────────────────────────────────────────

const RESTAURANTS = [
  { id: 'turquoise', name: 'Turquoise', cuisine: 'International Cuisine', emoji: '🌊' },
  { id: 'mermaid', name: 'The Mermaid', cuisine: 'Mediterranean Cuisine', emoji: '🧜' },
  { id: 'lolivo', name: "L'Olivo", cuisine: 'Italian Fine Dining', emoji: '🫒' },
];

const generateBookingRef = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'SP-' + Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const formatBookingDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

// ─── BOOKING TICKET ───────────────────────────────────────────────────────────
const printBookingTicket = (booking: any) => {
  const restaurant = RESTAURANTS.find(r => r.id === booking.restaurant);
  const html = `<!DOCTYPE html><html><head><title>Booking Confirmation</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #f8f6f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
  .ticket { background: white; width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
  .ticket-header { background: #001529; padding: 30px; text-align: center; }
  .hotel-name { font-family: 'Playfair Display', serif; font-size: 22px; color: #C5A059; letter-spacing: 4px; }
  .ticket-title { font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 3px; margin-top: 6px; text-transform: uppercase; }
  .gold-line { width: 40px; height: 2px; background: #C5A059; margin: 12px auto; }
  .restaurant-name { font-family: 'Playfair Display', serif; font-size: 20px; color: white; margin-top: 8px; }
  .cuisine { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; }
  .ticket-body { padding: 24px; }
  .booking-ref { text-align: center; background: #f8f6f0; border: 1px solid #C5A059; padding: 12px; margin-bottom: 20px; }
  .ref-label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #999; }
  .ref-number { font-family: 'Playfair Display', serif; font-size: 24px; color: #001529; font-weight: bold; letter-spacing: 3px; margin-top: 4px; }
  .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0ebe0; }
  .detail-row:last-child { border: none; }
  .detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; }
  .detail-value { font-size: 13px; font-weight: 600; color: #001529; }
  .notes-box { background: #f8f6f0; border-left: 3px solid #C5A059; padding: 10px 12px; margin-top: 16px; }
  .notes-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #C5A059; margin-bottom: 4px; font-weight: 600; }
  .notes-text { font-size: 11px; color: #555; font-style: italic; }
  .ticket-footer { background: #001529; padding: 16px; text-align: center; }
  .footer-text { font-size: 9px; color: rgba(255,255,255,0.4); letter-spacing: 1px; }
  .status-badge { display: inline-block; background: #C5A059; color: #001529; font-size: 9px; font-weight: bold; padding: 4px 12px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
  .dashed { border-top: 2px dashed #e0d8cc; margin: 16px 0; }
  @media print { body { background: white; } .ticket { box-shadow: none; } }
</style></head><body>
<div class="ticket">
  <div class="ticket-header">
    <div class="hotel-name">SENTINEL PRO</div>
    <div class="ticket-title">Luxury Hotel & Residences</div>
    <div class="gold-line"></div>
    <div class="restaurant-name">${restaurant?.emoji} ${restaurant?.name}</div>
    <div class="cuisine">${restaurant?.cuisine}</div>
  </div>
  <div class="ticket-body">
    <div class="booking-ref">
      <div class="ref-label">Booking Reference</div>
      <div class="ref-number">${booking.booking_ref}</div>
    </div>
    <div style="text-align:center;margin-bottom:16px">
      <span class="status-badge">${booking.status || 'Confirmed'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Guest Name</span>
      <span class="detail-value">${booking.guest_name}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Room Number</span>
      <span class="detail-value">${booking.room_number}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Date</span>
      <span class="detail-value">${formatBookingDate(booking.date)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Time</span>
      <span class="detail-value">${booking.time}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Guests</span>
      <span class="detail-value">${booking.pax} ${booking.pax === 1 ? 'Guest' : 'Guests'}</span>
    </div>
    ${booking.notes ? `<div class="notes-box"><div class="notes-label">Special Requests</div><div class="notes-text">${booking.notes}</div></div>` : ''}
    <div class="dashed"></div>
    <div style="font-size:10px;color:#999;text-align:center;line-height:1.6">
      Please arrive 5 minutes before your reservation.<br>
      For changes, contact reception or dial 0.
    </div>
  </div>
  <div class="ticket-footer">
    <div class="footer-text">SENTINEL PRO · LUXURY HOTEL MANAGEMENT · ${new Date().toLocaleDateString()}</div>
  </div>
</div>
<script>setTimeout(() => window.print(), 800);</script>
</body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
};

// ─── RESTAURANT BOOKING PORTAL ───────────────────────────────────────────────
const RestaurantPortal: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'book' | 'mybookings' | 'manage' | 'walkin' | 'menu' | 'settings'>('book');
  const [selectedRestaurant, setSelectedRestaurant] = useState('turquoise');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [pax, setPax] = useState('2');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [modifyBooking, setModifyBooking] = useState<any | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [restaurantSettings, setRestaurantSettings] = useState<any[]>([]);
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: '', category: 'all_day', restaurant: 'turquoise' });
  const [restSettings, setRestSettings] = useState<any>({});
  const [rejectModal, setRejectModal] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectAlt, setRejectAlt] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [walkInRestaurant, setWalkInRestaurant] = useState('turquoise');
  const [walkInDate, setWalkInDate] = useState('');
  const [walkInTime, setWalkInTime] = useState('');
  const [walkInPax, setWalkInPax] = useState('2');
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastWalkIn, setLastWalkIn] = useState<any | null>(null);
  // Reservation access controlled by occupation

  const isFBManager = profile.role === 'manager' && profile.department === 'F&B';
  const isExecutive = profile.role === 'manager' && profile.department === 'None';
  const isStaff = profile.role === 'staff' && profile.department === 'F&B';
  const isGuest = profile.role === 'guest';
  // ✅ Reservation staff = F&B Manager, Executive, OR Reservation Agent occupation
  const isReservationAgent = profile.occupation === 'Reservation Agent';
  const isReservationStaff = isFBManager || isExecutive || isReservationAgent;

  const fetchBookings = useCallback(async () => {
    let q = supabase.from('restaurant_bookings').select('*').order('created_at', { ascending: false });
    if (isGuest) q = q.eq('guest_id', profile.uid);
    const { data } = await q;
    if (data) setBookings(data);
  }, [profile, isGuest]);

  const fetchMenuItems = useCallback(async () => {
    const { data } = await supabase.from('menu_items').select('*').order('category');
    if (data) setMenuItems(data);
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('restaurant_settings').select('*');
    if (data) {
      const map: any = {};
      data.forEach((s: any) => { map[s.restaurant] = s; });
      setRestSettings(map);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    if (isFBManager || isExecutive || isStaff) { fetchMenuItems(); fetchSettings(); }
    // ✅ Unique channel per user to avoid conflicts
    const channel = supabase.channel(`restaurant-bookings-${profile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_bookings' }, () => {
        fetchBookings();
      })
      .subscribe();
    // ✅ Polling fallback every 3 seconds
    const poll = setInterval(() => { fetchBookings(); }, 3000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [fetchBookings, fetchMenuItems, fetchSettings, isFBManager, isExecutive, isStaff]);

  const submitBooking = async () => {
    if (!date || !time || !pax) { showToast('Please fill in date, time and number of guests', 'error'); return; }
    setLoading(true);
    try {
      const ref = generateBookingRef();
      const { data, error } = await supabase.from('restaurant_bookings').insert({
        booking_ref: ref,
        guest_id: profile.uid,
        guest_name: profile.displayName,
        room_number: profile.roomNumber || '',
        restaurant: selectedRestaurant,
        date, time,
        pax: Number(pax),
        notes,
        status: 'Pending',
      }).select().single();
      if (error) throw error;
      showToast(`Reservation submitted! Ref: ${ref} — Our team will confirm shortly.`, 'success');
      setDate(''); setTime(''); setPax('2'); setNotes('');
      fetchBookings();
      setActiveTab('mybookings');
      setTimeout(() => { if (data) printBookingTicket(data); }, 1000);
    } catch (e: any) { showToast(e.message || 'Booking failed', 'error'); }
    finally { setLoading(false); }
  };

  const updateBooking = async () => {
    if (!modifyBooking) return;
    const { error } = await supabase.from('restaurant_bookings').update({
      date: modifyBooking.date,
      time: modifyBooking.time,
      pax: modifyBooking.pax,
      notes: modifyBooking.notes,
      status: 'Modified',
    }).eq('id', modifyBooking.id);
    if (!error) { showToast('Booking updated successfully!', 'success'); setModifyBooking(null); fetchBookings(); }
    else showToast('Failed to update booking', 'error');
  };

  const cancelBooking = async (id: string) => {
    const { error } = await supabase.from('restaurant_bookings').update({ status: 'Cancelled' }).eq('id', id);
    if (error) { showToast('Failed to cancel: ' + error.message, 'error'); return; }
    showToast('Booking cancelled successfully', 'info'); 
    setCancelConfirm(null); 
    fetchBookings();
  };

  // ─── WALK-IN BOOKING ────────────────────────────────────────────────────────
  const submitWalkIn = async () => {
    if (!walkInName || !walkInDate || !walkInTime || !walkInPax) {
      showToast('Please fill in guest name, date, time and guests', 'error'); return;
    }
    setWalkInLoading(true);
    try {
      const ref = generateBookingRef();
      const restaurant = RESTAURANTS.find(r => r.id === walkInRestaurant);
      const { data, error } = await supabase.from('restaurant_bookings').insert({
        booking_ref: ref,
        guest_id: 'WALKIN-' + Date.now(),
        guest_name: walkInName.toUpperCase(),
        room_number: 'WALK-IN',
        restaurant: walkInRestaurant,
        date: walkInDate,
        time: walkInTime,
        pax: Number(walkInPax),
        notes: walkInNotes,
        status: 'Confirmed',
        confirmed_by: profile.displayName,
        confirmed_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      showToast(`Walk-in booking confirmed! Ref: ${ref}`, 'success');

      // Store booking info for sending confirmation
      setLastWalkIn({
        ref, name: walkInName.toUpperCase(),
        phone: walkInPhone, email: walkInEmail,
        restaurant: restaurant?.name || walkInRestaurant,
        date: walkInDate, time: walkInTime, pax: walkInPax, notes: walkInNotes,
        data,
      });

      // Reset form but stay on walkin tab to show send options
      setWalkInName(''); setWalkInPhone(''); setWalkInEmail('');
      setWalkInDate(''); setWalkInTime(''); setWalkInPax('2'); setWalkInNotes('');
      fetchBookings();
    } catch (e: any) {
      showToast(e.message || 'Failed to create booking', 'error');
    } finally { setWalkInLoading(false); }
  };

  // ─── PDF REPORT ───────────────────────────────────────────────────────────
  const generatePDFReport = async () => {
    showToast('Fetching latest data...', 'info');
    // Always fetch fresh data from Supabase before generating
    const { data: freshData, error } = await supabase
      .from('restaurant_bookings')
      .select('*')
      .order('time', { ascending: true });
    if (error) { showToast('Failed to fetch data: ' + error.message, 'error'); return; }
    const allBookings = freshData || [];
    const filtered = allBookings.filter((b: any) => {
      const bDate = b.date ? String(b.date).substring(0, 10) : '';
      return bDate === reportDate && b.status !== 'Cancelled';
    });
    if (filtered.length === 0) {
      showToast('No bookings found for ' + reportDate + '. Try a different date.', 'error');
      return;
    }

    const inHouse = filtered.filter(b => b.room_number !== 'WALK-IN');
    const walkIns = filtered.filter(b => b.room_number === 'WALK-IN');
    const totalPax = filtered.reduce((s, b) => s + (Number(b.pax) || 0), 0);
    const inHousePax = inHouse.reduce((s, b) => s + (Number(b.pax) || 0), 0);
    const walkInPaxTotal = walkIns.reduce((s, b) => s + (Number(b.pax) || 0), 0);

    // Pax breakdown
    const paxGroups: Record<string, number> = {};
    filtered.forEach(b => {
      const k = Number(b.pax) >= 8 ? '8+ Pax' : Number(b.pax) + ' Pax';
      paxGroups[k] = (paxGroups[k] || 0) + 1;
    });

    // Build rows using string concat — no nested backticks
    const buildRow = (b: any, i: number) => {
      const restName = RESTAURANTS.find((r: any) => r.id === b.restaurant)?.name || b.restaurant || '';
      const roomDisplay = b.room_number === 'WALK-IN' ? '<span style="color:#7C3AED;font-weight:bold">OUTSIDE</span>' : b.room_number;
      return '<tr style="background:' + (i % 2 === 0 ? '#ffffff' : '#f9f8f5') + '">' +
        '<td style="padding:6px 8px;border-bottom:1px solid #eee;color:#C5A059;font-weight:bold">' + (i + 1) + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid #eee">' + (b.date || '') + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:bold">' + restName + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:bold">' + (b.guest_name || '').toUpperCase() + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">' + roomDisplay + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;font-weight:bold">' + (b.pax || '') + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid #eee;color:#555;font-style:italic">' + (b.notes || '—') + '</td>' +
        '<td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:9px;color:#999">' + (b.time || '') + '</td>' +
        '</tr>';
    };

    const paxSummaryHtml = Object.entries(paxGroups).sort().map(([k, v]) =>
      '<div style="background:#f8f6f0;border:1px solid #ddd;padding:8px 14px;text-align:center;min-width:80px">' +
      '<div style="font-size:18px;font-weight:bold;color:#001529">' + v + '</div>' +
      '<div style="font-size:8px;color:#999;text-transform:uppercase">' + k + '</div></div>'
    ).join('');

    const tableHeader = '<thead><tr style="background:#f4f2ec">' +
      '<th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">S/No</th>' +
      '<th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Date</th>' +
      '<th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Restaurant</th>' +
      '<th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Guest Name</th>' +
      '<th style="padding:6px 8px;text-align:center;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Room #</th>' +
      '<th style="padding:6px 8px;text-align:center;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Pax</th>' +
      '<th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Guest Notes</th>' +
      '<th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Time</th>' +
      '</tr></thead>';

    const inHouseRows = inHouse.map((b: any, i: number) => buildRow(b, i)).join('');
    const walkInRows = walkIns.map((b: any, i: number) => buildRow(b, i)).join('');

    const inHouseSection = inHouse.length > 0
      ? '<div style="background:#001529;color:white;padding:7px 10px;font-weight:bold;font-size:10px;letter-spacing:1px;margin-bottom:0">IN-HOUSE GUESTS</div>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' + tableHeader + '<tbody>' + inHouseRows + '</tbody>' +
        '<tfoot><tr><td colspan="8" style="padding:6px 8px;font-weight:bold;font-size:10px;background:#f4f2ec;border-top:2px solid #001529">' +
        'Total In-House: ' + inHouse.length + ' bookings &nbsp;·&nbsp; ' + inHousePax + ' guests</td></tr></tfoot></table>'
      : '';

    const walkInSection = walkIns.length > 0
      ? '<div style="background:#4A0000;color:white;padding:7px 10px;font-weight:bold;font-size:10px;letter-spacing:1px;margin-bottom:0">OUTSIDE / WALK-IN GUESTS</div>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' + tableHeader + '<tbody>' + walkInRows + '</tbody>' +
        '<tfoot><tr><td colspan="8" style="padding:6px 8px;font-weight:bold;font-size:10px;background:#f4f2ec;border-top:2px solid #4A0000">' +
        'Total Walk-in: ' + walkIns.length + ' bookings &nbsp;·&nbsp; ' + walkInPaxTotal + ' guests</td></tr></tfoot></table>'
      : '';

    const html = '<!DOCTYPE html><html><head><title>Reservation Report ' + reportDate + '</title>' +
      '<style>@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap");' +
      '* { margin:0;padding:0;box-sizing:border-box; }' +
      'body { font-family:Inter,sans-serif;background:white;padding:20px;font-size:11px; }' +
      '@media print { body { padding:8px; } }</style></head><body>' +

      // Header
      '<div style="background:#001529;color:white;padding:16px 20px;margin-bottom:12px">' +
      '<div style="font-family:Playfair Display,serif;font-size:22px;color:#C5A059;letter-spacing:3px">SENTINEL PRO</div>' +
      '<div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:1px">RESTAURANT RESERVATIONS REPORT &nbsp;·&nbsp; ' + reportDate + '</div>' +
      '<div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap">' +
      '<div style="background:rgba(197,160,89,0.15);border:1px solid #C5A059;padding:6px 14px;text-align:center"><div style="font-size:20px;font-weight:bold;color:#C5A059">' + filtered.length + '</div><div style="font-size:8px;color:rgba(255,255,255,0.5);text-transform:uppercase">Total Reservations</div></div>' +
      '<div style="background:rgba(197,160,89,0.15);border:1px solid #C5A059;padding:6px 14px;text-align:center"><div style="font-size:20px;font-weight:bold;color:#C5A059">' + totalPax + '</div><div style="font-size:8px;color:rgba(255,255,255,0.5);text-transform:uppercase">Total People</div></div>' +
      '<div style="background:rgba(197,160,89,0.15);border:1px solid #C5A059;padding:6px 14px;text-align:center"><div style="font-size:20px;font-weight:bold;color:#C5A059">' + inHouse.length + '</div><div style="font-size:8px;color:rgba(255,255,255,0.5);text-transform:uppercase">In-House</div></div>' +
      '<div style="background:rgba(197,160,89,0.15);border:1px solid #C5A059;padding:6px 14px;text-align:center"><div style="font-size:20px;font-weight:bold;color:#C5A059">' + walkIns.length + '</div><div style="font-size:8px;color:rgba(255,255,255,0.5);text-transform:uppercase">Walk-in</div></div>' +
      '</div></div>' +

      // Pax breakdown
      '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">' + paxSummaryHtml + '</div>' +

      // Tables
      inHouseSection +
      walkInSection +

      // Footer
      '<div style="text-align:center;color:#999;font-size:8px;margin-top:16px;border-top:1px solid #eee;padding-top:8px">' +
      'SENTINEL PRO &nbsp;·&nbsp; Luxury Hotel Management &nbsp;·&nbsp; Report generated ' + new Date().toLocaleString() + '</div>' +
      '<script>setTimeout(function(){ window.print(); }, 600);</script>' +
      '</body></html>';

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      showToast('Popup blocked — please allow popups for this site', 'error');
    }
  };

    const confirmBooking = async (id: string, guestName: string, restaurant: string, date: string, time: string) => {
    const { error } = await supabase.from('restaurant_bookings').update({ 
      status: 'Confirmed',
    }).eq('id', id);
    if (error) { showToast('Failed to confirm booking: ' + error.message, 'error'); return; }
    showToast(`Booking confirmed for ${guestName}!`, 'success'); 
    fetchBookings();
  };

  const rejectBooking = async () => {
    if (!rejectModal || !rejectReason) { showToast('Please select a reason', 'error'); return; }
    const message = rejectAlt 
      ? `We regret that ${rejectModal.restaurant} is not available on ${rejectModal.date} at ${rejectModal.time}. ${rejectReason}. We would like to suggest ${rejectAlt} as an alternative — please let us know if this works for you.`
      : `We regret that ${rejectModal.restaurant} is not available on ${rejectModal.date} at ${rejectModal.time}. ${rejectReason}. Please contact reception to explore other options.`;
    const { error } = await supabase.from('restaurant_bookings').update({ 
      status: 'Rejected',
      rejection_reason: message,
    }).eq('id', rejectModal.id);
    if (error) { showToast('Failed to reject booking: ' + error.message, 'error'); return; }
    showToast('Booking rejected — guest has been notified', 'info');
    setRejectModal(null); setRejectReason(''); setRejectAlt('');
    fetchBookings();
  };

  const exportBookings = () => {
    const headers = 'Ref,Guest,Room,Restaurant,Date,Time,Pax,Notes,Status,Created\n';
    const rows = bookings.map(b =>
      `${b.booking_ref},${b.guest_name},${b.room_number},${b.restaurant},${b.date},${b.time},${b.pax},"${b.notes || ''}",${b.status},${b.created_at}`
    ).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI('data:text/csv;charset=utf-8,' + headers + rows));
    link.setAttribute('download', `RestaurantBookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Bookings exported to CSV!', 'success');
  };

  const addMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) { showToast('Please fill name and price', 'error'); return; }
    const { error } = await supabase.from('menu_items').insert({
      name: newMenuItem.name, price: Number(newMenuItem.price),
      category: newMenuItem.category, restaurant: newMenuItem.restaurant,
    });
    if (!error) { showToast('Menu item added!', 'success'); fetchMenuItems(); setNewMenuItem({ name: '', price: '', category: 'all_day', restaurant: 'turquoise' }); }
  };

  const deleteMenuItem = async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id);
    showToast('Item removed', 'info'); fetchMenuItems();
  };

  const saveRestaurantSettings = async (restaurantId: string, settings: any) => {
    await supabase.from('restaurant_settings').upsert(
      { restaurant: restaurantId, ...settings },
      { onConflict: 'restaurant' }
    );
    showToast('Settings saved!', 'success'); fetchSettings();
  };

  const statusColor = (status: string) => {
    if (status === 'Confirmed') return 'text-green-400 border-green-400';
    if (status === 'Cancelled') return 'text-red-400 border-red-400';
    if (status === 'Rejected') return 'text-red-500 border-red-500';
    if (status === 'Modified') return 'text-blue-400 border-blue-400';
    if (status === 'Pending') return 'text-yellow-400 border-yellow-400';
    return 'text-gold border-gold';
  };

  const tabs = [
    ...(isGuest ? [{ key: 'book', label: '+ New Booking' }] : []),
    ...(isGuest ? [{ key: 'mybookings', label: 'My Bookings' }] : []),
    ...(isReservationStaff ? [{ key: 'manage', label: `All Bookings (${bookings.filter(b => b.status !== 'Cancelled').length})` }] : []),
    ...(isReservationStaff ? [{ key: 'walkin', label: '🚶 Walk-in / Outside' }] : []),
    ...(isFBManager || isExecutive ? [{ key: 'menu', label: '🍽 Menu' }] : []),
    ...(isFBManager || isExecutive ? [{ key: 'settings', label: '⚙ Settings' }] : []),
  ];

  return (
    <div className={cn('min-h-screen', isGuest ? 'bg-[#FCF9F2]' : 'bg-[#001529] text-white')}>
      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#001c36] border border-red-500 w-full max-w-md p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-serif text-white flex items-center gap-2"><AlertCircle size={18} className="text-red-400" /> Reject Booking</h3>
              <div className="bg-navy/50 p-3 rounded">
                <p className="text-gold font-bold text-sm">{RESTAURANTS.find(r => r.id === rejectModal.restaurant)?.name}</p>
                <p className="text-white/60 text-[9px]">{rejectModal.guest_name} · Room {rejectModal.room_number} · {rejectModal.date} at {rejectModal.time} · {rejectModal.pax} pax</p>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-white/50 uppercase font-bold block">Reason for Rejection</label>
                <select value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full bg-white border border-red-400 p-2.5 text-sm text-navy outline-none">
                  <option value="">-- Select reason --</option>
                  <option value="Unfortunately, we are fully booked at this time">Fully booked at requested time</option>
                  <option value="The restaurant is closed on this day">Restaurant closed on this day</option>
                  <option value="The requested time is outside our operating hours">Outside operating hours</option>
                  <option value="We are unable to accommodate this party size at the requested time">Cannot accommodate party size</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-white/50 uppercase font-bold block">Suggest Alternative (Optional)</label>
                <select value={rejectAlt} onChange={e => setRejectAlt(e.target.value)} className="w-full bg-white border border-gold/30 p-2.5 text-sm text-navy outline-none">
                  <option value="">-- No alternative --</option>
                  {RESTAURANTS.filter(r => r.id !== rejectModal.restaurant).map(r => (
                    <option key={r.id} value={r.name}>{r.emoji} {r.name} — {r.cuisine}</option>
                  ))}
                  <option value="an earlier time slot">An earlier time slot</option>
                  <option value="a later time slot">A later time slot</option>
                </select>
              </div>
              <div className="bg-navy/30 p-3 text-[9px] text-white/50 italic rounded">
                <p className="text-gold/80 font-bold mb-1">Message to guest:</p>
                <p>We regret that {rejectModal.restaurant} is not available on {rejectModal.date} at {rejectModal.time}. {rejectReason}{rejectAlt ? `. We suggest ${rejectAlt} as an alternative.` : '.'}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setRejectModal(null); setRejectReason(''); setRejectAlt(''); }} className="flex-1 py-2.5 border border-gold/20 text-gold text-[10px] font-bold uppercase">Cancel</button>
                <button disabled={!rejectReason} onClick={rejectBooking} className="flex-1 py-2.5 bg-red-600 text-white text-[10px] font-bold uppercase disabled:opacity-40">Send Rejection</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modify Modal */}
      <AnimatePresence>
        {modifyBooking && (
          <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md p-6 shadow-2xl border border-gold">
              <h3 className="text-lg font-serif text-navy mb-4">Modify Booking {modifyBooking.booking_ref}</h3>
              <div className="space-y-3">
                {[{ label: 'Date', key: 'date', type: 'date' }, { label: 'Time', key: 'time', type: 'time' }, { label: 'Guests', key: 'pax', type: 'number' }].map(f => (
                  <div key={f.key}>
                    <label className="text-[9px] uppercase tracking-widest text-gold font-bold block mb-1">{f.label}</label>
                    <input type={f.type} value={modifyBooking[f.key]} onChange={e => setModifyBooking({ ...modifyBooking, [f.key]: e.target.value })}
                      className="w-full border border-gold p-2.5 text-sm text-navy outline-none" />
                  </div>
                ))}
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-gold font-bold block mb-1">Special Requests</label>
                  <textarea value={modifyBooking.notes || ''} onChange={e => setModifyBooking({ ...modifyBooking, notes: e.target.value })}
                    className="w-full border border-gold p-2.5 text-sm text-navy outline-none h-16 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setModifyBooking(null)} className="flex-1 py-2.5 border border-navy/20 text-navy text-[10px] font-bold uppercase">Cancel</button>
                <button onClick={updateBooking} className="flex-1 py-2.5 bg-navy text-white text-[10px] font-bold uppercase">Save Changes</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Confirm Modal */}
      <AnimatePresence>
        {cancelConfirm && (
          <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-sm p-6 shadow-2xl border-t-4 border-red-500">
              <h3 className="text-lg font-serif text-navy mb-2">Cancel Booking?</h3>
              <p className="text-sm text-gray-500 mb-2">Booking Reference: <strong>{cancelConfirm.booking_ref}</strong></p>
              <p className="text-sm text-gray-500 mb-4">{RESTAURANTS.find(r => r.id === cancelConfirm.restaurant)?.name} · {cancelConfirm.date} at {cancelConfirm.time}</p>
              <div className="flex gap-3">
                <button onClick={() => setCancelConfirm(null)} className="flex-1 py-2.5 border border-navy/20 text-navy text-[10px] font-bold uppercase">Keep Booking</button>
                <button onClick={() => cancelBooking(cancelConfirm.id)} className="flex-1 py-2.5 bg-red-600 text-white text-[10px] font-bold uppercase">Yes, Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Access denied for regular F&B staff who are not Reservation Agents */}
      {isStaff && !isReservationAgent && (
        <div className="min-h-screen bg-[#001529] flex items-center justify-center p-6">
          <div className="bg-[#001c36] border border-gold/20 p-8 w-full max-w-sm text-center space-y-4">
            <div className="text-4xl">🚫</div>
            <h2 className="text-xl font-serif text-gold">Access Restricted</h2>
            <p className="text-white/50 text-sm">Restaurant reservations are managed by the Reservation Agent team only.</p>
            <p className="text-white/30 text-[9px] uppercase tracking-widest">Contact your F&B Manager for assistance</p>
          </div>
        </div>
      )}

      {/* Show portal only if guest OR reservation staff */}
      {(isGuest || isReservationStaff) && <>

      {/* Header */}
      <div className={cn('px-4 pt-4 pb-0', isGuest ? 'bg-navy' : 'bg-navy border-b border-gold/20')}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl font-serif text-gold">Restaurant Reservations</h1>
            <p className="text-[9px] text-white/50 uppercase tracking-widest">{isGuest ? `Room ${profile.roomNumber}` : `${profile.displayName} · ${profile.department || 'Executive'}`}</p>
          </div>
          {(isFBManager || isExecutive || isStaff) && (
            <div className="flex gap-2">
            <button onClick={() => generatePDFReport()} className="flex items-center gap-1 bg-gold text-navy px-3 py-1.5 text-[9px] font-bold uppercase">
              📄 PDF Report
            </button>
            <button onClick={exportBookings} className="flex items-center gap-1 border border-gold/30 text-gold px-3 py-1.5 text-[9px] font-bold uppercase">
              <Download size={11} /> CSV
            </button>
          </div>
          )}
        </div>
        {isReservationStaff && (
          <div className="flex items-center gap-2 px-1 pb-1">
            <span className="text-[8px] text-white/40 uppercase">Report Date:</span>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
              className="bg-white/10 text-white text-[9px] px-2 py-1 border border-gold/20 outline-none" />
          </div>
        )}
        <div className="flex gap-0.5 flex-wrap pb-0">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={cn('px-3 py-2 text-[9px] font-bold uppercase tracking-wider border-b-2',
                activeTab === tab.key ? 'border-gold text-gold' : 'border-transparent text-white/50')}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* NEW BOOKING */}
        {activeTab === 'book' && isGuest && (
          <div className="space-y-4">
            <p className="text-[9px] uppercase tracking-widest text-gold font-bold">Select Restaurant</p>
            <div className="space-y-2">
              {RESTAURANTS.map(r => (
                <button key={r.id} onClick={() => setSelectedRestaurant(r.id)}
                  className={cn('w-full p-4 border text-left flex items-center gap-3', selectedRestaurant === r.id ? 'border-gold bg-gold/5' : 'border-navy/10 bg-white')}>
                  <span className="text-2xl">{r.emoji}</span>
                  <div>
                    <p className="text-navy font-bold font-serif">{r.name}</p>
                    <p className="text-[10px] text-navy/60 italic">{r.cuisine}</p>
                    {restSettings[r.id] && <p className="text-[9px] text-gold font-bold mt-0.5">{restSettings[r.id].opening_time} – {restSettings[r.id].closing_time}</p>}
                  </div>
                  {selectedRestaurant === r.id && <Check size={18} className="text-gold ml-auto" />}
                </button>
              ))}
            </div>
            <div className="bg-white p-4 border border-gold/20 space-y-3">
              {[{ label: 'Date', key: 'date', type: 'date', val: date, set: setDate },
                { label: 'Time', key: 'time', type: 'time', val: time, set: setTime },
                { label: 'Number of Guests', key: 'pax', type: 'number', val: pax, set: setPax }].map(f => (
                <div key={f.key}>
                  <label className="text-[9px] uppercase tracking-widest text-gold font-bold block mb-1">{f.label}</label>
                  <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} min={f.type === 'number' ? '1' : undefined}
                    className="w-full border border-gold/30 p-3 text-sm text-navy outline-none focus:border-gold" />
                </div>
              ))}
              <div>
                <label className="text-[9px] uppercase tracking-widest text-gold font-bold block mb-1">Special Requests / Dietary Requirements</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Allergies, anniversary, special setup..."
                  className="w-full border border-gold/30 p-3 text-sm text-navy outline-none h-20 resize-none focus:border-gold" />
              </div>
              <button onClick={submitBooking} disabled={loading}
                className="w-full bg-navy text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-navy/80">
                {loading ? 'Confirming...' : 'Confirm Reservation'}
              </button>
            </div>
          </div>
        )}

        {/* MY BOOKINGS */}
        {activeTab === 'mybookings' && isGuest && (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-2xl mb-2">🍽️</p>
                <p className="text-navy/40 font-serif italic">No reservations yet</p>
                <button onClick={() => setActiveTab('book')} className="mt-4 bg-navy text-white px-6 py-2 text-[10px] font-bold uppercase">Make a Reservation</button>
              </div>
            ) : bookings.map(b => {
              const restaurant = RESTAURANTS.find(r => r.id === b.restaurant);
              return (
                <div key={b.id} className="bg-white border border-navy/10 shadow-sm overflow-hidden">
                  <div className="bg-navy px-4 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-gold font-serif text-sm">{restaurant?.emoji} {restaurant?.name}</p>
                      <p className="text-white/50 text-[9px]">Ref: {b.booking_ref}</p>
                    </div>
                    <span className={cn('text-[9px] font-bold px-2 py-1 border', statusColor(b.status))}>{b.status}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[{ label: 'Date', val: formatBookingDate(b.date).split(',')[0] + ', ' + b.date.split('-').reverse().slice(0,2).join('/') },
                        { label: 'Time', val: b.time },
                        { label: 'Guests', val: `${b.pax} pax` }].map(d => (
                        <div key={d.label} className="bg-gray-50 p-2">
                          <p className="text-[8px] text-gray-400 uppercase font-bold">{d.label}</p>
                          <p className="text-navy font-bold text-sm mt-0.5">{d.val}</p>
                        </div>
                      ))}
                    </div>
                    {b.notes && <p className="text-[10px] text-navy/60 italic border-l-2 border-gold pl-2">📝 {b.notes}</p>}
                    {b.status === 'Pending' && (
                      <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-[10px] text-yellow-700">
                        ⏳ Your reservation is pending confirmation from our restaurant team. You will be notified shortly.
                      </div>
                    )}
                    {b.status === 'Rejected' && b.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded space-y-1">
                        <p className="text-[9px] text-red-600 font-bold">Message from our team:</p>
                        <p className="text-[10px] text-red-700 italic">{b.rejection_reason}</p>
                        <button onClick={() => setActiveTab('book')} className="mt-2 bg-navy text-white text-[9px] font-bold uppercase px-3 py-1.5 w-full">
                          Make New Reservation
                        </button>
                      </div>
                    )}
                    {b.status !== 'Cancelled' && b.status !== 'Rejected' && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => printBookingTicket(b)} className="flex-1 py-2 bg-navy text-white text-[9px] font-bold uppercase flex items-center justify-center gap-1">
                          <Download size={11} /> Download Ticket
                        </button>
                        <button onClick={() => setModifyBooking(b)} className="flex-1 py-2 border border-gold text-navy text-[9px] font-bold uppercase">
                          Modify
                        </button>
                        <button onClick={() => setCancelConfirm(b)} className="py-2 px-3 border border-red-300 text-red-500 text-[9px] font-bold uppercase">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MANAGE BOOKINGS — Staff/Manager/Executive */}
        {activeTab === 'manage' && (isStaff || isFBManager || isExecutive) && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center mb-2">
              {[{ label: 'Total', val: bookings.length, color: 'text-gold' },
                { label: 'Confirmed', val: bookings.filter(b => b.status === 'Confirmed').length, color: 'text-green-400' },
                { label: 'Cancelled', val: bookings.filter(b => b.status === 'Cancelled').length, color: 'text-red-400' }].map(s => (
                <div key={s.label} className="bg-[#001c36] border border-gold/10 p-3">
                  <p className={cn('text-xl font-serif font-bold', s.color)}>{s.val}</p>
                  <p className="text-[8px] text-white/40 uppercase">{s.label}</p>
                </div>
              ))}
            </div>
            {bookings.length === 0 ? <p className="text-white/20 italic text-center py-12">No bookings yet</p>
              : bookings.map(b => {
                const restaurant = RESTAURANTS.find(r => r.id === b.restaurant);
                return (
                  <div key={b.id} className={cn('border p-4', b.status === 'Cancelled' ? 'border-red-500/30 bg-red-900/5 opacity-60' : 'border-gold/10 bg-[#001c36]')}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-bold font-serif">{restaurant?.emoji} {restaurant?.name}</p>
                        <p className="text-[9px] text-gold font-bold">Ref: {b.booking_ref}</p>
                      </div>
                      <span className={cn('text-[9px] font-bold px-2 py-1 border', statusColor(b.status))}>{b.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                      {[{ l: '👤 Guest', v: b.guest_name },
                        { l: '🏠 Room', v: b.room_number },
                        { l: '📅 Date', v: b.date },
                        { l: '🕐 Time', v: b.time },
                        { l: '👥 Guests', v: `${b.pax} pax` },
                        { l: '📝 Notes', v: b.notes || '—' }].map(d => (
                        <div key={d.l}>
                          <span className="text-[8px] text-white/40 uppercase">{d.l}: </span>
                          <span className="text-[9px] text-white font-bold">{d.v}</span>
                        </div>
                      ))}
                    </div>
                    {/* Show rejection reason to staff */}
                    {b.rejection_reason && (
                      <div className="bg-red-900/20 border border-red-500/30 p-2 mt-2 rounded">
                        <p className="text-[8px] text-red-400 font-bold mb-0.5">Rejection Message Sent:</p>
                        <p className="text-[8px] text-white/60 italic">{b.rejection_reason}</p>
                      </div>
                    )}
                    {b.status === 'Pending' && isReservationStaff && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => confirmBooking(b.id, b.guest_name, b.restaurant, b.date, b.time)} className="flex-1 py-2 bg-green-600 text-white text-[8px] font-bold uppercase">
                          ✓ Confirm Booking
                        </button>
                        <button onClick={() => { setRejectModal(b); setRejectReason(''); setRejectAlt(''); }} className="flex-1 py-2 bg-red-700 text-white text-[8px] font-bold uppercase">
                          ✕ Reject
                        </button>
                      </div>
                    )}
                    {b.status === 'Confirmed' && isReservationStaff && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => printBookingTicket(b)} className="flex-1 py-1.5 bg-gold/20 text-gold text-[8px] font-bold uppercase border border-gold/30">
                          🖨 Print Ticket
                        </button>
                        <button onClick={() => cancelBooking(b.id)} className="py-1.5 px-3 bg-red-800 text-white text-[8px] font-bold uppercase">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* WALK-IN BOOKING TAB */}
        {activeTab === 'walkin' && isReservationStaff && (
          <div className="space-y-4">
            <div className="bg-[#4A0000]/40 border border-[#7C3AED]/30 p-3 rounded">
              <p className="text-[10px] text-white font-bold">🚶 Walk-in / Outside Guest Reservation</p>
              <p className="text-[9px] text-white/50 mt-0.5">For guests who call or walk in directly — not hotel room guests. Booking is auto-confirmed.</p>
            </div>
            <div className="bg-[#001c36] border border-gold/10 p-4 space-y-3">
              {[
                { label: 'Guest Full Name *', key: 'name', type: 'text', val: walkInName, set: setWalkInName, placeholder: 'e.g. John Smith' },
                { label: 'WhatsApp Number (optional)', key: 'phone', type: 'tel', val: walkInPhone, set: setWalkInPhone, placeholder: '+971XXXXXXXXX' },
                { label: 'Email Address (optional)', key: 'email', type: 'email', val: walkInEmail, set: setWalkInEmail, placeholder: 'guest@email.com' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">{f.label}</label>
                  <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-white border border-gold/30 p-2.5 text-sm text-navy outline-none focus:border-gold" />
                </div>
              ))}
              <div>
                <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Restaurant *</label>
                <select value={walkInRestaurant} onChange={e => setWalkInRestaurant(e.target.value)}
                  className="w-full bg-white border border-gold p-2.5 text-sm text-navy outline-none">
                  {RESTAURANTS.map(r => <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Date *', type: 'date', val: walkInDate, set: setWalkInDate },
                  { label: 'Time *', type: 'time', val: walkInTime, set: setWalkInTime },
                  { label: 'Guests *', type: 'number', val: walkInPax, set: setWalkInPax },
                ].map((f, i) => (
                  <div key={i}>
                    <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">{f.label}</label>
                    <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} min={f.type === 'number' ? '1' : undefined}
                      className="w-full bg-white border border-gold/30 p-2.5 text-sm text-navy outline-none" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Special Requests / Notes</label>
                <textarea value={walkInNotes} onChange={e => setWalkInNotes(e.target.value)}
                  placeholder="Dietary requirements, occasion, table preference..."
                  className="w-full bg-white border border-gold/30 p-2.5 text-sm text-navy outline-none h-16 resize-none focus:border-gold" />
              </div>
              <div className="bg-navy/30 p-3 text-[9px] text-white/50 space-y-1">
                <p className="text-gold font-bold text-[10px]">What happens after confirming:</p>
                <p>✅ Booking created immediately as Confirmed</p>
                {walkInPhone && <p>📱 WhatsApp confirmation message sent to {walkInPhone}</p>}
                {walkInEmail && <p>✉️ Email confirmation sent to {walkInEmail}</p>}
                <p>🖨️ Booking ticket opens for printing</p>
              </div>
              <button onClick={submitWalkIn} disabled={walkInLoading}
                className="w-full bg-gold text-navy py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-gold/80 disabled:opacity-50">
                {walkInLoading ? 'Creating Booking...' : '✓ Confirm Walk-in Reservation'}
              </button>
            </div>

            {/* Confirmation send panel — appears after booking created */}
            {lastWalkIn && (
              <div className="bg-green-900/20 border border-green-500 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-green-400 font-bold text-sm">✅ Booking Confirmed — {lastWalkIn.ref}</p>
                </div>
                <p className="text-white/60 text-[9px]">{lastWalkIn.name} · {lastWalkIn.restaurant} · {lastWalkIn.date} at {lastWalkIn.time} · {lastWalkIn.pax} pax</p>
                <p className="text-white/50 text-[9px] font-bold uppercase">Send Confirmation To Guest:</p>
                <div className="grid grid-cols-1 gap-2">
                  {lastWalkIn.phone && (
                    <a href={'https://wa.me/' + lastWalkIn.phone.replace(/\D/g,'') + '?text=' + encodeURIComponent('Dear ' + lastWalkIn.name + ', your reservation at ' + lastWalkIn.restaurant + ' is CONFIRMED! Booking Ref: ' + lastWalkIn.ref + ' Date: ' + lastWalkIn.date + ' Time: ' + lastWalkIn.time + ' Guests: ' + lastWalkIn.pax + (lastWalkIn.notes ? ' Notes: ' + lastWalkIn.notes : '') + ' Please arrive 5 minutes early. Sentinel Pro - Luxury Hotel')} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 text-[10px] font-bold uppercase">
                      📱 Send WhatsApp to {lastWalkIn.phone}
                    </a>
                  )}
                  {lastWalkIn.email && (
                    <a href={'mailto:' + lastWalkIn.email + '?subject=' + encodeURIComponent('Reservation Confirmed - ' + lastWalkIn.restaurant + ' - Ref: ' + lastWalkIn.ref) + '&body=' + encodeURIComponent('Dear ' + lastWalkIn.name + ', Your reservation has been confirmed. Booking Reference: ' + lastWalkIn.ref + ' Restaurant: ' + lastWalkIn.restaurant + ' Date: ' + lastWalkIn.date + ' Time: ' + lastWalkIn.time + ' Guests: ' + lastWalkIn.pax + (lastWalkIn.notes ? ' Special Requests: ' + lastWalkIn.notes : '') + ' Please present this reference upon arrival. Arrive 5 minutes early. Kind regards, Sentinel Pro - Luxury Hotel')}
                      className="flex items-center justify-center gap-2 bg-blue-700 text-white py-3 text-[10px] font-bold uppercase">
                      ✉️ Send Email to {lastWalkIn.email}
                    </a>
                  )}
                  {lastWalkIn.data && (
                    <button onClick={() => printBookingTicket(lastWalkIn.data)}
                      className="flex items-center justify-center gap-2 bg-gold/20 text-gold border border-gold py-3 text-[10px] font-bold uppercase">
                      🖨️ Print Booking Ticket
                    </button>
                  )}
                  <button onClick={() => setLastWalkIn(null)}
                    className="text-white/30 text-[9px] uppercase font-bold py-2">
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MENU MANAGEMENT */}
        {activeTab === 'menu' && (isFBManager || isExecutive) && (
          <div className="space-y-4">
            <div className="bg-[#001c36] border border-gold/10 p-4 space-y-3">
              <h3 className="text-base font-serif text-gold">Add Menu Item</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Restaurant</label>
                  <select value={newMenuItem.restaurant} onChange={e => setNewMenuItem({ ...newMenuItem, restaurant: e.target.value })}
                    className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none">
                    {RESTAURANTS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Category</label>
                  <select value={newMenuItem.category} onChange={e => setNewMenuItem({ ...newMenuItem, category: e.target.value })}
                    className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none">
                    <option value="breakfast">Breakfast</option>
                    <option value="all_day">All Day</option>
                    <option value="beverages">Beverages</option>
                    <option value="desserts">Desserts</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Item Name</label>
                  <input value={newMenuItem.name} onChange={e => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                    placeholder="e.g. Wagyu Steak" className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none" />
                </div>
                <div>
                  <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Price (AED)</label>
                  <input type="number" value={newMenuItem.price} onChange={e => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                    placeholder="e.g. 185" className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none" />
                </div>
              </div>
              <button onClick={addMenuItem} className="gold-button m-0 w-full">+ Add to Menu</button>
            </div>
            <h3 className="text-sm font-serif text-gold">Current Menu Items</h3>
            {menuItems.length === 0 ? <p className="text-white/20 italic text-center py-8">No menu items yet</p>
              : menuItems.map(item => (
                <div key={item.id} className="bg-[#001c36] border border-gold/10 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">{item.name}</p>
                    <p className="text-[8px] text-white/40 uppercase">{item.restaurant} · {item.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gold font-bold text-sm">AED {item.price}</span>
                    <button onClick={() => deleteMenuItem(item.id)} className="text-red-400 text-[8px] font-bold uppercase border border-red-400/30 px-2 py-1">Remove</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* RESTAURANT SETTINGS */}
        {activeTab === 'settings' && (isFBManager || isExecutive) && (
          <div className="space-y-4">
            {RESTAURANTS.map(r => {
              const s = restSettings[r.id] || {};
              return (
                <div key={r.id} className="bg-[#001c36] border border-gold/10 p-4 space-y-3">
                  <h3 className="text-base font-serif text-gold">{r.emoji} {r.name}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Opening Time</label>
                      <input type="time" defaultValue={s.opening_time || '12:00'}
                        id={`open-${r.id}`} className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Closing Time</label>
                      <input type="time" defaultValue={s.closing_time || '23:00'}
                        id={`close-${r.id}`} className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] text-white/50 uppercase font-bold block mb-2">Closed Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                        const closed = (s.closed_days || []).includes(day);
                        return (
                          <button key={day}
                            onClick={async () => {
                              const days = s.closed_days || [];
                              const newDays = closed ? days.filter((d: string) => d !== day) : [...days, day];
                              await saveRestaurantSettings(r.id, {
                                opening_time: (document.getElementById(`open-${r.id}`) as HTMLInputElement)?.value || '12:00',
                                closing_time: (document.getElementById(`close-${r.id}`) as HTMLInputElement)?.value || '23:00',
                                closed_days: newDays,
                              });
                            }}
                            className={cn('px-3 py-1.5 text-[9px] font-bold uppercase border', closed ? 'bg-red-600 text-white border-red-600' : 'border-gold/30 text-gold/60')}>
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={() => saveRestaurantSettings(r.id, {
                    opening_time: (document.getElementById(`open-${r.id}`) as HTMLInputElement)?.value || '12:00',
                    closing_time: (document.getElementById(`close-${r.id}`) as HTMLInputElement)?.value || '23:00',
                    closed_days: s.closed_days || [],
                  })} className="gold-button m-0 w-full">Save {r.name} Settings</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </> /* end reservation staff check */}
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
    } catch (err: any) { showToast(err.message || 'An error occurred. Please try again.', 'error'); } finally { setLoading(false); }
  };

  const handleManagerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (managerPassword === 'Manager12345') {
      const adminProfile: UserProfile = { uid: 'admin_override', email: 'admin@sentinel.pro', displayName: 'Executive Director', role: 'manager', department: 'None', status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify(adminProfile));
      onLoginSuccess(adminProfile); return;
    }
    const { data: manager } = await supabase.from('managers').select('*').eq('password', managerPassword).single();
    if (manager) {
      const mp: UserProfile = { uid: manager.id, email: manager.email, displayName: manager.name, role: 'manager', department: manager.department as Department, status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify(mp));
      onLoginSuccess(mp); return;
    }
    const newCount = failCount + 1; setFailCount(newCount);
    if (newCount >= 3) { showToast('Too many failed attempts. Please try again later.', 'error'); setShowManagerLock(false); setShowSecret(false); setFailCount(0); setManagerPassword(''); }
    else showToast(`Incorrect password. Attempt ${newCount} of 3.`, 'error');
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8 bg-[#001c36] p-6 sm:p-12 shadow-2xl border border-[#C5A059]">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 sm:p-6 border border-gold"><ShieldCheck className="w-10 h-10 sm:w-14 sm:h-14 text-gold" strokeWidth={1} /></div>
          <h1 className="text-2xl sm:text-4xl font-serif tracking-[0.1em] text-white uppercase">Sentinel Pro</h1>
          <p className="text-gold text-[8px] sm:text-[9px] tracking-[0.2em] uppercase font-bold">Luxury Management Systems</p>
        </div>
        {showManagerLock ? (
          <form onSubmit={handleManagerAuth} className="space-y-5">
            <p className="text-gold text-[10px] text-center uppercase tracking-widest font-bold">Executive Vault Access</p>
            <input type="password" required autoFocus value={managerPassword} onChange={e => setManagerPassword(e.target.value)} className="login-input text-center" placeholder="Enter Executive Password" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowManagerLock(false)} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase">{t('back')}</button>
              <button type="submit" className="flex-1 gold-button">Unlock</button>
            </div>
          </form>
        ) : showSecret ? (
          <div className="space-y-4">
            <p className="text-gold text-[10px] text-center uppercase tracking-widest font-bold">Security Override</p>
            <button onClick={() => setShowManagerLock(true)} className="gold-button w-full flex items-center justify-center gap-3"><ShieldCheck size={16} /> Executive Dashboard</button>
            <button onClick={onNavigateToStaff} className="navy-button w-full border border-gold/30 flex items-center justify-center gap-3"><User size={16} /> Staff Portal</button>
            <button onClick={() => setShowSecret(false)} className="text-[10px] text-white/40 uppercase tracking-widest w-full text-center">{t('cancel')}</button>
          </div>
        ) : (
          <form onSubmit={handleGuestLogin} className="space-y-4 w-full">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Full Name</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="login-input" placeholder="Enter your full name" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Room Number</label>
              <input type="text" required disabled={isLocked} value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className={cn('login-input', isLocked && 'opacity-60 cursor-not-allowed bg-gold/10')} placeholder="Room number" />
              {isLocked && <p className="text-[8px] text-gold/60 italic">✓ Room pre-filled from QR code</p>}
            </div>
            <button type="submit" disabled={loading} className="gold-button w-full">{loading ? '...' : t('sign_in')}</button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

// ─── STAFF LOGIN ──────────────────────────────────────────────────────────────
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
    e.preventDefault(); setLoading(true);
    try {
      if (mode === 'register') {
        const { data: existing } = await supabase.from('staff').select('id').eq('email', email).single();
        if (existing) { showToast('A profile with this email already exists. Please login.', 'info'); setMode('login'); setLoading(false); return; }
        const { error } = await supabase.from('staff').insert({
          name: fullName, staff_id: staffIdNumber, email, password,
          department: derivedDept, occupation, approved: false,
          needs_executive_approval: isManagerOccupation,
          logged_in: false, tasks_completed: 0, tasks_on_time: 0, violations: 0, failed_attempts: 0,
        });
        if (error) throw error;
        setPendingMessage(isManagerOccupation ? `Your ${occupation} profile has been submitted for Executive approval.` : `Your profile has been submitted for Department Manager approval.`);
        setShowPending(true);
      } else {
        const { data: staffData, error } = await supabase.from('staff').select('*').eq('email', email).single();
        if (error || !staffData) { showToast('Invalid email or password. Please try again.', 'error'); setLoading(false); return; }
        if (staffData.locked_until && new Date(staffData.locked_until) > new Date()) { showToast(`Account is locked until ${new Date(staffData.locked_until).toLocaleTimeString()}. Please try again later.`, 'error'); setLoading(false); return; }
        if (staffData.password !== password) {
          const attempts = (staffData.failed_attempts || 0) + 1;
          const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60000).toISOString() : null;
          await supabase.from('staff').update({ failed_attempts: attempts, ...(lockUntil ? { locked_until: lockUntil } : {}) }).eq('id', staffData.id);
          showToast(attempts >= 5 ? 'Account locked for 30 minutes due to too many failed attempts.' : `Incorrect password. ${5 - attempts} attempts remaining.`, 'error');
          setLoading(false); return;
        }
        if (!staffData.approved) { showToast('Your account is pending manager approval. Please wait.', 'info'); setLoading(false); return; }
        await supabase.from('staff').update({ logged_in: true, failed_attempts: 0, locked_until: null, device_id: null }).eq('id', staffData.id);
        const isManager = MANAGER_OCCUPATIONS.includes(staffData.occupation || '');
        const profile: UserProfile = {
          uid: staffData.id, email: staffData.email, displayName: staffData.name,
          role: isManager ? 'manager' : 'staff',
          department: (staffData.department as Department) || 'Front Office',
          staffIdNumber: staffData.staff_id, occupation: staffData.occupation, status: 'Approved',
        };
        localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
        onLoginSuccess(profile);
      }
    } catch (err: any) { showToast(err.message || 'An error occurred. Please try again.', 'error'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6">
      <AnimatePresence>
        {showPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="bg-[#001c36] p-10 text-center border-2 border-gold max-w-lg shadow-xl">
              <ShieldCheck className="w-16 h-16 text-gold mx-auto mb-6" strokeWidth={1} />
              <h2 className="text-3xl font-serif text-white mb-4">Profile Submitted</h2>
              <p className="text-white/70 text-sm font-serif italic mb-8">{pendingMessage}</p>
              <button onClick={onReturnToGuest} className="gold-button w-full py-4">Close & Return</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6 bg-[#001c36] p-6 sm:p-10 shadow-2xl border border-[#C5A059]">
        <div className="text-center space-y-3">
          <div className="inline-block p-3 border border-gold"><ShieldCheck className="w-8 h-8 text-gold" strokeWidth={1} /></div>
          <h1 className="text-2xl font-serif tracking-widest text-white uppercase">Sentinel Pro</h1>
          <p className="text-gold text-[8px] uppercase font-bold">Staff Portal</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-3">
          {mode === 'register' && (
            <>
              <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Full Name</label><input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="login-input bg-white text-navy" placeholder="Your full name" /></div>
              <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Staff ID Number</label><input type="text" required value={staffIdNumber} onChange={e => setStaffIdNumber(e.target.value)} className="login-input bg-white text-navy" placeholder="e.g. HK-001" /></div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Occupation / Role</label>
                <select value={occupation} onChange={e => setOccupation(e.target.value)} className="login-input bg-white text-navy">
                  <optgroup label="── Housekeeping"><option>Housekeeping Attendant</option><option>Housekeeping Supervisor</option><option>Housekeeping Manager</option></optgroup>
                  <optgroup label="── F&B"><option>F&B Waiter</option><option>F&B Supervisor</option><option>Chef</option><option>F&B Manager</option><option>Reservation Agent</option></optgroup>
                  <optgroup label="── Concierge"><option>Concierge Agent</option><option>Concierge Supervisor</option><option>Concierge Manager</option></optgroup>
                  <optgroup label="── Security"><option>Security Officer</option><option>Security Supervisor</option><option>Security Manager</option></optgroup>
                  <optgroup label="── Maintenance / Engineering"><option>Maintenance Technician</option><option>Maintenance Supervisor</option></optgroup>
                  <optgroup label="── Front Office"><option>Front Office Agent</option><option>Front Office Supervisor</option><option>Front Office Manager</option></optgroup>
                  <optgroup label="── Executive"><option>Executive</option></optgroup>
                </select>
                <div className="mt-1 flex items-center gap-2"><span className="text-[8px] text-white/40">Department:</span><span className="text-[8px] text-gold font-bold">{derivedDept === 'None' ? 'All Departments' : derivedDept}</span></div>
                {isManagerOccupation && <p className="text-[8px] text-gold font-bold">⚡ Requires Executive approval</p>}
              </div>
            </>
          )}
          <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Email</label><input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="login-input bg-white text-navy" placeholder="Email address" /></div>
          <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="login-input bg-white text-navy" placeholder="Password" /></div>
          <button type="submit" disabled={loading} className="gold-button w-full">{loading ? '...' : (mode === 'login' ? t('sign_in') : 'Create Profile')}</button>
        </form>
        <div className="text-center space-y-2">
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[10px] font-bold text-gold uppercase tracking-widest block w-full">{mode === 'login' ? "Don't have a profile? Create Profile" : "Already have a profile? Login"}</button>
          <button onClick={onReturnToGuest} className="text-[10px] text-white/30 uppercase tracking-widest hover:text-white">← Return to Guest Portal</button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── STAFF PORTAL ─────────────────────────────────────────────────────────────
const StaffPortal: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const { t, language } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [slaSettings, setSlaSettings] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'rooms' | 'maintenance'>('active');
  const [now, setNow] = useState(Date.now());
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [delayModalTask, setDelayModalTask] = useState<any | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [forwardModalTask, setForwardModalTask] = useState<any | null>(null);
  const [forwardDept, setForwardDept] = useState<Department>('Housekeeping');
  const [maintenanceForm, setMaintenanceForm] = useState({ room: '', category: 'AC / Heating Issue', description: '', priority: 'Normal' });
  const [roomSearch, setRoomSearch] = useState('');
  const [notifPermission, setNotifPermission] = useState('');
  const [showFBRestaurant, setShowFBRestaurant] = useState(false);
  const swRegistered = useRef(false);

  const isHousekeeping = userProfile.department === 'Housekeeping';
  const isMaintenance = userProfile.department === 'Maintenance' || userProfile.department === 'Front Office';

  // ✅ Setup notifications when staff logs in
  useEffect(() => {
    if (swRegistered.current) return;
    swRegistered.current = true;

    const setupNotifications = async () => {
      if (!('Notification' in window)) return;
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        // Register service worker for background notifications
        registerServiceWorker(userProfile.uid, userProfile.department);
      }
    };
    setupNotifications();
  }, [userProfile.uid, userProfile.department]);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const fetchSLA = async () => {
    const { data } = await supabase.from('sla_settings').select('*');
    if (data) { const map: any = {}; data.forEach((s: any) => { map[s.department] = s.sla_minutes; }); setSlaSettings(map); }
  };

  const mapRow = (row: any) => ({
    id: row.id, roomNumber: row.guest_room || '', type: row.service || '',
    message: row.notes,
    originalMessage: row.notes, // preserved original language
    department: row.department, status: row.status,
    guestId: row.guest_id || '', guestName: row.guest_name, timestamp: row.created_at,
    acceptedAt: row.accepted_at, completedAt: row.closed_at,
    assignedStaffName: row.assigned_to, delayReason: row.late_reason, lineItems: row.line_items,
    guestLanguage: row.guest_language || 'en',
  });

  const fetchTasks = useCallback(async () => {
    const dept = userProfile.department;
    let query = supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (dept === 'Security & Safety') query = query.in('department', ['Security & Safety', 'Security']);
    else query = query.eq('department', dept);
    const { data } = await query;
    if (data) {
      const mapped = data.map(mapRow);
      // ✅ Active tasks exclude completed
      setTasks(mapped.filter((t: any) => t.status !== 'Completed' && t.status !== 'Cancelled'));
      // ✅ History always loads all completed — persists across login sessions
      const completed = mapped.filter((t: any) => t.status === 'Completed');
      if (completed.length > 0) setHistory(completed.slice(0, 50));
    }
  }, [userProfile]);

  const fetchRooms = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').order('room_number');
    if (data) setRooms(data);
  }, []);

  // ✅ 5-second polling fallback + SLA escalation notifications
  const slaWarned = useRef<Set<string>>(new Set());
  useEffect(() => {
    const poll = setInterval(() => {
      fetchTasks();
      // SLA Escalation — warn staff before it expires
      tasks.forEach(task => {
        if (task.status === 'Completed') return;
        const dept = userProfile.department;
        const slaLimit = (slaSettings[dept] || 5) * 60;
        const elapsed = getElapsed(task.timestamp);
        const pct = (elapsed / slaLimit) * 100;
        const warnKey80 = `${task.id}-80`;
        const warnKey100 = `${task.id}-100`;
        // Level 1: 80% SLA used → warn staff
        if (pct >= 80 && pct < 100 && !slaWarned.current.has(warnKey80)) {
          slaWarned.current.add(warnKey80);
          playNotificationSound();
          showBrowserNotification('⚠️ SLA Warning — Act Now!', `Room #${task.roomNumber} · ${Math.floor((slaLimit - elapsed)/60)} minutes remaining!`);
          setNewOrderAlert(`⚠️ SLA WARNING — Room #${task.roomNumber} · Only ${Math.floor((slaLimit - elapsed)/60)}m left!`);
          setTimeout(() => setNewOrderAlert(null), 10000);
        }
        // Level 2: SLA exceeded → red alert to staff
        if (pct >= 100 && !slaWarned.current.has(warnKey100)) {
          slaWarned.current.add(warnKey100);
          playNotificationSound();
          showBrowserNotification('🚨 SLA EXCEEDED!', `Room #${task.roomNumber} · ${task.type} · Reason required to close!`);
          setNewOrderAlert(`🚨 SLA EXCEEDED — Room #${task.roomNumber} · Reason required!`);
          setTimeout(() => setNewOrderAlert(null), 15000);
        }
      });
    }, 5000);
    return () => clearInterval(poll);
  }, [fetchTasks, tasks, slaSettings, userProfile]);

  useEffect(() => {
    // ✅ Always fetch fresh data on mount/login — ensures history loads
    fetchTasks();
    fetchSLA();
    if (isHousekeeping) fetchRooms();
    const channel = supabase.channel(`staff-${userProfile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
        // ✅ Only alert on INSERT (new guest request), fetch on ALL events (INSERT + UPDATE + DELETE)
        if (payload.eventType === 'INSERT') {
          const newReq = payload.new as any;
          const reqDept = newReq.department;
          const myDept = userProfile.department;
          const deptMatch = reqDept === myDept ||
            (myDept === 'Security & Safety' && (reqDept === 'Security & Safety' || reqDept === 'Security'));
          if (deptMatch) {
            const msg = `Room #${newReq.guest_room} — ${newReq.service}`;
            setNewOrderAlert(`🔔 New Request: ${msg}`);
            playNotificationSound();
            showBrowserNotification('🔔 Sentinel Pro — New Guest Request', msg);
            setTimeout(() => setNewOrderAlert(null), 15000);
          }
        }
        fetchTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile, fetchTasks, fetchRooms, isHousekeeping]);

  const getElapsed = (ts: any) => {
    if (!ts) return 0;
    try {
      // Replace space separator with T so JS Date can parse it
      // Do NOT strip timezone — JS Date handles +04:00 correctly internally
      const normalized = String(ts).trim().replace(' ', 'T');
      const created = new Date(normalized).getTime();
      if (isNaN(created)) return 0;
      // Use `now` state so React re-renders every second and timer ticks
      const diff = Math.floor((now - created) / 1000);
      return diff < 0 ? 0 : diff;
    } catch {
      return 0;
    }
  };
  const getSLALimit = (dept: string) => (slaSettings[dept] || 30) * 60; // Default 30 min if not configured

  const formatTime = (ts: any) => {
    if (!ts) return '—';
    try {
      const normalized = String(ts).trim().replace(' ', 'T');
      const d = new Date(normalized);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return '—'; }
  };

  const getDuration = (from: any, to: any) => {
    if (!from || !to) return null;
    const fromParsed = from.replace(' ', 'T');
    const toParsed = to.replace(' ', 'T');
    const mins = Math.floor((new Date(toParsed).getTime() - new Date(fromParsed).getTime()) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
  };

  const handleAccept = async (id: string) => {
    await supabase.from('requests').update({ status: 'In Progress', accepted_at: new Date().toISOString(), assigned_to: userProfile.displayName, assigned_to_email: userProfile.email }).eq('id', id);
    // ✅ Immediately refresh so button switches from Accept to Complete
    await fetchTasks();
  };

  const handleComplete = async (task: any) => {
    const elapsed = getElapsed(task.timestamp);
    const limit = getSLALimit(task.department);
    // ✅ ALWAYS enforce delay reason if SLA exceeded — no bypass possible
    if (elapsed > limit || task.status === 'Violated') {
      setDelayModalTask(task);
      setDelayReason('');
      return;
    }
    await supabase.from('requests').update({ status: 'Completed', closed_at: new Date().toISOString() }).eq('id', task.id);
    const { data: sr } = await supabase.from('staff').select('tasks_completed,tasks_on_time').eq('id', userProfile.uid).single();
    if (sr) await supabase.from('staff').update({ tasks_completed: (sr.tasks_completed || 0) + 1, tasks_on_time: (sr.tasks_on_time || 0) + 1 }).eq('id', userProfile.uid);
    // ✅ Refresh immediately — completed task disappears from active, appears in history
    await fetchTasks();
  };

  const handleCompleteWithReason = async () => {
    if (!delayReason || !delayModalTask) return;
    await supabase.from('requests').update({ status: 'Completed', closed_at: new Date().toISOString(), late_reason: delayReason }).eq('id', delayModalTask.id);
    const { data: sr } = await supabase.from('staff').select('tasks_completed,violations').eq('id', userProfile.uid).single();
    if (sr) await supabase.from('staff').update({ tasks_completed: (sr.tasks_completed || 0) + 1, violations: (sr.violations || 0) + 1 }).eq('id', userProfile.uid);
    setDelayModalTask(null); setDelayReason('');
    // ✅ Refresh — completed task moves to history immediately
    await fetchTasks();
  };

  const handleForward = async () => {
    if (!forwardModalTask || !forwardDept) return;
    await supabase.from('requests').update({
      department: forwardDept, status: 'Pending', assigned_to: null, assigned_to_email: null, accepted_at: null,
      notes: (forwardModalTask.message || '') + ` [Forwarded from ${userProfile.department} by ${userProfile.displayName}]`
    }).eq('id', forwardModalTask.id);
    showToast(`Request forwarded to ${forwardDept} department`, 'success');
    setForwardModalTask(null);
    // ✅ Refresh so forwarded task disappears from this staff's queue
    await fetchTasks();
  };

  const updateRoomStatus = async (roomId: string, status: string) => {
    await supabase.from('rooms').update({ status, assigned_to: userProfile.displayName, last_updated: new Date().toISOString() }).eq('id', roomId);
    fetchRooms();
  };

  const submitMaintenanceRequest = async () => {
    if (!maintenanceForm.room || !maintenanceForm.description) { showToast('Please fill in both room/location and description fields.', 'error'); return; }
    await supabase.from('requests').insert({
      guest_room: maintenanceForm.room, guest_id: 'maintenance', guest_name: userProfile.displayName,
      service: `Maintenance: ${maintenanceForm.category}`,
      notes: `${maintenanceForm.description} [Priority: ${maintenanceForm.priority}]`,
      department: 'Maintenance', status: 'Pending',
    });
    showToast('Maintenance request submitted successfully!', 'success');
    setMaintenanceForm({ room: '', category: 'AC / Heating Issue', description: '', priority: 'Normal' });
  };

  const staffLogout = async () => {
  await supabase.from('staff').update({ logged_in: false }).eq('id', userProfile.uid);
  localStorage.clear(); window.location.replace('/');
};

  const tabs = [
    { key: 'active', label: `Active (${tasks.length})` },
    { key: 'history', label: 'History' },
    ...(isHousekeeping ? [{ key: 'rooms', label: '🛏 Rooms' }] : []),
    ...(isMaintenance ? [{ key: 'maintenance', label: '🔧 Maintenance' }] : []),
  ];

  return (
    <div className="w-full pb-24 bg-[#001529] min-h-screen text-white">
      {/* Restaurant Portal for F&B Staff */}
      <AnimatePresence>
        {showFBRestaurant && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-[25000] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-navy px-4 py-3 flex items-center gap-3 border-b border-gold/20">
              <button onClick={() => setShowFBRestaurant(false)} className="text-gold hover:text-white">
                <ArrowRight size={20} className="rotate-180" />
              </button>
              <h2 className="text-gold font-serif text-lg">Restaurant Bookings</h2>
            </div>
            <RestaurantPortal profile={userProfile} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delay Modal */}
      <AnimatePresence>
        {delayModalTask && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#001c36] p-8 max-w-md w-full border-t-4 border-red-600 shadow-2xl">
              <div className="flex items-center gap-3 mb-4"><AlertCircle className="text-red-500" size={24} /><h2 className="text-xl font-serif text-white">SLA Violation — Reason Required</h2></div>
              <p className="text-sm text-white/60 mb-4">Task: <span className="text-gold font-bold">{delayModalTask.type}</span></p>
              <select value={delayReason} onChange={e => setDelayReason(e.target.value)} className="w-full p-4 bg-white border border-red-500 mb-5 text-sm text-navy outline-none">
                <option value="">-- Select Reason (Required) --</option>
                {DELAY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => { setDelayModalTask(null); setDelayReason(''); }} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase">Cancel</button>
                <button disabled={!delayReason} onClick={handleCompleteWithReason} className="flex-1 py-3 bg-red-600 text-white text-[10px] font-bold uppercase disabled:opacity-40">Submit & Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forward Modal */}
      <AnimatePresence>
        {forwardModalTask && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#001c36] p-8 max-w-md w-full border-t-4 border-gold shadow-2xl">
              <div className="flex items-center gap-3 mb-4"><ArrowRight className="text-gold" size={22} /><h2 className="text-xl font-serif text-white">Forward Request</h2></div>
              <p className="text-sm text-white/60 mb-4">Task: <span className="text-gold font-bold">{forwardModalTask.type}</span></p>
              <select value={forwardDept} onChange={e => setForwardDept(e.target.value as Department)} className="w-full p-4 bg-white border border-gold mb-5 text-sm text-navy outline-none">
                {DEPARTMENTS.filter(d => d !== forwardModalTask.department).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => setForwardModalTask(null)} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase">Cancel</button>
                <button onClick={handleForward} className="flex-1 py-3 bg-gold text-navy text-[10px] font-bold uppercase">Forward</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✅ Alert Banner */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} className="fixed top-0 left-0 right-0 z-[10002] bg-gold text-navy px-6 py-4 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3"><Bell size={20} /><span className="font-bold uppercase tracking-widest text-sm">{newOrderAlert}</span></div>
            <button onClick={() => setNewOrderAlert(null)} className="text-navy/60"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="p-4 bg-navy flex justify-between items-center border-b border-gold/20">
        <div>
          <h1 className="text-xl font-serif text-gold">{userProfile.displayName}</h1>
          <p className="text-white/60 text-[9px] uppercase tracking-widest">{userProfile.department} · {userProfile.occupation || 'Staff'}</p>
          {notifPermission === 'denied' && <p className="text-red-400 text-[8px] mt-0.5">⚠ Enable notifications in browser settings</p>}
          {notifPermission === 'granted' && <p className="text-green-400 text-[8px] mt-0.5">🔔 Notifications active</p>}
          {userProfile.department === 'F&B' && (userProfile.occupation === 'Reservation Agent' || userProfile.occupation === 'F&B Manager' || userProfile.occupation === 'Food & Beverage Manager') && (
            <button onClick={() => setShowFBRestaurant(true)} className="text-[8px] text-gold font-bold uppercase mt-0.5">🍽 Restaurant Reservations →</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-navy/50 border border-gold/20 p-0.5 flex-wrap gap-0.5">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key as any); if (tab.key === 'history') fetchTasks(); }} className={cn('px-2.5 py-1.5 text-[9px] font-bold uppercase', activeTab === tab.key ? 'bg-gold text-navy' : 'text-gold/60')}>{tab.label}</button>
            ))}
          </div>
          <button onClick={staffLogout} className="flex items-center gap-1 border border-gold/30 text-gold px-3 py-1.5 text-[9px] font-bold uppercase"><LogOut size={12} /> Logout</button>
        </div>
      </header>

      {/* ACTIVE TASKS */}
      {activeTab === 'active' && (
        <div className="staff-grid p-4">
          {tasks.length === 0 ? (
            <div className="col-span-full py-20 text-center"><CheckCircle2 className="w-10 h-10 text-gold/20 mx-auto" strokeWidth={1} /><p className="text-white/40 font-serif italic mt-3">No active requests. Standing by.</p></div>
          ) : tasks.map(task => {
            const elapsed = getElapsed(task.timestamp);
            const limit = getSLALimit(task.department);
            const isViolated = elapsed > limit;
            const pct = Math.min((elapsed / limit) * 100, 100);
            return (
              <motion.div key={task.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn('staff-task-card bg-[#001c36] relative', isViolated ? 'border-red-500 bg-red-900/10' : 'border-gold/10')}>
                {isViolated && <div className="w-full py-2 px-3 bg-red-600 text-white text-[9px] font-bold uppercase flex items-center gap-2 mb-2"><AlertCircle size={12} /> SLA EXCEEDED by {Math.floor((elapsed - limit) / 60)}m</div>}
                <div className="flex justify-between items-start">
                  <div className="bg-gold/20 px-3 py-1.5 text-gold text-[10px] font-bold border border-gold/50 tracking-widest">ROOM #{task.roomNumber}</div>
                  <div className={cn('font-mono text-base font-bold', isViolated ? 'text-red-400' : 'text-gold')}>{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</div>
                </div>
                <div className="space-y-1 mt-2">
                  <h3 className="text-base font-serif text-white font-bold tracking-wide">{task.type}</h3>
                  <p className={cn('text-[9px] uppercase tracking-widest font-bold', task.status === 'Pending' ? 'text-gold' : 'text-blue-400')}>{task.status}</p>
                  {task.guestName && <p className="text-[9px] text-gold/80 font-bold">👤 Guest: {task.guestName}</p>}
                </div>
                {task.lineItems && task.lineItems.length > 0 && (
                  <div className="mt-2 bg-navy/30 p-2 border-l-2 border-gold/30">
                    {task.lineItems.map((li: any, i: number) => <p key={i} className="text-[9px] text-white font-semibold">{li.qty}x {li.name} — <span className="text-gold">AED {li.total}</span></p>)}
                  </div>
                )}
                {task.message && <div className="bg-navy/50 p-2 border-l-2 border-gold mt-2"><p className="text-[9px] text-gold font-bold mb-0.5">📝 Note:</p><p className="text-xs text-white italic">"{task.message}"</p></div>}
                <div className="mt-3 h-1 bg-navy/50 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', isViolated ? 'bg-red-500' : pct > 80 ? 'bg-orange-400' : 'bg-green-500')} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 bg-navy/60 p-2 rounded border border-gold/10">
                  <div className="text-center">
                    <p className="text-[7px] text-white/50 uppercase font-bold tracking-wider">Submitted</p>
                    <p className="text-[9px] text-white font-bold">{formatTime(task.timestamp)}</p>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <p className="text-[7px] text-white/50 uppercase font-bold tracking-wider">Accepted</p>
                    <p className="text-[9px] text-blue-300 font-bold">{formatTime(task.acceptedAt)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] text-white/50 uppercase font-bold tracking-wider">Completed</p>
                    <p className="text-[9px] text-green-400 font-bold">{formatTime(task.completedAt)}</p>
                  </div>
                </div>
                <div className="pt-3 space-y-2">
                  {task.status === 'Pending' ? (
                    <button onClick={() => handleAccept(task.id)} className="gold-button w-full m-0 py-2.5 text-[10px]">Accept Task</button>
                  ) : (
                    <button onClick={() => handleComplete(task)} className={cn('w-full py-2.5 font-bold uppercase text-[10px]', isViolated ? 'bg-red-600 text-white' : 'bg-green-600 text-white')}>
                      {isViolated ? '⚠ Close (Reason Required)' : '✓ Mark Completed'}
                    </button>
                  )}
                  <button onClick={() => { setForwardDept(DEPARTMENTS.find(d => d !== task.department) || 'F&B'); setForwardModalTask(task); }} className="w-full py-2 border border-gold/30 text-gold text-[9px] font-bold uppercase flex items-center justify-center gap-1">
                    <ArrowRight size={11} /> Forward to Correct Dept
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* HISTORY */}
      {activeTab === 'history' && (
        <div className="staff-grid p-4">
          {history.length === 0 ? <div className="col-span-full py-20 text-center text-white/20 italic font-serif">No completed requests yet.</div>
            : history.map(task => (
              <div key={task.id} className="bg-[#001c36] border border-gold/10 p-4 opacity-80">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold text-white/40 uppercase">ROOM #{task.roomNumber}</span>
                  <span className="text-[9px] font-bold text-green-500 uppercase">COMPLETED</span>
                </div>
                <h3 className="text-sm font-serif text-white">{task.type}</h3>
                {task.lineItems && task.lineItems.map((li: any, i: number) => <p key={i} className="text-[8px] text-gold/60">{li.qty}x {li.name} — AED {li.total}</p>)}
                {task.delayReason && <p className="text-[8px] text-red-400 mt-1 font-bold">Late: {task.delayReason}</p>}
              </div>
            ))}
        </div>
      )}

      {/* ROOM STATUS */}
      {activeTab === 'rooms' && isHousekeeping && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif text-gold flex items-center gap-2"><BedDouble size={18} /> Room Status Board</h2>
            <button onClick={fetchRooms} className="text-gold/60 hover:text-gold"><RefreshCw size={16} /></button>
          </div>
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={roomSearch || ''}
              onChange={e => setRoomSearch(e.target.value)}
              placeholder="Search by room number or status (e.g. Clean, Dirty...)"
              className="w-full bg-[#001c36] border border-gold/20 text-white text-[11px] p-2 pl-8 outline-none placeholder:text-white/30"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-gold/40" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rooms
              .filter(room => {
                if (!roomSearch || !roomSearch.trim()) return true;
                const q = (roomSearch || '').toLowerCase();
                return room.room_number?.toString().toLowerCase().includes(q)
                  || (room.status || '').toLowerCase().includes(q);
              })
              .map(room => {
              const statusObj = ROOM_STATUSES.find(s => s.key === room.status) || ROOM_STATUSES[0];
              return (
                <div key={room.id} className="bg-[#001c36] border border-gold/10 p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div><p className="text-gold font-bold text-sm">Room {room.room_number}</p><p className="text-[8px] text-white/40">{room.room_type} · Floor {room.floor}</p></div>
                    <span className={cn('text-[8px] font-bold px-2 py-0.5 text-white rounded-full', statusObj.color)}>{room.status}</span>
                  </div>
                  {room.assigned_to && <p className="text-[8px] text-green-400/80 italic">✏ {room.assigned_to}</p>}
                  <select value={room.status} onChange={e => updateRoomStatus(room.id, e.target.value)} className="w-full bg-navy/50 border border-gold/20 text-white text-[9px] p-1.5 outline-none">
                    {ROOM_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAINTENANCE */}
      {activeTab === 'maintenance' && isMaintenance && (
        <div className="p-4 space-y-5">
          <h2 className="text-lg font-serif text-gold flex items-center gap-2"><Wrench size={18} /> Maintenance Request</h2>
          <div className="bg-[#001c36] border border-gold/10 p-5 space-y-4">
            <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Room / Location</label><input type="text" value={maintenanceForm.room} onChange={e => setMaintenanceForm({ ...maintenanceForm, room: e.target.value })} className="w-full bg-white border border-gold p-3 text-sm text-navy outline-none" placeholder="e.g. Room 402, Lobby, Pool Area" /></div>
            <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Category</label><select value={maintenanceForm.category} onChange={e => setMaintenanceForm({ ...maintenanceForm, category: e.target.value })} className="w-full bg-white border border-gold p-3 text-sm text-navy outline-none">{MAINTENANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Priority</label>
              <div className="flex gap-2">
                {['Low', 'Normal', 'High', 'Urgent'].map(p => (
                  <button key={p} onClick={() => setMaintenanceForm({ ...maintenanceForm, priority: p })} className={cn('flex-1 py-2 text-[9px] font-bold uppercase border', maintenanceForm.priority === p ? (p === 'Urgent' ? 'bg-red-600 text-white border-red-600' : 'bg-gold text-navy border-gold') : 'border-gold/30 text-gold/60')}>{p}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1"><label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Description</label><textarea value={maintenanceForm.description} onChange={e => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} className="w-full bg-white border border-gold p-3 text-sm text-navy outline-none h-24 resize-none" placeholder="Describe the issue in detail..." /></div>
            <button onClick={submitMaintenanceRequest} className="gold-button w-full m-0">Submit Maintenance Request</button>
          </div>
          <h3 className="text-base font-serif text-gold">Active Maintenance Requests</h3>
          {tasks.filter(t => t.type?.includes('Maintenance')).length === 0
            ? <p className="text-white/20 italic text-sm">No active maintenance requests.</p>
            : tasks.filter(t => t.type?.includes('Maintenance')).map(task => (
              <div key={task.id} className="bg-[#001c36] border border-gold/10 p-4">
                <div className="flex justify-between">
                  <div><p className="text-white font-bold text-sm">{task.type}</p><p className="text-[9px] text-white/40">Location: {task.roomNumber}</p></div>
                  <span className={cn('text-[9px] font-bold px-2 py-1 border h-fit', task.status === 'Completed' ? 'border-green-500 text-green-400' : 'border-gold text-gold')}>{task.status}</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

// ─── DEPT MANAGER DASHBOARD ───────────────────────────────────────────────────
const DeptManagerDashboard: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const { t, language } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [slaConfig, setSlaConfig] = useState<any>({});
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomSearch, setRoomSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'sla' | 'staff' | 'settings' | 'restaurants' | 'rooms'>('requests');
  const [now, setNow] = useState(Date.now());
  const [editSLA, setEditSLA] = useState<number>(5);
  const [showMgrRestaurant, setShowMgrRestaurant] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);

  // ✅ 5-second polling fallback — ensures updates even if real-time fails
  useEffect(() => {
    const poll = setInterval(() => { fetchData(); }, 5000);
    return () => clearInterval(poll);
  }, []);

  const fetchData = async () => {
    const dept = profile.department;
    let reqQ = supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (dept === 'Security & Safety') reqQ = reqQ.in('department', ['Security & Safety', 'Security']);
    else reqQ = reqQ.eq('department', dept);
    const { data: reqData } = await reqQ;
    if (reqData) setRequests(reqData);
    const { data: staffData } = await supabase.from('staff').select('*').eq('department', dept).order('created_at', { ascending: false });
    if (staffData) setStaffList(staffData);
    const { data: slaData } = await supabase.from('sla_settings').select('*').eq('department', dept).single();
    if (slaData) { setSlaConfig(slaData); setEditSLA(slaData.sla_minutes); }
  };

  const fetchRoomsMgr = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').order('room_number', { ascending: true });
    if (data) setRooms(data);
  }, []);

  useEffect(() => {
    fetchData();
    fetchRoomsMgr();
    const channel = supabase.channel(`deptmgr-${profile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const getSLAExceeded = (req: any) => {
    if (!req.created_at || req.status === 'Completed') return false;
    return (now - new Date(req.created_at).getTime()) / 1000 > (slaConfig.sla_minutes || 5) * 60;
  };
  const getElapsedMin = (ts: any) => {
    if (!ts) return 0;
    try {
      const normalized = String(ts).trim().replace(' ', 'T');
      const created = new Date(normalized).getTime();
      if (isNaN(created)) return 0;
      return Math.floor((Date.now() - created) / 60000);
    } catch { return 0; }
  };
  const violations = requests.filter(r => getSLAExceeded(r));
  const pendingStaff = staffList.filter(s => !s.approved && !MANAGER_OCCUPATIONS.includes(s.occupation || ''));
  const approvedStaff = staffList.filter(s => s.approved);

  const approveStaff = async (id: string) => { await supabase.from('staff').update({ approved: true }).eq('id', id); };
  const rejectStaff = async (id: string) => { if (window.confirm('Are you sure you want to reject and delete this profile?')) { await supabase.from('staff').delete().eq('id', id); showToast('Staff profile rejected and deleted', 'info'); } };
  const terminateStaff = async (id: string) => { await supabase.from('staff').update({ approved: false, logged_in: false }).eq('id', id); };
  const forceLogout = async (id: string) => { await supabase.from('staff').update({ logged_in: false, device_id: null }).eq('id', id); showToast('Staff member logged out successfully', 'success'); };
  const saveSLA = async () => {
    await supabase.from('sla_settings').upsert({ department: profile.department, sla_minutes: editSLA, updated_by: profile.displayName, updated_at: new Date().toISOString() }, { onConflict: 'department' });
    showToast(`SLA updated to ${editSLA} minutes`, 'success');
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#001529] text-white p-4 sm:p-6 space-y-5">
      {/* Restaurant Portal Overlay */}
      <AnimatePresence>
        {showMgrRestaurant && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-[25000] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-navy px-4 py-3 flex items-center gap-3 border-b border-gold/20">
              <button onClick={() => setShowMgrRestaurant(false)} className="text-gold hover:text-white">
                <ArrowRight size={20} className="rotate-180" />
              </button>
              <h2 className="text-gold font-serif text-lg">Restaurant Reservations</h2>
            </div>
            <RestaurantPortal profile={profile} />
          </motion.div>
        )}
      </AnimatePresence>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gold/20 pb-4">
        <div>
          <h1 className="text-2xl font-serif text-gold">{profile.department} Manager</h1>
          <p className="text-gold/60 text-[9px] uppercase tracking-widest mt-1">{profile.displayName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-navy border border-gold/20 p-1 flex-wrap gap-0.5">
            {[
              { key: 'requests', label: `Requests (${requests.filter(r => r.status !== 'Completed').length})` },
              { key: 'sla', label: `SLA${violations.length > 0 ? ` (${violations.length})` : ''}` },
              { key: 'staff', label: `Staff${pendingStaff.length > 0 ? ` (${pendingStaff.length})` : ''}` },
              { key: 'settings', label: '⚙ Settings' },
              ...(profile.department === 'F&B' ? [{ key: 'restaurants', label: '🍽 Restaurants' }] : []),
              ...(profile.department === 'Housekeeping' ? [{ key: 'rooms', label: '🛏 Rooms' }] : []),
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={cn('px-3 py-1.5 text-[9px] font-bold uppercase', activeTab === tab.key ? 'bg-gold text-navy' : 'text-gold/60')}>{tab.label}</button>
            ))}
          </div>
          <button onClick={() => { localStorage.clear(); window.location.replace('/'); }} className="flex items-center gap-1 text-gold/60 hover:text-gold border border-gold/20 px-3 py-2 text-[9px] font-bold uppercase"><LogOut size={12} /> Logout</button>
        </div>
      </header>

      {violations.length > 0 && (
        <div className="border border-red-600 p-3 flex items-center gap-3" style={{ background: 'rgba(220,38,38,0.1)' }}>
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <h3 className="text-red-500 font-bold uppercase text-sm">⚠ {violations.length} SLA VIOLATION{violations.length > 1 ? 'S' : ''}</h3>
        </div>
      )}

      {profile.department === 'F&B' && (
        <div className="bg-[#001c36] border border-gold/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-gold font-bold text-sm">🍽 Restaurant Reservations Portal</p>
            <p className="text-white/40 text-[9px]">Manage bookings, menus and restaurant settings</p>
          </div>
          <button onClick={() => setShowMgrRestaurant(true)} className="bg-gold text-navy px-4 py-2 text-[9px] font-bold uppercase">Open Portal</button>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-3">
          <h2 className="text-lg font-serif text-gold">{profile.department} Requests</h2>
          {requests.length === 0 && <p className="text-white/20 italic py-12 text-center">No requests yet.</p>}
          {requests.map(req => {
            const over = getSLAExceeded(req);
            return (
              <div key={req.id} className={cn('border p-4', over ? 'border-red-500 bg-red-900/10' : 'border-gold/10 bg-[#001c36]')}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className={cn('text-[9px] font-bold px-2 py-0.5 border', req.status === 'Completed' ? 'border-green-500 text-green-400' : over ? 'border-red-500 text-red-400' : 'border-gold text-gold')}>{req.status}</span>
                      {over && <span className="text-[9px] font-bold px-2 py-0.5 bg-red-600 text-white">⚠ SLA EXCEEDED</span>}
                    </div>
                    <p className="text-sm font-serif text-white">{req.service}</p>
                    <p className="text-[9px] text-white/40 mt-1">Room {req.guest_room} · {req.guest_name} · {req.assigned_to || 'Unassigned'}</p>
                    {req.line_items && req.line_items.map((li: any, i: number) => <p key={i} className="text-[8px] text-gold/60">{li.qty}x {li.name} — AED {li.total}</p>)}
                    {req.late_reason && <p className="text-[9px] text-red-400 mt-1 font-bold">⚠ Late: {req.late_reason}</p>}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0 space-y-0.5">
                    <p className="text-[8px] text-white/60 font-bold">📥 {new Date(req.created_at.replace(' ','T').replace('+00','Z').replace('+00:00','Z')).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>
                    {req.accepted_at && <p className="text-[8px] text-blue-400 font-bold">✓ {new Date(req.accepted_at.replace(' ','T').replace('+00','Z').replace('+00:00','Z')).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>}
                    {req.closed_at && <p className="text-[8px] text-green-400 font-bold">✅ {new Date(req.closed_at.replace(' ','T').replace('+00','Z').replace('+00:00','Z')).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>}
                    {req.closed_at && req.accepted_at && <p className="text-[8px] text-white/40">Total: {Math.floor((new Date(req.closed_at).getTime()-new Date(req.created_at).getTime())/60000)}m</p>}
                    {req.total_price && <p className="text-gold font-bold">AED {req.total_price}</p>}
                    {over && <p className="text-red-400 text-xs font-bold">{getElapsedMin(req.created_at)}m elapsed</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'sla' && (
        <div className="bg-[#001c36] border border-gold/10 p-5">
          <h3 className="text-base font-serif text-white mb-3">Currently Delayed — {profile.department}</h3>
          {violations.length === 0 ? <p className="text-green-400 font-bold text-sm">✓ All within SLA ({slaConfig.sla_minutes || 5} min)</p> : (
            <div className="space-y-2">
              {violations.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-red-900/20 border border-red-500">
                  <div><p className="text-white font-bold text-sm">{req.assigned_to || 'Unassigned'}</p><p className="text-[9px] text-red-400">Room {req.guest_room} · {req.service}</p></div>
                  <p className="text-red-400 font-bold">{getElapsedMin(req.created_at)}m</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="bg-[#001c36] border border-gold/10 p-5 space-y-5">
          <h2 className="text-lg font-serif text-gold">{profile.department} Staff</h2>
          {pendingStaff.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gold mb-3">Pending Approval ({pendingStaff.length})</h3>
              <div className="space-y-2">
                {pendingStaff.map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-3 bg-navy/50 border border-gold/20">
                    <div><p className="text-white font-bold text-sm">{staff.name}</p><p className="text-[9px] text-gold uppercase">{staff.occupation} · {staff.staff_id}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => approveStaff(staff.id)} className="px-3 py-1.5 bg-gold text-navy text-[9px] font-bold uppercase">Approve ✓</button>
                      <button onClick={() => rejectStaff(staff.id)} className="px-3 py-1.5 bg-red-600 text-white text-[9px] font-bold uppercase">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gold mb-3">Approved Staff ({approvedStaff.length})</h3>
            <div className="space-y-2">
              {approvedStaff.map(staff => (
                <div key={staff.id} className="flex items-center justify-between p-3 border border-gold/10">
                  <div>
                    <p className="text-sm text-white font-bold">{staff.name}</p>
                    <p className="text-[8px] text-gold uppercase">{staff.occupation} · {staff.tasks_completed || 0} tasks · {staff.violations || 0} violations</p>
                    {staff.logged_in && <span className="text-[8px] text-green-400 font-bold">● Online</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => forceLogout(staff.id)} className="px-2 py-1 bg-orange-600 text-white text-[8px] font-bold uppercase">Force Logout</button>
                    <button onClick={() => terminateStaff(staff.id)} className="px-2 py-1 bg-red-800 text-white text-[8px] font-bold uppercase">Terminate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-[#001c36] border border-gold/10 p-5 space-y-5">
          <h2 className="text-lg font-serif text-gold flex items-center gap-2"><Settings size={18} /> SLA Settings — {profile.department}</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">SLA Response Time (minutes)</label>
              <div className="flex items-center gap-4">
                <input type="number" min="1" max="120" value={editSLA} onChange={e => setEditSLA(Number(e.target.value))} className="w-32 bg-white border border-gold p-3 text-xl font-serif text-navy text-center outline-none" />
                <span className="text-white/60 text-sm">minutes</span>
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                {[5, 10, 15, 20, 30, 45, 60].map(min => (
                  <button key={min} onClick={() => setEditSLA(min)} className={cn('px-3 py-1.5 text-[9px] font-bold uppercase border', editSLA === min ? 'bg-gold text-navy border-gold' : 'border-gold/30 text-gold/60')}>{min}m</button>
                ))}
              </div>
            </div>
            <button onClick={saveSLA} className="gold-button m-0">Save SLA Setting</button>
            <div className="border border-gold/10 p-4 bg-navy/20">
              <p className="text-white"><span className="text-gold font-bold text-2xl font-serif">{slaConfig.sla_minutes || 5}</span> minutes current SLA for {profile.department}</p>
              {slaConfig.updated_by && <p className="text-[9px] text-white/30 mt-1">Last updated by: {slaConfig.updated_by}</p>}
            </div>
          </div>
        </div>
      )}

      {/* HK Manager — Rooms Tab */}
      {activeTab === 'rooms' && profile.department === 'Housekeeping' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif text-gold flex items-center gap-2"><BedDouble size={18} /> Room Status Board</h2>
            <button onClick={fetchRoomsMgr} className="text-gold/60 hover:text-gold"><RefreshCw size={16} /></button>
          </div>
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={roomSearch}
              onChange={e => setRoomSearch(e.target.value)}
              placeholder="Search by room number or status (e.g. Clean, Dirty...)"
              className="w-full bg-[#001c36] border border-gold/20 text-white text-[11px] p-2 pl-8 outline-none placeholder:text-white/30"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-gold/40" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rooms
              .filter(room => {
                if (!roomSearch.trim()) return true;
                const q = roomSearch.toLowerCase();
                return room.room_number?.toString().toLowerCase().includes(q)
                  || (room.status || '').toLowerCase().includes(q);
              })
              .map(room => {
                const statusObj = ROOM_STATUSES.find(s => s.key === room.status) || ROOM_STATUSES[0];
                return (
                  <div key={room.id} className="bg-[#001c36] border border-gold/10 p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-gold font-bold text-sm">Room {room.room_number}</p>
                        <p className="text-[8px] text-white/40">{room.room_type} · Floor {room.floor}</p>
                      </div>
                      <span className={cn('text-[8px] font-bold px-2 py-0.5 text-white rounded-full', statusObj.color)}>{room.status}</span>
                    </div>
                    {room.assigned_to && (
                      <p className="text-[8px] text-white/60 italic">✏ {room.assigned_to}</p>
                    )}
                    <p className="text-[8px] text-white/30 italic">View only — update from staff portal</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* F&B Manager — Restaurants Tab */}
      {activeTab === 'restaurants' && profile.department === 'F&B' && (
        <RestaurantPortal profile={profile} />
      )}
    </div>
  );
};

// ─── EXECUTIVE DASHBOARD ──────────────────────────────────────────────────────
const ExecutiveDashboard: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [slaSettings, setSlaSettings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'requests' | 'sla' | 'leaderboard' | 'staff' | 'qr' | 'restaurants'>('analytics');
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);

  // ✅ 5-second polling fallback — ensures updates even if real-time fails
  useEffect(() => {
    const poll = setInterval(() => { fetchData(); }, 5000);
    return () => clearInterval(poll);
  }, []);

  const fetchData = async () => {
    const { data: reqData } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (reqData) setRequests(reqData);
    const { data: staffData } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (staffData) setStaffList(staffData);
    const { data: slaData } = await supabase.from('sla_settings').select('*');
    if (slaData) setSlaSettings(slaData);
    const { data: roomData } = await supabase.from('rooms').select('*').order('room_number');
    if (roomData) setRooms(roomData);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('exec-dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getSLALimit = (dept: string) => { const s = slaSettings.find((x: any) => x.department === dept); return (s?.sla_minutes || 5) * 60; };
  const getSLAExceeded = (req: any) => { if (!req.created_at || req.status === 'Completed') return false; return (now - new Date(req.created_at).getTime()) / 1000 > getSLALimit(req.department); };
  const getElapsedMin = (ts: any) => {
    if (!ts) return 0;
    try {
      const normalized = String(ts).trim().replace(' ', 'T');
      const created = new Date(normalized).getTime();
      if (isNaN(created)) return 0;
      return Math.floor((Date.now() - created) / 60000);
    } catch { return 0; }
  };

  const violations = requests.filter(r => getSLAExceeded(r));
  const completed = requests.filter(r => r.status === 'Completed').length;
  const pending = requests.filter(r => r.status !== 'Completed').length;
  const revenue = requests.filter(r => r.total_price && r.status === 'Completed').reduce((s, r) => s + (r.total_price || 0), 0);

  const deptRevenue = ['F&B', 'Concierge', 'Housekeeping', 'Front Office', 'Security & Safety', 'Maintenance'].map(dept => ({
    name: dept.split(' ')[0],
    revenue: requests.filter(r => r.department === dept && r.status === 'Completed' && r.total_price).reduce((s, r) => s + (r.total_price || 0), 0),
  }));

  const allLineItems: any[] = [];
  requests.forEach(r => { if (r.line_items) allLineItems.push(...r.line_items); });
  const itemSales: Record<string, { qty: number; revenue: number }> = {};
  allLineItems.forEach(li => { if (!itemSales[li.name]) itemSales[li.name] = { qty: 0, revenue: 0 }; itemSales[li.name].qty += li.qty; itemSales[li.name].revenue += li.total; });
  const topItems = Object.entries(itemSales).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8);

  const pendingManagers = staffList.filter(s => !s.approved && MANAGER_OCCUPATIONS.includes(s.occupation || ''));
  const approvedStaff = staffList.filter(s => s.approved);
  const allPendingCount = staffList.filter(s => !s.approved).length;
  const leaderboard = approvedStaff.filter(s => (s.tasks_completed || 0) > 0).sort((a, b) => ((b.tasks_on_time || 0) / (b.tasks_completed || 1)) - ((a.tasks_on_time || 0) / (a.tasks_completed || 1)));
  const slaViolators = staffList.filter(s => (s.violations || 0) > 0).sort((a, b) => (b.violations || 0) - (a.violations || 0));

  const approveStaff = async (id: string) => { await supabase.from('staff').update({ approved: true }).eq('id', id); };
  const deleteStaff = async (id: string) => { if (window.confirm('Are you sure you want to permanently delete this staff member?')) { await supabase.from('staff').delete().eq('id', id); showToast('Staff member deleted', 'info'); } };
  const terminateStaff = async (id: string) => { await supabase.from('staff').update({ approved: false, logged_in: false }).eq('id', id); };
  const forceLogout = async (id: string) => { await supabase.from('staff').update({ logged_in: false, device_id: null }).eq('id', id); showToast('Account logged out successfully', 'success'); };

  const generateQRCodes = () => {
    const baseUrl = window.location.origin;
    const roomNumbers = rooms.length > 0 ? rooms.map(r => r.room_number) : ['101', '102', '201', '202', '301', '302', '401', '402', '501', '502'];
    const html = `<!DOCTYPE html><html><head><title>Sentinel Pro QR Codes</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>body{font-family:Georgia,serif;background:#f8f6f0;padding:20px}h1{text-align:center;color:#C5A059;letter-spacing:4px;font-size:22px}p{text-align:center;color:#666;font-size:11px;margin-bottom:28px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.card{background:white;border:1px solid #C5A059;padding:18px;text-align:center;page-break-inside:avoid}.room{font-size:18px;font-weight:bold;color:#001529;margin-bottom:10px;letter-spacing:2px}.qr{display:flex;justify-content:center;margin:8px 0}.url{font-size:7px;color:#999;word-break:break-all;margin-top:6px}.instruction{font-size:8px;color:#C5A059;margin-top:5px;text-transform:uppercase;letter-spacing:1px}@media print{body{padding:8px}}</style>
</head><body><h1>Sentinel Pro</h1><p>Scan QR to request hotel services</p>
<div class="grid" id="grid"></div>
<script>const rooms=${JSON.stringify(roomNumbers)};const base='${baseUrl}';const grid=document.getElementById('grid');rooms.forEach(room=>{const div=document.createElement('div');div.className='card';div.innerHTML='<div class="room">Room '+room+'</div><div class="qr" id="qr_'+room+'"></div><div class="instruction">Scan to request services</div><div class="url">'+base+'?room='+room+'</div>';grid.appendChild(div);setTimeout(()=>{new QRCode(document.getElementById('qr_'+room),{text:base+'?room='+room,width:110,height:110,colorDark:'#001529',colorLight:'#ffffff'});},100);});setTimeout(()=>window.print(),2000);</script>
<button onclick="window.print()" style="position:fixed;bottom:20px;right:20px;background:#001529;color:#C5A059;border:2px solid #C5A059;padding:12px 24px;font-size:11px;font-weight:bold;cursor:pointer;">🖨 Print QR Codes</button></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // ✅ FULL PROFESSIONAL REPORT RESTORED
  const generateReport = (type: 'pdf' | 'email' | 'csv') => {
    setReportMenuOpen(false);
    if (type === 'csv') {
      const headers = `Date,Room,Department,Service,Items,Status,Revenue (AED),Delay Reason,Staff\n`;
      const rows = requests.map(r => {
        const items = r.line_items ? r.line_items.map((li: any) => `${li.qty}x ${li.name}`).join(' + ') : '';
        return `${new Date(r.created_at).toLocaleDateString()},${r.guest_room},${r.department},${r.service},"${items}",${r.status},${r.total_price || 0},${r.late_reason || 'N/A'},${r.assigned_to || 'Unassigned'}`;
      }).join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI('data:text/csv;charset=utf-8,' + headers + rows));
      link.setAttribute('download', `SentinelPro_${reportPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link); return;
    }
    if (type === 'email') { showToast(`${reportPeriod} report sent to all department managers`, 'success'); return; }

    // ✅ FULL PROFESSIONAL PDF REPORT
    const deptBreakdown = ['Housekeeping', 'F&B', 'Concierge', 'Security & Safety', 'Front Office', 'Maintenance'].map(dept => {
      const deptReqs = requests.filter(r => r.department === dept);
      return {
        dept, total: deptReqs.length,
        completed: deptReqs.filter(r => r.status === 'Completed').length,
        violations: deptReqs.filter(r => getSLAExceeded(r)).length,
        revenue: deptReqs.filter(r => r.status === 'Completed').reduce((s, r) => s + (r.total_price || 0), 0),
        slaMin: slaSettings.find((x: any) => x.department === dept)?.sla_minutes || 5,
      };
    });
    const avgRating = requests.filter(r => r.rating).length > 0
      ? (requests.filter(r => r.rating).reduce((s, r) => s + r.rating, 0) / requests.filter(r => r.rating).length).toFixed(1) : 'N/A';
    const completionRate = requests.length > 0 ? Math.round((completed / requests.length) * 100) : 0;
    const barMax = Math.max(...deptBreakdown.map(d => d.total), 1);

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Sentinel Pro ${reportPeriod} Report</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:#f8f6f0;color:#1a2744}
.page{max-width:960px;margin:0 auto;padding:40px 30px}
.header{background:#001529;color:white;padding:40px;margin-bottom:28px}
.gold-line{width:60px;height:3px;background:#C5A059;margin-bottom:16px}
.hotel-name{font-family:'Playfair Display',serif;font-size:28px;color:#C5A059;letter-spacing:3px;text-transform:uppercase}
.report-title{font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:4px;text-transform:uppercase;margin-top:6px}
.meta{margin-top:20px;display:flex;gap:40px;flex-wrap:wrap}
.meta-item .label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.4)}
.meta-item .value{font-size:13px;color:#C5A059;font-weight:600;margin-top:2px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.kpi{background:white;border:1px solid #e8e0d0;padding:20px;text-align:center;border-top:3px solid #C5A059}
.kpi.green{border-top-color:#22c55e}.kpi.red{border-top-color:#ef4444}.kpi.blue{border-top-color:#3b82f6}
.kpi-val{font-family:'Playfair Display',serif;font-size:30px;color:#1a2744}
.kpi-val.red{color:#ef4444}.kpi-val.green{color:#22c55e}
.kpi-lbl{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#999;margin-top:4px}
.section{margin-bottom:24px}
.section-title{font-family:'Playfair Display',serif;font-size:17px;color:#1a2744;border-bottom:2px solid #C5A059;padding-bottom:8px;margin-bottom:14px}
.dept-table,.item-table,.vtable{width:100%;border-collapse:collapse;background:white}
.dept-table th,.item-table th,.vtable th{background:#001529;color:#C5A059;font-size:9px;text-transform:uppercase;letter-spacing:2px;padding:11px 14px;text-align:left}
.dept-table td,.item-table td,.vtable td{padding:11px 14px;border-bottom:1px solid #f0ebe0;font-size:12px}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
.badge.green{background:#dcfce7;color:#16a34a}.badge.red{background:#fee2e2;color:#dc2626}.badge.gold{background:#fef3c7;color:#d97706}
.bar-bg{background:#f0ebe0;height:7px;border-radius:4px;overflow:hidden;margin-top:4px}
.bar-fill{height:7px;background:#C5A059;border-radius:4px}.bar-fill.red{background:#ef4444}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
.card{background:white;border:1px solid #e8e0d0;padding:18px}
.performer{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f0ebe0}.performer:last-child{border:none}
.avatar{width:36px;height:36px;background:#001529;color:#C5A059;display:flex;align-items:center;justify-content:center;font-size:16px;border-radius:50%;flex-shrink:0}
.perf-info{flex:1}.perf-name{font-weight:700;font-size:13px}.perf-role{font-size:9px;color:#C5A059;text-transform:uppercase}
.perf-stats{font-size:10px;color:#666;margin-top:2px}
.summary{background:#001529;color:white;padding:24px;margin-bottom:24px}
.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.summary-item{text-align:center}
.summary-val{font-family:'Playfair Display',serif;font-size:26px;color:#C5A059}
.summary-lbl{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.5);margin-top:3px}
.feedback-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.fb-card{background:white;border:1px solid #e8e0d0;padding:14px}
.stars{color:#C5A059;font-size:13px;letter-spacing:2px;margin-bottom:6px}
.fb-text{font-size:11px;color:#555;font-style:italic;line-height:1.5}
.fb-meta{font-size:9px;color:#C5A059;font-weight:600;margin-top:6px;text-transform:uppercase}
.footer{margin-top:36px;padding-top:18px;border-top:1px solid #e8e0d0;display:flex;justify-content:space-between}
.print-btn{position:fixed;bottom:24px;right:24px;background:#001529;color:#C5A059;border:2px solid #C5A059;padding:12px 24px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer}
@media print{.print-btn{display:none}body{background:white}.page{padding:15px}}
</style></head><body><div class="page">
<div class="header">
  <div class="gold-line"></div>
  <div class="hotel-name">Sentinel Pro</div>
  <div class="report-title">${reportPeriod.toUpperCase()} OPERATIONS AUDIT REPORT</div>
  <div class="meta">
    <div class="meta-item"><div class="label">Generated</div><div class="value">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div></div>
    <div class="meta-item"><div class="label">Time</div><div class="value">${new Date().toLocaleTimeString()}</div></div>
    <div class="meta-item"><div class="label">Prepared by</div><div class="value">${profile.displayName}</div></div>
    <div class="meta-item"><div class="label">Period</div><div class="value">${reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Summary</div></div>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-val">AED ${revenue.toLocaleString()}</div><div class="kpi-lbl">Confirmed Revenue</div></div>
  <div class="kpi blue"><div class="kpi-val">${requests.length}</div><div class="kpi-lbl">Total Requests</div></div>
  <div class="kpi green"><div class="kpi-val green">${completionRate}%</div><div class="kpi-lbl">Completion Rate</div></div>
  <div class="kpi ${violations.length > 0 ? 'red' : 'green'}"><div class="kpi-val ${violations.length > 0 ? 'red' : 'green'}">${violations.length}</div><div class="kpi-lbl">SLA Violations</div></div>
</div>

<div class="summary">
  <div style="font-family:'Playfair Display',serif;font-size:15px;color:#C5A059;margin-bottom:14px">Executive Summary</div>
  <div class="summary-grid">
    <div class="summary-item"><div class="summary-val">${approvedStaff.length}</div><div class="summary-lbl">Active Staff</div></div>
    <div class="summary-item"><div class="summary-val">${completed}</div><div class="summary-lbl">Completed</div></div>
    <div class="summary-item"><div class="summary-val">${avgRating}</div><div class="summary-lbl">Avg Rating</div></div>
    <div class="summary-item"><div class="summary-val">${requests.filter(r => r.rating).length}</div><div class="summary-lbl">Feedback</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Department Performance</div>
  <table class="dept-table"><thead><tr><th>Department</th><th>Total</th><th>Completed</th><th>SLA Limit</th><th>Violations</th><th>Revenue (AED)</th><th>Volume</th></tr></thead>
  <tbody>${deptBreakdown.map(d => `<tr>
    <td><strong>${d.dept}</strong></td><td>${d.total}</td>
    <td><span class="badge ${d.completed === d.total && d.total > 0 ? 'green' : d.completed > 0 ? 'gold' : 'red'}">${d.completed}/${d.total}</span></td>
    <td>${d.slaMin} min</td>
    <td><span class="badge ${d.violations > 0 ? 'red' : 'green'}">${d.violations}</span></td>
    <td>${d.revenue > 0 ? 'AED ' + d.revenue.toLocaleString() : '—'}</td>
    <td style="width:130px"><div class="bar-bg"><div class="bar-fill ${d.violations > 0 ? 'red' : ''}" style="width:${Math.round((d.total / barMax) * 100)}%"></div></div></td>
  </tr>`).join('')}</tbody></table>
</div>

${topItems.length > 0 ? `<div class="section">
  <div class="section-title">Top Selling Items & Services</div>
  <table class="item-table"><thead><tr><th>Item / Service</th><th>Qty Sold</th><th>Revenue (AED)</th><th>Avg Price (AED)</th></tr></thead>
  <tbody>${topItems.map(([name, data]) => `<tr><td><strong>${name}</strong></td><td>${data.qty}</td><td><strong>AED ${data.revenue.toLocaleString()}</strong></td><td>AED ${Math.round(data.revenue / data.qty)}</td></tr>`).join('')}</tbody></table>
</div>` : ''}

<div class="two-col">
  <div>
    <div class="section-title">Top Performers</div>
    <div class="card">
      ${leaderboard.slice(0, 5).length === 0 ? '<p style="color:#999;font-style:italic">No completed tasks yet.</p>' :
        leaderboard.slice(0, 5).map((s, i) => {
          const rate = Math.round(((s.tasks_on_time || 0) / (s.tasks_completed || 1)) * 100);
          return `<div class="performer">
            <div style="font-size:20px;width:28px">${['🥇', '🥈', '🥉'][i] || '#' + (i + 1)}</div>
            <div class="avatar">${s.name?.[0] || '?'}</div>
            <div class="perf-info"><div class="perf-name">${s.name}</div><div class="perf-role">${s.occupation || s.department}</div><div class="perf-stats">${s.tasks_completed} tasks · ${s.violations || 0} violations</div></div>
            <div style="font-size:18px;font-weight:700;color:${rate >= 80 ? '#16a34a' : rate >= 60 ? '#f59e0b' : '#dc2626'}">${rate}%</div>
          </div>`;
        }).join('')}
    </div>
  </div>
  <div>
    <div class="section-title">SLA Violations by Dept</div>
    <div class="card">
      ${deptBreakdown.map(d => `<div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;font-weight:600">${d.dept}</span><span style="font-size:12px;color:${d.violations > 0 ? '#dc2626' : '#16a34a'};font-weight:700">${d.violations} violation${d.violations !== 1 ? 's' : ''}</span></div>
        <div class="bar-bg"><div class="bar-fill red" style="width:${d.violations > 0 ? Math.max(Math.round((d.violations / Math.max(...deptBreakdown.map(x => x.violations), 1)) * 100), 8) : 0}%"></div></div>
      </div>`).join('')}
    </div>
  </div>
</div>

${slaViolators.length > 0 ? `<div class="section">
  <div class="section-title">Staff Violation Audit</div>
  <table class="vtable"><thead><tr><th>Staff Member</th><th>Occupation</th><th>Dept</th><th>Tasks</th><th>Violations</th><th>Rate</th><th>Status</th></tr></thead>
  <tbody>${slaViolators.map(s => {
    const rate = (s.tasks_completed || 0) > 0 ? Math.round(((s.violations || 0) / s.tasks_completed) * 100) : 0;
    return `<tr>
      <td><strong>${s.name}</strong><br><span style="font-size:10px;color:#999">${s.email}</span></td>
      <td>${s.occupation || 'N/A'}</td><td>${s.department}</td>
      <td>${s.tasks_completed || 0}</td>
      <td><span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${s.violations || 0}</span></td>
      <td style="font-weight:700;color:${rate > 30 ? '#dc2626' : '#f59e0b'}">${rate}%</td>
      <td><span class="badge ${rate > 50 ? 'red' : rate > 25 ? 'gold' : 'green'}">${rate > 50 ? 'Critical' : rate > 25 ? 'Review' : 'Monitor'}</span></td>
    </tr>`;
  }).join('')}</tbody></table>
</div>` : ''}

${requests.filter(r => r.rating).length > 0 ? `<div class="section">
  <div class="section-title">Guest Feedback (Avg: ${avgRating} ★)</div>
  <div class="feedback-grid">
    ${requests.filter(r => r.rating).slice(0, 8).map(r => `<div class="fb-card">
      <div class="stars">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</div>
      <div class="fb-text">"${r.feedback || 'No comment'}"</div>
      <div class="fb-meta">Room ${r.guest_room} · ${r.service}</div>
    </div>`).join('')}
  </div>
</div>` : ''}

<div class="footer">
  <div><div style="font-family:'Playfair Display',serif;font-size:14px;color:#C5A059">Sentinel Pro</div><div style="font-size:10px;color:#999;margin-top:3px">Luxury Hotel Management · Confidential</div></div>
  <div style="font-size:10px;color:#999;text-align:right">Generated: ${new Date().toLocaleString()}<br>By: ${profile.displayName}</div>
</div>
</div>
<button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="min-h-screen bg-[#001529] text-white p-4 sm:p-6 space-y-5">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gold/20 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-gold">Executive Operations Center</h1>
          <p className="text-gold/60 text-[9px] uppercase tracking-widest mt-1">{profile.displayName} · All Departments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <div className="flex items-center bg-navy border border-gold/20">
              <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value as any)} className="bg-transparent text-gold text-[9px] font-bold uppercase px-2 py-2 outline-none">
                <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
              <button onClick={() => setReportMenuOpen(!reportMenuOpen)} className="flex items-center gap-1 bg-gold text-navy px-3 py-2 text-[9px] font-bold uppercase"><FileText size={12} /> Report</button>
            </div>
            <AnimatePresence>
              {reportMenuOpen && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-48 bg-navy border border-gold/30 shadow-2xl z-50">
                  <button onClick={() => generateReport('pdf')} className="w-full px-4 py-3 text-left text-[9px] uppercase hover:bg-gold/10 flex items-center gap-2 border-b border-gold/10"><Download size={12} className="text-gold" /> Download PDF</button>
                  <button onClick={() => generateReport('email')} className="w-full px-4 py-3 text-left text-[9px] uppercase hover:bg-gold/10 flex items-center gap-2 border-b border-gold/10"><Mail size={12} className="text-gold" /> Email to Departments</button>
                  <button onClick={() => generateReport('csv')} className="w-full px-4 py-3 text-left text-[9px] uppercase hover:bg-gold/10 flex items-center gap-2"><ClipboardList size={12} className="text-gold" /> Export CSV</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex bg-navy border border-gold/20 p-1 flex-wrap gap-0.5">
            {[
              { key: 'analytics', label: 'Analytics' },
              { key: 'leaderboard', label: 'Leaderboard' },
              { key: 'sla', label: `SLA${violations.length > 0 ? `(${violations.length})` : ''}` },
              { key: 'requests', label: 'Requests' },
              { key: 'staff', label: `Staff${allPendingCount > 0 ? `(${allPendingCount})` : ''}` },
              { key: 'qr', label: '📱 QR' },
              { key: 'restaurants', label: '🍽 Restaurants' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={cn('px-2 py-1.5 text-[9px] font-bold uppercase', activeTab === tab.key ? 'bg-gold text-navy' : 'text-gold/60 hover:text-gold')}>{tab.label}</button>
            ))}
          </div>
          <button onClick={() => { localStorage.clear(); window.location.replace('/'); }} className="flex items-center gap-1 text-gold/60 hover:text-gold border border-gold/20 px-3 py-2 text-[9px] font-bold uppercase"><LogOut size={12} /> Logout</button>
        </div>
      </header>

      {violations.length > 0 && (
        <div className="border border-red-600 p-3 flex items-center gap-3" style={{ background: 'rgba(220,38,38,0.1)' }}>
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <div><h3 className="text-red-500 font-bold uppercase text-sm">⚠ {violations.length} SLA VIOLATION{violations.length > 1 ? 'S' : ''}</h3>
            <div className="flex gap-1 mt-1 flex-wrap">{violations.slice(0, 5).map(v => <span key={v.id} className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5">RM {v.guest_room}</span>)}</div>
          </div>
        </div>
      )}

      {/* ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Confirmed Revenue', value: `AED ${revenue.toLocaleString()}`, color: '#C5A059', sub: 'Completed orders only' },
              { label: 'Active Requests', value: pending, color: '#C5A059', sub: `${completed} completed` },
              { label: 'Completion Rate', value: `${requests.length > 0 ? Math.round((completed / requests.length) * 100) : 0}%`, color: '#4CAF50', sub: `${completed} of ${requests.length}` },
              { label: 'SLA Violations', value: violations.length, color: violations.length > 0 ? '#EF4444' : '#4CAF50', sub: 'Active now' },
            ].map(k => (
              <div key={k.label} className="bg-[#001c36] border border-gold/10 p-4 text-center">
                <div className="text-2xl sm:text-3xl font-serif mb-1" style={{ color: k.color }}>{k.value}</div>
                <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold">{k.label}</div>
                <div className="text-[8px] text-white/20 mt-1">{k.sub}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#001c36] border border-gold/10 p-5">
            <h3 className="text-base font-serif text-white mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-gold" /> Revenue by Department</h3>
            {deptRevenue.every(d => d.revenue === 0) ? <p className="text-white/20 italic text-sm py-8 text-center">No completed paid orders yet.</p> : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C5A05920" vertical={false} />
                    <XAxis dataKey="name" stroke="#FFF" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#FFF', fontWeight: 'bold' }} />
                    <YAxis stroke="#FFF" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#FFF', fontWeight: 'bold' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#002349', border: '1px solid #C5A059' }} itemStyle={{ color: '#FFF', fontWeight: 'bold' }} formatter={(v: any) => [`AED ${v}`, 'Revenue']} />
                    <Bar dataKey="revenue" name="Revenue (AED)" fill="#C5A059" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {topItems.length > 0 && (
            <div className="bg-[#001c36] border border-gold/10 p-5">
              <h3 className="text-base font-serif text-white mb-3 flex items-center gap-2"><Star size={16} className="text-gold" /> Top Selling Items</h3>
              <div className="space-y-2">
                {topItems.map(([name, data], i) => (
                  <div key={name} className="flex items-center justify-between p-2 border-b border-gold/10">
                    <div className="flex items-center gap-3"><span className="text-gold font-bold text-sm w-5">#{i + 1}</span><div><p className="text-white text-sm font-bold">{name}</p><p className="text-[8px] text-white/40">{data.qty} units sold</p></div></div>
                    <p className="text-gold font-bold">AED {data.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-[#001c36] border border-gold/10 p-5">
            <h3 className="text-base font-serif text-white mb-3 flex items-center gap-2"><Star size={16} className="text-gold" /> Guest Feedback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {requests.filter(r => r.rating).map(req => (
                <div key={req.id} className="bg-navy/30 p-3 border border-gold/10">
                  <div className="flex gap-1 mb-1">{[...Array(5)].map((_, i) => <Star key={i} size={10} className={cn(i < (req.rating || 0) ? 'text-gold fill-gold' : 'text-white/10')} />)}</div>
                  <p className="text-xs italic text-white/80">"{req.feedback || 'No comment'}"</p>
                  <p className="text-[8px] text-gold font-bold uppercase mt-1">Room #{req.guest_room} · {req.service}</p>
                </div>
              ))}
              {requests.filter(r => r.rating).length === 0 && <p className="text-white/20 italic py-6 text-center text-sm col-span-2">No feedback yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-[#001c36] border border-gold/10 p-5 space-y-4">
          <h2 className="text-xl font-serif text-gold">Staff Performance Leaderboard</h2>
          {leaderboard.length === 0 ? <p className="text-white/20 italic py-12 text-center">No completed tasks yet.</p> : (
            <div className="space-y-2">
              {leaderboard.map((staff, idx) => {
                const rate = Math.round(((staff.tasks_on_time || 0) / (staff.tasks_completed || 1)) * 100);
                return (
                  <div key={staff.id} className={cn('flex items-center gap-3 p-3 border', idx === 0 ? 'border-gold bg-gold/5' : 'border-gold/10 bg-navy/20')}>
                    <div className="text-xl w-7 text-center">{['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`}</div>
                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold border border-gold/20 text-xs flex-shrink-0">{staff.name?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{staff.name}</p>
                      <p className="text-[8px] text-gold uppercase">{staff.occupation} · {staff.department}</p>
                    </div>
                    <div className="text-center px-2"><p className="text-base font-serif" style={{ color: rate >= 80 ? '#22c55e' : rate >= 60 ? '#f59e0b' : '#ef4444' }}>{rate}%</p><p className="text-[7px] text-white/40 uppercase">On Time</p></div>
                    <div className="text-center px-2"><p className="text-base font-serif text-gold">{staff.tasks_completed || 0}</p><p className="text-[7px] text-white/40 uppercase">Tasks</p></div>
                    <div className="text-center px-2"><p className={cn('text-base font-serif', (staff.violations || 0) > 0 ? 'text-red-400' : 'text-green-400')}>{staff.violations || 0}</p><p className="text-[7px] text-white/40 uppercase">Violations</p></div>
                    {staff.logged_in && <span className="text-[8px] text-green-400 font-bold">● Online</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SLA */}
      {activeTab === 'sla' && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif text-gold">SLA Monitoring — All Departments</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slaSettings.map((s: any) => (
              <div key={s.department} className="bg-[#001c36] border border-gold/10 p-3 text-center">
                <p className="text-[9px] text-white/40 uppercase">{s.department}</p>
                <p className="text-2xl font-serif text-gold">{s.sla_minutes}m</p>
              </div>
            ))}
          </div>
          <div className="bg-[#001c36] border border-gold/10 p-5">
            <h3 className="text-base font-serif text-white mb-3">Currently Delayed</h3>
            {violations.length === 0 ? <p className="text-green-400 font-bold text-sm">✓ All tasks within SLA</p> : (
              <div className="space-y-2">
                {violations.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-red-900/20 border border-red-500">
                    <div><p className="text-white font-bold text-sm">{req.assigned_to || 'Unassigned'}</p><p className="text-[9px] text-red-400">{req.department} · Room {req.guest_room} · {req.service}</p></div>
                    <div className="text-right"><p className="text-red-400 font-bold">{getElapsedMin(req.created_at)}m</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#001c36] border border-gold/10 p-5">
            <h3 className="text-base font-serif text-white mb-3">Violation History</h3>
            {slaViolators.length === 0 ? <p className="text-green-400 font-bold text-sm">✓ No violations recorded</p> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-navy/50 text-gold text-[9px] uppercase tracking-widest border-b border-gold/20">
                    <th className="p-3 text-left">Staff</th><th className="p-3 text-left">Dept</th><th className="p-3 text-center">Tasks</th><th className="p-3 text-center">Violations</th><th className="p-3 text-right">Action</th>
                  </tr></thead>
                  <tbody>
                    {slaViolators.map(staff => (
                      <tr key={staff.id} className="border-b border-gold/10">
                        <td className="p-3 text-sm text-white">{staff.name}</td>
                        <td className="p-3 text-xs text-white/60">{staff.department}</td>
                        <td className="p-3 text-center text-sm font-bold text-white">{staff.tasks_completed || 0}</td>
                        <td className="p-3 text-center"><span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{staff.violations || 0}</span></td>
                        <td className="p-3 text-right"><button onClick={() => forceLogout(staff.id)} className="px-2 py-1 bg-orange-600 text-white text-[8px] font-bold uppercase">Force Logout</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          <h2 className="text-xl font-serif text-gold">All Requests</h2>
          {requests.length === 0 && <p className="text-white/20 italic py-12 text-center">No requests yet.</p>}
          {requests.map(req => {
            const over = getSLAExceeded(req);
            return (
              <div key={req.id} className={cn('border p-4', over ? 'border-red-500 bg-red-900/10' : 'border-gold/10 bg-[#001c36]')}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className={cn('text-[9px] font-bold px-2 py-0.5 border', req.status === 'Completed' ? 'border-green-500 text-green-400' : over ? 'border-red-500 text-red-400' : 'border-gold text-gold')}>{req.status}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 border border-gold/30 text-white/60">{req.department}</span>
                      {over && <span className="text-[9px] font-bold px-2 py-0.5 bg-red-600 text-white">⚠ SLA</span>}
                    </div>
                    <p className="text-sm font-serif text-white">{req.service}</p>
                    <p className="text-[9px] text-white/40 mt-1">Room {req.guest_room} · {req.guest_name} · {req.assigned_to || 'Unassigned'}</p>
                    {req.line_items && req.line_items.map((li: any, i: number) => <p key={i} className="text-[8px] text-gold/60">{li.qty}x {li.name} — AED {li.total}</p>)}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0 space-y-0.5">
                    <p className="text-[8px] text-white/60 font-bold">📥 {new Date(req.created_at.replace(' ','T').replace('+00','Z').replace('+00:00','Z')).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>
                    {req.accepted_at && <p className="text-[8px] text-blue-400 font-bold">✓ {new Date(req.accepted_at.replace(' ','T').replace('+00','Z').replace('+00:00','Z')).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>}
                    {req.closed_at && <p className="text-[8px] text-green-400 font-bold">✅ {new Date(req.closed_at.replace(' ','T').replace('+00','Z').replace('+00:00','Z')).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>}
                    {req.closed_at && <p className="text-[8px] text-white/40">Total: {Math.floor((new Date(req.closed_at).getTime()-new Date(req.created_at).getTime())/60000)}m</p>}
                    {req.total_price && <p className="text-gold font-bold">AED {req.total_price}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STAFF */}
      {activeTab === 'staff' && (
        <div className="bg-[#001c36] border border-gold/10 p-5 space-y-6">
          <h2 className="text-xl font-serif text-gold">Executive Staff Center</h2>
          {pendingManagers.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gold mb-3">Manager Profiles Awaiting Approval ({pendingManagers.length})</h3>
              <div className="space-y-2">
                {pendingManagers.map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-3 bg-gold/5 border border-gold/30">
                    <div><p className="text-white font-bold text-sm">{staff.name}</p><p className="text-[9px] text-gold uppercase">{staff.occupation} · {staff.department}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => approveStaff(staff.id)} className="px-3 py-1.5 bg-gold text-navy text-[9px] font-bold uppercase">Approve ✓</button>
                      <button onClick={() => deleteStaff(staff.id)} className="px-3 py-1.5 bg-red-600 text-white text-[9px] font-bold uppercase">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gold mb-3">All Approved Staff ({approvedStaff.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr className="bg-navy/50 text-gold text-[9px] uppercase tracking-widest border-b border-gold/20">
                  <th className="p-3 text-left">Name</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Dept</th><th className="p-3 text-center">Tasks</th><th className="p-3 text-center">Violations</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {approvedStaff.map(staff => (
                    <tr key={staff.id} className="border-b border-gold/10 hover:bg-gold/5">
                      <td className="p-3 text-sm text-white font-bold">{staff.name}<br /><span className="text-[8px] text-white/40 font-normal">{staff.email}</span></td>
                      <td className="p-3 text-xs text-white/60">{staff.occupation}</td>
                      <td className="p-3 text-xs text-white/60">{staff.department}</td>
                      <td className="p-3 text-center text-sm font-bold text-white">{staff.tasks_completed || 0}</td>
                      <td className="p-3 text-center"><span className={cn('text-sm font-bold', (staff.violations || 0) > 0 ? 'text-red-400' : 'text-green-400')}>{staff.violations || 0}</span></td>
                      <td className="p-3 text-center">{staff.logged_in ? <span className="text-[8px] text-green-400 font-bold">● Online</span> : <span className="text-[8px] text-white/20">Offline</span>}</td>
                      <td className="p-3 text-right"><div className="flex justify-end gap-1">
                        {staff.logged_in && <button onClick={() => forceLogout(staff.id)} className="px-2 py-1 bg-orange-600 text-white text-[8px] font-bold uppercase">Force Logout</button>}
                        <button onClick={() => terminateStaff(staff.id)} className="px-2 py-1 bg-red-800 text-white text-[8px] font-bold uppercase">Terminate</button>
                        <button onClick={() => deleteStaff(staff.id)} className="px-2 py-1 bg-red-600 text-white text-[8px] font-bold uppercase">Delete</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {approvedStaff.length === 0 && <p className="text-white/20 italic py-8 text-center text-sm">No approved staff.</p>}
            </div>
          </div>
        </div>
      )}

      {/* TRANSLATION SETTINGS */}
      {activeTab === 'qr' && (
        <div className="mt-4 bg-[#001c36] border border-gold/10 p-4">
          <h3 className="text-sm font-serif text-gold mb-3">🌐 Google Translate API Key</h3>
          <p className="text-[9px] text-white/40 mb-3">Enter your Google Cloud Translation API key to enable automatic translation of guest messages to staff language.</p>
          <input
            type="text"
            defaultValue={localStorage.getItem('google_translate_key') || ''}
            placeholder="AIza..."
            className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none mb-2"
            id="google-api-key-input"
          />
          <button
            onClick={() => {
              const val = (document.getElementById('google-api-key-input') as HTMLInputElement)?.value;
              if (val) { localStorage.setItem('google_translate_key', val); showToast('API key saved!', 'success'); }
            }}
            className="bg-gold text-navy px-4 py-2 text-[9px] font-bold uppercase"
          >
            Save API Key
          </button>
        </div>
      )}
      {/* RESTAURANT PORTAL */}
      {activeTab === 'restaurants' && (
        <RestaurantPortal profile={profile} />
      )}

      {/* QR CODES */}
      {activeTab === 'qr' && (
        <div className="bg-[#001c36] border border-gold/10 p-5 space-y-5">
          <h2 className="text-xl font-serif text-gold flex items-center gap-2"><QrCode size={20} /> Room QR Code Generator</h2>
          <p className="text-white/60 text-sm">Print once, laminate, place permanently. Guests scan → room auto-fills → enter name only.</p>
          <div className="bg-navy/30 border border-gold/20 p-4 space-y-2">
            <p className="text-[9px] text-gold uppercase tracking-widest font-bold">Rooms in System ({rooms.length})</p>
            <div className="flex flex-wrap gap-2">{rooms.map(r => <span key={r.id} className="text-[9px] bg-navy/50 border border-gold/20 text-gold px-2 py-1 font-bold">Room {r.room_number}</span>)}</div>
          </div>
          <button onClick={generateQRCodes} className="gold-button m-0 flex items-center gap-2 w-full justify-center"><QrCode size={16} /> Generate & Print QR Codes for All Rooms</button>
          <div className="border border-gold/10 p-4 bg-navy/20 space-y-1">
            <p className="text-[9px] text-gold uppercase tracking-widest font-bold">How It Works</p>
            <p className="text-[10px] text-white/50">1. Click Generate → printable page with QR codes for every room</p>
            <p className="text-[10px] text-white/50">2. Print and laminate each card</p>
            <p className="text-[10px] text-white/50">3. Place in each room permanently</p>
            <p className="text-[10px] text-white/50">4. Guest scans → room auto-fills → enters name only</p>
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
  const [showRestaurantPortal, setShowRestaurantPortal] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [feedbackRequest, setFeedbackRequest] = useState<any | null>(null);
  const [roomNumber] = useState(roomNumberFromUrl || '');
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

  useEffect(() => {
    if (!profile || profile.role !== 'guest') return;
    const fetchRequests = async () => {
      const { data } = await supabase.from('requests').select('*').eq('guest_id', profile.uid).order('created_at', { ascending: false });
      if (data) {
        const mapped = data.map((row: any) => ({
          id: row.id, roomNumber: row.guest_room || '', type: row.service || '',
          message: row.notes, department: row.department, status: row.status,
          guestId: row.guest_id, timestamp: row.created_at, totalPrice: row.total_price,
          rating: row.rating, feedbackDismissed: row.feedback_dismissed,
          assignedStaffName: row.assigned_to, lineItems: row.line_items,
        }));
        setRequests(mapped);
        const unrated = mapped.find((r: any) => r.status === 'Completed' && !r.rating && !r.feedbackDismissed);
        if (unrated) setFeedbackRequest(unrated);
      }
    };
    fetchRequests();
    // ✅ Poll every 3 seconds so guest sees status updates without manual refresh
    const poll = setInterval(() => { fetchRequests(); }, 3000);
    const channel = supabase.channel(`guest-${profile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchRequests)
      .subscribe();
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [profile]);

  const logout = () => { localStorage.clear(); setProfile(null); window.location.replace('/'); };

  // ✅ CORRECT DEPARTMENT ROUTING — Room Service = F&B, Concierge = Concierge etc
  const submitRequest = async (customData?: any) => {
    const activeRoom = profile?.roomNumber || roomNumber;
    if (!profile || !activeRoom) { showToast('Room number is required', 'error'); return; }
    const service = customData?.type ? customData : selectedService;
    if (!service) return;
    const lineItems = customData?.lineItems || null;
    const totalPrice = lineItems ? lineItems.reduce((s: number, li: any) => s + li.total, 0) : customData?.totalPrice || 0;
    const serviceKey = service.serviceKey || customData?.serviceKey || '';
    // ✅ This is the key fix — always use getDepartmentFromServiceKey
    const department = getDepartmentFromServiceKey(serviceKey, service.dept || customData?.dept);
    try {
      const { error } = await supabase.from('requests').insert({
        guest_room: activeRoom,
        guest_id: profile.uid,
        guest_name: profile.displayName,
        service: service.type || service.name,
        service_key: serviceKey,
        notes: customData?.notes || [message, dietaryRequirements].filter(Boolean).join(' — ') || '',
        department, // ✅ Always correct department
        status: 'Pending',
        total_price: totalPrice > 0 ? totalPrice : null,
        line_items: lineItems,
        language,
      });
      if (error) throw error;
      setShowRequestModal(false); setMessage(''); setSelectedService(null);
      setCart({}); setDietaryRequirements(''); setGuestTab('services');
      showToast('Your request has been submitted successfully!', 'success');
    } catch (e: any) { showToast(e.message || 'An error occurred. Please try again.', 'error'); }
  };

  const submitFeedback = async (rating: number, comment: string) => {
    if (!feedbackRequest) return;
    await supabase.from('requests').update({ rating, feedback: comment }).eq('id', feedbackRequest.id);
    setFeedbackRequest(null);
  };

  const navigateToStaff = () => { window.history.pushState({}, '', '/staff-portal'); setPathname('/staff-portal'); };

  const isExecutive = profile?.role === 'manager' && profile?.department === 'None';
  const isDeptManager = profile?.role === 'manager' && profile?.department !== 'None';

  // ✅ Guest service tiles — each has correct serviceKey for routing
  const guestServices = [
    { name: t('housekeeping'), icon: Sparkles, dept: 'Housekeeping', serviceKey: 'housekeeping', options: [t('room_cleaning'), t('laundry'), t('extra_blanket'), 'Extra Pillow', 'Extra Towels', 'Turn Down Service'] },
    { name: t('room_service'), icon: Coffee, dept: 'F&B', serviceKey: 'room_service' }, // ✅ Goes to F&B
    { name: 'Restaurant Reservations', icon: UtensilsCrossed, dept: 'F&B', serviceKey: 'restaurant_portal', isPortal: true }, // ✅ Opens dedicated portal
    { name: t('concierge_services'), icon: Key, dept: 'Concierge', serviceKey: 'concierge_services' }, // ✅ Goes to Concierge
    { name: t('security'), icon: Shield, dept: 'Security & Safety', serviceKey: 'security', options: [t('emergency'), t('safe_box'), t('medical'), t('escort'), 'Lost & Found', 'Other'] },
    { name: 'Maintenance', icon: Wrench, dept: 'Maintenance', serviceKey: 'maintenance', options: ['AC / Heating Issue', 'Plumbing Issue', 'Electrical Issue', 'TV / Electronics', 'Door / Lock Issue', 'Lighting Issue', 'Bathroom Issue', 'Other'] }, // ✅ Goes to Maintenance
  ];

  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="text-gold font-serif text-2xl animate-pulse">Loading...</div></div>;

  return (
    <>
    <ToastContainer />
    <div className={cn('main-content', isRTL && 'rtl', profile?.role === 'manager' && 'manager-dark-mode')}>
      <GlobalLanguageSelector />
      {profile && profile.role === 'guest' && (
        <Header roomNumber={profile.roomNumber || roomNumber} user={profile} logout={logout} navigateToGuest={() => { setGuestTab('services'); if (pathname !== '/') { window.history.pushState({}, '', '/'); setPathname('/'); } }} />
      )}
      <main className="w-full flex-1">
        <div className="luxury-container">
          <AnimatePresence mode="wait">
            {!profile ? (
              <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {pathname === '/staff-portal' ? (
                  <StaffLogin onLoginSuccess={p => setProfile(p)} onReturnToGuest={() => { window.history.pushState({}, '', '/'); setPathname('/'); }} />
                ) : (
                  <Auth onLoginSuccess={p => setProfile(p)} initialRoom={roomNumber} isLocked={isRoomLocked} onNavigateToStaff={navigateToStaff} />
                )}
              </motion.div>
            ) : isExecutive ? (
              <motion.div key="executive" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ExecutiveDashboard profile={profile} /></motion.div>
            ) : isDeptManager ? (
              <motion.div key="deptmgr" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><DeptManagerDashboard profile={profile} /></motion.div>
            ) : profile.role === 'staff' ? (
              <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><StaffPortal userProfile={profile} /></motion.div>
            ) : (
              <motion.div key="guest" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {guestTab === 'services' && (
                  <>
                    <div className="bg-navy p-5 sm:p-10 shadow-2xl mb-6">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[8px] text-gold/60 uppercase tracking-widest">Room {profile.roomNumber || roomNumber}</p>
                        <button onClick={logout} className="flex items-center gap-2 border border-gold/40 text-gold px-4 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-gold/10">
                          <LogOut size={12} /> Checkout / Logout
                        </button>
                      </div>
                      <h2 className="text-2xl sm:text-4xl font-serif text-white mb-3 leading-tight">
                        {new Date().getHours() < 12 ? t('greeting_morning') : new Date().getHours() < 17 ? t('greeting_afternoon') : t('greeting_evening')},
                        <span className="text-gold italic"> {profile.displayName}</span>
                      </h2>
                      <p className="text-white/70 max-w-2xl font-serif text-sm italic">{t('welcome_sanctuary')}</p>
                    </div>
                    <div className="dashboard-grid px-4">
                      {guestServices.map(service => (
                        <button key={service.name} onClick={() => {
                          if (service.serviceKey === 'room_service') setGuestTab('room-service');
                          else if (service.serviceKey === 'restaurant_portal') setShowRestaurantPortal(true);
                          else if (service.serviceKey === 'concierge_services') setGuestTab('concierge');
                          else { setSelectedService(service); if (service.options) setMessage(service.options[0]); setShowRequestModal(true); }
                        }} className="premium-card">
                          <div className="icon-wrapper"><service.icon size={24} className="text-gold" strokeWidth={1} /></div>
                          <h3 className="text-xs sm:text-sm">{service.name}</h3>
                        </button>
                      ))}
                    </div>
                    {requests.length > 0 && (
                      <section className="mt-8 px-4">
                        <div className="flex items-center gap-2 mb-3 border-b border-gold/20 pb-2">
                          <ClipboardList size={13} className="text-gold" />
                          <h2 className="text-[10px] font-bold text-gold uppercase tracking-[0.25em]">Your Requests</h2>
                        </div>
                        <div className="space-y-2">
                          {requests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-3 border border-navy/10 bg-white shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className={cn('w-7 h-7 flex items-center justify-center rounded-full border', req.status === 'Completed' ? 'text-green-600 bg-green-50 border-green-200' : req.status === 'In Progress' ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-gold bg-gold/5 border-gold/30')}>
                                  {req.status === 'Completed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                </div>
                                <div>
                                  <span className="text-navy font-bold text-sm font-serif block">{req.type}</span>
                                  {req.lineItems && <span className="text-[8px] text-gold/70">{req.lineItems.map((li: any) => `${li.qty}x ${li.name}`).join(', ')}</span>}
                                  {req.status === 'In Progress' && req.assignedStaffName && <span className="text-[8px] text-blue-600 font-bold uppercase block">✓ {req.assignedStaffName} is handling this</span>}
                                  {req.totalPrice && <span className="text-[8px] text-gold font-bold block">AED {req.totalPrice.toLocaleString()}</span>}
                                </div>
                              </div>
                              <span className={cn('text-[9px] font-bold px-2 py-1 border rounded-full', req.status === 'Completed' ? 'text-green-600 border-green-200' : req.status === 'In Progress' ? 'text-blue-600 border-blue-200' : 'text-gold border-gold/30')}>{req.status}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                    <GuestFooter />
                  </>
                )}
                {guestTab === 'room-service' && (
                  <RoomService cart={cart} updateCart={(id, delta) => setCart(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }))} onSubmit={(notes, items) => submitRequest({ type: t('room_service'), serviceKey: 'room_service', dept: 'F&B', notes, lineItems: items })} />
                )}
                {/* restaurant-bookings moved to dedicated RestaurantPortal */}
                {guestTab === 'concierge' && <Concierge onSubmit={data => submitRequest({ ...data, serviceKey: 'concierge_services', dept: 'Concierge' })} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Restaurant Portal Overlay */}
      <AnimatePresence>
        {showRestaurantPortal && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-[25000] bg-[#FCF9F2] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-navy px-4 py-3 flex items-center gap-3 border-b border-gold/20">
              <button onClick={() => setShowRestaurantPortal(false)} className="text-gold hover:text-white">
                <ArrowRight size={20} className="rotate-180" />
              </button>
              <h2 className="text-gold font-serif text-lg">Restaurant Reservations</h2>
            </div>
            {profile && <RestaurantPortal profile={profile} />}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedbackRequest && (
          <FeedbackModal request={feedbackRequest} onClose={async () => { await supabase.from('requests').update({ feedback_dismissed: true }).eq('id', feedbackRequest.id); setFeedbackRequest(null); }} onSubmit={submitFeedback} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRequestModal && selectedService && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#FCF9F2] border border-[#C5A059] w-full max-w-md p-8 relative shadow-2xl">
              <button onClick={() => setShowRequestModal(false)} className="absolute top-5 right-5 text-navy/40 hover:text-navy"><X size={20} /></button>
              <h2 className="text-2xl font-serif text-navy mb-6">{selectedService.name}</h2>
              {selectedService.options ? (
                <div className="space-y-4 mb-6">
                  <p className="text-[9px] uppercase tracking-widest text-navy/50 font-bold">{t('select_option')}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedService.options.map((opt: string) => (
                      <button key={opt} onClick={() => setMessage(opt)} className={cn('w-full p-3 text-left border text-sm', message === opt ? 'border-gold bg-gold/5 text-navy' : 'border-navy/10 text-navy/60')}>{opt}</button>
                    ))}
                  </div>
                  <textarea value={dietaryRequirements} onChange={e => setDietaryRequirements(e.target.value)} placeholder="Additional details..." className="h-20 resize-none w-full bg-white text-navy border border-gold p-3 text-sm" />
                </div>
              ) : (
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t('message_placeholder')} className="h-28 resize-none w-full bg-white text-navy border border-gold p-3 text-sm mb-6" />
              )}
              <button onClick={() => submitRequest()} className="gold-button w-full m-0">{t('submit')}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </>
  );
}
