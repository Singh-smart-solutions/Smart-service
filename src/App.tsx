import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInAnonymously,
  signOut, 
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  setDoc,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  UserProfile, 
  ServiceRequest, 
  Department, 
  MenuItem,
  UserRole
} from './types';
import { cn } from './lib/utils';
import { 
  Sun,
  Cloud,
  Thermometer,
  LogOut, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Shield,
  Coffee,
  Key,
  Sparkles,
  UtensilsCrossed,
  Send,
  X,
  Globe,
  Home,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle,
  Check,
  ChevronDown,
  User,
  ClipboardList,
  TrendingUp,
  Star,
  ShieldCheck,
  Car,
  MapPin,
  Briefcase,
  History,
  Zap,
  MessageSquare,
  Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, Language } from './contexts/TranslationContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line
} from 'recharts';

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-navy p-4">
          <div className="bg-white p-8 max-w-md w-full text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-serif text-navy mb-4">Service Interruption</h2>
            <p className="text-navy/60 mb-8">Something went wrong. Please try again later.</p>
            <button onClick={() => window.location.reload()} className="gold-button">Restart Application</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const GlobalLanguageSelector: React.FC = () => {
  const { language, setLanguage, isRTL } = useLanguage();
  
  return (
    <div className={cn("fixed top-4 z-[10005] transition-all duration-300", isRTL ? "left-4" : "right-4")}>
      <div className="relative group">
        <button className="flex items-center gap-2 bg-navy/80 backdrop-blur-md text-white/90 hover:text-gold transition-all px-4 py-2 border border-gold/30 shadow-2xl">
          <Globe size={16} className="text-gold animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
            {language === 'English' ? '🇺🇸' : 
             language === 'Arabic' ? '🇦🇪' : 
             language === 'Russian' ? '🇷🇺' : 
             language === 'Hindi' ? '🇮🇳' : 
             language === 'French' ? '🇫🇷' : 
             language === 'Turkish' ? '🇹🇷' : '🇨🇳'}
          </span>
          <ChevronDown size={12} className="group-hover:rotate-180 transition-transform" />
        </button>
        <div className={cn(
          "absolute top-full mt-2 w-56 bg-navy border border-gold/30 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[10006]",
          isRTL ? "left-0" : "right-0"
        )}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gold"></div>
          {(['English', 'Arabic', 'Russian', 'Hindi', 'French', 'Turkish', 'Chinese'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={cn(
                "w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-gold/10 transition-colors flex items-center justify-between border-b border-gold/5 last:border-0",
                language === lang ? "text-gold bg-gold/5" : "text-white/60"
              )}
            >
              <span className="flex items-center gap-3">
                <span className="text-base">
                  {lang === 'English' ? '🇺🇸' : 
                   lang === 'Arabic' ? '🇦🇪' : 
                   lang === 'Russian' ? '🇷🇺' : 
                   lang === 'Hindi' ? '🇮🇳' : 
                   lang === 'French' ? '🇫🇷' : 
                   lang === 'Turkish' ? '🇹🇷' : '🇨🇳'}
                </span>
                {lang === 'English' ? 'English' : 
                 lang === 'Arabic' ? 'العربية' : 
                 lang === 'Russian' ? 'Русский' : 
                 lang === 'Hindi' ? 'हिन्दी' : 
                 lang === 'French' ? 'Français' : 
                 lang === 'Turkish' ? 'Türkçe' : '中文'}
              </span>
              {language === lang && <Check size={14} className="text-gold" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const Header: React.FC<{
  roomNumber: string;
  isAdminRoute: boolean;
  user: any;
  logout: () => void;
  navigateToGuest: () => void;
}> = ({ roomNumber, isAdminRoute, user, logout, navigateToGuest }) => {
  const { t, isRTL } = useLanguage();
  
  return (
    <nav className="sticky-header">
      <div className={cn("flex items-center gap-1 sm:gap-2 px-4", isRTL && "flex-row-reverse")}>
        {user && (
          <button onClick={navigateToGuest} className="p-1 sm:p-2 text-gold hover:text-white transition-colors">
            <Home size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="logo-container cursor-pointer" onClick={navigateToGuest}>
        <div className="flex flex-col items-center">
          <h1 className="logo-text">Sentinel Pro</h1>
          <span className="text-[7px] sm:text-[8px] font-bold text-gold/60 uppercase tracking-[0.3em] -mt-1">Luxury Hotel & Residences</span>
        </div>
      </div>

      <div className={cn("flex items-center gap-1 sm:gap-2 px-4", isRTL && "flex-row-reverse")}>
        <div className={cn("flex flex-col items-end mr-2 hidden xs:flex", isRTL && "items-start ml-2 mr-0")}>
          <span className="text-[10px] font-bold text-white tracking-widest uppercase">{t('room')} {roomNumber || '---'}</span>
          <span className="text-[7px] text-gold font-bold uppercase tracking-tighter">Executive Level</span>
        </div>
        {user && (
          <button onClick={logout} className="p-1 sm:p-2 text-gold hover:text-white transition-colors">
            <LogOut size={18} strokeWidth={1} />
          </button>
        )}
      </div>
    </nav>
  );
};

const FeedbackModal: React.FC<{ 
  request: ServiceRequest; 
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}> = ({ request, onClose, onSubmit }) => {
  const { t, isRTL } = useLanguage();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="bg-[#FCF9F2] w-full max-w-md p-8 relative shadow-2xl border border-gold/20"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-navy/40 hover:text-navy">
          <X size={20} />
        </button>
        
        <div className="text-center space-y-6">
          <div className="inline-block p-3 bg-gold/10 rounded-full">
            <Star size={32} className="text-gold fill-gold" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-serif text-navy">{t('rate_experience')}</h2>
            <p className="text-[10px] uppercase tracking-widest text-gold font-bold">{request.type}</p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star} 
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star 
                  size={32} 
                  className={cn(star <= rating ? "text-gold fill-gold" : "text-gold/20")} 
                />
              </button>
            ))}
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">
              {t('tell_us_experience')}
            </label>
            <textarea 
              value={comment} 
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('feedback_placeholder')}
              className="h-32 resize-none"
            />
          </div>

          <button 
            onClick={() => onSubmit(rating, comment)}
            className="w-full bg-navy text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-navy/90 transition-colors font-sans"
          >
            {t('submit_feedback')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const RoomService: React.FC<{
  cart: { [itemId: string]: number };
  updateCart: (itemId: string, delta: number) => void;
  onSubmit: (notes: string) => void;
}> = ({ cart, updateCart, onSubmit }) => {
  const { t, isRTL } = useLanguage();
  const [notes, setNotes] = useState('');
  
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
  const total = Object.entries(cart).reduce((acc, [id, qty]) => {
    const item = menuItems.find(m => m.id === id);
    return acc + (item?.price || 0) * qty;
  }, 0);

  return (
    <div className="space-y-12 pb-32 w-full px-4 sm:px-8">
      {categories.map(cat => (
        <section key={cat} className="space-y-4">
          <h2 className="text-sm font-bold text-gold uppercase tracking-[0.2em] border-b border-gold/20 pb-2">{t(cat)}</h2>
          <div className="space-y-1">
            {menuItems.filter(i => i.category === cat).map(item => (
              <div key={item.id} onClick={() => updateCart(item.id, 1)} className="menu-list-item">
                <div className="flex flex-col">
                  <span className="text-navy font-serif text-lg">{item.name}</span>
                  {cart[item.id] > 0 && <span className="text-[10px] text-gold font-bold uppercase">Qty: {cart[item.id]}</span>}
                </div>
                <div className="menu-dots" />
                <span className="text-navy font-bold">{item.price} {t('currency_label')}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
      
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none" />
        <p className="text-[8px] text-charcoal/40 uppercase tracking-widest font-bold mt-2">{t('includes_vat')}</p>
      </div>

      <AnimatePresence>
        {Object.keys(cart).length > 0 && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-4 left-4 right-4 bg-navy p-4 flex items-center justify-between shadow-2xl z-[9999]" style={{ borderRadius: 0 }}>
            <div className="flex flex-col">
              <span className="text-[8px] text-white/50 uppercase tracking-widest">{t('your_tray')}</span>
              <span className="text-gold font-bold">{total} {t('currency_label')}</span>
            </div>
            <button onClick={() => onSubmit(notes)} className="bg-gold text-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest">{t('order_now')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RestaurantBooking: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  const { t, isRTL } = useLanguage();
  const [bookingData, setBookingData] = useState({ restaurant: 'turquoise', pax: '2', date: '', time: '', notes: '' });
  const restaurants = [
    { id: 'turquoise', name: t('turquoise'), desc: t('international_cuisine') },
    { id: 'mermaid', name: t('mermaid'), desc: t('mediterranean_cuisine') },
    { id: 'lolivo', name: t('lolivo'), desc: t('italian_cuisine') }
  ];

  return (
    <div className="w-full py-8 space-y-8 px-4 sm:px-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif text-navy">{t('restaurant_bookings')}</h2>
        <p className="text-gold text-[10px] uppercase tracking-widest font-bold">{t('reserve_table')}</p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3">
          {restaurants.map(r => (
            <button key={r.id} onClick={() => setBookingData({ ...bookingData, restaurant: r.id })} className={cn("p-4 border text-left transition-all", bookingData.restaurant === r.id ? "border-gold bg-gold/5" : "border-navy/10")}>
              <p className="text-navy font-bold">{r.name}</p>
              <p className="text-[10px] text-charcoal/60 italic">{r.desc}</p>
            </button>
          ))}
        </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_pax')}</label>
            <input type="number" value={bookingData.pax} onChange={(e) => setBookingData({ ...bookingData, pax: e.target.value })} className="w-full bg-white text-navy border border-gold p-4" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_date')}</label>
            <input type="date" value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} className="w-full bg-white text-navy border border-gold p-4" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_time')}</label>
            <input type="time" value={bookingData.time} onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })} className="w-full bg-white text-navy border border-gold p-4" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
            <textarea value={bookingData.notes} onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
          </div>
        <button onClick={() => onSubmit({ type: `Restaurant: ${bookingData.restaurant}`, restaurantName: bookingData.restaurant, pax: Number(bookingData.pax), preferredTiming: `${bookingData.date} ${bookingData.time}`, notes: bookingData.notes })} className="gold-button w-full m-0">{t('confirm')}</button>
      </div>
    </div>
  );
};

const Concierge: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  const { t, isRTL } = useLanguage();
  const [selectedConcierge, setSelectedConcierge] = useState<string>('rent_a_car');
  const [notes, setNotes] = useState('');
  const [subTab, setSubTab] = useState<string>('taxi');
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
          <button key={opt.id} onClick={() => { setSelectedConcierge(opt.id); setSubTab(opt.id === 'luggage_service' ? 'pickup' : 'taxi'); }} className={cn("premium-card", selectedConcierge === opt.id ? "border-gold bg-gold/5" : "")}>
            <div className="icon-wrapper"><opt.icon size={20} className="text-gold" strokeWidth={1} /></div>
            <h3>{opt.name}</h3>
          </button>
        ))}
      </div>

      {selectedConcierge === 'rent_a_car' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {cars.map(car => (
              <div key={car.id} className="flex items-center gap-4 bg-white border border-gold/10 p-3 shadow-sm">
                <img src={car.img} alt={car.name} className="w-24 h-16 object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1">
                  <h4 className="font-serif text-navy">{car.name}</h4>
                  <p className="text-gold font-bold text-xs">{car.price} {t('currency_label')} / {t('label_date')}</p>
                </div>
                <button onClick={() => onSubmit({ type: `Rent a Car: ${car.name}`, dept: 'Concierge', totalPrice: car.price, notes: `Car: ${car.name}. ${notes}` })} className="bg-gold text-white px-4 py-2 text-[10px] font-bold uppercase">{t('book_now')}</button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
          </div>
        </div>
      )}

      {selectedConcierge === 'taxi_limousine' && (
        <div className="bg-white p-6 shadow-xl border border-gold/10 space-y-6">
           <div className="pill-container">
              <button onClick={() => setSubTab('taxi')} className={cn("pill-btn", subTab === 'taxi' ? "active" : "inactive")}>{t('taxi')}</button>
              <button onClick={() => setSubTab('limousine')} className={cn("pill-btn", subTab === 'limousine' ? "active" : "inactive")}>{t('limousine')}</button>
           </div>
           {subTab === 'limousine' && <p className="text-gold font-bold text-[10px] uppercase tracking-widest text-center">{t('limousine_service')}</p>}
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_pickup')}</label>
                    <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full bg-white text-navy border border-gold p-4" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_destination')}</label>
                    <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={t('drop_off_destination')} className="w-full bg-white text-navy border border-gold p-4" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
                  </div>
               </div>
           <button onClick={() => onSubmit({ type: `Concierge: ${subTab}`, dept: 'Concierge', pickupTime, destination, notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}

      {selectedConcierge === 'luggage_service' && (
        <div className="bg-white p-6 shadow-xl border border-gold/10 space-y-6">
           <div className="pill-container">
              <button onClick={() => setSubTab('pickup')} className={cn("pill-btn", subTab === 'pickup' ? "active" : "inactive")}>{t('pickup')}</button>
              <button onClick={() => setSubTab('delivery')} className={cn("pill-btn", subTab === 'delivery' ? "active" : "inactive")}>{t('delivery')}</button>
           </div>
           {subTab === 'pickup' ? (
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('luggage')}</label>
                  <input type="number" value={numBags} onChange={(e) => setNumBags(e.target.value)} min="1" className="w-full bg-white text-navy border border-gold p-4" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_pickup')}</label>
                  <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full bg-white text-navy border border-gold p-4" />
                </div>
             </div>
           ) : (
             <div className="text-center py-4">
               <p className="text-navy/60 font-serif italic">{t('luggage_desc')}</p>
             </div>
           )}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
            </div>
           <button onClick={() => onSubmit({ type: `Luggage: ${subTab}`, dept: 'Concierge', numBags: subTab === 'pickup' ? numBags : null, pickupTime: subTab === 'pickup' ? pickupTime : null, notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
      {selectedConcierge === 'local_tours' && (
        <div className="bg-white p-6 shadow-xl border border-gold/10 space-y-6">
           <div className="text-center py-4">
             <p className="text-navy/60 font-serif italic">{t('local_tours_desc') || 'Discover the beauty of Abu Dhabi with our curated local tours.'}</p>
           </div>
           <div className="space-y-2">
             <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
             <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none" />
           </div>
           <button onClick={() => onSubmit({ type: `Concierge: Local Tours`, dept: 'Concierge', notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
    </div>
  );
};

const getDeviceId = () => {
  let id = localStorage.getItem('sentinel_device_id');
  if (!id) {
    id = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem('sentinel_device_id', id);
  }
  return id;
};

const Auth: React.FC<{ 
  onLoginSuccess: (user: any, profile: any) => void, 
  initialRoom?: string, 
  isLocked?: boolean,
  onNavigateToStaff: () => void 
}> = ({ onLoginSuccess, initialRoom, isLocked, onNavigateToStaff }) => {
  const { t, isRTL } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [roomNumber, setRoomNumber] = useState(initialRoom || '');
  const [loading, setLoading] = useState(false);
  const [showSecretHandshake, setShowSecretHandshake] = useState(false);
  const [showManagerLock, setShowManagerLock] = useState(false);
  const [managerPassword, setManagerPassword] = useState('');
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    if (initialRoom) setRoomNumber(initialRoom);
  }, [initialRoom]);

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (fullName === '12345' || roomNumber === '12345') {
        setShowSecretHandshake(true);
        setLoading(false);
        return;
      }
      try { await signInAnonymously(auth); } catch (e) {}
      const guestId = fullName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + roomNumber;
      const guestDocRef = doc(db, 'guests', guestId);
      const guestDoc = await getDoc(guestDocRef);
      let guestData = guestDoc.exists() ? guestDoc.data() : { fullName, roomNumber, role: 'guest', createdAt: new Date().toISOString() };
      if (!guestDoc.exists()) await setDoc(guestDocRef, guestData);
      const profile = { uid: auth.currentUser?.uid || guestId, email: 'guest@hotel.com', roomNumber, role: 'guest' as UserRole, displayName: fullName || `Guest ${roomNumber}`, department: 'None' as Department };
      localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
      localStorage.setItem('sentinel_guest_session_id', sessionId);
      onLoginSuccess(auth.currentUser || { uid: profile.uid, email: profile.email }, profile);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleManagerAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (managerPassword === 'Manager12345') {
      const adminProfile = { 
        uid: 'admin_override', 
        email: 'admin@sentinel.pro', 
        roomNumber: 'ADMIN', 
        role: 'manager' as UserRole, 
        displayName: 'System Administrator', 
        department: 'None' as Department 
      };
      localStorage.setItem('sentinel_local_session', JSON.stringify(adminProfile));
      onLoginSuccess({ uid: 'admin_override', email: 'admin@sentinel.pro' }, adminProfile);
    } else {
      const newCount = failCount + 1;
      setFailCount(newCount);
      if (newCount >= 3) {
        alert('SECURITY ALERT: Too many failed attempts. Returning to main screen.');
        setShowManagerLock(false);
        setShowSecretHandshake(false);
        setFailCount(0);
        setManagerPassword('');
      } else {
        alert(`INVALID PASSWORD. Attempt ${newCount} of 3.`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 relative">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8 sm:space-y-16 bg-[#001c36] p-6 sm:p-12 shadow-2xl border border-[#C5A059]">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="inline-block p-4 sm:p-6 border border-gold mb-2 sm:mb-4"><ShieldCheck className="w-10 h-10 sm:w-16 sm:h-16 text-gold" strokeWidth={1} /></div>
          <h1 className="text-2xl sm:text-5xl font-serif tracking-[0.1em] sm:tracking-[0.3em] text-white uppercase luxury-text-shadow leading-tight">{t('sentinel_pro_title') || 'Sentinel Pro'}</h1>
          <p className="text-gold text-[8px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.4em] uppercase font-bold">{t('luxury_management_systems') || 'Luxury Management Systems'}</p>
        </div>

        {showManagerLock ? (
          <form onSubmit={handleManagerAuth} className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-2">
              <p className="text-gold text-[10px] text-center uppercase tracking-widest font-bold">{t('executive_vault_access') || 'Executive Vault Access'}</p>
              <input 
                type="password" 
                required 
                autoFocus
                value={managerPassword} 
                onChange={(e) => setManagerPassword(e.target.value)} 
                className="login-input text-center" 
                placeholder={t('enter_manager_password') || 'Enter Manager Password'} 
              />
            </div>
            <div className={cn("flex gap-4", isRTL && "flex-row-reverse")}>
              <button type="button" onClick={() => setShowManagerLock(false)} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest">{t('back')}</button>
              <button type="submit" className="flex-1 gold-button">{t('unlock') || 'Unlock'}</button>
            </div>
          </form>
        ) : showSecretHandshake ? (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <p className="text-gold text-[10px] text-center uppercase tracking-widest font-bold">{t('security_override_detected') || 'Security Override Detected'}</p>
            <div className="space-y-4">
              <button onClick={() => setShowManagerLock(true)} className={cn("gold-button w-full flex items-center justify-center gap-3", isRTL && "flex-row-reverse")}>
                <ShieldCheck size={18} /> {t('executive_dashboard')}
              </button>
              <button onClick={onNavigateToStaff} className={cn("navy-button w-full border border-gold/30 flex items-center justify-center gap-3", isRTL && "flex-row-reverse")}>
                <User size={18} /> {t('staff_portal')}
              </button>
              <button onClick={() => setShowSecretHandshake(false)} className="text-[10px] text-white/40 uppercase tracking-widest w-full text-center hover:text-white transition-colors">{t('cancel')}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGuestLogin} className="space-y-4 w-full">
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="login-input" placeholder={t('full_name') || 'Full Name'} />
            <input type="text" required disabled={isLocked} value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className={cn("login-input", isLocked && "bg-navy/20 text-white/40 cursor-not-allowed")} placeholder={t('room_number')} />
            <button type="submit" disabled={loading} className="gold-button w-full">{loading ? '...' : t('sign_in')}</button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

const StaffLogin: React.FC<{ 
  onLoginSuccess: (user: any, profile: any) => void;
  onReturnToGuest: () => void;
}> = ({ onLoginSuccess, onReturnToGuest }) => {
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [staffIdNumber, setStaffIdNumber] = useState('');
  const [department, setDepartment] = useState<Department>('Housekeeping');
  const [loading, setLoading] = useState(false);
  const [showPendingOverlay, setShowPendingOverlay] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('mode') as any) || 'login';
  });

  const handleStaffAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === 'register') {
        const staffId = email.replace(/[^a-zA-Z0-9]/g, '_');
        const staffDocRef = doc(db, 'staff', staffId);
        const staffDoc = await getDoc(staffDocRef);
        
        if (staffDoc.exists()) {
          alert('Profile already exists. Please login.');
          setMode('login');
          return;
        }

        const staffData = { 
          fullName, 
          displayName: fullName,
          staffIdNumber,
          email, 
          password, 
          department, 
          role: 'staff' as UserRole,
          status: 'Pending',
          createdAt: new Date().toISOString() 
        };
        await setDoc(staffDocRef, staffData);
        
        // Data Bridge: Save to localStorage for Executive Approval Center
        const pending = JSON.parse(localStorage.getItem('sentinel_pending') || '[]');
        pending.push({ ...staffData, uid: staffId });
        localStorage.setItem('sentinel_pending', JSON.stringify(pending));
        
        setShowPendingOverlay(true);
      } else {
        // Login Logic
        const staffId = email.replace(/[^a-zA-Z0-9]/g, '_');
        const staffDocRef = doc(db, 'staff', staffId);
        const staffDoc = await getDoc(staffDocRef);

        if (staffDoc.exists() && staffDoc.data().password === password) {
          const data = staffDoc.data();
          
          if (data.status === 'Pending') {
            alert('ACCESS DENIED: Your account is pending manager approval.');
            setLoading(false);
            return;
          }

          const currentDeviceId = getDeviceId();
          if (data.deviceId && data.deviceId !== currentDeviceId) {
            alert('ACCESS DENIED: Account active on another device.');
            setLoading(false);
            return;
          }

          if (!data.deviceId) {
            await updateDoc(staffDocRef, { deviceId: currentDeviceId });
          }

          const profile = { 
            uid: staffId, 
            email: data.email, 
            role: data.role, 
            department: data.department, 
            displayName: data.fullName,
            status: data.status,
            deviceId: data.deviceId || currentDeviceId
          };
          localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
          onLoginSuccess({ uid: staffId, email: data.email }, profile);
        } else if (password === '12345' && ['hk@hotel.com', 'fb@hotel.com', 'concierge@hotel.com', 'admin@hotel.com'].includes(email)) {
          // Legacy Bypass
          let role: UserRole = 'staff';
          let dept: Department = 'None';
          let displayName = 'Staff Member';
          if (email === 'admin@hotel.com') { role = 'manager'; displayName = 'General Manager'; }
          else if (email === 'hk@hotel.com') { dept = 'Housekeeping'; displayName = 'Housekeeping Lead'; }
          else if (email === 'fb@hotel.com') { dept = 'F&B'; displayName = 'F&B Supervisor'; }
          const profile = { uid: `bypass-${Date.now()}`, email, role, department: dept, displayName, status: 'Approved' };
          localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
          onLoginSuccess({ uid: profile.uid, email: profile.email } as any, profile);
        } else {
          alert('Invalid credentials.');
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 relative">
      <AnimatePresence>
        {showPendingOverlay && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              className="bg-[#001c36] p-10 sm:p-16 text-center border-2 border-gold max-w-lg shadow-[0_0_50px_rgba(197,160,89,0.3)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gold animate-pulse"></div>
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full"></div>
                <ShieldCheck className="w-20 h-20 text-gold mx-auto relative z-10" strokeWidth={1} />
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif text-white mb-6 tracking-tight">{t('request_submitted_awaiting_approval')}</h2>
              <div className="space-y-4 mb-10">
                <p className="text-gold font-bold text-xs uppercase tracking-[0.2em]">{t('managers_approval_queue_active')}</p>
                <p className="text-white/70 text-sm sm:text-base leading-relaxed font-serif italic">
                  {t('access_granted_after_approval')}
                </p>
              </div>
              <button 
                onClick={onReturnToGuest} 
                className="gold-button w-full py-5 text-sm tracking-[0.3em]"
              >
                {t('close_return_to_sanctuary')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className={cn(
          "w-full max-w-md space-y-8 bg-[#001c36] p-6 sm:p-12 shadow-2xl border border-[#C5A059] transition-all duration-500",
          showPendingOverlay && "blur-sm scale-95 opacity-50 pointer-events-none"
        )}
      >
        <div className="text-center space-y-4">
          <div className="inline-block p-4 border border-gold"><ShieldCheck className="w-10 h-10 text-gold" strokeWidth={1} /></div>
          <h1 className="text-2xl sm:text-5xl font-serif tracking-widest text-white uppercase">{t('sentinel_pro_title') || 'Sentinel Pro'}</h1>
          <p className="text-gold text-[8px] uppercase font-bold">{t('staff_portal_access') || 'Staff Portal Access'}</p>
        </div>
        <form onSubmit={handleStaffAuth} className="space-y-4">
          {mode === 'register' && (
            <>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="login-input bg-white text-navy" placeholder={t('full_name') || 'Full Name'} />
              <input type="text" required value={staffIdNumber} onChange={(e) => setStaffIdNumber(e.target.value)} className="login-input bg-white text-navy" placeholder={t('staff_id_number') || 'Staff ID Number'} />
              <select value={department} onChange={(e) => setDepartment(e.target.value as Department)} className="login-input bg-white text-navy">
                <option value="Housekeeping">{t('housekeeping')}</option>
                <option value="F&B">{t('f_b')}</option>
                <option value="Security & Safety">{t('security_safety')}</option>
                <option value="Concierge">{t('concierge')}</option>
              </select>
            </>
          )}
          <input type="text" required value={email} onChange={(e) => setEmail(e.target.value)} className="login-input bg-white text-navy" placeholder={t('email')} />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="login-input bg-white text-navy" placeholder={t('password')} />
          <button type="submit" disabled={loading} className="gold-button w-full">{loading ? '...' : (mode === 'login' ? t('sign_in') : t('register'))}</button>
        </form>
        <div className="text-center">
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[10px] font-bold text-gold uppercase tracking-widest cursor-pointer">
            {mode === 'login' ? t('dont_have_profile') || "Don't have a profile? Create Profile" : t('already_have_profile') || "Already have a profile? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const StaffPortal: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const { t, isRTL } = useLanguage();
  const [tasks, setTasks] = useState<ServiceRequest[]>([]);
  const [history, setHistory] = useState<ServiceRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [now, setNow] = useState(Date.now());
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [delayModalTask, setDelayModalTask] = useState<ServiceRequest | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [slaLimits] = useState(() => {
    const saved = localStorage.getItem('sentinel_sla_limits');
    return saved ? JSON.parse(saved) : { Security: 2, 'F&B': 5, Housekeeping: 5, Concierge: 5, 'Front Office': 5 };
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    const q = query(collection(db, 'requests'), orderBy('timestamp', 'desc'));
    let firstLoad = true;
    return onSnapshot(q, (snapshot) => {
      const allReqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
      
      if (!firstLoad && snapshot.docChanges().some(change => change.type === 'added')) {
        const added = snapshot.docChanges().find(c => c.type === 'added');
        if (added) {
          const data = added.doc.data() as ServiceRequest;
          setNewOrderAlert(`New Request: Room #${data.roomNumber} - ${data.type}`);
          setTimeout(() => setNewOrderAlert(null), 5000);
        }
      }
      firstLoad = false;

      const active = allReqs.filter(t => t.status !== 'Completed');
      const completed = allReqs.filter(t => t.status === 'Completed');
      
      const filterByDept = (reqs: ServiceRequest[]) => reqs.filter(req => {
        if (userProfile.role === 'manager') return true;
        if (userProfile.department === 'Security & Safety') return ['Emergency Assistance', 'Safe Box Fault', 'Door Lock Issue'].includes(req.type);
        return req.department === userProfile.department || req.department === 'Front Office';
      });
      
      setTasks(filterByDept(active));
      setHistory(filterByDept(completed).slice(0, 20));
    });
  }, [userProfile]);

  const handleAccept = async (id: string) => {
    await updateDoc(doc(db, 'requests', id), { 
      status: 'In Progress', 
      accepted_time: serverTimestamp(), 
      assignedStaffEmail: userProfile.email,
      assignedStaffName: userProfile.displayName
    });
  };

  const handleComplete = async (task: ServiceRequest) => {
    const elapsed = getElapsedTime(task.timestamp);
    const limit = (slaLimits[task.department as keyof typeof slaLimits] || 5) * 60;
    
    if (elapsed > limit && !task.delayReason) {
      setDelayModalTask(task);
      return;
    }

    await updateDoc(doc(db, 'requests', task.id), { 
      status: 'Completed', 
      completed_time: serverTimestamp(),
      delayReason: delayReason || null
    });
    setDelayModalTask(null);
    setDelayReason('');
  };

  const getElapsedTime = (ts: any) => {
    if (!ts) return 0;
    const start = ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime();
    return Math.floor((now - start) / 1000);
  };

  return (
    <div className="w-full pb-24 relative bg-[#001529] min-h-screen text-white">
      <AnimatePresence>
        {delayModalTask && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#001c36] p-8 max-w-md w-full border-t-4 border-red-600 shadow-2xl">
              <h2 className="text-xl font-serif text-white mb-4">SLA Violation Detected</h2>
              <p className="text-sm text-white/60 mb-6">This task exceeded the department SLA limit. Please provide a reason for the delay to complete the task.</p>
              <select 
                value={delayReason} 
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full p-4 bg-white border border-gold mb-6 text-sm text-navy outline-none focus:border-gold"
              >
                <option value="">Select Reason...</option>
                <option value="High Volume">High Volume of Requests</option>
                <option value="Staff Shortage">Staff Shortage</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Guest Not in Room">Guest Not in Room</option>
                <option value="Other">Other</option>
              </select>
              <div className="flex gap-4">
                <button onClick={() => setDelayModalTask(null)} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                <button 
                  disabled={!delayReason}
                  onClick={() => handleComplete(delayModalTask)} 
                  className="flex-1 py-3 bg-gold text-navy text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  Submit & Complete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[10002] bg-gold text-navy px-6 py-3 shadow-2xl flex items-center gap-3 border-2 border-white"
          >
            <AlertCircle size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">{newOrderAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <header className={cn("p-6 bg-navy text-white flex justify-between items-center border-b border-gold/20", isRTL && "flex-row-reverse")}>
        <div className={isRTL ? "text-right" : "text-left"}>
          <h1 className="text-2xl font-serif text-gold">{userProfile.displayName}</h1>
          <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">{t(userProfile.department.toLowerCase().replace(' ', '_')) || userProfile.department} {t('command_center') || 'Command Center'}</p>
        </div>
        <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
          <div className={cn("flex bg-navy/50 border border-gold/20 p-1", isRTL && "flex-row-reverse")}>
            <button 
              onClick={() => setActiveTab('active')} 
              className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'active' ? "bg-gold text-navy" : "text-gold/60 hover:text-gold")}
            >
              {t('active')}
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'history' ? "bg-gold text-navy" : "text-gold/60 hover:text-gold")}
            >
              {t('history')}
            </button>
          </div>
          <button 
            onClick={() => {
              auth.signOut();
              localStorage.clear();
              window.location.replace('/');
            }}
            className="p-2 text-gold hover:text-white transition-colors flex flex-col items-center gap-1"
          >
            <LogOut size={20} />
            <span className="text-[8px] uppercase font-bold">{t('logout')}</span>
          </button>
        </div>
      </header>

      <div className="staff-grid p-6">
        {activeTab === 'active' ? (
          <>
            {tasks.map(task => {
              const elapsed = getElapsedTime(task.timestamp);
              const limit = (slaLimits[task.department as keyof typeof slaLimits] || 5) * 60;
              const isViolated = elapsed > limit;
              
              return (
                <motion.div 
                  key={task.id} 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn("staff-task-card bg-[#001c36] border-gold/10", isViolated && "sla-violated")}
                >
                  <div className={cn("flex justify-between items-start", isRTL && "flex-row-reverse")}>
                    <div className="bg-navy/50 px-3 py-1 text-gold text-[10px] font-bold tracking-widest uppercase border border-gold/20">{t('room').toUpperCase()} #{task.roomNumber}</div>
                    <div className={cn("timer-text text-white", isViolated && "violated text-red-500")}>
                      {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
                    </div>
                  </div>

                  <div className={cn("space-y-1", isRTL && "text-right")}>
                    <h3 className="text-lg font-serif text-white">{t(task.serviceKey || task.type)}</h3>
                    <p className={cn(
                      "text-[10px] uppercase tracking-widest font-bold",
                      task.status === 'Pending' ? "text-gold" : "text-blue-400"
                    )}>{t(task.status.toLowerCase().replace(' ', '_')) || task.status}</p>
                    {task.assignedStaffName && (
                      <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">{t('handled_by') || 'Handled by'}: {task.assignedStaffName}</p>
                    )}
                  </div>

                  {task.message && (
                    <div className={cn("bg-navy/30 p-3 border-l-2 border-gold/20 italic text-xs text-white/60", isRTL && "border-l-0 border-r-2 text-right")}>
                      "{task.message}"
                    </div>
                  )}

                  {task.items && (
                    <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                      {task.items.map((i, idx) => <div key={idx}>{i.quantity}x {i.name}</div>)}
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    {task.status === 'Pending' ? (
                      <button onClick={() => handleAccept(task.id)} className="gold-button w-full m-0 py-3">{t('accept_task') || 'Accept Task'}</button>
                    ) : (
                      <div className="space-y-2">
                        <button onClick={() => handleComplete(task)} className="w-full py-3 bg-green-600 text-white font-bold uppercase tracking-widest text-[10px]">{t('mark_completed') || 'Mark Completed'}</button>
                        {userProfile.department === 'F&B' && (
                          <div className="space-y-1">
                            <button 
                              onClick={() => alert('Order successfully synced to Oracle Micros Symphony API.')}
                              className="w-full py-2 bg-[#C5A059] text-navy font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                            >
                              <Zap size={12} /> {t('sync_to_micros') || 'Sync to Micros/Symphony'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {tasks.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-gold/20 mx-auto" strokeWidth={1} />
                <p className="text-white/40 font-serif italic">All tasks completed. Standing by.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {history.map(task => (
              <div key={task.id} className={cn("bg-[#001c36] border border-gold/10 p-4 shadow-sm opacity-70", isRTL && "text-right")}>
                <div className={cn("flex justify-between items-center mb-2", isRTL && "flex-row-reverse")}>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('room').toUpperCase()} #{task.roomNumber}</span>
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{t('completed').toUpperCase()}</span>
                </div>
                <h3 className="text-sm font-serif text-white">{t(task.serviceKey || task.type)}</h3>
                <p className="text-[8px] text-gold/60 uppercase font-bold mt-1">{t('closed_at') || 'Closed at'} {task.completed_time?.toDate ? task.completed_time.toDate().toLocaleTimeString() : t('recently')}</p>
              </div>
            ))}
            {history.length === 0 && (
              <div className="col-span-full py-20 text-center text-white/20 italic font-serif">
                {t('no_history_available') || 'No history available.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ManagerDashboard: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('sentinel_manager_stats');
    return saved ? JSON.parse(saved) : { revenue: 0, pending: 0, completed: 0, avgResolution: 0 };
  });
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [graphMode, setGraphMode] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [activeTab, setActiveTab] = useState<'analytics' | 'config' | 'staff'>('analytics');
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [staffFilter, setStaffFilter] = useState<'Pending' | 'Approved' | 'Terminated'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [slaLimits, setSlaLimits] = useState(() => {
    const saved = localStorage.getItem('sentinel_sla_limits');
    return saved ? JSON.parse(saved) : { Security: 2, 'F&B': 5, Housekeeping: 5, Concierge: 5, 'Front Office': 5 };
  });

  useEffect(() => {
    const q = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbStaff = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          uid: doc.id, 
          ...data, 
          displayName: data.displayName || data.fullName || 'Staff'
        } as UserProfile;
      });
      
      // Merge with localStorage for instant feedback and requested logic
      const pending = JSON.parse(localStorage.getItem('sentinel_pending') || '[]');
      const active = JSON.parse(localStorage.getItem('sentinel_active') || '[]');
      const terminated = JSON.parse(localStorage.getItem('sentinel_terminated') || '[]');
      
      const merged = [...dbStaff];
      
      [...pending, ...active, ...terminated].forEach((local: any) => {
        if (!merged.find(s => s.uid === local.uid)) {
          merged.push({ ...local, displayName: local.fullName || local.displayName || 'Staff' });
        }
      });
      
      setStaffList(merged);
    });

    return () => unsubscribe();
  }, []);

  // Admin Refresh: Pull from local storage whenever tab changes to staff
  useEffect(() => {
    if (activeTab === 'staff') {
      const pending = JSON.parse(localStorage.getItem('sentinel_pending') || '[]');
      const active = JSON.parse(localStorage.getItem('sentinel_active') || '[]');
      const terminated = JSON.parse(localStorage.getItem('sentinel_terminated') || '[]');
      
      setStaffList(prev => {
        const merged = [...prev];
        [...pending, ...active, ...terminated].forEach((local: any) => {
          if (!merged.find(s => s.uid === local.uid)) {
            merged.push({ ...local, displayName: local.fullName || local.displayName || 'Staff' });
          }
        });
        return merged;
      });
    }
  }, [activeTab]);

  const approveStaff = async (staff: UserProfile) => {
    const staffRef = doc(db, 'staff', staff.uid);
    await updateDoc(staffRef, { status: 'Approved' });
    
    // Move in localStorage
    const pending = JSON.parse(localStorage.getItem('sentinel_pending') || '[]');
    const active = JSON.parse(localStorage.getItem('sentinel_active') || '[]');
    
    const filteredPending = pending.filter((s: any) => s.uid !== staff.uid);
    const approvedStaff = { ...staff, status: 'Approved' };
    active.push(approvedStaff);
    
    localStorage.setItem('sentinel_pending', JSON.stringify(filteredPending));
    localStorage.setItem('sentinel_active', JSON.stringify(active));
  };

  const terminateStaff = async (staff: UserProfile) => {
    const staffRef = doc(db, 'staff', staff.uid);
    await updateDoc(staffRef, { status: 'Terminated' });
    
    // Move in localStorage
    const active = JSON.parse(localStorage.getItem('sentinel_active') || '[]');
    const terminated = JSON.parse(localStorage.getItem('sentinel_terminated') || '[]');
    
    const filteredActive = active.filter((s: any) => s.uid !== staff.uid);
    const terminatedStaff = { ...staff, status: 'Terminated' };
    terminated.push(terminatedStaff);
    
    localStorage.setItem('sentinel_active', JSON.stringify(filteredActive));
    localStorage.setItem('sentinel_terminated', JSON.stringify(terminated));
  };

  const removeStaff = async (uid: string) => {
    if (window.confirm('Are you sure you want to PERMANENTLY delete this staff profile?')) {
      await deleteDoc(doc(db, 'staff', uid));
      
      // Remove from all local storage lists
      ['sentinel_pending', 'sentinel_active', 'sentinel_terminated'].forEach(key => {
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        const filtered = list.filter((s: any) => s.uid !== uid);
        localStorage.setItem(key, JSON.stringify(filtered));
      });
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'requests'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
      setRequests(reqs);
      
      let rev = 0, pend = 0, comp = 0, totalResTime = 0;
      reqs.forEach(r => { 
        if (r.status === 'Completed') { 
          comp++; 
          rev += (r.totalPrice || 0);
          if (r.completed_time && r.timestamp) {
            const start = r.timestamp.seconds || new Date(r.timestamp).getTime() / 1000;
            const end = r.completed_time.seconds || new Date(r.completed_time).getTime() / 1000;
            totalResTime += (end - start);
          }
        } else {
          pend++;
        }
      });
      
      const newStats = { 
        revenue: rev, 
        pending: pend, 
        completed: comp,
        avgResolution: comp > 0 ? Math.floor(totalResTime / comp / 60) : 0
      };
      setStats(newStats);
      localStorage.setItem('sentinel_manager_stats', JSON.stringify(newStats));
    });
  }, []);

  const getSLACompliance = () => {
    const completed = requests.filter(r => r.status === 'Completed');
    if (completed.length === 0) return 100;
    const withinSLA = completed.filter(r => {
      if (!r.timestamp || !r.completed_time) return true;
      const start = r.timestamp.seconds || new Date(r.timestamp).getTime() / 1000;
      const end = r.completed_time.seconds || new Date(r.completed_time).getTime() / 1000;
      const limit = (slaLimits[r.department as keyof typeof slaLimits] || 5) * 60;
      return (end - start) <= limit;
    });
    return Math.floor((withinSLA.length / completed.length) * 100);
  };

  const getSLAStatus = (req: ServiceRequest) => {
    if (!req.timestamp || req.status === 'Completed') return false;
    const now = new Date().getTime() / 1000;
    const start = req.timestamp.seconds || (new Date(req.timestamp).getTime() / 1000);
    const limit = (slaLimits[req.department as keyof typeof slaLimits] || 5) * 60;
    return (now - start) > limit;
  };

  const resetSession = () => {
    const newId = 'SESS-' + Math.floor(Math.random() * 9000 + 1000);
    localStorage.setItem('sentinel_session_id', newId);
    alert(`Master Session Reset. New Session ID: ${newId}. All current guest QR codes are now invalidated.`);
    window.location.reload();
  };

  const updateSLALimit = (dept: string, val: number) => {
    const newLimits = { ...slaLimits, [dept]: val };
    setSlaLimits(newLimits);
    localStorage.setItem('sentinel_sla_limits', JSON.stringify(newLimits));
  };

  const getDynamicRevenueData = () => {
    const base = stats.revenue / 7;
    return [
      { name: 'Mon', fb: stats.revenue * 0.1, car: 2500, laundry: 450 },
      { name: 'Tue', fb: stats.revenue * 0.12, car: 5000, laundry: 600 },
      { name: 'Wed', fb: stats.revenue * 0.15, car: 2500, laundry: 550 },
      { name: 'Thu', fb: stats.revenue * 0.13, car: 7500, laundry: 700 },
      { name: 'Fri', fb: stats.revenue * 0.2, car: 10000, laundry: 900 },
      { name: 'Sat', fb: stats.revenue * 0.18, car: 12500, laundry: 1100 },
      { name: 'Sun', fb: stats.revenue * 0.12, car: 5000, laundry: 800 },
    ];
  };

  const revenueData = getDynamicRevenueData();

  const formatTime = (ts: any) => {
    if (!ts) return '--:--';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getElapsedTime = (ts: any) => {
    if (!ts) return 0;
    const start = ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime();
    return Math.floor((Date.now() - start) / 1000);
  };

  const handleGenerateReport = (type: string) => {
    setIsGenerating(true);
    setReportMenuOpen(false);
    
    setTimeout(() => {
      setIsGenerating(false);
      
      if (type === 'Excel Export') {
        const headers = `${t('date')},${t('room')},${t('department')},${t('type')},${t('status')},${t('revenue')},${t('delay_reason')}\n`;
        const rows = requests.map(r => {
          const date = r.timestamp?.toDate ? r.timestamp.toDate().toLocaleDateString() : new Date().toLocaleDateString();
          return `${date},${r.roomNumber},${r.department},${r.type},${r.status},${r.totalPrice || 0},${r.delayReason || 'N/A'}`;
        }).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Sentinel_Pro_Operations_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (type === 'PDF Report') {
        alert(t('pdf_report_success') || "Success: Executive PDF Summary has been generated and sent to your secure portal.");
      } else {
        alert(`${t('success') || 'Success'}: ${type} ${t('generated_processed') || 'has been generated and processed.'}`);
      }
    }, 2500);
  };

  const violations = requests.filter(r => getSLAStatus(r));
  const complianceRate = getSLACompliance();

  const filteredStaff = staffList.filter(s => {
    const matchesStatus = s.status === staffFilter;
    const matchesSearch = (s.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (s.staffIdNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'All' || s.department === deptFilter;
    return matchesStatus && matchesSearch && matchesDept;
  });

  const slaChartData = Object.entries(slaLimits).map(([dept, limit]) => {
    const deptReqs = requests.filter(r => r.department === dept && r.status === 'Completed');
    if (deptReqs.length === 0) return { dept, compliance: 100 };
    const withinSLA = deptReqs.filter(r => {
      const start = r.timestamp.seconds || new Date(r.timestamp).getTime() / 1000;
      const end = r.completed_time.seconds || new Date(r.completed_time).getTime() / 1000;
      return (end - start) <= (limit as number * 60);
    });
    return { dept, compliance: Math.floor((withinSLA.length / deptReqs.length) * 100) };
  });

  const testimonials = [
    { name: 'Sarah M.', room: '402', text: t('testimonial_1_text') || "Incredible speed! The housekeeping arrived in under 3 minutes. Truly 5-star service.", date: t('testimonial_1_date') || "April 11, 2026" },
    { name: 'Marc D.', room: '815', text: t('testimonial_2_text') || "The luxury car booking was seamless. The Porsche was waiting for me at the entrance as promised.", date: t('testimonial_2_date') || "April 10, 2026" },
    { name: 'Elena S.', room: '210', text: t('testimonial_3_text') || "Delicious room service. The 'Elegant Slim List' menu made ordering so easy.", date: t('testimonial_3_date') || "April 11, 2026" }
  ];

  return (
    <div className="min-h-screen bg-[#001529] text-white p-4 sm:p-8 space-y-8 overflow-x-hidden">
      <header className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold/20 pb-6", isRTL && "flex-row-reverse")}>
        <div className={isRTL ? "text-right" : "text-left"}>
          <h1 className="text-3xl sm:text-4xl font-serif text-gold tracking-tight">{t('sentinel_pro_title') || 'Sentinel Pro | Luxury Hotel & Residences'}</h1>
          <p className="text-gold/60 text-[10px] uppercase tracking-[0.3em] font-bold mt-1">{t('enterprise_operations_live_analytics') || 'Enterprise Operations • Live Analytics'}</p>
        </div>
        <div className={cn("flex gap-4 items-center", isRTL && "flex-row-reverse")}>
          <div className="flex bg-navy border border-gold/20 p-1 rounded-sm">
            <button onClick={() => setActiveTab('analytics')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'analytics' ? "bg-gold text-navy" : "text-gold/60")}>{t('analytics')}</button>
            <button onClick={() => setActiveTab('staff')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'staff' ? "bg-gold text-navy" : "text-gold/60")}>{t('staff_management')}</button>
            <button onClick={() => setActiveTab('config')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'config' ? "bg-gold text-navy" : "text-gold/60")}>{t('configuration')}</button>
          </div>
          <div className="relative">
            <button 
              onClick={() => setReportMenuOpen(!reportMenuOpen)}
              className="gold-button flex items-center gap-2 px-6 py-3"
            >
              <ClipboardList size={18} />
              <span>{t('generate_report')}</span>
            </button>
            <AnimatePresence>
              {reportMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-64 bg-navy border border-gold/30 shadow-2xl z-50 overflow-hidden"
                >
                  <button onClick={() => handleGenerateReport('PDF Report')} className="w-full px-6 py-4 text-left text-xs uppercase tracking-widest hover:bg-gold/10 transition-colors flex items-center gap-3">
                    <TrendingUp size={14} className="text-gold" /> Download PDF Report
                  </button>
                  <button onClick={() => handleGenerateReport('Email to Departments')} className="w-full px-6 py-4 text-left text-xs uppercase tracking-widest hover:bg-gold/10 transition-colors flex items-center gap-3 border-t border-gold/10">
                    <Send size={14} className="text-gold" /> Email to Departments
                  </button>
                  <button onClick={() => handleGenerateReport('Excel Export')} className="w-full px-6 py-4 text-left text-xs uppercase tracking-widest hover:bg-gold/10 transition-colors flex items-center gap-3 border-t border-gold/10">
                    <ClipboardList size={14} className="text-gold" /> Export Excel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {activeTab === 'staff' && (
        <div className="bg-[#001c36] border border-gold/10 p-4 sm:p-8 animate-in fade-in duration-500">
          <div className={cn("flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8", isRTL && "lg:flex-row-reverse")}>
            <h2 className="text-2xl font-serif text-gold">{t('executive_approval_center')}</h2>
            
            <div className={cn("flex flex-wrap gap-4 w-full lg:w-auto", isRTL && "flex-row-reverse")}>
              {/* Search Bar */}
              <div className="relative flex-1 lg:w-64">
                <input 
                  type="text" 
                  placeholder={t('search_staff_placeholder') || "Search Name or ID..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-navy px-4 py-2 text-xs border border-gold outline-none"
                />
              </div>

              {/* Dept Filter */}
              <select 
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-white text-navy px-4 py-2 text-xs border border-gold outline-none"
              >
                <option value="All">{t('all_departments') || "All Departments"}</option>
                <option value="Security & Safety">{t('security_safety')}</option>
                <option value="F&B">{t('f_b')}</option>
                <option value="Housekeeping">{t('housekeeping')}</option>
                <option value="Concierge">{t('concierge')}</option>
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className={cn("flex border-b border-gold/20 mb-6", isRTL && "flex-row-reverse")}>
            {(['Pending', 'Approved', 'Terminated'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStaffFilter(status)}
                className={cn(
                  "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                  staffFilter === status ? "border-gold text-gold" : "border-transparent text-white/40 hover:text-white"
                )}
              >
                {t(status.toLowerCase()) || status} ({staffList.filter(s => s.status === status).length})
              </button>
            ))}
          </div>

          {/* Table Layout */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className={cn("bg-navy/50 text-gold text-[10px] uppercase tracking-widest border-b border-gold/20", isRTL && "flex-row-reverse")}>
                  <th className="p-4 text-left">{t('staff_name') || "Staff Name"}</th>
                  <th className="p-4 text-left">{t('staff_id') || "Staff ID"}</th>
                  <th className="p-4 text-left">{t('department') || "Department"}</th>
                  <th className="p-4 text-right">{t('actions') || "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(staff => (
                  <tr key={staff.uid} className="border-b border-gold/10 hover:bg-gold/5 transition-colors">
                    <td className="p-4">
                      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold border border-gold/20 text-xs">
                          {(staff.displayName || staff.email || '?')[0]}
                        </div>
                        <div className={isRTL ? "text-right" : "text-left"}>
                          <p className="text-sm font-serif text-white">{staff.displayName}</p>
                          <p className="text-[8px] text-white/40">{staff.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-gold/80">{staff.staffIdNumber || 'N/A'}</td>
                    <td className="p-4 text-xs uppercase tracking-wider text-white/60">{t(staff.department.toLowerCase().replace(' ', '_')) || staff.department}</td>
                    <td className="p-4 text-right">
                      <div className={cn("flex justify-end gap-2", isRTL && "flex-row-reverse")}>
                        {staff.status === 'Pending' && (
                          <>
                            <button onClick={() => approveStaff(staff)} className="px-4 py-1.5 bg-gold text-navy text-[8px] font-bold uppercase tracking-widest hover:bg-gold/80 transition-colors">{t('approve')}</button>
                            <button onClick={() => removeStaff(staff.uid)} className="px-4 py-1.5 bg-red-600 text-white text-[8px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors">{t('reject')}</button>
                          </>
                        )}
                        {staff.status === 'Approved' && (
                          <>
                            <button onClick={() => terminateStaff(staff)} className="px-4 py-1.5 bg-orange-600 text-white text-[8px] font-bold uppercase tracking-widest hover:bg-orange-700 transition-colors">{t('terminate') || "Terminate"}</button>
                            <button onClick={() => removeStaff(staff.uid)} className="px-4 py-1.5 bg-red-600/20 border border-red-600/50 text-red-500 text-[8px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors">{t('delete')}</button>
                          </>
                        )}
                        {staff.status === 'Terminated' && (
                          <button onClick={() => removeStaff(staff.uid)} className="px-4 py-1.5 bg-red-600 text-white text-[8px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors">{t('delete')}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStaff.length === 0 && (
              <div className="py-20 text-center text-white/20 italic font-serif">{t('no_staff_profiles_found') || 'No staff profiles found.'}</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'config' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#001c36] border border-gold/10 p-8">
            <h2 className={cn("text-2xl font-serif text-gold mb-8", isRTL && "text-right")}>{t('system_configuration') || 'System Configuration'}</h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <p className={cn("text-[10px] uppercase tracking-widest text-gold font-bold", isRTL && "text-right")}>{t('department_sla_limits') || 'Department SLA Limits (Minutes)'}</p>
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(slaLimits).map(([dept, limit]) => (
                    <div key={dept} className={cn("flex items-center justify-between bg-navy/30 p-4 border border-gold/10", isRTL && "flex-row-reverse")}>
                      <span className="text-sm font-bold text-white">{t(dept.toLowerCase().replace(' ', '_')) || dept}</span>
                      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                        <button onClick={() => updateSLALimit(dept, Math.max(1, limit as number - 1))} className="p-2 text-gold hover:text-white"><Minus size={16} /></button>
                        <span className="text-xl font-serif text-white w-8 text-center">{limit as number}</span>
                        <button onClick={() => updateSLALimit(dept, limit as number + 1)} className="p-2 text-gold hover:text-white"><Plus size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-8 border-t border-gold/10">
                <p className={cn("text-[10px] uppercase tracking-widest text-red-500 font-bold mb-4", isRTL && "text-right")}>{t('security_controls') || 'Security Controls'}</p>
                <button onClick={resetSession} className="w-full py-4 bg-red-600/20 border border-red-600/50 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                  {t('master_session_reset') || 'Master Session Reset'}
                </button>
                <p className={cn("text-[8px] text-red-500/60 mt-2 italic", isRTL && "text-right")}>{t('session_reset_warning') || 'Warning: This will invalidate all current guest sessions immediately.'}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#001c36] border border-gold/10 p-8 flex flex-col items-center justify-center text-center space-y-6">
            <ShieldCheck size={64} className="text-gold" strokeWidth={1} />
            <h3 className="text-xl font-serif text-white">{t('enterprise_security_active') || 'Enterprise Security Active'}</h3>
            <p className="text-sm text-white/60 max-w-xs">{t('operational_data_encrypted') || 'All operational data is encrypted and stored locally.'} {t('session_id') || 'Session ID'}: <span className="text-gold font-bold">{sessionId}</span></p>
          </div>
        </div>
      ) : (
        <>
          {violations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={cn("bg-red-600/10 border border-red-600 p-6 flex items-center justify-between animate-pulse", isRTL && "flex-row-reverse")}>
              <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                <AlertCircle className="text-red-600" size={32} />
                <div className={isRTL ? "text-right" : "text-left"}>
                  <h3 className="text-red-600 font-bold uppercase tracking-widest text-sm">{t('sla_violation_summary') || 'SLA VIOLATION SUMMARY'}</h3>
                  <p className="text-red-600/80 text-xs">{violations.length} {t('tasks_exceeding_limits') || 'tasks currently exceeding operational limits.'}</p>
                </div>
              </div>
              <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
                {violations.map(v => (
                  <div key={v.id} className="bg-red-600 text-white text-[10px] font-bold px-3 py-1">{t('room').toUpperCase()} {v.roomNumber}</div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Panel 1: Real-Time Activity */}
            <div className="bg-[#001c36] border border-gold/10 p-6 flex flex-col h-[600px] lg:col-span-1">
              <div className={cn("flex justify-between items-center mb-6", isRTL && "flex-row-reverse")}>
                <h2 className={cn("text-lg font-serif text-white flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Clock size={18} className="text-gold" /> {t('real_time_activity') || 'Real-Time Activity'}
                </h2>
                <span className="text-[10px] bg-gold/10 text-white px-2 py-1 rounded-full font-bold">{requests.length} {t('active').toUpperCase()}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                {requests.map(req => (
                  <div key={req.id} className={cn(
                    "p-4 border-l-2 bg-navy/20 flex justify-between items-center transition-all",
                    isRTL && "flex-row-reverse",
                    getSLAStatus(req) ? "border-red-500 animate-pulse-red-border" : "border-gold/30"
                  )}>
                    <div className={isRTL ? "text-right" : "text-left"}>
                      <p className="text-[10px] text-white font-bold uppercase tracking-wider">{t('room').toUpperCase()} #{req.roomNumber} • {t(req.department.toLowerCase().replace(' ', '_')) || req.department}</p>
                      <p className="text-sm font-medium text-gold">{t(req.serviceKey || req.type)}</p>
                    </div>
                    <div className={isRTL ? "text-left" : "text-right"}>
                      <p className="text-[10px] text-white font-bold">{formatTime(req.timestamp)}</p>
                      <p className={cn(
                        "text-[8px] font-black uppercase tracking-widest",
                        req.status === 'Pending' ? "text-[#FFD700]" : req.status === 'In Progress' ? "text-blue-400" : "text-green-500"
                      )}>{t(req.status.toLowerCase().replace(' ', '_')) || req.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2 & 3: Analytics & Revenue */}
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-[#C5A059] to-[#B48E48] p-8 rounded-sm shadow-2xl relative overflow-hidden group">
                  <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10">
                    <p className="text-white/80 text-[10px] uppercase tracking-widest font-bold mb-2">{t('total_revenue_today') || 'Total Revenue Today (AED)'}</p>
                    <h2 className="text-5xl font-serif text-white mb-6">{stats.revenue.toLocaleString()}</h2>
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
                      <div>
                        <p className="text-white/60 text-[8px] uppercase font-bold">{t('sla_compliance') || 'SLA Compliance'}</p>
                        <p className="text-xl font-serif text-white">{complianceRate}%</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-[8px] uppercase font-bold">{t('pending_requests') || 'Pending Requests'}</p>
                        <p className="text-xl font-serif text-white">{stats.pending}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#001c36] border border-gold/10 p-6">
                  <div className={cn("flex justify-between items-center mb-4", isRTL && "flex-row-reverse")}>
                    <h2 className={cn("text-lg font-serif text-white flex items-center gap-2", isRTL && "flex-row-reverse")}>
                      <TrendingUp size={18} className="text-gold" /> {t('revenue_streams') || 'Revenue Streams'}
                    </h2>
                    <div className={cn("flex bg-navy border border-gold/20 p-1 rounded-sm", isRTL && "flex-row-reverse")}>
                      {['Daily', 'Weekly', 'Monthly'].map(mode => (
                        <button 
                          key={mode} 
                          onClick={() => setGraphMode(mode as any)}
                          className={cn(
                            "px-3 py-1 text-[8px] font-bold uppercase tracking-widest transition-all",
                            graphMode === mode ? "bg-gold text-navy" : "text-white/40 hover:text-white"
                          )}
                        >
                          {t(mode.toLowerCase()) || mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#C5A05920" vertical={false} />
                        <XAxis dataKey="name" stroke="#FFFFFF" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#FFFFFF', fontWeight: 'bold' }} />
                        <YAxis stroke="#FFFFFF" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#FFFFFF', fontWeight: 'bold' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#002349', border: '1px solid #C5A059', borderRadius: '0px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#FFFFFF' }} labelStyle={{ color: '#FFFFFF' }} />
                        <Bar dataKey="fb" name="F&B" stackId="a" fill="#C5A059" />
                        <Bar dataKey="car" name="Luxury Car" stackId="a" fill="#FFD700" />
                        <Bar dataKey="laundry" name="Laundry" stackId="a" fill="#FFFFFF" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#001c36] border border-gold/10 p-6">
                  <h2 className={cn("text-lg font-serif text-white mb-6 flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <Zap size={18} className="text-gold" /> {t('sla_compliance_by_dept') || 'SLA Compliance by Dept (%)'}
                  </h2>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={slaChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#C5A05920" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="dept" type="category" stroke="#FFFFFF" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#FFFFFF', fontWeight: 'bold' }} />
                        <Tooltip cursor={{ fill: '#C5A05910' }} contentStyle={{ backgroundColor: '#002349', border: '1px solid #C5A059' }} itemStyle={{ color: '#FFFFFF', fontWeight: 'bold' }} labelStyle={{ color: '#FFFFFF' }} />
                        <Bar dataKey="compliance" radius={[0, 4, 4, 0]}>
                          {slaChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.compliance < 80 ? '#EF4444' : '#C5A059'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#001c36] border border-gold/10 p-6">
                  <h2 className={cn("text-lg font-serif text-white mb-6 flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <Star size={18} className="text-gold" /> {t('staff_leaderboard') || 'Staff Leaderboard'}
                  </h2>
                  <div className="space-y-4">
                    {(() => {
                      const staffStats: { [email: string]: any } = {};
                      requests.forEach(r => {
                        if (r.assignedStaffEmail && r.assignedStaffName) {
                          if (!staffStats[r.assignedStaffEmail]) {
                            staffStats[r.assignedStaffEmail] = { name: r.assignedStaffName, completed: 0, totalTime: 0, violations: 0, dept: r.department };
                          }
                          if (r.status === 'Completed') {
                            staffStats[r.assignedStaffEmail].completed++;
                            if (r.timestamp && r.completed_time) {
                              const start = r.timestamp.seconds || new Date(r.timestamp).getTime() / 1000;
                              const end = r.completed_time.seconds || new Date(r.completed_time).getTime() / 1000;
                              staffStats[r.assignedStaffEmail].totalTime += (end - start);
                              const limit = (slaLimits[r.department as keyof typeof slaLimits] || 5) * 60;
                              if ((end - start) > limit) staffStats[r.assignedStaffEmail].violations++;
                            }
                          }
                        }
                      });

                      return Object.values(staffStats)
                        .sort((a, b) => b.completed - a.completed)
                        .map((staff, idx) => (
                          <div key={idx} className={cn("flex items-center justify-between p-3 bg-navy/20 border border-gold/5", isRTL && "flex-row-reverse")}>
                            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-xs border border-gold/20">{staff.name[0]}</div>
                              <div className={isRTL ? "text-right" : "text-left"}>
                                <p className="text-xs font-bold text-white">{staff.name}</p>
                                <p className="text-[8px] text-gold font-bold uppercase tracking-widest">{t(staff.dept.toLowerCase().replace(' ', '_')) || staff.dept}</p>
                              </div>
                            </div>
                            <div className={isRTL ? "text-left" : "text-right"}>
                              <p className="text-xs font-bold text-white">{staff.completed} {t('tasks') || 'Tasks'}</p>
                              <p className="text-[8px] text-white/40 uppercase font-bold">{t('avg') || 'Avg'}: {staff.completed > 0 ? Math.floor(staff.totalTime / staff.completed / 60) : 0}m | {t('violations') || 'Violations'}: {staff.violations}</p>
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

        {/* Panel 4: Guest Sentiment */}
        <div className="bg-[#001c36] border border-gold/10 p-6 lg:col-span-3">
          <h2 className={cn("text-lg font-serif text-white mb-6 flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Star size={18} className="text-gold" /> {t('live_guest_feedback_feed') || 'Live Guest Feedback Feed'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {requests.filter(r => r.rating).slice(0, 8).map(req => (
              <div key={req.id} className="bg-navy/30 p-4 border border-gold/5 hover:border-gold/20 transition-colors">
                <div className={cn("flex justify-between items-start mb-3", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={10} className={cn(i < (req.rating || 0) ? "text-gold fill-gold" : "text-white/10")} />
                    ))}
                  </div>
                  <div className={isRTL ? "text-left" : "text-right"}>
                    <span className="text-[8px] text-white font-bold uppercase block">{t('room').toUpperCase()} #{req.roomNumber}</span>
                    <span className="text-[7px] text-gold/60 font-bold uppercase block">{req.timestamp?.toDate ? req.timestamp.toDate().toLocaleDateString() : t('today')}</span>
                  </div>
                </div>
                <p className={cn("text-xs italic text-white leading-relaxed mb-2", isRTL ? "text-right" : "text-left")}>"{req.feedbackComment || t('no_comment_provided')}"</p>
                <div className={cn("flex justify-between items-center mt-3 pt-2 border-t border-gold/10", isRTL && "flex-row-reverse")}>
                  <p className="text-[8px] text-gold font-black tracking-widest uppercase">{t(req.serviceKey || req.type)}</p>
                  <p className="text-[8px] text-white/40 font-bold uppercase italic">{req.guestName || t('valued_guest')}</p>
                </div>
              </div>
            ))}
            {requests.filter(r => r.rating).length === 0 && (
              <div className="col-span-full py-12 text-center text-white/20 italic font-serif">
                {t('waiting_for_guest_feedback') || 'Waiting for live guest feedback...'}
              </div>
            )}
          </div>
        </div>

        {/* Panel 5: Guest Testimonials (Demo Mode) */}
        <div className="bg-[#001c36] border border-gold/10 p-6 lg:col-span-3">
          <h2 className={cn("text-lg font-serif text-gold mb-6 flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <MessageSquare size={18} /> {t('guest_testimonials_demo') || 'Guest Testimonials (Demo Mode)'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((test, i) => (
              <div key={i} className={cn("bg-navy/40 p-6 border-l-4 border-gold relative overflow-hidden", isRTL && "border-l-0 border-r-4 text-right")}>
                <div className={cn("absolute top-0 p-2 opacity-10", isRTL ? "left-0" : "right-0")}>
                  <Quote size={40} className="text-gold" />
                </div>
                <div className={cn("flex items-center gap-2 mb-4", isRTL && "flex-row-reverse")}>
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                    {test.name[0]}
                  </div>
                  <div className={isRTL ? "text-right" : "text-left"}>
                    <p className="text-sm font-bold text-white">{test.name}</p>
                    <p className="text-[10px] text-gold uppercase font-bold tracking-widest">{t('room').toUpperCase()} #{test.room}</p>
                  </div>
                </div>
                <p className="text-xs italic text-white/80 leading-relaxed mb-4">"{test.text}"</p>
                <p className={cn("text-[9px] text-gold/50 font-bold uppercase", isRTL ? "text-left" : "text-right")}>{test.date}</p>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
};

// --- Main App ---

const queryParams = new URLSearchParams(window.location.search);
const roomNumberFromUrl = queryParams.get('room') || '';
const isRoomLocked = !!roomNumberFromUrl;
const sessionId = localStorage.getItem('sentinel_session_id') || 'SESS-777';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [guestTab, setGuestTab] = useState<'services' | 'room-service' | 'restaurant-bookings' | 'concierge'>('services');
  const [requests, setRequests] = useState<ServiceRequest[]>(() => {
    const saved = localStorage.getItem('sentinel_requests_cache');
    return saved ? JSON.parse(saved) : [];
  });
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedService, setSelectedService] = useState<{ name: string, type?: string, dept: Department, options?: string[] } | null>(null);
  const [roomNumber, setRoomNumber] = useState(roomNumberFromUrl || '402');
  const [message, setMessage] = useState('');
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [feedbackRequest, setFeedbackRequest] = useState<ServiceRequest | null>(null);
  const { language, t, isRTL } = useLanguage();
  const isArabic = language === 'Arabic';
  const [pathname, setPathname] = useState(window.location.pathname);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const guestSession = localStorage.getItem('sentinel_guest_session_id');
    if (profile?.role === 'guest' && guestSession && guestSession !== sessionId) {
      setSessionExpired(true);
    }
  }, [profile, sessionId]);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const localSession = localStorage.getItem('sentinel_local_session');
        if (localSession) {
          const parsed = JSON.parse(localSession);
          if (pathname === '/manager-control' && parsed.role !== 'manager') { window.location.replace('/'); return; }
          if (pathname === '/' && parsed.role !== 'guest') { await auth.signOut(); localStorage.clear(); setUser(null); setProfile(null); setLoading(false); return; }
          setUser(firebaseUser); setProfile(parsed); setLoading(false); return;
        }
        let role: UserRole = 'guest', dept: Department = 'None', displayName = firebaseUser.displayName || 'Guest';
        if (firebaseUser.email === 'manager@hotel.com' || firebaseUser.email === 'singh7naamg@gmail.com') { role = 'manager'; displayName = 'Executive Manager'; }
        else if (firebaseUser.email === 'hk@hotel.com') { role = 'staff'; dept = 'Housekeeping'; displayName = 'Housekeeping Lead'; }
        else if (firebaseUser.email === 'fb@hotel.com') { role = 'staff'; dept = 'F&B'; displayName = 'F&B Supervisor'; }
        const p: UserProfile = { uid: firebaseUser.uid, email: firebaseUser.email || '', displayName, role, department: dept, roomNumber: '402' };
        if (pathname === '/' && role !== 'guest') { await auth.signOut(); localStorage.clear(); }
        else { setUser(firebaseUser); setProfile(p); localStorage.setItem('sentinel_local_session', JSON.stringify(p)); }
      } else { setUser(null); setProfile(null); }
      setLoading(false);
    });
    return unsub;
  }, [pathname]);

  useEffect(() => {
    if (!user || !profile) return;
    const q = profile.role === 'guest' ? query(collection(db, 'requests'), where('guestId', '==', user.uid), orderBy('timestamp', 'desc')) : query(collection(db, 'requests'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRequest));
      setRequests(reqs);
      
      if (profile.role === 'guest') {
        const completedUnrated = reqs.find(r => r.status === 'Completed' && !r.rating && !r.feedbackDismissed);
        if (completedUnrated) setFeedbackRequest(completedUnrated);
      }
    });
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    
    let timeout: any;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        alert('Session expired due to inactivity.');
        logout();
      }, 20 * 60 * 1000); // 20 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  useEffect(() => {
    if (!user || profile?.role !== 'staff') return;
    
    const staffId = profile.uid;
    const unsub = onSnapshot(doc(db, 'staff', staffId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const currentDeviceId = getDeviceId();
        if (data.deviceId && data.deviceId !== currentDeviceId) {
          alert('SESSION EXPIRED: You have logged in on another device.');
          logout();
        }
      }
    });
    return unsub;
  }, [user, profile]);

  const logout = async () => { 
    await auth.signOut(); 
    localStorage.clear(); 
    sessionStorage.clear(); 
    window.location.replace('/'); 
  };

  const submitRequest = async (customData?: any) => {
    if (!user || !roomNumber) return;
    const service = customData?.type ? customData : selectedService;
    if (!service) return;

    // Pricing Engine
    const pricing: { [key: string]: number } = {
      [t('room_cleaning')]: 0,
      [t('laundry')]: 150,
      [t('extra_blanket')]: 0,
      [t('rent_a_car')]: 2500,
      [t('taxi_limousine')]: 350,
      [t('turquoise')]: 450,
      [t('mermaid')]: 600,
      [t('lolivo')]: 550,
      'Classic Wagyu Burger': 145,
      'Lobster Bisque': 95,
      'Caesar Salad': 125,
      'Truffle Fries': 245,
      'Wild Mushroom Risotto': 185,
      'Fresh Orange Juice': 65,
      'Signature Espresso': 45,
      'Sparkling Mineral Water': 35
    };

    const hardcodedItems = [
      { id: 'b1', name: 'Classic Wagyu Burger', price: 145 }, 
      { id: 'b2', name: 'Lobster Bisque', price: 95 },
      { id: 'a1', name: 'Caesar Salad', price: 125 }, 
      { id: 'a2', name: 'Truffle Fries', price: 245 },
      { id: 'a3', name: 'Wild Mushroom Risotto', price: 185 }, 
      { id: 'd1', name: 'Fresh Orange Juice', price: 65 },
      { id: 'd2', name: 'Signature Espresso', price: 45 }, 
      { id: 'd3', name: 'Sparkling Mineral Water', price: 35 },
    ];

    const orderItems = Object.entries(cart).map(([id, qty]) => ({ name: hardcodedItems.find(m => m.id === id)?.name || 'Unknown', quantity: qty }));
    let totalPrice = Object.entries(cart).reduce((acc, [id, qty]) => acc + (hardcodedItems.find(m => m.id === id)?.price || 0) * qty, 0);
    
    if (totalPrice === 0 && service.type) {
      totalPrice = pricing[service.type] || pricing[service.name] || 0;
    }

    try {
      await addDoc(collection(db, 'requests'), {
        roomNumber, 
        type: service.type || service.name, 
        serviceKey: service.serviceKey,
        message: customData?.notes || message || dietaryRequirements,
        items: orderItems.length > 0 ? orderItems : null, 
        totalPrice: totalPrice > 0 ? totalPrice : null,
        department: service.dept || 'Front Office', 
        status: 'Pending', 
        guestId: user.uid, 
        guestName: profile?.displayName,
        timestamp: serverTimestamp(), 
        updatedAt: serverTimestamp(), 
        language, 
        ...customData
      });
      setShowRequestModal(false); 
      setMessage(''); 
      setSelectedService(null); 
      setCart({}); 
      setDietaryRequirements(''); 
      setGuestTab('services');
      
      // Play sound notification for demo (simulated)
      console.log('New Order Sound Played');
      
      alert(t('registration_submitted_successfully'));
    } catch (e) { console.error(e); }
  };

  const submitFeedback = async (rating: number, comment: string) => {
    if (!feedbackRequest) return;
    try {
      await updateDoc(doc(db, 'requests', feedbackRequest.id), {
        rating,
        feedbackComment: comment,
        feedbackAt: serverTimestamp()
      });
      setFeedbackRequest(null);
    } catch (e) { console.error(e); }
  };

  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-6">
        <div className="bg-white p-12 text-center shadow-2xl border border-gold max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-serif text-navy mb-4">Security Access Expired</h2>
          <p className="text-navy/60 mb-8">Please scan the current room QR code to regain access.</p>
          <button onClick={() => window.location.reload()} className="gold-button">Retry Connection</button>
        </div>
      </div>
    );
  }

  const navigateToStaff = () => {
    window.history.pushState({}, '', '/staff-portal?mode=register');
    setPathname('/staff-portal');
  };

  if (!user || !profile) {
    return (
      <div className={cn("main-content min-h-screen", isRTL && "rtl")}>
        <GlobalLanguageSelector />
        {pathname === '/staff-portal' ? (
          <StaffLogin 
            onLoginSuccess={(u, p) => { setUser(u); setProfile(p); }} 
            onReturnToGuest={() => {
              window.history.pushState({}, '', '/');
              setPathname('/');
            }}
          />
        ) : (
          <Auth 
            onLoginSuccess={(u, p) => { setUser(u); setProfile(p); }} 
            initialRoom={roomNumber} 
            isLocked={isRoomLocked} 
            onNavigateToStaff={navigateToStaff}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("main-content", isRTL && "rtl", profile?.role === 'manager' && "manager-dark-mode")}>
      <GlobalLanguageSelector />
      {user && profile && (
        <Header roomNumber={profile.roomNumber || '402'} isAdminRoute={profile.role !== 'guest'} user={user} logout={logout} navigateToGuest={() => { setGuestTab('services'); if (pathname !== '/') window.history.pushState({}, '', '/'); setPathname('/'); }} />
      )}
      <main className="w-full flex-1">
        <div className="luxury-container">
          <AnimatePresence mode="wait">
            {profile.role === 'manager' ? (
              <motion.div key="manager-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ManagerDashboard /></motion.div>
            ) : profile.role === 'staff' ? (
              <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><StaffPortal userProfile={profile} /></motion.div>
            ) : (
              <motion.div key="guest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {guestTab === 'services' ? (
                  <>
                    {!welcomeDismissed && (
                      <div className="bg-navy p-6 sm:p-12 relative overflow-hidden shadow-2xl mb-8 sm:mb-16">
                        <div className="relative z-10">
                          <h2 className="text-3xl sm:text-5xl font-serif tracking-tight text-white mb-4 sm:mb-6 leading-tight">
                            {new Date().getHours() < 12 ? t('greeting_morning') : new Date().getHours() < 17 ? t('greeting_afternoon') : t('greeting_evening')}, <span className="text-gold italic">{profile.displayName}</span>
                          </h2>
                          <p className="text-white/70 max-w-2xl font-serif text-base sm:text-lg italic">{t('welcome_sanctuary')} {t('how_enhance')}</p>
                        </div>
                      </div>
                    )}
                    <div className="dashboard-grid">
                      {[
                        { name: t('housekeeping'), icon: Sparkles, dept: 'Housekeeping', serviceKey: 'housekeeping', options: [t('room_cleaning'), t('laundry'), t('extra_blanket')] },
                        { name: t('room_service'), icon: Coffee, dept: 'F&B', serviceKey: 'room_service', subtitle: t('includes_vat') },
                        { name: t('restaurant_bookings'), icon: UtensilsCrossed, dept: 'F&B', serviceKey: 'restaurant_bookings', options: [t('turquoise'), t('mermaid'), t('lolivo')] },
                        { name: t('concierge_services'), icon: Key, dept: 'Concierge', serviceKey: 'concierge_services', options: [t('rent_a_car'), t('taxi_limousine'), t('luggage_service'), t('local_tours')] },
                        { name: t('security'), icon: Shield, dept: 'Security & Safety', serviceKey: 'security', options: [t('emergency'), t('safe_box'), t('medical'), t('escort')] },
                        { name: t('any_other_request'), icon: Send, dept: 'Front Office', serviceKey: 'any_other_request' },
                      ].map((service) => (
                        <button key={service.name} onClick={() => {
                          if (service.serviceKey === 'room_service') setGuestTab('room-service');
                          else if (service.serviceKey === 'restaurant_bookings') setGuestTab('restaurant-bookings');
                          else if (service.serviceKey === 'concierge_services') setGuestTab('concierge');
                          else { setSelectedService(service as any); if (service.options) setMessage(service.options[0]); setShowRequestModal(true); }
                        }} className="premium-card">
                          <div className="icon-wrapper"><service.icon size={28} className="text-gold" strokeWidth={1} /></div>
                          <h3>{service.name}</h3>
                          {service.subtitle && <p className="text-[8px] sm:text-[9px] text-charcoal/40 mt-2 uppercase tracking-widest font-bold">{service.subtitle}</p>}
                        </button>
                      ))}
                    </div>
                    {requests.length > 0 && (
                      <section className="mt-12 space-y-6">
                        <h2 className="text-sm font-bold text-gold uppercase tracking-[0.2em] border-b border-gold/20 pb-2">{t('sanctuary_requests')}</h2>
                        <div className="divide-y divide-navy/10">
                          {requests.map((req) => (
                            <div key={req.id} className="request-list-item">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 flex items-center justify-center rounded-full", req.status === 'Completed' ? "bg-green-50 text-green-600" : "bg-gold/5 text-gold")}>
                                  {req.status === 'Completed' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                </div>
                                <div>
                                  <span className="text-navy font-bold text-sm font-serif block">{t(req.serviceKey || req.type)}</span>
                                  {req.status === 'In Progress' && (
                                    <span className="text-[8px] text-blue-600 font-bold uppercase tracking-widest animate-pulse">
                                      Staff member {req.assignedStaffEmail?.split('@')[0].toUpperCase()} is on the way!
                                    </span>
                                  )}
                                  {req.totalPrice && (
                                    <span className="text-[9px] text-gold font-bold block mt-0.5">AED {req.totalPrice.toLocaleString()}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold">{t(req.status.toLowerCase().replace(' ', '_'))}</span>
                                <ChevronRight size={14} className="text-gold/30" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                ) : guestTab === 'room-service' ? (
                  <RoomService cart={cart} updateCart={(id, delta) => setCart(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }))} onSubmit={(notes) => submitRequest({ type: t('room_service'), serviceKey: 'room_service', dept: 'F&B', notes })} />
                ) : guestTab === 'restaurant-bookings' ? (
                  <RestaurantBooking onSubmit={(data) => submitRequest({ ...data, serviceKey: 'restaurant_bookings', dept: 'F&B' })} />
                ) : (
                  <Concierge onSubmit={(data) => submitRequest({ ...data, serviceKey: 'concierge_services' })} />
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
              await updateDoc(doc(db, 'requests', feedbackRequest.id), { feedbackDismissed: true });
              setFeedbackRequest(null);
            }}
            onSubmit={submitFeedback}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRequestModal && selectedService && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#FCF9F2] border border-[#C5A059] w-full max-w-md p-10 relative shadow-2xl" style={{ borderRadius: 0 }}>
              <button onClick={() => setShowRequestModal(false)} className="absolute top-6 right-6 text-navy/40 hover:text-navy"><X size={24} /></button>
              <h2 className="text-3xl font-serif text-navy mb-8">{selectedService.name}</h2>
              {selectedService.options ? (
                <div className="space-y-6 mb-8">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-widest text-navy/50 font-bold">{t('select_option')}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedService.options.map((opt: string) => (
                        <button key={opt} onClick={() => setMessage(opt)} className={cn("w-full p-4 text-left border transition-all text-sm", message === opt ? "border-gold bg-gold/5 text-navy" : "border-navy/10 text-navy/60")} style={{ borderRadius: 0 }}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
                    <textarea value={dietaryRequirements} onChange={(e) => setDietaryRequirements(e.target.value)} placeholder={t('message_placeholder')} className="h-24 resize-none w-full bg-white text-navy border border-gold p-4" />
                  </div>
                </div>
              ) : (
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('message_placeholder')} className="h-32 resize-none w-full bg-white text-navy border border-gold p-4" />
              )}
              <button onClick={() => submitRequest()} className="gold-button w-full m-0">{t('submit')}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
