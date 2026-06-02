import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import { UserProfile, Department } from './types';
import { cn } from './lib/utils';
import {
  LogOut, Clock, CheckCircle2, AlertCircle,
  Shield, Coffee, Key, Sparkles, UtensilsCrossed, X,
  Globe, Home, Plus, Minus, Check, ChevronDown,
  User, ClipboardList, TrendingUp, Star, ShieldCheck,
  Car, MapPin, Briefcase, FileText, Mail, Download,
  Phone, ArrowRight, QrCode, Settings, Wrench, BedDouble,
  Bell, RefreshCw, Search, Edit2, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, Language } from './contexts/TranslationContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MANAGER_OCCUPATIONS = [
  'Housekeeping Manager', 'Maintenance Manager',
  'F&B Manager', 'Concierge Manager',
  'Security Manager', 'Front Office Manager', 'Executive',
];

// Supervisor occupations — get role='staff' but with supervisor-level room access
const SUPERVISOR_OCCUPATIONS = [
  'Housekeeping Supervisor', 'Reservation Agent',
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
  'Maintenance Technician': 'Maintenance', 'Maintenance Supervisor': 'Maintenance', 'Maintenance Manager': 'Maintenance',
};

const DEPARTMENTS: Department[] = ['Housekeeping', 'F&B', 'Concierge', 'Security & Safety', 'Front Office', 'Maintenance'];

const DELAY_REASONS = [
  'High Volume of Requests', 'Staff Shortage', 'Technical Issue',
  'Guest Not in Room', 'Waiting for Supplies', 'Too Many Simultaneous Requests', 'Other',
];

const ROOM_STATUSES = [
  { key: 'Clean',           color: 'bg-green-500',  label: '🟢 Clean',             requireReason: false, supervisorOnly: false },
  { key: 'Dirty',           color: 'bg-red-500',    label: '🔴 Dirty',             requireReason: false, supervisorOnly: false },
  { key: 'Cleaning',        color: 'bg-yellow-500', label: '🟡 Cleaning',          requireReason: false, supervisorOnly: false },
  { key: 'Do Not Disturb',  color: 'bg-purple-500', label: '🟣 Do Not Disturb',    requireReason: true,  supervisorOnly: false },
  { key: 'Out of Order',    color: 'bg-gray-500',   label: '⚫ Out of Order',       requireReason: true,  supervisorOnly: false },
  { key: 'Guest Refused',   color: 'bg-pink-500',   label: '🚫 Guest Refused',     requireReason: true,  supervisorOnly: false },
  { key: 'Different Time',  color: 'bg-cyan-500',   label: '🕐 Different Time',    requireReason: true,  supervisorOnly: false },
  { key: 'Inspected',       color: 'bg-orange-500', label: '🟠 Inspected',         requireReason: false, supervisorOnly: true  },
  { key: 'Checked Out',     color: 'bg-blue-500',   label: '🔵 Checked Out',       requireReason: false, supervisorOnly: true  },
];

const MAINTENANCE_CATEGORIES = [
  'AC / Heating Issue', 'Plumbing Issue', 'Electrical Issue', 'TV / Electronics',
  'Door / Lock Issue', 'Furniture Damage', 'Lighting Issue', 'Bathroom Fixtures',
  'Safe Box Issue', 'Internet / WiFi', 'Minibar', 'Other',
];

// Menu items loaded from DB per hotel in RoomService component

// ✅ CORRECT department routing
const getDepartmentFromServiceKey = (serviceKey: string, fallback?: string): string => {
  if (serviceKey === 'room_service') return 'F&B';
  if (serviceKey === 'restaurant_bookings') return 'F&B';
  if (serviceKey === 'concierge_services') return 'Concierge';
  if (serviceKey === 'luggage') return 'Concierge';
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
          <h1 className="font-serif tracking-[0.15em] text-gold uppercase text-base sm:text-2xl whitespace-nowrap">{(() => { try { const h = JSON.parse(localStorage.getItem('sentinel_hotel')||'{}'); return h.hotel_name || 'Sentinel Pro'; } catch { return 'Sentinel Pro'; } })()}</h1>
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

// ─── TELEGRAM NOTIFICATIONS ──────────────────────────────────────────────────
const BOT_TOKEN = (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN || '';
const BOT_NAME  = 'SentinelPr0BoT';

const sendTelegram = async (chatId: string, message: string): Promise<void> => {
  if (!BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch { /* silent — notification failure should never break the app */ }
};

// Notify all online staff in a department
const notifyDeptStaff = async (
  hotelId: string | null | undefined,
  department: string,
  message: string,
  excludeId?: string
): Promise<void> => {
  if (!BOT_TOKEN) return;
  let q = supabase.from('staff')
    .select('telegram_chat_id')
    .eq('department', department)
    .not('telegram_chat_id', 'is', null);
  // Filter by hotel if available
  if (hotelId) q = q.eq('hotel_id', hotelId);
  const { data: staff } = await q;
  if (!staff || staff.length === 0) return;
  for (const s of staff) {
    if (s.telegram_chat_id && s.telegram_chat_id !== excludeId) {
      await sendTelegram(s.telegram_chat_id, message);
    }
  }
};

// Notify department manager
const notifyDeptManager = async (
  hotelId: string | null | undefined,
  department: string,
  message: string
): Promise<void> => {
  if (!BOT_TOKEN) return;
  const managerOccupations = ['Housekeeping Manager','F&B Manager','Concierge Manager',
    'Security Manager','Front Office Manager'];
  let q = supabase.from('staff')
    .select('telegram_chat_id')
    .eq('department', department)
    .in('occupation', managerOccupations)
    .not('telegram_chat_id', 'is', null);
  if (hotelId) q = q.eq('hotel_id', hotelId);
  const { data: managers } = await q;
  if (!managers) return;
  for (const m of managers) {
    if (m.telegram_chat_id) await sendTelegram(m.telegram_chat_id, message);
  }
};

// ─── SHARED UTILITY — used by StaffPortal, DeptManagerDashboard, ExecutiveDashboard
const formatTime = (ts: any): string => {
  if (!ts) return '—';
  try {
    let normalized = String(ts).trim().replace(' ', 'T');
    // ✅ Check timezone at END of string only (not date separators like -27)
    if (!/([Z]|[+\-]\d{2}(:\d{2})?)$/.test(normalized)) normalized += 'Z';
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });
  } catch { return '—'; }
};

const RoomService: React.FC<{ cart: { [id: string]: number }; updateCart: (id: string, delta: number) => void; onSubmit: (notes: string, items: any[]) => void }> = ({ cart, updateCart, onSubmit }) => {
  const { t } = useLanguage();
  const [notes, setNotes] = useState('');
  const [activeCategory, setActiveCategory] = useState('all_day');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  useEffect(() => {
    const hId = (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let q = supabase.from('menu_items').select('*').order('category').order('name');
    if (hId) q = q.eq('hotel_id', hId);
    q.then(({ data }) => {
      setMenuItems(data || []);
      setLoadingMenu(false);
    });
  }, []);

  const categories = [...new Set(menuItems.map(m => m.category))];

  const total = Object.entries(cart).reduce((acc, [id, qty]) => {
    const item = menuItems.find(m => m.id === id);
    return acc + (item?.price || 0) * qty;
  }, 0);
  const buildLineItems = () => Object.entries(cart).filter(([, qty]) => qty > 0).map(([id, qty]) => {
    const item = menuItems.find(m => m.id === id)!;
    return { id, name: item.name, qty, price: item.price, total: item.price * qty };
  });
  return (
    <div className="space-y-6 pb-32 w-full px-4 sm:px-8">
      <div className="flex gap-1 border-b border-gold/20 pb-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={cn('px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest', activeCategory === cat ? 'text-gold border-b-2 border-gold' : 'text-navy/40')}>{cat.replace('_',' ')}</button>
        ))}
      </div>
      {loadingMenu ? (
        <p className="text-center text-navy/40 py-8 text-sm">Loading menu...</p>
      ) : menuItems.length === 0 ? (
        <p className="text-center text-navy/40 italic py-8 text-sm">Menu not available. Please contact reception.</p>
      ) : (
      <>
      <div className="space-y-1">
        {menuItems.filter(i => i.category === activeCategory).map(item => (
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
      </>
      )}
    </div>
  );
};

// ─── RESTAURANT BOOKING ───────────────────────────────────────────────────────
const RestaurantBooking: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  const { t } = useLanguage();
  const [data, setData] = useState({ restaurant: '', pax: '2', date: '', time: '', notes: '' });
  const [restaurants, setRestaurants] = useState<any[]>([]);
  useEffect(() => {
    const hId = (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let q = supabase.from('restaurants').select('id, name, cuisine').eq('active', true);
    if (hId) q = q.eq('hotel_id', hId);
    q.then(({ data: rData }) => {
      if (rData && rData.length > 0) {
        setRestaurants(rData);
        setData(prev => ({ ...prev, restaurant: prev.restaurant || rData[0].id }));
      }
    });
  }, []);
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
            <input type={f.type}
              value={(data as any)[f.key]}
              min={f.key === 'date' ? new Date().toISOString().split('T')[0] : undefined}
              onChange={e => setData({ ...data, [f.key]: e.target.value })}
              className="w-full bg-white text-navy border border-gold p-3 text-sm" />
          </div>
        ))}
        <textarea value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} placeholder="Special requests, dietary requirements..." className="h-20 resize-none w-full bg-white text-navy border border-gold p-3 text-sm" />
        <button onClick={() => onSubmit({ type: `Restaurant: ${data.restaurant}`, pax: Number(data.pax), preferredTiming: `${data.date} ${data.time}`, notes: data.notes })} className="gold-button w-full m-0">{t('confirm')}</button>
      </div>
    </div>
  );
};

// ─── CONCIERGE ────────────────────────────────────────────────────────────────
const Concierge: React.FC<{ onSubmit: (data: any) => void; profile?: UserProfile }> = ({ onSubmit, profile }) => {
  const { t } = useLanguage();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [view, setView] = useState<'browse'|'book'|'mybookings'>('browse');
  const [form, setForm] = useState({ guests_count: '1', pickup_date: '', pickup_time: '', return_date: '', return_time: '', special_requests: '' });
  const [submitting, setSubmitting] = useState(false);
  const [modifyBooking, setModifyBooking] = useState<any>(null);

  const hotelId = profile?.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();

  const CATEGORY_LABELS: Record<string,string> = { tour: '🗺 Tours', car_rental: '🚗 Car Rental', taxi: '🚕 Taxi / Transfer', luggage: '🧳 Luggage' };

  useEffect(() => {
    const fetchServices = async () => {
      let q = supabase.from('concierge_services').select('*').eq('active', true).order('category').order('name');
      if (hotelId) q = q.eq('hotel_id', hotelId);
      const { data } = await q;
      if (data) setServices(data);
      setLoading(false);
    };
    fetchServices();
  }, [hotelId]);

  const fetchMyBookings = useCallback(async () => {
    if (!profile?.uid) return;
    const { data } = await supabase.from('concierge_bookings').select('*')
      .eq('guest_id', profile.uid).order('created_at', { ascending: false });
    if (data) setMyBookings(data);
  }, [profile?.uid]);

  useEffect(() => { if (view === 'mybookings') fetchMyBookings(); }, [view, fetchMyBookings]);

  const submitBooking = async () => {
    if (!selected || !form.pickup_date || !form.pickup_time) {
      alert('Please fill in pickup date and time.'); return;
    }
    setSubmitting(true);
    // ✅ ISSUE 3 FIX: Check for existing Pending booking for same service+guest
    const { data: existingBooking } = await supabase.from('concierge_bookings')
      .select('id').eq('guest_id', profile?.uid || '').eq('service_id', selected.id)
      .eq('status', 'Pending').single();
    if (existingBooking) {
      alert('You already have a pending booking for this service. Please check My Bookings.');
      setSubmitting(false); return;
    }
    const total = (parseFloat(form.guests_count)||1) * (selected.price||0);
    await supabase.from('concierge_bookings').insert({
      hotel_id: hotelId,
      service_id: selected.id,
      service_name: selected.name,
      category: selected.category,
      guest_id: profile?.uid,
      guest_name: profile?.displayName,
      room_number: profile?.roomNumber,
      guests_count: parseInt(form.guests_count)||1,
      pickup_date: form.pickup_date,
      pickup_time: form.pickup_time,
      return_date: form.return_date || null,
      return_time: form.return_time || null,
      special_requests: form.special_requests || null,
      total_price: total,
      status: 'Pending',
    });
    setSubmitting(false);
    setView('mybookings'); fetchMyBookings();
      // Notify Concierge staff via Telegram
      try {
        const hId = profile?.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
        const catLabel: Record<string,string> = { tour: 'Tour', car_rental: 'Car Rental', taxi: 'Taxi/Transfer', luggage: 'Luggage' };
        const catName = catLabel[form.category] || form.category;
        const notifMsg = '<b>🔑 Concierge Request — ' + catName + '</b>\n'
          + '🏨 Room ' + (profile?.roomNumber || '—') + ' · ' + (profile?.displayName || 'Guest') + '\n'
          + '📝 ' + (form.notes || '—');
        notifyDeptStaff(hId, 'Concierge', notifMsg);
      } catch { /* never block */ }
    setForm({ guests_count:'1', pickup_date:'', pickup_time:'', return_date:'', return_time:'', special_requests:'' });
    setSelected(null);
  };

  const cancelBooking = async (id: string) => {
    if (!window.confirm('Cancel this booking?')) return;
    await supabase.from('concierge_bookings').update({ status: 'Cancelled' }).eq('id', id);
    fetchMyBookings();
  };

  const saveModify = async () => {
    if (!modifyBooking) return;
    await supabase.from('concierge_bookings').update({
      pickup_date: modifyBooking.pickup_date,
      pickup_time: modifyBooking.pickup_time,
      return_date: modifyBooking.return_date,
      return_time: modifyBooking.return_time,
    }).eq('id', modifyBooking.id);
    setModifyBooking(null); fetchMyBookings();
  };

  const categories = [...new Set(services.map(s => s.category))];
  const STATUS_COLOR: Record<string,string> = {
    Pending:'bg-yellow-50 text-yellow-700 border-yellow-200',
    Confirmed:'bg-green-50 text-green-700 border-green-200',
    Cancelled:'bg-red-50 text-red-700 border-red-200',
    Completed:'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="w-full py-4 space-y-4 px-4 sm:px-8">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-serif text-navy">{t('concierge_services')}</h2>
        <p className="text-gold text-[9px] uppercase tracking-widest font-bold">Luxury Assistance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 justify-center">
        {[{key:'browse',label:'Browse Services'},{key:'mybookings',label:`My Bookings (${myBookings.filter(b=>b.status!=='Cancelled').length})`}].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key as any)}
            className={cn('px-4 py-1.5 text-[9px] font-bold uppercase border',
              view===tab.key ? 'bg-navy text-white border-navy' : 'bg-white text-navy/50 border-navy/20')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── BROWSE SERVICES ── */}
      {view === 'browse' && !selected && (
        loading ? <p className="text-center text-navy/40 py-8">Loading services...</p>
        : services.length === 0 ? <p className="text-center text-navy/40 italic py-8">No concierge services available at this time.</p>
        : categories.map(cat => (
          <div key={cat} className="space-y-2">
            <h3 className="text-[10px] uppercase tracking-widest text-gold font-bold border-b border-gold/20 pb-1">{CATEGORY_LABELS[cat]||cat}</h3>
            {services.filter(s => s.category === cat).map(svc => (
              <button key={svc.id} onClick={() => { setSelected(svc); setView('book'); }}
                className="w-full bg-white border border-navy/10 p-3 text-left flex gap-3 items-start hover:border-gold/50 transition-colors">
                {svc.image_url && <img src={svc.image_url} className="w-16 h-14 object-cover flex-shrink-0" alt="" />}
                <div className="flex-1">
                  <p className="text-navy font-bold font-serif">{svc.name}</p>
                  {svc.description && <p className="text-[10px] text-navy/60 mt-0.5">{svc.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-gold font-bold text-[11px]">AED {svc.price} <span className="text-navy/40 font-normal">{svc.price_unit}</span></p>
                    {svc.duration && <p className="text-[9px] text-navy/50">⏱ {svc.duration}</p>}
                  </div>
                  <p className="text-[8px] text-navy/40 mt-0.5">Available: {(svc.availability||[]).join(', ')}</p>
                </div>
                <ArrowRight size={16} className="text-gold flex-shrink-0 mt-1" />
              </button>
            ))}
          </div>
        ))
      )}

      {/* ── BOOKING FORM ── */}
      {view === 'book' && selected && (
        <div className="space-y-4">
          <button onClick={() => { setView('browse'); setSelected(null); }}
            className="text-[9px] text-gold uppercase font-bold">← Back</button>
          <div className="bg-white border border-gold/20 p-4 space-y-1">
            <p className="text-navy font-bold font-serif text-lg">{selected.name}</p>
            <p className="text-[10px] text-navy/60">{selected.description}</p>
            <p className="text-gold font-bold">AED {selected.price} {selected.price_unit}</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase text-navy/60 font-bold block mb-1">Pickup Date *</label>
                <input type="date" value={form.pickup_date} onChange={e=>setForm({...form,pickup_date:e.target.value})}
                  className="w-full border border-navy/20 p-2 text-sm text-navy outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[9px] uppercase text-navy/60 font-bold block mb-1">Pickup Time *</label>
                <input type="time" value={form.pickup_time} onChange={e=>setForm({...form,pickup_time:e.target.value})}
                  className="w-full border border-navy/20 p-2 text-sm text-navy outline-none focus:border-gold" />
              </div>
              {(selected.category==='car_rental'||selected.category==='taxi') && (<>
              <div>
                <label className="text-[9px] uppercase text-navy/60 font-bold block mb-1">Return Date</label>
                <input type="date" value={form.return_date} onChange={e=>setForm({...form,return_date:e.target.value})}
                  className="w-full border border-navy/20 p-2 text-sm text-navy outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[9px] uppercase text-navy/60 font-bold block mb-1">Return Time</label>
                <input type="time" value={form.return_time} onChange={e=>setForm({...form,return_time:e.target.value})}
                  className="w-full border border-navy/20 p-2 text-sm text-navy outline-none focus:border-gold" />
              </div>
              </>)}
              <div>
                <label className="text-[9px] uppercase text-navy/60 font-bold block mb-1">Number of Guests</label>
                <input type="number" min="1" value={form.guests_count} onChange={e=>setForm({...form,guests_count:e.target.value})}
                  className="w-full border border-navy/20 p-2 text-sm text-navy outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[9px] uppercase text-navy/60 font-bold block mb-1">Total Price</label>
                <p className="border border-gold/20 bg-gold/5 p-2 text-gold font-bold text-sm">
                  AED {((parseFloat(form.guests_count)||1) * (selected.price||0)).toFixed(2)}
                </p>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase text-navy/60 font-bold block mb-1">Special Requests</label>
              <textarea value={form.special_requests} onChange={e=>setForm({...form,special_requests:e.target.value})}
                rows={2} placeholder="Any special requirements..."
                className="w-full border border-navy/20 p-2 text-sm text-navy outline-none focus:border-gold resize-none" />
            </div>
            <p className="text-[8px] text-navy/40 italic">Payment at concierge desk upon service. You will receive a confirmation shortly.</p>
            <button onClick={submitBooking} disabled={submitting}
              className="gold-button w-full">{submitting ? 'Submitting...' : 'Submit Booking Request'}</button>
          </div>
        </div>
      )}

      {/* ── MY BOOKINGS ── */}
      {view === 'mybookings' && (
        <div className="space-y-3">
          {myBookings.length === 0
            ? <p className="text-center text-navy/40 italic py-8">No bookings yet.</p>
            : myBookings.map(b => (
              <div key={b.id} className="bg-white border border-navy/10 p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-navy font-bold font-serif">{b.service_name}</p>
                    <p className="text-[10px] text-navy/50">{b.guests_count} guest{b.guests_count>1?'s':''} · AED {b.total_price}</p>
                  </div>
                  <span className={cn('text-[8px] font-bold px-2 py-0.5 border', STATUS_COLOR[b.status]||'bg-white text-navy border-navy/20')}>{b.status}</span>
                </div>
                <div className="text-[9px] text-navy/50 space-y-0.5">
                  <p>📅 Pickup: {b.pickup_date} at {b.pickup_time}</p>
                  {b.return_date && <p>🔄 Return: {b.return_date} at {b.return_time}</p>}
                  {b.special_requests && <p>📝 {b.special_requests}</p>}
                </div>
                {/* Modify form */}
                {modifyBooking?.id === b.id && (
                  <div className="border-t border-navy/10 pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] uppercase text-navy/50 font-bold block mb-1">New Pickup Date</label>
                        <input type="date" value={modifyBooking.pickup_date} onChange={e=>setModifyBooking({...modifyBooking,pickup_date:e.target.value})}
                          className="w-full border border-navy/20 p-1.5 text-[11px] text-navy outline-none" />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase text-navy/50 font-bold block mb-1">New Pickup Time</label>
                        <input type="time" value={modifyBooking.pickup_time} onChange={e=>setModifyBooking({...modifyBooking,pickup_time:e.target.value})}
                          className="w-full border border-navy/20 p-1.5 text-[11px] text-navy outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveModify} className="flex-1 py-1.5 bg-navy text-white text-[9px] font-bold uppercase">Save Changes</button>
                      <button onClick={()=>setModifyBooking(null)} className="flex-1 py-1.5 border border-navy/20 text-navy/50 text-[9px] uppercase">Cancel</button>
                    </div>
                  </div>
                )}
                {b.status === 'Pending' && !modifyBooking && (
                  <div className="flex gap-2">
                    <button onClick={()=>setModifyBooking({...b})}
                      className="flex-1 py-1.5 border border-navy/20 text-navy text-[9px] font-bold uppercase">✏ Modify</button>
                    <button onClick={()=>cancelBooking(b.id)}
                      className="flex-1 py-1.5 border border-red-200 text-red-500 text-[9px] font-bold uppercase">✕ Cancel</button>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};


// restaurants loaded dynamically from DB per hotel

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
  // restaurant name stored in booking or fallback to id
  const restaurant = { name: booking.restaurant_name || booking.restaurant || 'Restaurant', emoji: '🍽', cuisine: '' };
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
    <div class="cuisine">${restaurant?.cuisine || ''}</div>
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
// ✅ STORAGE: Extract storage path from full URL and generate signed URL
const getStoragePath = (fullUrl: string): string | null => {
  if (!fullUrl) return null;
  const marker = '/object/public/hotel-assets/';
  const altMarker = '/object/sign/hotel-assets/';
  const idx = fullUrl.indexOf(marker);
  const idx2 = fullUrl.indexOf(altMarker);
  if (idx >= 0) return fullUrl.slice(idx + marker.length);
  if (idx2 >= 0) return fullUrl.slice(idx2 + altMarker.length).split('?')[0];
  return null;
};

const getSignedUrl = async (fullUrl: string): Promise<string> => {
  if (!fullUrl) return '';
  const path = getStoragePath(fullUrl);
  if (!path) return fullUrl; // fallback to original if can't parse
  const { data } = await supabase.storage.from('hotel-assets').createSignedUrl(path, 3600);
  return data?.signedUrl || fullUrl;
};

const RestaurantPortal: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'book' | 'mybookings' | 'manage' | 'walkin' | 'menu' | 'settings'>('book');
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [newRest, setNewRest] = useState({ name: '', cuisine: '', emoji: '🍽', description: '' });
  const [savingRest, setSavingRest] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [pax, setPax] = useState('2');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [modifyBooking, setModifyBooking] = useState<any | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [restaurantSettings, setRestaurantSettings] = useState<any[]>([]);
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: '', category: 'all_day', restaurant: '' });
  const [restSettings, setRestSettings] = useState<any>({});
  const [rejectModal, setRejectModal] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectAlt, setRejectAlt] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [walkInRestaurant, setWalkInRestaurant] = useState('');
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
    const hId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let q = supabase.from('restaurant_bookings').select('*').order('created_at', { ascending: false });
    if (hId) q = q.eq('hotel_id', hId);
    if (isGuest) q = q.eq('guest_id', profile.uid);
    const { data } = await q;
    if (data) setBookings(data);
  }, [profile, isGuest]);

  const fetchMenuItems = useCallback(async () => {
    const hId3 = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let menuQ = supabase.from('menu_items').select('*').order('category');
    if (hId3) menuQ = menuQ.eq('hotel_id', hId3);
    const { data } = await menuQ;
    if (data) setMenuItems(data);
  }, [profile.hotelId]);

  const fetchRestaurants = useCallback(async () => {
    const hId0 = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let rQ = supabase.from('restaurants').select('*').eq('active', true).order('created_at');
    if (hId0) rQ = rQ.eq('hotel_id', hId0);
    const { data: rData } = await rQ;
    if (rData && rData.length > 0) {
      // ✅ STORAGE: Generate signed URLs for private bucket
      const withSignedUrls = await Promise.all(rData.map(async (r: any) => ({
        ...r,
        logo_url: r.logo_url ? await getSignedUrl(r.logo_url) : null,
        cover_url: r.cover_url ? await getSignedUrl(r.cover_url) : null,
      })));
      setRestaurants(withSignedUrls);
      setSelectedRestaurant(prev => prev || rData[0].id);
    }
  }, [profile.hotelId]);

  const fetchSettings = useCallback(async () => {
    const hId2 = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let settQ = supabase.from('restaurant_settings').select('*');
    if (hId2) settQ = settQ.eq('hotel_id', hId2);
    const { data } = await settQ;
    if (data) {
      const map: any = {};
      data.forEach((s: any) => { map[s.restaurant] = s; });
      setRestSettings(map);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchRestaurants();
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
  }, [fetchBookings, fetchMenuItems, fetchSettings, fetchRestaurants, isFBManager, isExecutive, isStaff]);

  const submitBooking = async () => {
    if (!date || !time || !pax) { showToast('Please fill in date, time and number of guests', 'error'); return; }
    // ✅ Past date check
    const today = new Date().toISOString().split('T')[0];
    if (date < today) { showToast('Please select today or a future date.', 'error'); return; }

    const settings = restSettings[selectedRestaurant];
    const selRestaurant = restaurants.find((r: any) => r.id === selectedRestaurant);

    if (settings) {
      // ✅ Closed day check
      const bookingDay = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Dubai' });
      const closedDays: string[] = settings.closed_days || [];
      if (closedDays.includes(bookingDay)) {
        showToast(`Sorry, ${selRestaurant?.name || 'this restaurant'} is closed on ${bookingDay}s. Please choose another date.`, 'error'); return;
      }
      // ✅ Opening hours check
      if (settings.opening_time && settings.closing_time) {
        const [openH, openM] = settings.opening_time.split(':').map(Number);
        const [closeH, closeM] = settings.closing_time.split(':').map(Number);
        const [bookH, bookM] = time.split(':').map(Number);
        const openMins = openH * 60 + openM;
        const closeMins = closeH * 60 + closeM;
        const bookMins = bookH * 60 + bookM;
        if (bookMins < openMins || bookMins >= closeMins) {
          showToast(`${selRestaurant?.name || 'This restaurant'} is open from ${settings.opening_time} to ${settings.closing_time}. Please choose a time within opening hours.`, 'error'); return;
        }
      }
      // ✅ Table availability check
      const totalTables = settings.total_tables || 0;
      if (totalTables > 0) {
        // Count bookings within 2-hour window of requested time
        const { data: existingBookings } = await supabase
          .from('restaurant_bookings')
          .select('id, time')
          .eq('restaurant', selectedRestaurant)
          .eq('date', date)
          .in('status', ['Pending', 'Confirmed']);
        const [reqH, reqM] = time.split(':').map(Number);
        const reqMins = reqH * 60 + reqM;
        const conflicting = (existingBookings || []).filter((b: any) => {
          const [bH, bM] = (b.time || '00:00').split(':').map(Number);
          const bMins = bH * 60 + bM;
          return Math.abs(bMins - reqMins) < 120; // within 2 hours
        });
        if (conflicting.length >= totalTables) {
          // Build suggestion message
          const otherRestaurants = restaurants
            .filter((r: any) => r.id !== selectedRestaurant && r.active)
            .map((r: any) => r.name).slice(0, 2).join(' or ');
          const suggestion = otherRestaurants
            ? `You may also try ${otherRestaurants}.`
            : 'Please try a different date or time.';
          showToast(
            `Dear ${profile.displayName}, we regret that ${selRestaurant?.name || 'this restaurant'} is fully booked for ${date} around ${time}. Please try a different time or date. ${suggestion}`,
            'error'
          );
          return;
        }
      }
    }
    setLoading(true);
    try {
      // ✅ ISSUE 3 FIX: Check for existing Pending booking same guest+date+restaurant
      const { data: existingRB } = await supabase.from('restaurant_bookings')
        .select('id').eq('guest_id', profile.uid).eq('restaurant', selectedRestaurant)
        .eq('date', date).eq('status', 'Pending').single();
      if (existingRB) {
        showToast('You already have a pending reservation at this restaurant for this date.', 'error');
        setLoading(false); return;
      }
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
        hotel_id: profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })(),
      }).select().single();
      if (error) throw error;
      // Notify F&B staff via Telegram
      try {
        const hId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
        const restMsg = '<b>🍽 Restaurant Reservation</b>\n'
          + '🏨 Room ' + (profile.roomNumber || '—') + ' · ' + profile.displayName + '\n'
          + '🍴 ' + (selectedRestaurant || '') + ' · ' + pax + ' guests · ' + date + ' ' + time + '\n'
          + '📝 ' + (notes || '—') + '\n'
          + '🔖 Ref: ' + ref;
        notifyDeptStaff(hId, 'F&B', restMsg);
      } catch { /* never block booking */ }
      showToast(`Reservation submitted! Ref: ${ref} — Our team will confirm shortly.`, 'success');
      setDate(''); setTime(''); setPax('2'); setNotes('');
      fetchBookings();
      setActiveTab('mybookings');
      // Ticket available in My Bookings tab
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
      const restaurant = restaurants.find(r => r.id === walkInRestaurant);
      const { data, error } = await supabase.from('restaurant_bookings').insert({
        booking_ref: ref,
        guest_id: 'WALKIN-' + Date.now(),
        hotel_id: profile?.hotelId || null,
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
      .eq('hotel_id', profile?.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id || 'none'; } catch { return 'none'; } })())
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
      const restName = restaurants.find((r: any) => r.id === b.restaurant)?.name || b.restaurant || '';
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
    const guestNamePart = rejectModal.guest_name ? `Dear ${rejectModal.guest_name}` : 'Dear Valued Guest';
    const message = rejectAlt
      ? `${guestNamePart}, we regret to inform you that your reservation at ${rejectModal.restaurant} on ${rejectModal.date} at ${rejectModal.time} cannot be accommodated. ${rejectReason}. We would be delighted to suggest ${rejectAlt} as an alternative — please let our team know if this suits you, and we will arrange it immediately.`
      : `${guestNamePart}, we regret to inform you that your reservation at ${rejectModal.restaurant} on ${rejectModal.date} at ${rejectModal.time} cannot be accommodated. ${rejectReason}. We sincerely apologise for any inconvenience caused and kindly invite you to contact our reception team, who will be happy to assist you with alternative arrangements.`;
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
    logAudit('booking_rejected', { id: profile.uid, name: profile.displayName, role: profile.occupation || 'staff', hotelId: profile.hotelId },
      { type: 'restaurant_booking', id: rejectModal?.id }, { guest: rejectModal?.guest_name, restaurant: rejectModal?.restaurant });
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
    const hIdMenu = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    const { error } = await supabase.from('menu_items').insert({
      name: newMenuItem.name, price: Number(newMenuItem.price),
      category: newMenuItem.category, restaurant: newMenuItem.restaurant,
      hotel_id: hIdMenu,
    });
    const firstRestId = restaurants.length > 0 ? restaurants[0].id : '';
    if (!error) { showToast('Menu item added!', 'success'); fetchMenuItems(); setNewMenuItem({ name: '', price: '', category: 'all_day', restaurant: firstRestId }); }
  };

  const deleteMenuItem = async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id);
    showToast('Item removed', 'info'); fetchMenuItems();
  };

  const saveRestaurantSettings = async (restaurantId: string, settings: any) => {
    // Pick up total_tables from the input field
    const tablesInput = document.getElementById(`tables-${restaurantId}`) as HTMLInputElement;
    const totalTables = tablesInput ? parseInt(tablesInput.value) || 0 : (settings.total_tables || 0);
    await supabase.from('restaurant_settings').upsert(
      { restaurant: restaurantId, ...settings, total_tables: totalTables, hotel_id: profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })() },
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
                <p className="text-gold font-bold text-sm">{restaurants.find(r => r.id === rejectModal.restaurant)?.name}</p>
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
                  {restaurants.filter(r => r.id !== rejectModal.restaurant).map(r => (
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
              <p className="text-sm text-gray-500 mb-4">{restaurants.find(r => r.id === cancelConfirm.restaurant)?.name} · {cancelConfirm.date} at {cancelConfirm.time}</p>
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
              {restaurants.map(r => {
                const rs = restSettings[r.id] || {};
                return (
                <button key={r.id} onClick={() => setSelectedRestaurant(r.id)}
                  className={cn('w-full border text-left overflow-hidden', selectedRestaurant === r.id ? 'border-gold' : 'border-navy/10')}>
                  {/* Cover image */}
                  {rs.cover_url
                    ? <div className="w-full h-20 bg-navy/10 overflow-hidden"><img src={rs.cover_url} alt={r.name} className="w-full h-full object-cover" /></div>
                    : <div className="w-full h-10 bg-gold/10 flex items-center justify-center text-2xl">{r.emoji}</div>
                  }
                  <div className="p-3 flex items-center gap-3">
                    {rs.logo_url && <img src={rs.logo_url} alt="logo" className="w-10 h-10 object-contain border border-gold/20 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="text-navy font-bold font-serif">{rs.restaurant_display_name || r.name}</p>
                      <p className="text-[10px] text-navy/60 italic">{r.cuisine}</p>
                      {rs.opening_time && <p className="text-[9px] text-gold font-bold mt-0.5">{rs.opening_time} – {rs.closing_time}</p>}
                    </div>
                    {selectedRestaurant === r.id && <Check size={18} className="text-gold ml-auto" />}
                  </div>
                </button>
                );
              })}
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
              const restaurant = restaurants.find(r => r.id === b.restaurant);
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
                const restaurant = restaurants.find(r => r.id === b.restaurant);
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
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}
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
              <h3 className="text-base font-serif text-gold">Add Room Service Menu Item</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Restaurant</label>
                  <select value={newMenuItem.restaurant} onChange={e => setNewMenuItem({ ...newMenuItem, restaurant: e.target.value })}
                    className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none">
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Category</label>
                  <select value={newMenuItem.category} onChange={e => setNewMenuItem({ ...newMenuItem, category: e.target.value })}
                    className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none">
                    <option value="breakfast">🌅 Breakfast</option>
                    <option value="all_day">☀️ All Day Dining</option>
                    <option value="mains">🍽 Main Course</option>
                    <option value="starters">🥗 Starters</option>
                    <option value="beverages">☕ Beverages</option>
                    <option value="desserts">🍰 Desserts</option>
                    <option value="healthy">🥑 Healthy</option>
                    <option value="kids">👶 Kids Menu</option>
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
            {/* Add Restaurant */}
            <div className="bg-[#001c36] border border-gold/30 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] uppercase tracking-widest text-gold font-bold">+ Add New Restaurant</h3>
                <button onClick={() => setShowAddRestaurant(!showAddRestaurant)}
                  className="text-[9px] text-gold/60 hover:text-gold">{showAddRestaurant ? '▲ Hide' : '▼ Show'}</button>
              </div>
              {showAddRestaurant && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] text-white/40 uppercase block mb-1">Restaurant Name *</label>
                      <input value={newRest.name} onChange={e => setNewRest({...newRest, name: e.target.value})}
                        placeholder="e.g. The Rooftop" className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] text-white/40 uppercase block mb-1">Cuisine Type</label>
                      <input value={newRest.cuisine} onChange={e => setNewRest({...newRest, cuisine: e.target.value})}
                        placeholder="e.g. Mediterranean" className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] text-white/40 uppercase block mb-1">Emoji Icon</label>
                      <input value={newRest.emoji} onChange={e => setNewRest({...newRest, emoji: e.target.value})}
                        placeholder="🍽" className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] text-white/40 uppercase block mb-1">Description</label>
                      <input value={newRest.description} onChange={e => setNewRest({...newRest, description: e.target.value})}
                        placeholder="Short description" className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={async () => {
                      if (!newRest.name) { showToast('Restaurant name required', 'error'); return; }
                      setSavingRest(true);
                      const hId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
                      await supabase.from('restaurants').insert({ ...newRest, hotel_id: hId, active: true });
                      setNewRest({ name: '', cuisine: '', emoji: '🍽', description: '' });
                      setShowAddRestaurant(false);
                      setSavingRest(false);
                      fetchRestaurants();
                      showToast('Restaurant added!', 'success');
                    }} disabled={savingRest}
                      className="bg-gold text-navy px-4 py-2 text-[9px] font-bold uppercase">
                      {savingRest ? 'Saving...' : '+ Add Restaurant'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {restaurants.length === 0 && (
              <p className="text-white/30 italic text-sm text-center py-6">No restaurants added yet. Add your first restaurant above.</p>
            )}

            {restaurants.map(r => {
              const s = restSettings[r.id] || {};
              return (
                <div key={r.id} className="bg-[#001c36] border border-gold/10 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-serif text-gold">{r.emoji} {r.name}</h3>
                    <button onClick={async () => {
                      if (!window.confirm('Remove ' + r.name + '?')) return;
                      await supabase.from('restaurants').update({ active: false }).eq('id', r.id);
                      fetchRestaurants();
                    }} className="text-red-400/40 hover:text-red-400 text-[9px]">Remove</button>
                  </div>

                  {/* Logo + Cover Image Upload */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Restaurant Logo</label>
                      {r.logo_url && <img src={r.logo_url} alt="logo" className="w-12 h-12 object-contain mb-1 border border-gold/20" />}
                      <input type="file" accept="image/*" id={`logo-${r.id}`}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          // ✅ ISSUE 5 FIX: Validate file type and size
                          if (!file.type.startsWith('image/')) { showToast('Only image files are allowed.', 'error'); return; }
                          if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB.', 'error'); return; }
                          const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
                          const path = `restaurants/${r.id}/logo_${Date.now()}.${ext}`;
                          const { data, error } = await supabase.storage.from('hotel-assets').upload(path, file, { upsert: true });
                          if (error) { showToast('Upload failed: ' + error.message, 'error'); return; }
                          const { data: { publicUrl } } = supabase.storage.from('hotel-assets').getPublicUrl(path);
                          await supabase.from('restaurants').update({ logo_url: publicUrl }).eq('id', r.id);
                          showToast('Logo saved!', 'success'); fetchRestaurants();
                        }}
                        className="w-full text-[9px] text-white/50 bg-navy/50 border border-gold/20 p-1.5 file:bg-gold file:text-navy file:border-0 file:text-[8px] file:font-bold file:px-2 file:py-0.5 file:mr-2 cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Cover Image</label>
                      {r.cover_url && <img src={r.cover_url} alt="cover" className="w-full h-12 object-cover mb-1 border border-gold/20" />}
                      <input type="file" accept="image/*" id={`cover-${r.id}`}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          // ✅ ISSUE 5 FIX: Validate file type and size
                          if (!file.type.startsWith('image/')) { showToast('Only image files are allowed.', 'error'); return; }
                          if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB.', 'error'); return; }
                          const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
                          const path = `restaurants/${r.id}/cover_${Date.now()}.${ext}`;
                          const { data, error } = await supabase.storage.from('hotel-assets').upload(path, file, { upsert: true });
                          if (error) { showToast('Upload failed: ' + error.message, 'error'); return; }
                          const { data: { publicUrl } } = supabase.storage.from('hotel-assets').getPublicUrl(path);
                          await supabase.from('restaurants').update({ cover_url: publicUrl }).eq('id', r.id);
                          showToast('Cover saved!', 'success'); fetchRestaurants();
                        }}
                        className="w-full text-[9px] text-white/50 bg-navy/50 border border-gold/20 p-1.5 file:bg-gold file:text-navy file:border-0 file:text-[8px] file:font-bold file:px-2 file:py-0.5 file:mr-2 cursor-pointer" />
                    </div>
                  </div>

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
                    <label className="text-[8px] text-white/50 uppercase font-bold block mb-1">Total Tables</label>
                    <input type="number" min="0" max="500"
                      defaultValue={s.total_tables || 0}
                      id={`tables-${r.id}`}
                      className="w-full bg-white border border-gold p-2 text-sm text-navy outline-none"
                      placeholder="e.g. 20" />
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
  const [qrOnlyMode, setQrOnlyMode] = useState(false);
  const [roomNumber, setRoomNumber] = useState(initialRoom || '');
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showManagerLock, setShowManagerLock] = useState(false);
  const [managerPassword, setManagerPassword] = useState('');
  const [failCount, setFailCount] = useState(0);

  useEffect(() => { if (initialRoom) setRoomNumber(initialRoom); }, [initialRoom]);

  useEffect(() => {
    const hotelParam = queryParams.get('hotel');
    if (hotelParam) {
      // Guest scanned QR — load fresh hotel data from DB
      supabase.from('hotel_clients')
        .select('id, hotel_name, entry_code, executive_password, access_mode, status')
        .eq('id', hotelParam).single()
        .then(({ data: h }) => {
          if (h && h.status !== 'suspended' && h.status !== 'inactive') {
            localStorage.setItem('sentinel_hotel', JSON.stringify(h));
            if (h.access_mode === 'qr_only') setQrOnlyMode(true);
          }
        });
    } else {
      // No hotel URL param — guest accessed directly, no QR lock applied
      // Clear any stale hotel session that might have old access_mode
      const hotelRaw = localStorage.getItem('sentinel_hotel');
      if (hotelRaw) {
        try {
          const h = JSON.parse(hotelRaw);
          // Only apply QR lock if hotel was set via QR (has hotel param in URL)
          // Direct URL access = no lock regardless of cached session
          if (h.access_mode === 'qr_only' && hotelParam) setQrOnlyMode(true);
        } catch {}
      }
    }
  }, []);

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // ✅ Check hotel entry code OR legacy 12345
    const typedCode = fullName.trim().toUpperCase();
    if (typedCode === '12345') { setShowSecret(true); return; }
    // Check hotel_clients for matching entry_code
    const { data: hotelByCode } = await supabase.from('hotel_clients')
      .select('id, hotel_name, entry_code, executive_password, access_mode, status')
      .eq('entry_code', typedCode).single();
    if (hotelByCode) {
      // Check hotel is active before allowing access
      if (hotelByCode.status === 'suspended' || hotelByCode.status === 'inactive') {
        showToast('This hotel account is currently suspended. Please contact support.', 'error');
        setLoading(false);
        return;
      }
      localStorage.setItem('sentinel_hotel', JSON.stringify(hotelByCode));
      setShowSecret(true);
      return;
    }
    setLoading(true);
    try {
      const hotelParam = queryParams.get('hotel');
      const hotelSessionRaw = localStorage.getItem('sentinel_hotel');
      const hotelSession = hotelSessionRaw ? JSON.parse(hotelSessionRaw) : null;
      const resolvedHotelId = hotelParam || hotelSession?.id || null;
      // ✅ FIX 3: Validate room number exists in rooms table
      if (resolvedHotelId) {
        const { data: roomCheck } = await supabase
          .from('rooms').select('id').eq('hotel_id', resolvedHotelId)
          .eq('room_number', roomNumber).single();
        if (!roomCheck) {
          showToast('Room number not found. Please scan the QR code in your room.', 'error');
          setLoading(false); return;
        }
      }
      const guestId = `${fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${roomNumber}`;
      const { data: existing } = await supabase.from('guests').select('*').eq('id', guestId).single();
      if (!existing) await supabase.from('guests').insert({ id: guestId, name: fullName, email: 'guest@hotel.com', room: roomNumber });
      const profile: UserProfile = { uid: guestId, email: 'guest@hotel.com', displayName: fullName || `Guest ${roomNumber}`, role: 'guest', department: 'None', roomNumber, status: 'Approved',
        hotelId: resolvedHotelId };
      localStorage.setItem('sentinel_local_session', JSON.stringify({ ...profile, loginAt: Date.now() }));
      logAudit('staff_login', { id: profile.uid, name: profile.displayName, role: profile.occupation || 'staff', hotelId: profile.hotelId },
        { type: 'staff', id: profile.uid }, { department: profile.department });
      onLoginSuccess(profile);
    } catch (err: any) { showToast(err.message || 'An error occurred. Please try again.', 'error'); } finally { setLoading(false); }
  };

  const handleManagerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    // Check hotel-specific exec password first
    const hotelRaw = localStorage.getItem('sentinel_hotel');
    const hotelCtx = hotelRaw ? JSON.parse(hotelRaw) : null;
    if (hotelCtx && managerPassword === hotelCtx.executive_password) {
      const adminProfile: UserProfile = {
        uid: 'exec_' + hotelCtx.id,
        email: 'executive@' + hotelCtx.hotel_name.toLowerCase().replace(/\s/g,'') + '.hotel',
        displayName: 'Executive Director',
        role: 'manager', department: 'None', status: 'Approved',
        hotelId: hotelCtx.id, hotelName: hotelCtx.hotel_name,
      };
      localStorage.setItem('sentinel_local_session', JSON.stringify({ ...adminProfile, loginAt: Date.now() }));
      onLoginSuccess(adminProfile); return;
    }
    // Legacy global password — ONLY works when no hotel context is active (owner testing only)
    if (managerPassword === 'Manager12345' && !hotelCtx) {
      const adminProfile: UserProfile = { uid: 'admin_override', email: 'admin@sentinel.pro', displayName: 'Executive Director', role: 'manager', department: 'None', status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify({ ...adminProfile, loginAt: Date.now() }));
      onLoginSuccess(adminProfile); return;
    }
    const { data: manager } = await supabase.from('managers').select('*').eq('password', managerPassword).single();
    if (manager) {
      const mp: UserProfile = { uid: manager.id, email: manager.email, displayName: manager.name, role: 'manager', department: manager.department as Department, status: 'Approved' };
      localStorage.setItem('sentinel_local_session', JSON.stringify({ ...mp, loginAt: Date.now() }));
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
        ) : qrOnlyMode && !isLocked ? (
          <div className="space-y-5 text-center">
            <div className="text-5xl">📱</div>
            <p className="text-gold font-serif text-lg">QR Access Only</p>
            <p className="text-white/60 text-[11px] leading-relaxed">
              Please scan the QR code placed in your room to access the guest portal.
            </p>
            <p className="text-white/30 text-[9px]">
              Find the Sentinel Pro card on your room desk.
            </p>
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
        const hotelCtxRaw = localStorage.getItem('sentinel_hotel');
        const hotelCtx = hotelCtxRaw ? JSON.parse(hotelCtxRaw) : null;
        // ✅ BUG FIX: Email uniqueness scoped to same hotel only
        let emailQuery = supabase.from('staff').select('id').eq('email', email);
        if (hotelCtx?.id) emailQuery = emailQuery.eq('hotel_id', hotelCtx.id);
        const { data: existing } = await emailQuery.single();
        if (existing) { showToast('A profile with this email already exists. Please login.', 'info'); setMode('login'); setLoading(false); return; }
        const hashedPassword = await bcrypt.hash(password, 10);
        const { error } = await supabase.from('staff').insert({
          name: fullName, staff_id: staffIdNumber, email, password: hashedPassword,
          department: derivedDept, occupation, approved: false,
          needs_executive_approval: ['Housekeeping Manager','Maintenance Manager','F&B Manager','Concierge Manager','Security Manager','Front Office Manager','Executive'].includes(occupation),
          logged_in: false, tasks_completed: 0, tasks_on_time: 0, violations: 0, failed_attempts: 0,
          hotel_id: hotelCtx?.id || null,
        });
        if (error) throw error;
        const needsExecApproval = ['Housekeeping Manager','F&B Manager','Concierge Manager','Security Manager','Front Office Manager','Executive'].includes(occupation);
        setPendingMessage(needsExecApproval ? `Your ${occupation} profile has been submitted for Executive approval.` : isManagerOccupation ? `Your ${occupation} profile has been submitted for Department Manager approval.` : `Your profile has been submitted for Department Manager approval.`);
        setShowPending(true);
      } else {
        const { data: staffData, error } = await supabase.from('staff').select('*').eq('email', email).single();
        if (error || !staffData) { showToast('Invalid email or password. Please try again.', 'error'); setLoading(false); return; }
        if (staffData.locked_until && new Date(staffData.locked_until) > new Date()) {
          const lockedUntil = new Date(staffData.locked_until).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });
          showToast(`Account is locked until ${lockedUntil}. Please try again later.`, 'error');
          setLoading(false);
          return;
        }
        const passwordMatch = await bcrypt.compare(password, staffData.password);
        if (!passwordMatch) {
          const attempts = (staffData.failed_attempts || 0) + 1;
          const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60000).toISOString() : null;
          await supabase.from('staff').update({ failed_attempts: attempts, ...(lockUntil ? { locked_until: lockUntil } : {}) }).eq('id', staffData.id);
          showToast(attempts >= 5 ? 'Account locked for 30 minutes due to too many failed attempts.' : `Incorrect password. ${5 - attempts} attempts remaining.`, 'error');
          setLoading(false); return;
        }
        if (!staffData.approved) { showToast('Your account is pending manager approval. Please wait.', 'info'); setLoading(false); return; }
        await supabase.from('staff').update({ logged_in: true, failed_attempts: 0, locked_until: null, device_id: null }).eq('id', staffData.id);
        const isManager = MANAGER_OCCUPATIONS.includes(staffData.occupation || '');
        // Supervisors get staff role (not manager dashboard)
        const hotelCtxRaw2 = localStorage.getItem('sentinel_hotel');
        const hotelCtx2 = hotelCtxRaw2 ? JSON.parse(hotelCtxRaw2) : null;
        // ✅ Staff must belong to this hotel — block NULL hotel_id too
        if (hotelCtx2?.id) {
          if (!staffData.hotel_id || staffData.hotel_id !== hotelCtx2.id) {
            showToast('This account does not belong to this hotel.', 'error');
            setLoading(false); return;
          }
        }
        const profile: UserProfile = {
          uid: staffData.id, email: staffData.email, displayName: staffData.name,
          role: isManager ? 'manager' : 'staff',
          department: (staffData.department as Department) || 'Front Office',
          staffIdNumber: staffData.staff_id, occupation: staffData.occupation, status: 'Approved',
          telegram_chat_id: staffData.telegram_chat_id || null,
          hotelId: staffData.hotel_id || hotelCtx2?.id || null,
          hotelName: hotelCtx2?.hotel_name || null,
        };
        localStorage.setItem('sentinel_local_session', JSON.stringify({ ...profile, loginAt: Date.now() }));
        logAudit('staff_login', { id: profile.uid, name: profile.displayName, role: profile.occupation || 'staff', hotelId: profile.hotelId },
          { type: 'staff', id: profile.uid }, { department: profile.department });
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
                  <optgroup label="── Maintenance / Engineering"><option>Maintenance Technician</option><option>Maintenance Supervisor</option><option>Maintenance Manager</option></optgroup>
                  <optgroup label="── Front Office"><option>Front Office Agent</option><option>Front Office Supervisor</option><option>Front Office Manager</option></optgroup>
                  <optgroup label="── Executive"><option>Executive</option></optgroup>
                </select>
                <div className="mt-1 flex items-center gap-2"><span className="text-[8px] text-white/40">Department:</span><span className="text-[8px] text-gold font-bold">{derivedDept === 'None' ? 'All Departments' : derivedDept}</span></div>
                {isManagerOccupation && <p className="text-[8px] text-gold font-bold">⚡ Requires {['Housekeeping Manager','F&B Manager','Concierge Manager','Security Manager','Front Office Manager','Executive'].includes(occupation) ? 'Executive' : 'Manager'} approval</p>}
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
  const [conciergeBookings, setConciergeBookings] = useState<any[]>([]);
  const [roomReasonModal, setRoomReasonModal] = useState<{ roomId: string; status: string; label: string } | null>(null);
  const [roomReason, setRoomReason] = useState('');
  const [checkoutConfirm, setCheckoutConfirm] = useState<{ roomId: string; roomNumber: string } | null>(null);
  const [checkoutConfirmed, setCheckoutConfirmed] = useState(false);
  const [conciergeCancelModal, setConciergeCancelModal] = useState<{ id: string; service: string; guest: string } | null>(null);
  const [conciergeRejectReason, setConciergeRejectReason] = useState('');
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
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

  const fetchConciergeBookings = useCallback(async () => {
    if (userProfile.department !== 'Concierge') return;
    const hId = userProfile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let q = supabase.from('concierge_bookings').select('*').order('created_at', { ascending: false });
    if (hId) q = q.eq('hotel_id', hId);
    const { data } = await q;
    if (data) setConciergeBookings(data.filter((b: any) => b.status === 'Pending' || b.status === 'Confirmed'));
  }, [userProfile]);

  const fetchSLA = async () => {
    // ✅ BUG FIX: Filter SLA by hotel_id — staff see their hotel's SLA only
    const hId = userProfile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let slaQ = supabase.from('sla_settings').select('*');
    if (hId) slaQ = slaQ.eq('hotel_id', hId);
    const { data } = await slaQ;
    if (data) { const map: any = {}; data.forEach((s: any) => { map[s.department] = s.sla_minutes; }); setSlaSettings(map); }
  };

  // ✅ FIX: Get server time via Supabase to avoid browser timezone issues
  

const mapRow = (row: any) => ({
    id: row.id, roomNumber: row.guest_room || '', type: row.service || '',
    message: row.notes,
    originalMessage: row.notes, // preserved original language
    department: row.department, status: row.status,
    guestId: row.guest_id || '', guestName: row.guest_name, timestamp: row.created_at,
    acceptedAt: row.accepted_at, completedAt: row.closed_at,
    assignedStaffName: row.assigned_to, delayReason: row.late_reason, lineItems: row.line_items,
    guestLanguage: row.language || 'en',
  });

  const fetchTasks = useCallback(async () => {
    const dept = userProfile.department;
    let query = supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (userProfile.hotelId) query = query.eq('hotel_id', userProfile.hotelId);
    if (dept === 'Security & Safety') query = query.in('department', ['Security & Safety', 'Security']);
    else query = query.eq('department', dept);
    // ✅ Reservation Agent only sees restaurant booking requests, not room service
    if (userProfile.occupation === 'Reservation Agent') {
      query = query.neq('service_key', 'room_service');
    }
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
    // ✅ BUG FIX: Filter rooms by hotel_id — HK staff only see their hotel
    const hId = userProfile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let rQ = supabase.from('rooms').select('*').order('room_number');
    if (hId) rQ = rQ.eq('hotel_id', hId);
    const { data } = await rQ;
    if (data) setRooms(data);
  }, [userProfile.hotelId]);

  // ✅ 5-second polling fallback + SLA escalation notifications
  const slaWarned = useRef<Set<string>>(new Set());
  useEffect(() => {
    const poll = setInterval(() => {
      fetchTasks();
      fetchSLA(); // ✅ Re-fetch SLA every cycle — picks up manager changes immediately
      if (userProfile.department === 'Concierge') fetchConciergeBookings();
      // SLA Escalation — warn staff before it expires
      tasks.forEach(task => {
        if (task.status === 'Completed') return;
        const dept = userProfile.department;
        const slaLimit = getSLALimit(dept); // ✅ Consistent with handleComplete
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
        // Level 2: SLA exceeded (100%) → red alert to staff
        if (pct >= 100 && !slaWarned.current.has(warnKey100)) {
          slaWarned.current.add(warnKey100);
          playNotificationSound();
          showBrowserNotification('🚨 SLA EXCEEDED!', `Room #${task.roomNumber} · ${task.type} · Reason required to close!`);
          setNewOrderAlert(`🚨 SLA EXCEEDED — Room #${task.roomNumber} · Reason required!`);
          // Notify manager via Telegram on SLA breach
          try {
            if (userProfile.hotelId) {
              const slaMsg = '<b>⚠️ SLA Violated — ' + task.type + '</b>\n'
                + '🏨 Room ' + task.roomNumber + ' · ' + (task.guestName || '') + '\n'
                + '⏱ Limit exceeded · ' + Math.floor(elapsed/60) + ' min elapsed\n'
                + '👷 ' + (task.assignedTo || 'Unassigned');
              notifyDeptManager(userProfile.hotelId, userProfile.department, slaMsg);
            }
          } catch { /* never block SLA logic */ };
          setTimeout(() => setNewOrderAlert(null), 15000);
          // Mark as Violated in DB → visible to Manager & Executive in their SLA tab
          supabase.from('requests').update({ status: 'Violated' }).eq('id', task.id)
            .then(() => fetchTasks());
        }
        // Level 3: Escalated (150%+ SLA) → notify manager/exec via visual flag
        const warnKey150 = `${task.id}-150`;
        if (pct >= 150 && !slaWarned.current.has(warnKey150)) {
          slaWarned.current.add(warnKey150);
          playNotificationSound();
          showBrowserNotification('🔴 ESCALATED TO MANAGEMENT', `Room #${task.roomNumber} · ${task.type} · 150% SLA exceeded — Manager & Executive alerted!`);
          setNewOrderAlert(`🔴 ESCALATED — Room #${task.roomNumber} · Manager & Executive notified!`);
          setTimeout(() => setNewOrderAlert(null), 20000);
        }
      });
    }, 5000);
    return () => clearInterval(poll);
  }, [fetchTasks, tasks, slaSettings, userProfile]);

  useEffect(() => {
    // ✅ Always fetch fresh data on mount/login — ensures history loads
    // Reservation Agent auto-opens restaurant portal — they don't handle task requests
    if (userProfile.occupation === 'Reservation Agent') {
      setShowFBRestaurant(true);
    } else {
      fetchTasks();
      fetchSLA();
    }
    if (userProfile.department === 'Concierge') fetchConciergeBookings();
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

    // F&B staff also listen for restaurant bookings
    let restChannel: any = null;
    if (userProfile.department === 'F&B') {
      restChannel = supabase.channel(`rest-${userProfile.uid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'restaurant_bookings' }, (payload) => {
          const booking = payload.new as any;
          const myHotelId = userProfile.hotelId;
          if (myHotelId && booking.hotel_id && booking.hotel_id !== myHotelId) return;
          const msg = `${booking.guest_name} · ${booking.pax} guests · ${booking.date} ${booking.time}`;
          setNewOrderAlert(`🍽 New Reservation: ${msg}`);
          playNotificationSound();
          showBrowserNotification('🍽 Sentinel Pro — Restaurant Reservation', msg);
          setTimeout(() => setNewOrderAlert(null), 15000);
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (restChannel) supabase.removeChannel(restChannel);
    };
  }, [userProfile, fetchTasks, fetchRooms, isHousekeeping]);

  const getElapsed = (ts: any) => {
    if (!ts) return 0;
    try {
      let normalized = String(ts).trim().replace(' ', 'T');
      // Add Z if no timezone suffix — same fix as formatTime
      if (!/([Z]|[+\-]\d{2}(:\d{2})?)$/.test(normalized)) normalized += 'Z';
      const created = new Date(normalized).getTime();
      if (isNaN(created)) return 0;
      const diff = Math.floor((now - created) / 1000);
      return diff < 0 ? 0 : diff;
    } catch {
      return 0;
    }
  };
  const getSLALimit = (dept: string) => (slaSettings[dept] || 30) * 60; // Default 30 min if not configured

  // formatTime moved to module level

  const getDuration = (from: any, to: any) => {
    if (!from || !to) return null;
    const fixTz = (ts: string) => {
      let n = ts.trim().replace(' ', 'T');
      if (!/([Z]|[+\-]\d{2}(:\d{2})?)$/.test(n)) n += 'Z';
      return n;
    };
    const mins = Math.floor((new Date(fixTz(to)).getTime() - new Date(fixTz(from)).getTime()) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
  };

  const handleAccept = async (id: string) => {
    // ✅ Staff can always accept freely — delay reason only required on CLOSE
    const acceptedAt = new Date().toISOString();
    await supabase.from('requests').update({ status: 'In Progress', accepted_at: acceptedAt, assigned_to: userProfile.displayName, assigned_to_email: userProfile.email }).eq('id', id);
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
    const closedAt = new Date().toISOString();
    await supabase.from('requests').update({ status: 'Completed', closed_at: closedAt }).eq('id', task.id);
    logAudit('request_completed', { id: userProfile.uid, name: userProfile.displayName, role: userProfile.occupation || 'staff', hotelId: userProfile.hotelId },
      { type: 'request', id: task.id }, { service: task.type, room: task.roomNumber });
    const { data: sr } = await supabase.from('staff').select('tasks_completed,tasks_on_time').eq('id', userProfile.uid).single();
    if (sr) await supabase.from('staff').update({ tasks_completed: (sr.tasks_completed || 0) + 1, tasks_on_time: (sr.tasks_on_time || 0) + 1 }).eq('id', userProfile.uid);
    // ✅ Refresh immediately — completed task disappears from active, appears in history
    await fetchTasks();
  };

  const handleCompleteWithReason = async () => {
    if (!delayReason || !delayModalTask) return;
    const closedAtR = new Date().toISOString();
    await supabase.from('requests').update({ status: 'Completed', closed_at: closedAtR, late_reason: delayReason }).eq('id', delayModalTask.id);
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

  const updateRoomStatus = async (roomId: string, status: string, reason?: string) => {
    const now = new Date().toISOString();
    const update: any = {
      status,
      last_updated: now,
    };
    // Track who did what
    if (status === 'Cleaning')  { update.cleaning_at = now;   update.cleaned_by = userProfile.displayName; }
    if (status === 'Clean')     { update.cleaned_at = now;    update.cleaned_by = userProfile.displayName; update.assigned_to = userProfile.displayName; }
    if (status === 'Inspected') { update.inspected_at = now;  update.inspected_by = userProfile.displayName; }
    if (status === 'Checked Out') { update.checked_out_by = userProfile.displayName; update.checked_out_at = now; }
    if (reason) update.status_reason = reason;
    if (!['Checked Out'].includes(status)) update.assigned_to = userProfile.displayName;
    // ✅ FIX 2: Checked Out — clear guest session so they cannot re-login without QR
    if (status === 'Checked Out') {
      // Find the room to get room_number
      const room = rooms.find((r: any) => r.id === roomId);
      if (room) {
        const hId = userProfile.hotelId || (() => {
          try { return JSON.parse(localStorage.getItem('sentinel_hotel') || '{}').id; } catch { return null; }
        })();
        // Delete guest record — triggers instant logout via realtime
        await supabase.from('guests').delete().eq('room', room.room_number);
        // Delete ALL requests for this room — clean slate for next guest
        if (hId) {
          await supabase.from('requests').delete()
            .eq('guest_room', room.room_number)
            .eq('hotel_id', hId);
        }
        // Reset room fields — clean slate for next guest
        update.assigned_to   = null;
        update.cleaning_at   = null;
        update.cleaned_at    = null;
        update.cleaned_by    = null;
        update.inspected_at  = null;
        update.inspected_by  = null;
        update.status_reason = null;
      }
    }
    await supabase.from('rooms').update(update).eq('id', roomId);
    fetchRooms();
  };

  const submitMaintenanceRequest = async () => {
    if (!maintenanceForm.room || !maintenanceForm.description) { showToast('Please fill in both room/location and description fields.', 'error'); return; }
    const maintHotelId = userProfile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    const { error: maintErr } = await supabase.from('requests').insert({
      created_at: new Date().toISOString(),
      guest_room: maintenanceForm.room, guest_id: userProfile.uid, guest_name: userProfile.displayName,
      service: `Maintenance: ${maintenanceForm.category}`,
      notes: `${maintenanceForm.description} [Priority: ${maintenanceForm.priority}]`,
      department: 'Maintenance', status: 'Pending',
      hotel_id: maintHotelId,
    });
    if (maintErr) { showToast('Failed to submit: ' + maintErr.message, 'error'); return; }
    showToast('Maintenance request submitted successfully!', 'success');
    setMaintenanceForm({ room: '', category: 'AC / Heating Issue', description: '', priority: 'Normal' });
  };

  const connectTelegram = () => {
    const deepLink = `https://t.me/${BOT_NAME}?start=${userProfile.uid}`;
    window.open(deepLink, '_blank');
  };

  const staffLogout = async () => {
  await supabase.from('staff').update({ logged_in: false }).eq('id', userProfile.uid);
  logAudit('staff_logout', { id: userProfile.uid, name: userProfile.displayName, role: userProfile.occupation || 'staff', hotelId: userProfile.hotelId },
    { type: 'staff', id: userProfile.uid }, { department: userProfile.department });
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
          {userProfile.hotelName && <p className="text-gold/50 text-[8px] uppercase tracking-[0.2em] mb-0.5">{userProfile.hotelName}</p>}
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
          <button onClick={connectTelegram}
            className={`flex items-center gap-1 border px-3 py-1.5 text-[9px] font-bold uppercase ${userProfile.telegram_chat_id ? 'border-green-500/50 text-green-400' : 'border-gold/20 text-gold/50 hover:text-gold'}`}>
            {userProfile.telegram_chat_id ? '✅ Telegram On' : '🔔 Connect Telegram'}
          </button>
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
                  {(task.status === 'Pending' || task.status === 'Violated') ? (
                    <button onClick={() => handleAccept(task.id)} className={cn('w-full m-0 py-2.5 text-[10px] font-bold uppercase', task.status === 'Violated' ? 'bg-orange-600 text-white' : 'gold-button')}>
                      {task.status === 'Violated' ? '⚠ Accept Task (SLA Exceeded)' : 'Accept Task'}
                    </button>
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

      {/* CONCIERGE BOOKINGS — visible to Concierge dept staff */}
      {activeTab === 'active' && userProfile.department === 'Concierge' && conciergeBookings.length > 0 && (
        <div className="p-4 space-y-3">
          <h3 className="text-[10px] uppercase tracking-widest text-gold font-bold border-b border-gold/20 pb-2">
            🔑 Concierge Bookings — Pending Confirmation
          </h3>
          {conciergeBookings.map(b => (
            <div key={b.id} className="bg-[#001c36] border border-gold/10 p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-bold text-sm">{b.service_name}</p>
                  <p className="text-[9px] text-gold">Room {b.room_number} · {b.guest_name}</p>
                </div>
                <span className={cn('text-[8px] font-bold px-2 py-0.5',
                  b.status === 'Pending' ? 'bg-yellow-900/40 text-yellow-400' :
                  b.status === 'Confirmed' ? 'bg-green-900/40 text-green-400' :
                  'bg-white/10 text-white/40')}>{b.status}</span>
              </div>
              <div className="text-[9px] text-white/50 space-y-0.5">
                <p>📅 Pickup: {b.pickup_date} at {b.pickup_time}</p>
                {b.return_date && <p>🔄 Return: {b.return_date} at {b.return_time}</p>}
                <p>👥 {b.guests_count} guest{b.guests_count > 1 ? 's' : ''} · AED {b.total_price}</p>
                {b.special_requests && <p>📝 {b.special_requests}</p>}
              </div>
              {b.status === 'Pending' && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      await supabase.from('concierge_bookings').update({ status: 'Confirmed', confirmed_by: userProfile.displayName }).eq('id', b.id);
                      fetchConciergeBookings();
                    }} className="flex-1 py-1.5 bg-green-900/40 border border-green-500/40 text-green-400 text-[9px] font-bold uppercase">
                      ✓ Confirm
                    </button>
                    <button
                      onClick={() => { setConciergeCancelModal({ id: b.id, service: b.service_name, guest: b.guest_name }); }}
                      className="flex-1 py-1.5 bg-red-900/40 border border-red-500/40 text-red-400 text-[9px] font-bold uppercase">
                      ✕ Cancel / Reject
                    </button>
                  </div>
                  {cancellingBookingId === b.id && (
                    <div className="space-y-2">
                      <textarea
                        placeholder="Please explain the reason for cancellation (visible to guest)..."
                        className="w-full bg-navy/30 border border-red-500/30 text-white/80 p-2 text-[9px] resize-none outline-none"
                        rows={2}
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                      />
                      <button onClick={async () => {
                        if (!cancelReason.trim()) { showToast('Please enter a cancellation reason', 'error'); return; }
                        await supabase.from('concierge_bookings').update({
                          status: 'Cancelled',
                          confirmed_by: userProfile.displayName,
                          special_requests: (b.special_requests ? b.special_requests + ' | ' : '') + 'CANCELLATION REASON: ' + cancelReason
                        }).eq('id', b.id);
                        setCancellingBookingId(null);
                        setCancelReason('');
                        fetchConciergeBookings();
                      }} className="w-full py-1.5 bg-red-700 text-white text-[9px] font-bold uppercase">
                        Confirm Cancellation
                      </button>
                    </div>
                  )}
                </div>
              )}
              {b.status === 'Confirmed' && (
                <button onClick={async () => {
                  await supabase.from('concierge_bookings').update({ status: 'Completed', confirmed_by: userProfile.displayName }).eq('id', b.id);
                  fetchConciergeBookings();
                }} className="w-full py-1.5 bg-blue-900/40 border border-blue-500/40 text-blue-400 text-[9px] font-bold uppercase">
                  ✓ Mark Completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CHECKOUT CONFIRMATION MODAL */}
      {checkoutConfirm && (
        <div className="fixed inset-0 z-[20001] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#001c36] p-8 max-w-sm w-full border-t-4 border-red-600 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚪</span>
              <div>
                <h2 className="text-xl font-serif text-white">Confirm Check Out</h2>
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Room {checkoutConfirm.roomNumber}</p>
              </div>
            </div>
            <div className="bg-red-900/20 border border-red-500/30 p-3 rounded space-y-1">
              <p className="text-white/70 text-[11px]">⚠ This will permanently:</p>
              <p className="text-white/60 text-[10px]">• Log out the current guest immediately</p>
              <p className="text-white/60 text-[10px]">• Delete all pending guest requests</p>
              <p className="text-white/60 text-[10px]">• Reset room for next guest</p>
              <p className="text-green-400/80 text-[10px]">• Completed requests remain in history ✓</p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={checkoutConfirmed}
                onChange={e => setCheckoutConfirmed(e.target.checked)}
                className="w-4 h-4 accent-red-500" />
              <span className="text-white text-[11px]">I confirm this guest is checking out</span>
            </label>
            <div className="flex gap-3">
              <button onClick={() => { setCheckoutConfirm(null); setCheckoutConfirmed(false); }}
                className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase">
                Cancel
              </button>
              <button disabled={!checkoutConfirmed}
                onClick={() => {
                  updateRoomStatus(checkoutConfirm.roomId, 'Checked Out');
                  setCheckoutConfirm(null);
                  setCheckoutConfirmed(false);
                }}
                className="flex-1 py-3 bg-red-600 text-white text-[10px] font-bold uppercase disabled:opacity-40">
                Confirm Check Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HK ROOM REASON MODAL */}
      {roomReasonModal && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md">
          <div className="bg-[#001c36] p-8 max-w-sm w-full border-t-4 border-purple-500 shadow-2xl">
            <h2 className="text-xl font-serif text-white mb-2">{roomReasonModal.label}</h2>
            <p className="text-white/50 text-[10px] mb-4">Please select a reason before updating the room status.</p>
            <select value={roomReason} onChange={e => setRoomReason(e.target.value)}
              className="w-full p-3 bg-white border border-purple-400 mb-5 text-sm text-navy outline-none">
              <option value="">-- Select Reason (Required) --</option>
              {roomReasonModal.status === 'Do Not Disturb' && <>
                <option>Guest requested DND</option>
                <option>Guest sleeping</option>
                <option>Guest privacy requested</option>
              </>}
              {roomReasonModal.status === 'Out of Order' && <>
                <option>Maintenance required</option>
                <option>Deep cleaning in progress</option>
                <option>Plumbing issue</option>
                <option>AC / Electrical issue</option>
                <option>Awaiting inspection</option>
              </>}
              {roomReasonModal.status === 'Guest Refused' && <>
                <option>Guest refused housekeeping service</option>
                <option>Guest was present and declined</option>
                <option>Guest requested no entry</option>
              </>}
              {roomReasonModal.status === 'Different Time' && <>
                <option>Guest requested service after 2 PM</option>
                <option>Guest requested service after 4 PM</option>
                <option>Guest requested service tomorrow morning</option>
                <option>Guest will call when ready</option>
              </>}
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setRoomReasonModal(null); setRoomReason(''); }}
                className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase">Cancel</button>
              <button disabled={!roomReason}
                onClick={() => {
                  updateRoomStatus(roomReasonModal.roomId, roomReasonModal.status, roomReason);
                  setRoomReasonModal(null); setRoomReason('');
                }}
                className="flex-1 py-3 bg-purple-600 text-white text-[10px] font-bold uppercase disabled:opacity-40">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONCIERGE REJECTION MODAL */}
      {conciergeCancelModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="bg-[#001c36] border border-gold/30 max-w-sm w-full p-6 space-y-4">
            <h3 className="text-gold font-serif text-base">Cancel / Reject Booking</h3>
            <div className="bg-navy/50 p-3 rounded text-[9px] text-white/60 space-y-1">
              <p><b className="text-white">{conciergeCancelModal.service}</b></p>
              <p>Guest: {conciergeCancelModal.guest}</p>
            </div>
            <div>
              <label className="text-[9px] text-white/50 uppercase tracking-wider block mb-2">Reason for cancellation <span className="text-red-400">*</span></label>
              <textarea
                value={conciergeRejectReason}
                onChange={e => setConciergeRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Fully booked on this date, vehicle not available, etc."
                className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none resize-none focus:border-gold"
              />
            </div>
            <p className="text-[8px] text-white/30 italic">
              Guest will receive: "Dear Valued Guest, we regret to inform you that your {conciergeCancelModal.service} booking has been cancelled. [Your reason]. We apologise for any inconvenience and hope to assist you with an alternative arrangement."
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setConciergeCancelModal(null); setConciergeRejectReason(''); }}
                className="flex-1 py-2 border border-white/20 text-white/50 text-[9px] uppercase">
                Back
              </button>
              <button
                disabled={!conciergeRejectReason.trim()}
                onClick={async () => {
                  const fullMsg = `Dear Valued Guest, we regret to inform you that your ${conciergeCancelModal.service} booking has been cancelled. ${conciergeRejectReason.trim()}. We apologise for any inconvenience and hope to assist you with an alternative arrangement. Please do not hesitate to contact our concierge team.`;
                  await supabase.from('concierge_bookings').update({
                    status: 'Cancelled',
                    confirmed_by: userProfile.displayName,
                    rejection_reason: fullMsg,
                  }).eq('id', conciergeCancelModal.id);
                  logAudit('concierge_booking_cancelled', { id: userProfile.uid, name: userProfile.displayName, role: userProfile.occupation || 'staff', hotelId: userProfile.hotelId },
                    { type: 'concierge_booking', id: conciergeCancelModal.id }, { service: conciergeCancelModal.service, guest: conciergeCancelModal.guest });
                  setConciergeCancelModal(null);
                  setConciergeRejectReason('');
                  fetchConciergeBookings();
                }}
                className="flex-1 py-2 bg-red-700 text-white text-[9px] font-bold uppercase disabled:opacity-40">
                Confirm Cancellation
              </button>
            </div>
          </div>
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
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif text-gold flex items-center gap-2"><BedDouble size={18} /> Room Status Board</h2>
            <button onClick={fetchRooms} className="text-gold/60 hover:text-gold"><RefreshCw size={16} /></button>
          </div>
          <RoomLiveBoard rooms={rooms} occupation={userProfile.occupation}
            onStatusChange={(roomId: string, roomNumber: string, newStatus: string) => {
              if (newStatus === 'Checked Out') {
                setCheckoutConfirm({ roomId, roomNumber });
                setCheckoutConfirmed(false);
                return;
              }
              const sel = ROOM_STATUSES.find((s: any) => s.key === newStatus);
              if ((sel as any)?.requireReason) {
                setRoomReasonModal({ roomId, status: newStatus, label: (sel as any).label });
                setRoomReason('');
              } else {
                updateRoomStatus(roomId, newStatus);
              }
            }}
          />
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
// ─── PDF ROOM IMPORT ─────────────────────────────────────────────────────────
const PDFRoomImport: React.FC<{ profile: UserProfile; rooms: any[]; onDone: () => void }> = ({ profile, rooms, onDone }) => {
  const [pdfType, setPdfType] = useState<'arrivals' | 'inhouse' | 'checkouts' | ''>('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<{ roomNumber: string; guestName: string; arrival: string; checkout: string }[]>([]);
  const [matched, setMatched] = useState<{ roomNumber: string; guestName: string; arrival: string; checkout: string; roomId: string }[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const extractRoomsFromText = (text: string) => {
    // PDF.js outputs all text as one continuous string — no line breaks between table rows
    const results: { roomNumber: string; guestName: string; arrival: string; checkout: string }[] = [];
    const seen = new Set<string>();
    const dateRe = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g;
    const natRe = /\b(UAE|UK|USA|India|China|France|Germany|Russia|KSA|Saudi|Oman|Qatar|Kuwait|Bahrain|Jordan|Egypt|Lebanon|Filipino|Pakistani|Italian|Spanish|Turkish|Japanese|Korean|Australian|Canadian)\b/gi;
    const roomRe = /(?<!\d)(\d{3,4})(?!\d)/g;
    const flat = text.replace(/\s+/g, ' ').trim();
    let m: RegExpExecArray | null;
    while ((m = roomRe.exec(flat)) !== null) {
      const num = m[1];
      const val = parseInt(num);
      if (val < 100 || (val >= 2000 && val <= 2100)) continue;
      if (seen.has(num)) continue;
      const after = flat.slice(m.index + num.length, m.index + num.length + 120);
      if (!/^\s+[A-Za-z]/.test(after)) continue;
      const afterDates: string[] = [];
      const tmpRe = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g;
      let dm: RegExpExecArray | null;
      while ((dm = tmpRe.exec(after)) !== null) afterDates.push(dm[0]);
      if (afterDates.length < 2) continue;
      const firstDateIdx = after.indexOf(afterDates[0]);
      const nameRaw = after.slice(0, firstDateIdx).trim();
      const name = nameRaw.replace(natRe, '').replace(/[^a-zA-Z ]/g, '').replace(/\s+/g, ' ').trim();
      if (!name) continue;
      seen.add(num);
      results.push({ roomNumber: num, guestName: name, arrival: afterDates[0], checkout: afterDates[1] });
    }
    return results;
  };

  const handleFile = async (file: File) => {
    if (!pdfType) { alert('Please select PDF type first'); return; }
    setParsing(true);
    setParsed([]); setMatched([]); setUnmatched([]); setDone(false);
    try {
      // Load PDF.js dynamically
      const pdfjsLib = (window as any).pdfjsLib || await new Promise<any>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          const lib = (window as any).pdfjsLib;
          lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(lib);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let fullText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      const extracted = extractRoomsFromText(fullText);
      setParsed(extracted);
      // Match against hotel rooms
      const hotelRoomNumbers = new Set(rooms.map(r => String(r.room_number)));
      const matchedRooms = extracted
        .filter(e => hotelRoomNumbers.has(e.roomNumber))
        .map(e => ({ ...e, roomId: rooms.find(r => String(r.room_number) === e.roomNumber)?.id || '' }));
      const unmatchedRooms = extracted.filter(e => !hotelRoomNumbers.has(e.roomNumber)).map(e => e.roomNumber);
      setMatched(matchedRooms);
      setUnmatched(unmatchedRooms);
    } catch (err) {
      alert('Failed to parse PDF. Please check the file and try again.');
    }
    setParsing(false);
  };

  const applyChanges = async () => {
    if (pdfType === 'checkouts') { setDone(true); return; }
    setApplying(true);
    const now = new Date().toISOString();
    const hId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    // Bulk update — mark all matched rooms as Dirty in one query
    const roomIds = matched.map((r: any) => r.roomId).filter(Boolean);
    if (roomIds.length > 0) {
      await supabase.from('rooms').update({
        status: 'Dirty',
        last_updated: now,
        cleaned_by: null, cleaned_at: null,
        inspected_by: null, inspected_at: null,
        status_reason: pdfType === 'arrivals' ? 'Arrival - ready for cleaning' : 'In-house - ready for cleaning',
      }).in('id', roomIds);
    }
    setApplying(false);
    setDone(true);
    onDone();
  };

  return (
    <div className="bg-[#001c36] border border-gold/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-gold">📄 PDF Room Import</h3>
          <p className="text-white/40 text-[9px] mt-0.5">Upload front office PDF to update room statuses</p>
        </div>
      </div>

      {/* Step 1: Select type */}
      <div className="space-y-2">
        <p className="text-[9px] text-white/50 uppercase font-bold">Step 1 — Select PDF Type</p>
        <div className="flex gap-2 flex-wrap">
          {(['arrivals', 'inhouse', 'checkouts'] as const).map(t => (
            <button key={t} onClick={() => { setPdfType(t); setParsed([]); setMatched([]); setUnmatched([]); setDone(false); }}
              className={cn('px-3 py-2 text-[9px] font-bold uppercase border',
                pdfType === t ? 'bg-gold text-navy border-gold' : 'border-gold/30 text-gold/70 hover:bg-gold/10')}>
              {t === 'arrivals' ? '🛬 Arrivals' : t === 'inhouse' ? '🏨 In-House' : '🛫 Checkouts'}
            </button>
          ))}
        </div>
        {pdfType === 'arrivals' && <p className="text-[9px] text-yellow-400">→ Will mark rooms as Dirty for cleaning</p>}
        {pdfType === 'inhouse' && <p className="text-[9px] text-yellow-400">→ Will mark rooms as Dirty for cleaning</p>}
        {pdfType === 'checkouts' && <p className="text-[9px] text-white/40">→ Preview only — staff handle manually</p>}
      </div>

      {/* Step 2: Upload */}
      {pdfType && (
        <div className="space-y-2">
          <p className="text-[9px] text-white/50 uppercase font-bold">Step 2 — Upload PDF</p>
          <input ref={fileRef} type="file" accept=".pdf" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-3 border-2 border-dashed border-gold/30 text-gold text-[10px] hover:border-gold/60 hover:bg-gold/5">
            {parsing ? '⏳ Parsing PDF...' : '📁 Click to upload PDF'}
          </button>
        </div>
      )}

      {/* Step 3: Preview */}
      {matched.length > 0 && !done && (
        <div className="space-y-3">
          <p className="text-[9px] text-white/50 uppercase font-bold">
            Step 3 — Preview ({matched.length} rooms found{unmatched.length > 0 ? `, ${unmatched.length} unrecognised` : ''})
          </p>
          {unmatched.length > 0 && (
            <p className="text-[9px] text-red-400/70">⚠ Unrecognised rooms (not in hotel): {unmatched.join(', ')}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] border-collapse min-w-[400px]">
              <thead>
                <tr className="border-b border-gold/20">
                  <th className="text-left py-1.5 px-2 text-gold/60 font-bold uppercase text-[8px]">Room</th>
                  <th className="text-left py-1.5 px-2 text-gold/60 font-bold uppercase text-[8px]">Guest</th>
                  <th className="text-left py-1.5 px-2 text-gold/60 font-bold uppercase text-[8px]">Arrival</th>
                  <th className="text-left py-1.5 px-2 text-gold/60 font-bold uppercase text-[8px]">Checkout</th>
                  <th className="text-left py-1.5 px-2 text-gold/60 font-bold uppercase text-[8px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {matched.map((r, i) => (
                  <tr key={r.roomNumber} className={cn('border-b border-white/5', i % 2 === 0 ? '' : 'bg-white/[0.02]')}>
                    <td className="py-1.5 px-2 text-white font-bold">{r.roomNumber}</td>
                    <td className="py-1.5 px-2 text-white/70">{r.guestName}</td>
                    <td className="py-1.5 px-2 text-white/50">{r.arrival}</td>
                    <td className="py-1.5 px-2 text-white/50">{r.checkout}</td>
                    <td className="py-1.5 px-2">
                      {pdfType !== 'checkouts'
                        ? <span className="text-yellow-400 font-bold text-[8px]">→ DIRTY</span>
                        : <span className="text-white/30 text-[8px]">View only</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setParsed([]); setMatched([]); setUnmatched([]); }}
              className="flex-1 py-2.5 border border-gold/20 text-gold text-[9px] font-bold uppercase">
              Cancel
            </button>
            <button onClick={applyChanges} disabled={applying}
              className="flex-1 py-2.5 bg-gold text-navy text-[9px] font-bold uppercase disabled:opacity-40">
              {applying ? 'Applying...' : pdfType === 'checkouts' ? 'Done (View Only)' : `Apply — Mark ${matched.length} Rooms Dirty`}
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="bg-green-900/20 border border-green-500/30 p-3 text-center">
          <p className="text-green-400 font-bold text-[11px]">
            {pdfType === 'checkouts' ? '✅ Checkout list reviewed' : `✅ ${matched.length} rooms marked as Dirty`}
          </p>
        </div>
      )}

      {parsed.length === 0 && !parsing && matched.length === 0 && pdfType && (
        <p className="text-white/30 text-[10px] text-center py-2">Upload a PDF to see extracted room data</p>
      )}
    </div>
  );
};


// ─── HK ROOM LIVE BOARD ───────────────────────────────────────────────────────
const ROOM_STATUS_FILTERS = ['All','Clean','Dirty','Cleaning','Inspected',
  'Do Not Disturb','Out of Order','Checked Out','Guest Refused','Different Time'];

const BADGE_COLOR = (s: string) =>
  s === 'Clean' ? 'bg-green-600' : s === 'Dirty' ? 'bg-red-600' :
  s === 'Cleaning' ? 'bg-yellow-600' : s === 'Inspected' ? 'bg-orange-600' :
  s === 'Do Not Disturb' ? 'bg-purple-600' : s === 'Checked Out' ? 'bg-blue-600' :
  s === 'Guest Refused' ? 'bg-pink-600' : s === 'Different Time' ? 'bg-cyan-600' :
  s === 'Out of Order' ? 'bg-gray-600' : 'bg-gray-500';

const RoomLiveBoard: React.FC<{
  rooms: any[];
  onReactivate?: (roomId: string) => void;
  onStatusChange?: (roomId: string, roomNumber: string, newStatus: string) => void;
  occupation?: string;
}> = ({ rooms, onReactivate, onStatusChange, occupation }) => {
  const [filter, setFilter] = useState('All');
  const [roomSearch, setRoomSearch] = useState('');
  const filtered = rooms
    .filter(r => filter === 'All' || r.status === filter)
    .filter(r => !roomSearch.trim() || String(r.room_number).includes(roomSearch.trim()));
  return (
    <div className="space-y-3">
      {/* Search bar */}
      <input
        type="text"
        value={roomSearch}
        onChange={e => setRoomSearch(e.target.value)}
        placeholder="Search room number..."
        className="w-full bg-navy/50 border border-gold/20 text-white text-[10px] p-2 outline-none placeholder:text-white/30 mb-1"
      />
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {ROOM_STATUS_FILTERS.map(f => {
          const count = f === 'All' ? rooms.length : rooms.filter(r => r.status === f).length;
          if (f !== 'All' && count === 0) return null;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-2.5 py-1 text-[8px] font-bold uppercase rounded-full border transition-colors',
                filter === f ? 'bg-gold text-navy border-gold' : 'border-white/20 text-white/50 hover:border-gold/50')}>
              {f} ({count})
            </button>
          );
        })}
      </div>
      {/* Row table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[10px] border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-gold/20 bg-navy/40">
              <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Room</th>
              <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Status</th>
              <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Cleaned By</th>
              <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Clean Time</th>
              <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Inspected By</th>
              <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Inspect Time</th>
              <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Notes</th>
            
                      {onStatusChange && <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Action</th>}
                      {onReactivate && !onStatusChange && <th className="py-2 px-2 w-24"></th>}
                    </tr>
          </thead>
          <tbody>
            {filtered.map((room: any, i: number) => (
              <tr key={room.id} className={cn('border-b border-white/[0.04]', i % 2 === 0 ? '' : 'bg-white/[0.02]')}>
                <td className="py-2 px-2 text-white font-bold text-[11px]">{room.room_number}</td>
                <td className="py-2 px-2">
                  <span className={cn('px-2 py-0.5 text-[8px] font-bold text-white rounded-full whitespace-nowrap', BADGE_COLOR(room.status))}>
                    {room.status}
                  </span>
                </td>
                <td className="py-2 px-2 text-white/70">{room.cleaned_by || '—'}</td>
                <td className="py-2 px-2 text-white/70 whitespace-nowrap">{formatTime(room.cleaned_at)}</td>
                <td className="py-2 px-2 text-white/70">{room.inspected_by || '—'}</td>
                <td className="py-2 px-2 text-white/70 whitespace-nowrap">{formatTime(room.inspected_at)}</td>
                <td className="py-2 px-2 text-white/50 italic text-[9px] max-w-[120px]">
                  {room.status_reason
                    || (room.cleaning_at && !room.cleaned_at ? `Cleaning since ${formatTime(room.cleaning_at)}` : '')
                    || (room.status === 'Dirty' && !room.cleaned_by ? 'Not yet assigned' : '')}
                </td>
                {onStatusChange && (
                  <td className="py-1.5 px-1.5">
                    {room.status === 'Checked Out' ? (
                      <button onClick={() => onReactivate && onReactivate(room.id)}
                        className="w-full px-2 py-1.5 bg-green-700 text-white text-[8px] font-bold uppercase">
                        ✅ Re-activate
                      </button>
                    ) : (
                      <select value={room.status}
                        onChange={e => onStatusChange(room.id, room.room_number, e.target.value)}
                        className="w-full bg-navy/60 border border-gold/30 text-white text-[9px] p-1 outline-none min-w-[130px]">
                        {(ROOM_STATUSES as any[]).filter((s: any) => {
                          const isSup = occupation === 'Housekeeping Supervisor' || occupation === 'Housekeeping Manager';
                          if (s.supervisorOnly && !isSup) return false;
                          return true;
                        }).map((s: any) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    )}
                  </td>
                )}
                {!onStatusChange && onReactivate && (
                  <td className="py-1.5 px-2">
                    {room.status === 'Checked Out' && (
                      <button onClick={() => onReactivate(room.id)}
                        className="px-2 py-1 bg-green-700 text-white text-[8px] font-bold uppercase">
                        ✅ Re-activate
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-white/30 text-[11px]">No rooms match this filter</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const DeptManagerDashboard: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const { t, language } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [conciergeBookingsRevenue, setConciergeBookingsRevenue] = useState<any[]>([]);
  const [execStaffLogs, setExecStaffLogs] = useState<any[]>([]);
  const [execLogsLoading, setExecLogsLoading] = useState(false);
  const [slaConfig, setSlaConfig] = useState<any>({});
  const [staffLogs, setStaffLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [liveData, setLiveData] = useState<{ onlineStaff: any[], activeRequests: any[], rooms: any[] }>({ onlineStaff: [], activeRequests: [], rooms: [] });
  const [liveLoading, setLiveLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomSearch, setRoomSearch] = useState('');
  const [repPeriod, setRepPeriod] = useState<'daily'|'weekly'|'monthly'>('daily');
  const [activeTab, setActiveTab] = useState<'operations' | 'team' | 'reports' | 'settings' | 'rooms' | 'restaurants' | 'concierge'>('operations');
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
    if (profile.hotelId) reqQ = reqQ.eq('hotel_id', profile.hotelId);
    if (dept === 'Security & Safety') reqQ = reqQ.in('department', ['Security & Safety', 'Security']);
    else reqQ = reqQ.eq('department', dept);
    const { data: reqData } = await reqQ;
    if (reqData) setRequests(reqData);
    let staffQ = supabase.from('staff').select('*').eq('department', dept).order('created_at', { ascending: false });
    if (profile.hotelId) staffQ = staffQ.eq('hotel_id', profile.hotelId);
    const { data: staffData } = await staffQ;
    if (staffData) setStaffList(staffData);
    const slaHotelId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let slaQ2 = supabase.from('sla_settings').select('*').eq('department', dept);
    if (slaHotelId) slaQ2 = slaQ2.eq('hotel_id', slaHotelId);
    const { data: slaData } = await slaQ2.maybeSingle();
    if (slaData) { setSlaConfig(slaData); setEditSLA(slaData.sla_minutes); }
  };

  const fetchRoomsMgr = useCallback(async () => {
    // Use profile.hotelId first (most reliable), then localStorage as fallback
    const hId = profile.hotelId || (() => {
      try { return JSON.parse(localStorage.getItem('sentinel_hotel') || '{}').id; } catch { return null; }
    })();
    let roomQ = supabase.from('rooms').select('*').order('room_number', { ascending: true });
    if (hId) roomQ = roomQ.eq('hotel_id', hId);
    const { data } = await roomQ;
    if (data) setRooms(data);
  }, [profile.hotelId]);

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
      let normalized = String(ts).trim().replace(' ', 'T');
      if (!/([Z]|[+\-]\d{2}(:\d{2})?)$/.test(normalized)) normalized += 'Z';
      const created = new Date(normalized).getTime();
      if (isNaN(created)) return 0;
      return Math.floor((now - created) / 60000);
    } catch { return 0; }
  };
  const violations = requests.filter(r => getSLAExceeded(r));
  // Pending staff: unapproved staff in this dept (excluding Executive-level)
  const pendingStaff = staffList.filter(s => !s.approved && s.occupation !== 'Executive');
  const approvedStaff = staffList.filter(s => s.approved);

  const approveStaff = async (id: string) => {
    const s = staffList.find((x: any) => x.id === id);
    await supabase.from('staff').update({ approved: true }).eq('id', id);
    // Notify approved staff via Telegram
    const approvedStaff = staffList.find((x: any) => x.id === id);
    if (approvedStaff?.telegram_chat_id) {
      const approvalMsg = `✅ <b>Account Approved — Sentinel Pro</b>\n`
        + `Welcome ${approvedStaff.name}! Your ${approvedStaff.occupation} account has been approved.\n`
        + `Login at: smart-service-rho.vercel.app`;
      sendTelegram(approvedStaff.telegram_chat_id, approvalMsg).catch(() => {});
    }
    logAudit('staff_approved', { id: profile.uid, name: profile.displayName, role: profile.occupation || 'manager', hotelId: profile.hotelId },
      { type: 'staff', id }, { approved_name: s?.name, department: s?.department });
  };
  const rejectStaff = async (id: string) => { if (window.confirm('Are you sure you want to reject and delete this profile?')) { await supabase.from('staff').delete().eq('id', id); showToast('Staff profile rejected and deleted', 'info'); } };
  const terminateStaff = async (id: string) => { await supabase.from('staff').update({ approved: false, logged_in: false }).eq('id', id); };
  const forceLogout = async (id: string) => { await supabase.from('staff').update({ logged_in: false, device_id: null }).eq('id', id); showToast('Staff member logged out successfully', 'success'); };
  const fetchLiveData = async () => {
    setLiveLoading(true);
    const hId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    const isExec = profile.occupation === 'Executive' || profile.department === 'None';
    const dept = profile.department;
    // Fetch online staff
    let sQ = supabase.from('staff').select('id, name, occupation, department, logged_in, tasks_completed, violations').eq('logged_in', true);
    if (hId) sQ = sQ.eq('hotel_id', hId);
    if (!isExec && dept && dept !== 'None') sQ = sQ.eq('department', dept);
    // Fetch active requests
    let rQ = supabase.from('requests').select('*').in('status', ['Pending', 'In Progress', 'Violated']).order('created_at', { ascending: false });
    if (hId) rQ = rQ.eq('hotel_id', hId);
    if (!isExec && dept && dept !== 'None') rQ = rQ.eq('department', dept);
    // Also fetch rooms for HK dept
    let roomsData: any[] = [];
    if (!isExec && dept === 'Housekeeping' || isExec) {
      let rmQ = supabase.from('rooms').select('*').order('room_number');
      if (hId) rmQ = rmQ.eq('hotel_id', hId);
      const { data: rd } = await rmQ;
      roomsData = rd || [];
    }
    const [{ data: staffData }, { data: reqData }] = await Promise.all([sQ, rQ]);
    setLiveData({ onlineStaff: staffData || [], activeRequests: reqData || [], rooms: roomsData } as any);
    setLiveLoading(false);
  };

  const handlePrintStaffLogs = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const dept = profile.department || 'All';
    const hotel = profile.hotelName || 'Hotel';
    const printed = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai', hour12: true });
    const rows = staffLogs.map((l: any) => {
      const ts = new Date(l.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dubai', hour12: true });
      const action = l.action.replace(/_/g, ' ').replace(/\w/g, (c: string) => c.toUpperCase());
      const detail = l.details
        ? Object.entries(l.details).map(([k, v]) => '<b>' + k.replace(/_/g, ' ') + ':</b> ' + v).join('<br/>')
        : '—';
      return '<tr><td>' + ts + '</td><td>' + l.actor_name + '</td><td>' + l.actor_role + '</td><td>' + action + '</td><td>' + detail + '</td></tr>';
    }).join('');
    const html = '<!DOCTYPE html><html><head><title>Staff Logs - ' + dept + '</title>'
      + '<style>'
      + 'body{font-family:Arial,sans-serif;padding:30px;color:#1a1a2e;}'
      + 'h1{color:#001529;font-size:20px;border-bottom:2px solid #C5A059;padding-bottom:8px;}'
      + 'h2{color:#666;font-size:13px;font-weight:normal;margin-top:4px;}'
      + 'table{width:100%;border-collapse:collapse;margin-top:20px;font-size:11px;}'
      + 'th{background:#001529;color:#C5A059;padding:8px;text-align:left;}'
      + 'td{padding:7px 8px;border-bottom:1px solid #eee;}'
      + 'tr:nth-child(even){background:#f9f9f9;}'
      + '.footer{margin-top:20px;font-size:10px;color:#999;text-align:center;}'
      + '</style></head><body>'
      + '<h1>Sentinel Pro — Staff Activity Logs</h1>'
      + '<h2>' + dept + ' Department &nbsp;|&nbsp; ' + hotel + ' &nbsp;|&nbsp; Printed: ' + printed + '</h2>'
      + '<table><thead><tr><th>Timestamp (UAE)</th><th>Staff Member</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>'
      + '<tbody>' + rows + '</tbody></table>'
      + '<div class="footer">Sentinel Pro Audit Log — Confidential</div>'
      + '</body></html>';
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const fetchStaffLogs = async () => {
    setLogsLoading(true);
    const hId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    const isExec = profile.occupation === 'Executive' || profile.department === 'None';
    const dept = profile.department;

    // ✅ Pull COMPLETED requests as activity — this is real staff activity data
    let rQ = supabase.from('requests').select('*')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false }).limit(200);
    if (hId) rQ = rQ.eq('hotel_id', hId);
    if (!isExec && dept && dept !== 'None') rQ = rQ.eq('department', dept);

    // ✅ Also pull pending/in-progress requests for full picture
    let aQ = supabase.from('requests').select('*')
      .in('status', ['Pending','In Progress','Violated'])
      .order('created_at', { ascending: false }).limit(100);
    if (hId) aQ = aQ.eq('hotel_id', hId);
    if (!isExec && dept && dept !== 'None') aQ = aQ.eq('department', dept);

    // ✅ Also pull audit_logs for login/approval events
    let lQ = supabase.from('audit_logs').select('*')
      .order('created_at', { ascending: false }).limit(100);
    if (hId) lQ = lQ.or(`hotel_id.eq.${hId},hotel_id.is.null`);
    if (!isExec && dept && dept !== 'None') {
      const { data: deptStaff } = await supabase.from('staff')
        .select('id, name').eq('department', dept);
      if (deptStaff && deptStaff.length > 0) {
        lQ = lQ.in('actor_id', deptStaff.map((s: any) => s.id));
      }
    }

    const [{ data: completedReqs }, { data: activeReqs }, { data: auditData }] = await Promise.all([rQ, aQ, lQ]);

    // Combine into unified log format
    const combined: any[] = [];

    // Map completed requests to log entries
    (completedReqs || []).forEach((r: any) => {
      combined.push({
        id: r.id + '-complete',
        created_at: r.closed_at,
        actor_name: r.assigned_to || 'Unknown Staff',
        actor_role: r.department,
        action: 'request_completed',
        details: {
          service: r.service,
          room: r.guest_room,
          guest: r.guest_name || '—',
          requested: formatTime(r.created_at),
          accepted: formatTime(r.accepted_at),
          completed: formatTime(r.closed_at),
          late_reason: r.late_reason || null,
        },
        _type: 'request',
        _raw: r,
      });
    });

    // Map active requests
    (activeReqs || []).forEach((r: any) => {
      combined.push({
        id: r.id + '-active',
        created_at: r.created_at,
        actor_name: r.assigned_to || 'Unassigned',
        actor_role: r.department,
        action: r.status === 'Violated' ? 'sla_violated' : r.status === 'In Progress' ? 'request_in_progress' : 'request_pending',
        details: {
          service: r.service,
          room: r.guest_room,
          guest: r.guest_name || '—',
          status: r.status,
          requested: formatTime(r.created_at),
          accepted: formatTime(r.accepted_at),
        },
        _type: 'request',
      });
    });

    // Add audit logs (logins, approvals etc)
    (auditData || []).forEach((l: any) => combined.push({ ...l, _type: 'audit' }));

    // Sort by time desc
    combined.sort((a, b) => {
      const ta = a.created_at ? new Date(String(a.created_at).trim().replace(' ','T')).getTime() : 0;
      const tb = b.created_at ? new Date(String(b.created_at).trim().replace(' ','T')).getTime() : 0;
      return tb - ta;
    });

    setStaffLogs(combined.slice(0, 300));
    setLogsLoading(false);
  };

  const saveSLA = async () => {
    const hId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    await supabase.from('sla_settings').upsert(
      { department: profile.department, sla_minutes: editSLA, hotel_id: hId, updated_at: new Date().toISOString() },
      { onConflict: 'department,hotel_id' }
    );
    showToast(`SLA updated to ${editSLA} minutes`, 'success');
    logAudit('sla_changed', { id: profile.uid, name: profile.displayName, role: profile.occupation || 'manager', hotelId: profile.hotelId },
      { type: 'sla_settings' }, { department: profile.department, new_minutes: editSLA });
    fetchData();
  };

  const handleRoomStatusChange = async (roomId: string, roomNumber: string, newStatus: string) => {
    if (newStatus === 'Checked Out') {
      if (!window.confirm(`Confirm Check Out for Room ${roomNumber}?`)) return;
      const hId = profile.hotelId;
      const nowTs = new Date().toISOString();
      await supabase.from('guests').delete().eq('room', roomNumber);
      if (hId) await supabase.from('requests').delete().eq('guest_room', roomNumber).eq('hotel_id', hId).in('status', ['Pending','In Progress','Violated']);
      await supabase.from('rooms').update({
        status: 'Checked Out', last_updated: nowTs,
        checked_out_by: profile.displayName, checked_out_at: nowTs,
        assigned_to: null, cleaning_at: null, cleaned_at: null, cleaned_by: null,
        inspected_at: null, inspected_by: null, status_reason: null,
        guest_name: null, arrival_date: null, checkout_date: null,
      }).eq('id', roomId);
    } else {
      const nowTs = new Date().toISOString();
      const upd: any = { status: newStatus, last_updated: nowTs, assigned_to: profile.displayName };
      if (newStatus === 'Clean') { upd.cleaned_at = nowTs; upd.cleaned_by = profile.displayName; }
      if (newStatus === 'Cleaning') upd.cleaning_at = nowTs;
      if (newStatus === 'Inspected') { upd.inspected_at = nowTs; upd.inspected_by = profile.displayName; }
      if (['Do Not Disturb','Out of Order','Guest Refused','Different Time'].includes(newStatus)) upd.status_reason = newStatus;
      await supabase.from('rooms').update(upd).eq('id', roomId);
    }
    fetchRoomsMgr();
  };

  const handleRoomReactivate = async (roomId: string) => {
    await supabase.from('rooms').update({ status: 'Clean', assigned_to: profile.displayName, last_updated: new Date().toISOString() }).eq('id', roomId);
    fetchRoomsMgr();
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
          {profile.hotelName && <p className="text-gold/50 text-[8px] uppercase tracking-[0.2em] mb-0.5">{profile.hotelName}</p>}
          <h1 className="text-2xl font-serif text-gold">{profile.department} Manager</h1>
          <p className="text-gold/60 text-[9px] uppercase tracking-widest mt-1">{profile.displayName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-navy border border-gold/20 p-1 flex-wrap gap-0.5">
            {[
              { key: 'operations', label: `📋 Operations${requests.filter(r=>r.status!=='Completed').length>0?' ('+requests.filter(r=>r.status!=='Completed').length+')':''}` },
              { key: 'team', label: `👥 Team${pendingStaff.length>0?' ('+pendingStaff.length+')':''}` },
              { key: 'reports', label: '📊 Reports' },
              { key: 'settings', label: '⚙ Settings' },
              ...(profile.department === 'Housekeeping' ? [{ key: 'rooms', label: '🛏 Rooms' }] : []),
              ...(profile.department === 'F&B' ? [{ key: 'restaurants', label: '🍽 Restaurants' }] : []),
              ...(profile.department === 'Concierge' ? [{ key: 'concierge', label: '🔑 Services' }] : []),
            ].map(tab => (
              <button key={tab.key} onClick={() => { const k = tab.key as any; setActiveTab(k); if (k === 'reports') fetchStaffLogs(); }} className={cn('px-3 py-1.5 text-[9px] font-bold uppercase', activeTab === tab.key ? 'bg-gold text-navy' : 'text-gold/60')}>{tab.label}</button>
            ))}
          </div>
          <button onClick={() => { localStorage.clear(); window.location.replace('/'); }} className="flex items-center gap-1 text-gold/60 hover:text-gold border border-gold/20 px-3 py-2 text-[9px] font-bold uppercase"><LogOut size={12} /> Logout</button>
          <button onClick={() => window.open('https://t.me/SentinelPr0BoT?start=' + profile.uid, '_blank')}
            className={(profile as any).telegram_chat_id ? 'flex items-center gap-1 border border-green-500/40 text-green-400 px-3 py-2 text-[9px] font-bold uppercase' : 'flex items-center gap-1 border border-gold/20 text-gold/50 hover:text-gold px-3 py-2 text-[9px] font-bold uppercase'}>
            {(profile as any).telegram_chat_id ? '✅ Telegram' : '🔔 Telegram'}
          </button>
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

      {/* Operations Tab — Requests + SLA */}
      {activeTab === 'operations' && (
        <div className="space-y-3 p-3">
          {violations.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 p-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">
                {violations.length} SLA violation{violations.length !== 1 ? 's' : ''} — immediate action required
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif text-gold">{profile.department} — All Requests</h2>
            <p className="text-[9px] text-white/30">{requests.length} total</p>
          </div>
          {requests.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-12">No requests yet</p>
          ) : (
            <div className="overflow-x-auto -mx-3">
              <table className="w-full text-[9px] border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-gold/20 bg-navy/40">
                    <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Room</th>
                    <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Guest</th>
                    <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Service / Notes</th>
                    <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Status</th>
                    <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Requested</th>
                    <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Accepted By</th>
                    <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Accept Time</th>
                    <th className="text-left py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">Completed</th>
                    <th className="text-right py-2 px-2 text-gold/60 font-bold uppercase text-[8px]">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req: any, idx: number) => {
                    const elapsedMin = getElapsedMin(req.created_at);
                    const slaLimitMin = slaConfig?.sla_minutes || 30;
                    const isOver = req.status !== 'Completed' && elapsedMin > slaLimitMin;
                    const pct = Math.min((elapsedMin / slaLimitMin) * 100, 100);
                    return (
                      <tr key={req.id} className={cn('border-b border-white/[0.04]',
                        idx % 2 === 0 ? '' : 'bg-white/[0.02]',
                        isOver ? 'bg-red-900/10' : '')}>
                        <td className="py-2 px-2 text-white font-bold">{req.guest_room}</td>
                        <td className="py-2 px-2 text-white/70 whitespace-nowrap">
                          {req.guest_name}
                          {req.language && req.language !== 'English' &&
                            <span className="ml-1">{LANG_FLAG[req.language] || '🌐'}</span>}
                        </td>
                        <td className="py-2 px-2 max-w-[120px]">
                          <p className="text-white/80 truncate">{req.service}</p>
                          {req.notes && <p className="text-white/40 italic truncate text-[8px]">{req.notes}</p>}
                        </td>
                        <td className="py-2 px-2">
                          <span className={cn('px-1.5 py-0.5 text-[7px] font-bold text-white rounded-full whitespace-nowrap',
                            req.status === 'Completed' ? 'bg-green-600' :
                            req.status === 'Violated' ? 'bg-red-600' :
                            req.status === 'In Progress' ? 'bg-blue-600' : 'bg-yellow-600')}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-white/50 whitespace-nowrap">{formatTime(req.created_at)}</td>
                        <td className="py-2 px-2 text-white/70 whitespace-nowrap">{req.assigned_to || '—'}</td>
                        <td className="py-2 px-2 text-white/50 whitespace-nowrap">{formatTime(req.accepted_at)}</td>
                        <td className="py-2 px-2 text-white/50 whitespace-nowrap">{formatTime(req.closed_at)}</td>
                        <td className="py-2 px-2 text-right">
                          {req.status !== 'Completed' ? (
                            <span className={cn('font-mono font-bold text-[9px]',
                              isOver ? 'text-red-400' : 'text-gold')}>
                              {elapsedMin}m/{slaLimitMin}m
                            </span>
                          ) : <span className="text-green-400 text-[9px]">✓</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

{activeTab === 'team' && (
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


{/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          {(() => {
        const now = new Date();
        const cutoff = new Date();
        if (repPeriod === 'weekly')  cutoff.setDate(now.getDate() - 7);
        if (repPeriod === 'monthly') cutoff.setMonth(now.getMonth() - 1);
        if (repPeriod === 'daily')   cutoff.setHours(0,0,0,0);
        const filtered = requests.filter(r =>
          r.status === 'Completed' && r.closed_at && new Date(r.closed_at.replace(' ','T')) >= cutoff
        );
        const slaLimit = (slaConfig?.sla_minutes || 30) * 60 * 1000;
        const staffPerf: Record<string,{name:string,done:number,onTime:number,late:number,avgMin:number,totalMs:number}> = {};
        filtered.forEach(r => {
          const staff = r.assigned_to || 'Unassigned';
          if (!staffPerf[staff]) staffPerf[staff] = {name:staff,done:0,onTime:0,late:0,avgMin:0,totalMs:0};
          staffPerf[staff].done++;
          const created = new Date(r.created_at.replace(' ','T')).getTime();
          const closed  = new Date(r.closed_at.replace(' ','T')).getTime();
          const ms = closed - created;
          staffPerf[staff].totalMs += ms;
          if (ms <= slaLimit) staffPerf[staff].onTime++;
          else staffPerf[staff].late++;
        });
        Object.values(staffPerf).forEach(s => { s.avgMin = s.done > 0 ? Math.round(s.totalMs/s.done/60000) : 0; });
        const ranked = Object.values(staffPerf).sort((a,b) => b.onTime - a.onTime || a.avgMin - b.avgMin);
        const medals = [
          {title:'⭐ The Supernova',   bg:'#fef9c3',border:'#eab308',badge:'🥇'},
          {title:'🌟 The North Star',  bg:'#f1f5f9',border:'#94a3b8',badge:'🥈'},
          {title:'🚀 The Rising Comet',bg:'#fff7ed',border:'#f97316',badge:'🥉'},
        ];
        const generatePDF = () => {
          const dateStr = now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
          const periodLabel = repPeriod === 'daily' ? 'Daily' : repPeriod === 'weekly' ? 'Weekly (Last 7 Days)' : 'Monthly (Last 30 Days)';
          const podiumHtml = ranked.slice(0,3).map((s,i) =>
            `<div style="background:${medals[i].bg};border:2px solid ${medals[i].border};padding:14px 20px;text-align:center;min-width:110px;border-radius:4px">
              <div style="font-size:28px">${medals[i].badge}</div>
              <div style="font-size:12px;font-weight:bold;color:#001529;margin:4px 0">${medals[i].title}</div>
              <div style="font-size:14px;font-weight:bold;color:#001529">${s.name}</div>
              <div style="font-size:9px;color:#666;margin-top:4px">${s.done} tasks · ${s.onTime} on-time · avg ${s.avgMin}m</div>
            </div>`
          ).join('');
          const tableRows = ranked.map((s,i) => {
            const rate = s.done > 0 ? Math.round(s.onTime/s.done*100) : 0;
            const rateColor = rate>=90?'#166534':rate>=70?'#92400e':'#991b1b';
            return `<tr style="background:${i%2===0?'#f9f8f5':'#fff'}">
              <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#C5A059;font-weight:bold">${i+1}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:bold">${s.name}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${s.done}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;color:#166534;font-weight:bold">${s.onTime}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;color:#991b1b">${s.late}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">
                <span style="background:${rateColor};color:#fff;padding:2px 8px;border-radius:9px;font-size:9px;font-weight:bold">${rate}%</span>
              </td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${s.avgMin}m</td>
            </tr>`;
          }).join('');
          const html = `<!DOCTYPE html><html><head><title>${profile.department} Performance Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,sans-serif;padding:20px;font-size:11px}
            @media print{body{padding:6px}}
          </style></head><body>
          <div style="background:#001529;color:#fff;padding:16px 20px;margin-bottom:16px">
            <div style="font-family:'Playfair Display',serif;font-size:22px;color:#C5A059;letter-spacing:3px">SENTINEL PRO</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:3px;letter-spacing:1px">${profile.department.toUpperCase()} DEPARTMENT · ${periodLabel.toUpperCase()} PERFORMANCE REPORT · ${dateStr}</div>
            <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
              <div style="background:rgba(197,160,89,0.15);border:1px solid #C5A059;padding:6px 14px;text-align:center">
                <div style="font-size:20px;font-weight:bold;color:#C5A059">${filtered.length}</div>
                <div style="font-size:8px;color:rgba(255,255,255,0.5)">TASKS COMPLETED</div></div>
              <div style="background:rgba(197,160,89,0.15);border:1px solid #C5A059;padding:6px 14px;text-align:center">
                <div style="font-size:20px;font-weight:bold;color:#C5A059">${ranked.length}</div>
                <div style="font-size:8px;color:rgba(255,255,255,0.5)">ACTIVE STAFF</div></div>
              <div style="background:rgba(197,160,89,0.15);border:1px solid #C5A059;padding:6px 14px;text-align:center">
                <div style="font-size:20px;font-weight:bold;color:#C5A059">${filtered.length>0?Math.round(filtered.filter(r=>{const c=new Date(r.created_at.replace(' ','T')).getTime(),d=new Date(r.closed_at.replace(' ','T')).getTime();return d-c<=slaLimit}).length/filtered.length*100):0}%</div>
                <div style="font-size:8px;color:rgba(255,255,255,0.5)">ON-TIME RATE</div></div>
            </div>
          </div>
          ${ranked.length>=1?`<div style="margin-bottom:18px"><div style="font-size:13px;font-weight:bold;color:#001529;margin-bottom:10px;letter-spacing:1px">🏆 TOP PERFORMERS</div><div style="display:flex;gap:10px;flex-wrap:wrap">${podiumHtml}</div></div>`:''}
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead><tr style="background:#f4f2ec">
              <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">#</th>
              <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Staff Name</th>
              <th style="padding:6px 8px;text-align:center;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Tasks Done</th>
              <th style="padding:6px 8px;text-align:center;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">On Time</th>
              <th style="padding:6px 8px;text-align:center;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Late</th>
              <th style="padding:6px 8px;text-align:center;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">On-Time %</th>
              <th style="padding:6px 8px;text-align:center;font-size:9px;text-transform:uppercase;color:#666;border-bottom:2px solid #C5A059">Avg Time</th>
            </tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div style="text-align:center;color:#999;font-size:8px;border-top:1px solid #eee;padding-top:8px">
            SENTINEL PRO · ${profile.department} Department · Generated ${now.toLocaleString()}</div>
          <scr'+'ipt>setTimeout(()=>window.print(),500)</scr'+'ipt></body></html>`;
          const w = window.open('','_blank');
          if(w){w.document.open();w.document.write(html);w.document.close();}
          else showToast('Allow popups to print report','error');
        };
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif text-gold">📊 Performance Report</h2>
              <button onClick={generatePDF} className="flex items-center gap-1 bg-gold text-navy text-[9px] font-bold px-3 py-1.5">
                <Download size={11}/> Print PDF
              </button>
            </div>
            <div className="flex gap-2">
              {(['daily','weekly','monthly'] as const).map(p => (
                <button key={p} onClick={() => setRepPeriod(p)}
                  className={cn('px-3 py-1.5 text-[9px] font-bold uppercase', repPeriod===p ? 'bg-gold text-navy' : 'bg-[#001c36] text-gold/60 border border-gold/20')}>
                  {p === 'daily' ? 'Today' : p === 'weekly' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
            {ranked.length === 0 ? (
              <p className="text-white/30 italic text-sm text-center py-10">No completed tasks in this period.</p>
            ) : (
              <>
                <div className="flex gap-3 flex-wrap">
                  {ranked.slice(0,3).map((s,i) => (
                    <div key={s.name} className="bg-[#001c36] border border-gold/20 p-3 flex-1 min-w-[120px] text-center space-y-1">
                      <div className="text-2xl">{medals[i].badge}</div>
                      <p className="text-[9px] text-gold font-bold">{medals[i].title}</p>
                      <p className="text-white font-bold text-sm">{s.name}</p>
                      <p className="text-[8px] text-white/50">{s.done} tasks · {s.onTime} on-time</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[#001c36] border border-gold/10 overflow-hidden">
                  <table className="w-full text-[9px]">
                    <thead><tr className="bg-navy/80">
                      <th className="p-2 text-left text-gold/60">#</th>
                      <th className="p-2 text-left text-gold/60">Staff</th>
                      <th className="p-2 text-center text-gold/60">Done</th>
                      <th className="p-2 text-center text-gold/60">On Time</th>
                      <th className="p-2 text-center text-gold/60">Late</th>
                      <th className="p-2 text-center text-gold/60">Rate</th>
                      <th className="p-2 text-center text-gold/60">Avg</th>
                    </tr></thead>
                    <tbody>
                      {ranked.map((s,i) => {
                        const rate = s.done > 0 ? Math.round(s.onTime/s.done*100) : 0;
                        return (
                          <tr key={s.name} className={i%2===0?'bg-[#001c36]':'bg-[#002440]'}>
                            <td className="p-2 text-gold font-bold">{i+1}</td>
                            <td className="p-2 text-white font-bold">{s.name}</td>
                            <td className="p-2 text-center text-white">{s.done}</td>
                            <td className="p-2 text-center text-green-400">{s.onTime}</td>
                            <td className="p-2 text-center text-red-400">{s.late}</td>
                            <td className="p-2 text-center">
                              <span className={cn('px-2 py-0.5 rounded-full font-bold text-white text-[8px]',
                                rate>=90?'bg-green-700':rate>=70?'bg-yellow-700':'bg-red-700')}>{rate}%</span>
                            </td>
                            <td className="p-2 text-center text-white/60">{s.avgMin}m</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      })()}
          {/* Staff Logs */}
          <div className="mt-4 border-t border-gold/10 pt-4">
            <div className="space-y-4 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-serif text-gold">Staff Activity Logs</h2>
              <p className="text-white/40 text-[9px] uppercase tracking-widest mt-1">{profile.department} Department · {profile.hotelName}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchStaffLogs}
                className="px-4 py-2 border border-gold/30 text-gold text-[9px] uppercase tracking-widest hover:bg-gold/10">
                🔄 Refresh
              </button>
              <button onClick={handlePrintStaffLogs}
                className="px-4 py-2 bg-gold text-white text-[9px] font-bold uppercase tracking-widest hover:bg-gold/80">
                🖨 Print / Export
              </button>
            </div>
          </div>

          {logsLoading ? (
            <div className="text-center py-12 text-white/30">Loading logs...</div>
          ) : staffLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/30 text-sm">No activity logs yet for this department.</p>
              <p className="text-white/20 text-[10px] mt-2">Logs are recorded when staff login, complete tasks, get approved, and more.</p>
              <button onClick={fetchStaffLogs} className="mt-4 px-4 py-2 border border-gold/20 text-gold/60 text-[9px] uppercase">Load Logs</button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-white/30 text-[9px]">{staffLogs.length} record{staffLogs.length !== 1 ? 's' : ''} found</p>
              {staffLogs.map((log, i) => (
                <div key={log.id || i} className="bg-[#001c36] border border-gold/10 p-3 flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background:
                    log.action === 'staff_login' ? '#4ade80' :
                    log.action === 'request_completed' ? '#60a5fa' :
                    log.action === 'staff_approved' ? '#f59e0b' :
                    log.action === 'sla_changed' ? '#c084fc' :
                    log.action.includes('cancel') || log.action.includes('reject') ? '#f87171' : '#94a3b8'
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-white text-[10px] font-bold">{log.actor_name}</span>
                        <span className="text-white/40 text-[9px] mx-2">·</span>
                        <span className="text-white/50 text-[9px]">{log.actor_role}</span>
                      </div>
                      <span className="text-white/30 text-[8px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dubai', hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={cn('text-[9px] uppercase tracking-wider mt-0.5 font-bold',
                      log.action === 'request_completed' ? 'text-blue-400' :
                      log.action === 'staff_login' ? 'text-green-400' :
                      log.action === 'staff_logout' ? 'text-white/40' :
                      log.action === 'sla_violated' ? 'text-red-400' :
                      log.action === 'request_in_progress' ? 'text-yellow-400' :
                      log.action === 'request_pending' ? 'text-white/50' : 'text-gold/80')}>
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    {log.details && (
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {log.details.service && <p className="text-[8px] text-white/50 col-span-2">📋 <span className="text-white/70">{log.details.service}</span></p>}
                        {log.details.room && <p className="text-[8px] text-white/50">🏨 Room: <span className="text-white/70">{log.details.room}</span></p>}
                        {log.details.guest && <p className="text-[8px] text-white/50">👤 Guest: <span className="text-white/70">{log.details.guest}</span></p>}
                        {log.details.requested && log.details.requested !== '—' && <p className="text-[8px] text-white/50">🕐 Requested: <span className="text-white/70">{log.details.requested}</span></p>}
                        {log.details.accepted && log.details.accepted !== '—' && <p className="text-[8px] text-white/50">✅ Accepted: <span className="text-white/70">{log.details.accepted}</span></p>}
                        {log.details.completed && log.details.completed !== '—' && <p className="text-[8px] text-white/50">🏁 Completed: <span className="text-white/70">{log.details.completed}</span></p>}
                        {log.details.status && <p className="text-[8px] text-white/50">Status: <span className="text-white/70">{log.details.status}</span></p>}
                        {log.details.department && <p className="text-[8px] text-white/50">Dept: <span className="text-white/70">{log.details.department}</span></p>}
                        {log.details.late_reason && <p className="text-[8px] text-red-400 col-span-2">⚠ {log.details.late_reason}</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      
          </div>
        </div>
      )}


      {/* Concierge Manager — Services Tab */}
      {activeTab === 'concierge' && profile.department === 'Concierge' && (
        <ConciergeManagerTab profile={profile} />
      )}

      {/* HK Manager — Rooms Tab */}
      {activeTab === 'settings' && (
        <div className="p-4 space-y-4">
          <h2 className="text-lg font-serif text-gold">⚙ Settings</h2>
          <div className="bg-[#001c36] border border-gold/10 p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-gold font-bold">SLA Configuration</p>
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-[10px]">{profile.department} SLA:</span>
              <input type="number" min="5" max="120" value={editSLA}
                onChange={e => setEditSLA(Number(e.target.value))}
                className="w-20 bg-navy/50 border border-gold/20 text-white text-[10px] p-1.5 outline-none text-center" />
              <span className="text-white/40 text-[9px]">minutes</span>
              <button onClick={saveSLA} className="px-3 py-1.5 bg-gold text-navy text-[9px] font-bold uppercase">Save</button>
            </div>
            <p className="text-white/30 text-[9px]">Current: {slaConfig?.sla_minutes || 30} min · Affects SLA timer and violation alerts</p>
          </div>
        </div>
      )}

      {activeTab === 'rooms' && profile.department === 'Housekeeping' && (
        <div className="p-4 space-y-4">

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif text-gold flex items-center gap-2"><BedDouble size={18} /> Room Status Board</h2>
            <button onClick={fetchRoomsMgr} className="text-gold/60 hover:text-gold"><RefreshCw size={16} /></button>
          </div>
          {/* Row view with inline status dropdown */}
          <RoomLiveBoard rooms={rooms} occupation={profile.occupation}
            onStatusChange={handleRoomStatusChange}
            onReactivate={handleRoomReactivate} />
        </div>
      )}

      {/* F&B Manager — Restaurants Tab */}
      {activeTab === 'restaurants' && profile.department === 'F&B' && (
        <RestaurantPortal profile={profile} />
      )}
    </div>
  );
};


// ─── CONCIERGE MANAGER TAB ───────────────────────────────────────────────────
const ConciergeManagerTab: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<'services'|'bookings'>('services');
  const [showForm, setShowForm] = useState(false);
  const [editService, setEditService] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const CATEGORIES = [
    { key: 'tour', label: '🗺 Tours', unit: 'per person' },
    { key: 'car_rental', label: '🚗 Car Rental', unit: 'per day' },
    { key: 'taxi', label: '🚕 Taxi / Transfer', unit: 'per trip' },
    { key: 'luggage', label: '🧳 Luggage', unit: 'per bag' },
  ];
  const emptyForm = { category: 'tour', name: '', description: '', price: '', price_unit: 'per person', duration: '', availability: DAYS, image_url: '', active: true };
  const [form, setForm] = useState<any>(emptyForm);

  const fetchServices = useCallback(async () => {
    const csHotelId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let csQ = supabase.from('concierge_services').select('*').order('category').order('created_at');
    if (csHotelId) csQ = csQ.eq('hotel_id', csHotelId);
    const { data } = await csQ;
    if (data) setServices(data);
  }, [profile.hotelId]);

  const fetchBookings = useCallback(async () => {
    const cbHotelId = profile.hotelId || (() => { try { return JSON.parse(localStorage.getItem('sentinel_hotel')||'{}').id; } catch { return null; } })();
    let cbQ = supabase.from('concierge_bookings').select('*').order('created_at', { ascending: false });
    if (cbHotelId) cbQ = cbQ.eq('hotel_id', cbHotelId);
    const { data } = await cbQ;
    if (data) setBookings(data);
  }, [profile.hotelId]);

  useEffect(() => {
    fetchServices();
    fetchBookings();
    // Poll every 10 seconds so manager sees new bookings without refresh
    const poll = setInterval(() => fetchBookings(), 10000);
    return () => clearInterval(poll);
  }, [fetchServices, fetchBookings]);

  const saveService = async () => {
    if (!form.name || !form.category) return;
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price) || 0, hotel_id: profile.hotelId };
    if (editService) {
      await supabase.from('concierge_services').update(payload).eq('id', editService.id);
    } else {
      await supabase.from('concierge_services').insert(payload);
    }
    setSaving(false); setShowForm(false); setEditService(null); setForm(emptyForm);
    fetchServices();
  };

  const deleteService = async (id: string) => {
    if (!window.confirm('Delete this service?')) return;
    await supabase.from('concierge_services').delete().eq('id', id);
    fetchServices();
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await supabase.from('concierge_bookings').update({ status, confirmed_by: profile.displayName }).eq('id', id);
    fetchBookings();
  };

  const toggleDay = (day: string) => {
    const days = form.availability || [];
    setForm({ ...form, availability: days.includes(day) ? days.filter((d:string) => d !== day) : [...days, day] });
  };

  const STATUS_COLOR: Record<string,string> = {
    Pending: 'bg-yellow-900/40 text-yellow-400',
    Confirmed: 'bg-green-900/40 text-green-400',
    Cancelled: 'bg-red-900/40 text-red-400',
    Completed: 'bg-blue-900/40 text-blue-400',
  };

  return (
    <div className="p-4 space-y-4">
      {/* Section toggle */}
      <div className="flex gap-2">
        {[{key:'services',label:'🔧 Manage Services'},{key:'bookings',label:'📋 Bookings (' + bookings.filter((b:any)=>b.status==='Pending').length + ' pending)'}].map((s:any) => (
          <button key={s.key} onClick={() => setActiveSection(s.key as any)}
            className={cn('px-4 py-2 text-[9px] font-bold uppercase', activeSection===s.key?'bg-gold text-navy':'bg-[#001c36] text-gold/60 border border-gold/20')}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── SERVICES MANAGEMENT ── */}
      {activeSection === 'services' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-serif text-gold">Concierge Services</h3>
            <button onClick={() => { setEditService(null); setForm(emptyForm); setShowForm(true); }}
              className="bg-gold text-navy text-[9px] font-bold uppercase px-3 py-1.5 flex items-center gap-1">
              <Plus size={11}/> Add Service
            </button>
          </div>

          {/* Service form */}
          {showForm && (
            <div className="bg-[#001c36] border border-gold/30 p-4 space-y-3">
              <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold">{editService ? 'Edit Service' : 'Add New Service'}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] text-white/40 uppercase block mb-1">Category</label>
                  <select value={form.category} onChange={e => { setForm({ ...form, category: e.target.value, price_unit: CATEGORIES.find(c=>c.key===e.target.value)?.unit || 'per person' }); }}
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none">
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-white/40 uppercase block mb-1">Service Name</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="e.g. Desert Safari, Toyota Camry"
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[8px] text-white/40 uppercase block mb-1">Description</label>
                  <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                    placeholder="Brief description for guests"
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[8px] text-white/40 uppercase block mb-1">Price (AED)</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    placeholder="0"
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[8px] text-white/40 uppercase block mb-1">Price Unit</label>
                  <select value={form.price_unit} onChange={e => setForm({...form, price_unit: e.target.value})}
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none">
                    {['per person','per day','per trip','per bag','per hour','per night'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-white/40 uppercase block mb-1">Duration (optional)</label>
                  <input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
                    placeholder="e.g. 4 hours, Full day"
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[8px] text-white/40 uppercase block mb-1">Image URL (optional)</label>
                  <input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" />
                </div>
              </div>
              {/* Availability */}
              <div>
                <label className="text-[8px] text-white/40 uppercase block mb-2">Available Days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={cn('px-2.5 py-1 text-[8px] font-bold uppercase border',
                        (form.availability||[]).includes(day) ? 'bg-gold text-navy border-gold' : 'bg-transparent text-white/30 border-white/10')}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm({...form, active: !form.active})}
                  className={cn('px-3 py-1.5 text-[9px] font-bold uppercase border',
                    form.active ? 'bg-green-900/40 border-green-500 text-green-400' : 'bg-red-900/40 border-red-500 text-red-400')}>
                  {form.active ? '✅ Active' : '❌ Inactive'}
                </button>
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => { setShowForm(false); setEditService(null); }}
                    className="px-4 py-1.5 text-[9px] text-white/50 border border-white/10 uppercase">Cancel</button>
                  <button onClick={saveService} disabled={saving}
                    className="px-4 py-1.5 text-[9px] bg-gold text-navy font-bold uppercase">
                    {saving ? 'Saving...' : 'Save Service'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Services list grouped by category */}
          {CATEGORIES.map(cat => {
            const catServices = services.filter(s => s.category === cat.key);
            if (catServices.length === 0 && !showForm) return null;
            return (
              <div key={cat.key} className="space-y-2">
                <h4 className="text-[9px] uppercase tracking-widest text-gold/60 font-bold border-b border-gold/10 pb-1">{cat.label}</h4>
                {catServices.length === 0
                  ? <p className="text-[9px] text-white/20 italic px-2">No services yet</p>
                  : catServices.map(svc => (
                    <div key={svc.id} className="bg-[#001c36] border border-gold/10 p-3 flex items-center gap-3">
                      {svc.image_url && <img src={svc.image_url} className="w-12 h-10 object-cover flex-shrink-0" alt="" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold text-[11px]">{svc.name}</p>
                          <span className={cn('text-[7px] font-bold px-1.5 py-0.5', svc.active ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400')}>
                            {svc.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {svc.description && <p className="text-[9px] text-white/40 truncate">{svc.description}</p>}
                        <p className="text-[9px] text-gold font-bold">AED {svc.price} {svc.price_unit} {svc.duration ? `· ${svc.duration}` : ''}</p>
                        <p className="text-[8px] text-white/30">{(svc.availability||[]).join(', ')}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => { setEditService(svc); setForm({...svc, price: String(svc.price)}); setShowForm(true); }}
                          className="text-gold/50 hover:text-gold"><Edit2 size={13}/></button>
                        <button onClick={() => deleteService(svc.id)}
                          className="text-red-400/40 hover:text-red-400"><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))
                }
              </div>
            );
          })}
        </div>
      )}

      {/* ── BOOKINGS MANAGEMENT ── */}
      {activeSection === 'bookings' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {['Pending','Confirmed','Completed','Cancelled'].map(s => (
              <span key={s} className={cn('text-[8px] font-bold px-2 py-0.5', STATUS_COLOR[s])}>
                {s}: {bookings.filter(b=>b.status===s).length}
              </span>
            ))}
          </div>
          {bookings.length === 0
            ? <p className="text-white/20 italic text-sm text-center py-10">No bookings yet.</p>
            : bookings.map(b => (
              <div key={b.id} className="bg-[#001c36] border border-gold/10 p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-bold text-[11px]">{b.service_name}</p>
                    <p className="text-[9px] text-gold">Room {b.room_number} · {b.guest_name}</p>
                  </div>
                  <span className={cn('text-[8px] font-bold px-2 py-0.5', STATUS_COLOR[b.status]||'bg-white/10 text-white/50')}>{b.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 text-[9px] text-white/50">
                  <p>👥 {b.guests_count} guest{b.guests_count>1?'s':''}</p>
                  <p>💰 AED {b.total_price}</p>
                  <p>📅 Pickup: {b.pickup_date} {b.pickup_time}</p>
                  {b.return_date && <p>🔄 Return: {b.return_date} {b.return_time}</p>}
                  {b.special_requests && <p className="col-span-2">📝 {b.special_requests}</p>}
                  {b.confirmed_by && <p className="col-span-2 text-gold/60">Handled by: {b.confirmed_by}</p>}
                </div>
                {b.status === 'Pending' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => updateBookingStatus(b.id, 'Confirmed')}
                      className="flex-1 py-1.5 bg-green-900/40 border border-green-500/40 text-green-400 text-[9px] font-bold uppercase">✓ Confirm</button>
                    <button onClick={() => updateBookingStatus(b.id, 'Cancelled')}
                      className="flex-1 py-1.5 bg-red-900/40 border border-red-500/40 text-red-400 text-[9px] font-bold uppercase">✕ Cancel</button>
                  </div>
                )}
                {b.status === 'Confirmed' && (
                  <button onClick={() => updateBookingStatus(b.id, 'Completed')}
                    className="w-full py-1.5 bg-blue-900/40 border border-blue-500/40 text-blue-400 text-[9px] font-bold uppercase">✓ Mark Completed</button>
                )}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

// ─── EXECUTIVE DASHBOARD ──────────────────────────────────────────────────────
const ExecutiveDashboard: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [conciergeBookingsRevenue, setConciergeBookingsRevenue] = useState<any[]>([]);
  const [execStaffLogs, setExecStaffLogs] = useState<any[]>([]);
  const [execLogsLoading, setExecLogsLoading] = useState(false);
  const [slaSettings, setSlaSettings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'requests' | 'sla' | 'leaderboard' | 'staff' | 'qr' | 'restaurants' | 'stafflogs'>('analytics');
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
    let execRQ = supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (profile.hotelId) execRQ = execRQ.eq('hotel_id', profile.hotelId);
    const { data: reqData } = await execRQ;
    if (reqData) setRequests(reqData);
    // ✅ REVENUE FIX: Fetch concierge bookings for Concierge dept revenue
    let cbRQ = supabase.from('concierge_bookings').select('total_price, status, created_at').order('created_at', { ascending: false });
    if (profile.hotelId) cbRQ = cbRQ.eq('hotel_id', profile.hotelId);
    const { data: cbData } = await cbRQ;
    if (cbData) setConciergeBookingsRevenue(cbData);
    let execSQ = supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (profile.hotelId) execSQ = execSQ.eq('hotel_id', profile.hotelId);
    const { data: staffData } = await execSQ;
    if (staffData) setStaffList(staffData);
    let slaQ = supabase.from('sla_settings').select('*');
    if (profile.hotelId) slaQ = slaQ.eq('hotel_id', profile.hotelId);
    const { data: slaData } = await slaQ;
    if (slaData) setSlaSettings(slaData);
    let roomQ2 = supabase.from('rooms').select('*').order('room_number');
    if (profile.hotelId) roomQ2 = roomQ2.eq('hotel_id', profile.hotelId);
    const { data: roomData } = await roomQ2;
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

  const fetchExecStaffLogs = async () => {
    setExecLogsLoading(true);
    const hId = profile.hotelId;
    let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(300);
    if (hId) q = q.eq('hotel_id', hId);
    // Executive sees ALL staff logs for the hotel
    const { data } = await q;
    if (data) setExecStaffLogs(data);
    setExecLogsLoading(false);
  };

  const getSLALimit = (dept: string) => { const s = slaSettings.find((x: any) => x.department === dept); return (s?.sla_minutes || 5) * 60; };
  const getSLAExceeded = (req: any) => { if (!req.created_at || req.status === 'Completed') return false; return (now - new Date(req.created_at).getTime()) / 1000 > getSLALimit(req.department); };
  const getElapsedMin = (ts: any) => {
    if (!ts) return 0;
    try {
      let normalized = String(ts).trim().replace(' ', 'T');
      if (!/([Z]|[+\-]\d{2}(:\d{2})?)$/.test(normalized)) normalized += 'Z';
      const created = new Date(normalized).getTime();
      if (isNaN(created)) return 0;
      return Math.floor((now - created) / 60000);
    } catch { return 0; }
  };

  const violations = requests.filter(r => getSLAExceeded(r));
  const completed = requests.filter(r => r.status === 'Completed').length;
  const pending = requests.filter(r => r.status !== 'Completed').length;
  // ✅ REVENUE FIX: Total revenue includes concierge booking revenue
  const revenue = requests.filter(r => r.total_price && r.status === 'Completed').reduce((s, r) => s + (r.total_price || 0), 0)
    + conciergeBookingsRevenue.filter(b => b.status === 'Completed').reduce((s, b) => s + (b.total_price || 0), 0);

  // ✅ REVENUE FIX: Concierge revenue includes concierge_bookings (tours/taxi/car rental)
  const conciergeBookingRev = conciergeBookingsRevenue
    .filter(b => b.status === 'Completed')
    .reduce((s, b) => s + (b.total_price || 0), 0);
  const deptRevenue = ['F&B', 'Concierge', 'Housekeeping', 'Front Office', 'Security & Safety', 'Maintenance'].map(dept => ({
    name: dept.split(' ')[0],
    revenue: requests.filter(r => r.department === dept && r.status === 'Completed' && r.total_price).reduce((s, r) => s + (r.total_price || 0), 0)
      + (dept === 'Concierge' ? conciergeBookingRev : 0),
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

  const approveStaff = async (id: string) => {
    const s = staffList.find((x: any) => x.id === id);
    await supabase.from('staff').update({ approved: true }).eq('id', id);
    // Notify approved staff via Telegram
    const approvedStaff = staffList.find((x: any) => x.id === id);
    if (approvedStaff?.telegram_chat_id) {
      const approvalMsg = `✅ <b>Account Approved — Sentinel Pro</b>\n`
        + `Welcome ${approvedStaff.name}! Your ${approvedStaff.occupation} account has been approved.\n`
        + `Login at: smart-service-rho.vercel.app`;
      sendTelegram(approvedStaff.telegram_chat_id, approvalMsg).catch(() => {});
    }
    logAudit('staff_approved', { id: profile.uid, name: profile.displayName, role: profile.occupation || 'manager', hotelId: profile.hotelId },
      { type: 'staff', id }, { approved_name: s?.name, department: s?.department });
  };
  const deleteStaff = async (id: string) => { if (window.confirm('Are you sure you want to permanently delete this staff member?')) { await supabase.from('staff').delete().eq('id', id); showToast('Staff member deleted', 'info'); } };
  const terminateStaff = async (id: string) => { await supabase.from('staff').update({ approved: false, logged_in: false }).eq('id', id); };
  const forceLogout = async (id: string) => { await supabase.from('staff').update({ logged_in: false, device_id: null }).eq('id', id); showToast('Account logged out successfully', 'success'); };

  const generateQRCodes = () => {
    const baseUrl = window.location.origin;
    const hotelSuffix = profile.hotelId ? '&hotel=' + profile.hotelId : '';
    if (rooms.length === 0) {
      showToast('No rooms found. Please add rooms to this hotel first.', 'error');
      return;
    }
    const roomNumbers = rooms.map(r => r.room_number);
    const html = `<!DOCTYPE html><html><head><title>Sentinel Pro QR Codes</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>body{font-family:Georgia,serif;background:#f8f6f0;padding:20px}h1{text-align:center;color:#C5A059;letter-spacing:4px;font-size:22px}p{text-align:center;color:#666;font-size:11px;margin-bottom:28px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.card{background:white;border:1px solid #C5A059;padding:18px;text-align:center;page-break-inside:avoid}.room{font-size:18px;font-weight:bold;color:#001529;margin-bottom:10px;letter-spacing:2px}.qr{display:flex;justify-content:center;margin:8px 0}.welcome{font-size:8px;color:#C5A059;margin-top:6px;line-height:1.6;font-style:italic;font-family:Georgia,serif}.instruction{font-size:8px;color:#C5A059;margin-top:5px;text-transform:uppercase;letter-spacing:1px}@media print{body{padding:8px}}</style>
</head><body><h1>Sentinel Pro</h1><p>Scan QR to request hotel services</p>
<div class="grid" id="grid"></div>
<script>const rooms=${JSON.stringify(roomNumbers)};const base='${baseUrl}';const grid=document.getElementById('grid');rooms.forEach(room=>{const div=document.createElement('div');div.className='card';div.innerHTML='<div class="room">Room '+room+'</div><div class="qr" id="qr_'+room+'"></div><div class="instruction">📱 Scan to Request Services</div><div class="welcome">Your comfort is our priority.<br>We are here for you, anytime.</div>';grid.appendChild(div);setTimeout(()=>{new QRCode(document.getElementById('qr_'+room),{text:base+'?room='+room+'${profile.hotelId ? "&hotel="+profile.hotelId : ""}',width:110,height:110,colorDark:'#001529',colorLight:'#ffffff'});},100);});setTimeout(()=>window.print(),2000);</script>
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
    <div class="meta-item"><div class="label">Time</div><div class="value">${new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Dubai'})}</div></div>
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
          {profile.hotelName && <p className="text-gold/50 text-[8px] uppercase tracking-[0.2em] mb-0.5">{profile.hotelName}</p>}
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
              { key: 'live', label: '🟢 Live' },
              { key: 'stafflogs', label: '📋 Staff Logs' },
            ].map(tab => (
              <button key={tab.key} onClick={() => { const k = tab.key as any; setActiveTab(k); if (k === 'stafflogs') fetchExecStaffLogs(); }} className={cn('px-2 py-1.5 text-[9px] font-bold uppercase', activeTab === tab.key ? 'bg-gold text-navy' : 'text-gold/60 hover:text-gold')}>{tab.label}</button>
            ))}
          </div>
          <button onClick={() => { localStorage.clear(); window.location.replace('/'); }} className="flex items-center gap-1 text-gold/60 hover:text-gold border border-gold/20 px-3 py-2 text-[9px] font-bold uppercase"><LogOut size={12} /> Logout</button>
          <button onClick={() => window.open('https://t.me/SentinelPr0BoT?start=' + profile.uid, '_blank')}
            className={(profile as any).telegram_chat_id ? 'flex items-center gap-1 border border-green-500/40 text-green-400 px-3 py-2 text-[9px] font-bold uppercase' : 'flex items-center gap-1 border border-gold/20 text-gold/50 hover:text-gold px-3 py-2 text-[9px] font-bold uppercase'}>
            {(profile as any).telegram_chat_id ? '✅ Telegram' : '🔔 Telegram'}
          </button>
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
                    <p className="text-[8px] text-white/60 font-bold">📥 {formatTime(req.created_at)}</p>
                    {req.accepted_at && <p className="text-[8px] text-blue-400 font-bold">✓ {formatTime(req.accepted_at)}</p>}
                    {req.closed_at && <p className="text-[8px] text-green-400 font-bold">✅ {formatTime(req.closed_at)}</p>}
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
        <div className="bg-[#001c36] border border-gold/10 p-4">
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
// ✅ ISSUE 7: Audit logging helper
const logAudit = async (
  action: string,
  actor: { id: string; name: string; role: string; hotelId?: string | null },
  target?: { type: string; id?: string },
  details?: Record<string, any>
) => {
  try {
    await supabase.from('audit_logs').insert({
      hotel_id: actor.hotelId || null,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      action,
      target_type: target?.type || null,
      target_id: target?.id || null,
      details: details || null,
    });
  } catch { /* audit failure must never break the app */ }
};

// Language flag map
const LANG_FLAG: Record<string, string> = {
  English: '🇺🇸', Arabic: '🇦🇪', Russian: '🇷🇺',
  Hindi: '🇮🇳', French: '🇫🇷', Turkish: '🇹🇷', Chinese: '🇨🇳',
};

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestTab, setGuestTab] = useState<'services' | 'room-service' | 'restaurant-bookings' | 'concierge'>('services');
  const [showRestaurantPortal, setShowRestaurantPortal] = useState(false);
  const [guestNotification, setGuestNotification] = useState<{ type: 'confirmed' | 'cancelled'; message: string } | null>(null);
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
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // ✅ ISSUE 6 FIX: Expire sessions older than 24 hours
        const loginAt = parsed.loginAt || 0;
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (Date.now() - loginAt > TWENTY_FOUR_HOURS) {
          localStorage.removeItem('sentinel_local_session');
          localStorage.removeItem('sentinel_hotel');
        } else {
          setProfile(parsed);
        }
      } catch { localStorage.removeItem('sentinel_local_session'); }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profile || profile.role !== 'guest') return;
    const fetchRequests = async () => {
      let guestReqQ = supabase.from('requests').select('*').eq('guest_id', profile.uid).order('created_at', { ascending: false });
      if (profile.hotelId) guestReqQ = guestReqQ.eq('hotel_id', profile.hotelId);
      const { data } = await guestReqQ;
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
    // ✅ FIX 2 REALTIME: Subscribe to guest record — instant logout on checkout
    const checkoutChannel = supabase.channel(`checkout-${profile.uid}`)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'guests',
        filter: `id=eq.${profile.uid}`,
      }, () => {
        // Room checked out — guest record deleted — clear session immediately
        localStorage.removeItem('sentinel_local_session');
        localStorage.removeItem('sentinel_hotel');
        window.location.reload();
      })
      .subscribe();
    const poll = setInterval(() => { fetchRequests(); }, 3000);
    const channel = supabase.channel(`guest-${profile.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchRequests)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurant_bookings' }, (payload) => {
        const b = payload.new as any;
        if (b.guest_id === profile.uid) {
          const status = b.status;
          if (status === 'Confirmed') {
            setGuestNotification({ type: 'confirmed', message: `Dear ${profile.displayName}, we are delighted to confirm your table reservation on ${b.date} at ${b.time}. We very much look forward to welcoming you and ensuring a memorable dining experience.` });
          } else if (status === 'Cancelled' || status === 'Rejected') {
            const restReason = b.rejection_reason ? ` ${b.rejection_reason}` : '';
            setGuestNotification({ type: 'cancelled', message: `Dear ${profile.displayName}, we regret to inform you that your table reservation on ${b.date} at ${b.time} has been cancelled.${restReason} We sincerely apologise for the inconvenience. Please contact our reservations team or reception for further assistance.` });
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'concierge_bookings' }, (payload) => {
        const b = payload.new as any;
        if (b.guest_id === profile.uid) {
          const status = b.status;
          if (status === 'Confirmed') {
            setGuestNotification({ type: 'confirmed', message: `Dear ${profile.displayName}, we are pleased to confirm your ${b.service_name} booking on ${b.pickup_date} at ${b.pickup_time}. Our team will be fully prepared and ready to assist you. We look forward to making your experience exceptional.` });
          } else if (status === 'Cancelled' || status === 'Rejected') {
            const reason = b.special_requests && b.special_requests.includes('CANCELLATION REASON:')
              ? b.special_requests.split('CANCELLATION REASON:').pop()?.trim()
              : null;
            const reasonText = reason ? ` Our team has noted: "${reason}".` : '';
            setGuestNotification({ type: 'cancelled', message: `Dear ${profile.displayName}, we regret to inform you that your ${b.service_name} booking scheduled for ${b.pickup_date} has been cancelled.${reasonText} We sincerely apologise for any inconvenience. Please do not hesitate to contact our concierge team for further assistance.` });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(checkoutChannel); clearInterval(poll); };
  }, [profile]);

  const logout = () => { localStorage.clear(); setProfile(null); window.location.replace('/'); };

  // ✅ CORRECT DEPARTMENT ROUTING — Room Service = F&B, Concierge = Concierge etc
  const submitRequest = async (customData?: any) => {
    const activeRoom = profile?.roomNumber || roomNumber;
    if (!profile || !activeRoom) { showToast('Room number is required', 'error'); return; }
    // ✅ Verify guest session still valid (not checked out)
    if (profile.role === 'guest' && profile.uid) {
      const { data: guestStillValid, error: guestErr } = await supabase
        .from('guests').select('id').eq('id', profile.uid).maybeSingle();
      if (!guestErr && guestStillValid === null) {
        localStorage.removeItem('sentinel_local_session');
        localStorage.removeItem('sentinel_hotel');
        window.location.reload();
        return;
      }
    }
    // ✅ ISSUE 3 FIX: 30-second cooldown to prevent request spam
    const svcKey = customData?.serviceKey || 'general';
    const cooldownKey = `sentinel_cooldown_${profile.uid}_${svcKey}`;
    const last = sessionStorage.getItem(cooldownKey);
    if (last && Date.now() - parseInt(last) < 30000) {
      const secs = Math.ceil((30000 - (Date.now() - parseInt(last))) / 1000);
      showToast(`Please wait ${secs} second${secs !== 1 ? 's' : ''} before submitting again.`, 'error');
      return;
    }
    sessionStorage.setItem(cooldownKey, Date.now().toString());
    const service = customData?.type ? customData : selectedService;
    if (!service) return;
    const lineItems = customData?.lineItems || null;
    const totalPrice = lineItems ? lineItems.reduce((s: number, li: any) => s + li.total, 0) : customData?.totalPrice || 0;
    const serviceKey = service.serviceKey || customData?.serviceKey || '';
    // ✅ This is the key fix — always use getDepartmentFromServiceKey
    const department = getDepartmentFromServiceKey(serviceKey, service.dept || customData?.dept);
    try {
      const { error } = await supabase.from('requests').insert({
        created_at: new Date().toISOString(),
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
        hotel_id: profile?.hotelId || null,
      });
      if (error) throw error;
      setShowRequestModal(false); setMessage(''); setSelectedService(null);
      setCart({}); setDietaryRequirements(''); setGuestTab('services');
      showToast('Your request has been submitted successfully!', 'success');
      // Notify dept staff via Telegram
      try {
        const dept = getDepartmentFromServiceKey(serviceKey);
        const flag = LANG_FLAG[language] || '';
        // Fetch actual SLA limit for this dept
        let slaMin = 30;
        if (profile.hotelId) {
          const { data: slaDat } = await supabase.from('sla_settings')
            .select('sla_minutes').eq('department', dept).eq('hotel_id', profile.hotelId).single();
          if (slaDat?.sla_minutes) slaMin = slaDat.sla_minutes;
        }
        const msg = '<b>🔔 New Request — ' + (service.type || service.name) + '</b>\n'
          + '🏨 Room ' + activeRoom + ' · ' + profile.displayName + ' ' + flag + '\n'
          + '📝 ' + (customData?.notes || [message, dietaryRequirements].filter(Boolean).join(', ') || (lineItems && lineItems.length > 0 ? lineItems.map((li: any) => li.name).join(', ') : '—')) + '\n'
          + '⏰ SLA: ' + slaMin + ' min';
        notifyDeptStaff(profile.hotelId, dept, msg);
      } catch { /* never block request submission */ }
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
  // ✅ Read hotel services config — filter tiles per hotel
  const hotelServicesConfig = (() => {
    try { return JSON.parse(localStorage.getItem('sentinel_hotel') || '{}').services_config || null; } catch { return null; }
  })();

  const allGuestServices = [
    { name: t('housekeeping'), icon: Sparkles, dept: 'Housekeeping', serviceKey: 'housekeeping', configKey: 'housekeeping', options: [t('room_cleaning'), t('laundry'), t('extra_blanket'), 'Extra Pillow', 'Extra Towels', 'Turn Down Service'] },
    { name: t('room_service'), icon: Coffee, dept: 'F&B', serviceKey: 'room_service', configKey: 'room_service' },
    { name: 'Restaurant Reservations', icon: UtensilsCrossed, dept: 'F&B', serviceKey: 'restaurant_portal', configKey: 'restaurant', isPortal: true },
    { name: t('concierge_services'), icon: Key, dept: 'Concierge', serviceKey: 'concierge_services', configKey: 'concierge' },

    { name: t('security'), icon: Shield, dept: 'Security & Safety', serviceKey: 'security', configKey: 'security', options: [t('emergency'), t('safe_box'), t('medical'), t('escort'), 'Lost & Found', 'Other'] },
    { name: 'Maintenance', icon: Wrench, dept: 'Maintenance', serviceKey: 'maintenance', configKey: 'maintenance', options: ['AC / Heating Issue', 'Plumbing Issue', 'Electrical Issue', 'TV / Electronics', 'Door / Lock Issue', 'Lighting Issue', 'Bathroom Issue', 'Other'] },
  ];

  // Filter services based on hotel config — if no config (testing/12345), show all
  const guestServices = hotelServicesConfig
    ? allGuestServices.filter(s => hotelServicesConfig[s.configKey] === true)
    : allGuestServices;

  if (loading) return <div className="min-h-screen bg-navy flex items-center justify-center"><div className="text-gold font-serif text-2xl animate-pulse">Loading...</div></div>;

  return (
    <>
    <ToastContainer />

    {/* ── GUEST BOOKING NOTIFICATION MODAL ── */}
    {guestNotification && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,21,41,0.85)' }}>
        <div className="bg-white max-w-sm w-full shadow-2xl overflow-hidden" style={{ borderTop: `4px solid ${guestNotification.type === 'confirmed' ? '#2D7D46' : '#C0392B'}` }}>
          <div className={`px-5 py-4 flex items-center gap-3 ${guestNotification.type === 'confirmed' ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className="text-3xl">{guestNotification.type === 'confirmed' ? '✅' : '❌'}</span>
            <div>
              <p className="font-bold font-serif text-navy text-base">
                {guestNotification.type === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled'}
              </p>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">Sentinel Pro · Guest Notification</p>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="text-navy text-sm leading-relaxed font-serif">{guestNotification.message}</p>
          </div>
          <div className="px-6 pb-6">
            <button
              onClick={() => setGuestNotification(null)}
              className={`w-full py-3 text-[10px] font-bold uppercase tracking-widest text-white ${guestNotification.type === 'confirmed' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {guestNotification.type === 'confirmed' ? 'Thank You — I Understand' : 'Understood — I Will Contact Reception'}
            </button>
          </div>
        </div>
      </div>
    )}

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
                {(pathname === '/staff-portal' || queryParams.get('mode') === 'staff') ? (
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
                {guestTab === 'concierge' && <Concierge profile={profile} onSubmit={data => submitRequest({ ...data, serviceKey: 'concierge_services', dept: 'Concierge' })} />}
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
