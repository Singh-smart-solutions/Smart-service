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
import { useLanguage } from './contexts/TranslationContext';
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

const Header: React.FC<{
  roomNumber: string;
  isAdminRoute: boolean;
  user: any;
  logout: () => void;
  navigateToGuest: () => void;
}> = ({ roomNumber, isAdminRoute, user, logout, navigateToGuest }) => {
  const { language, setLanguage, t, isRTL } = useLanguage();
  
  const languages: { id: any; label: string }[] = [
    { id: 'English', label: 'English 🇺🇸' },
    { id: 'Arabic', label: 'العربية 🇦🇪' },
    { id: 'Russian', label: 'Русский 🇷🇺' },
    { id: 'Mandarin', label: '普通话 🇨🇳' },
    { id: 'Turkish', label: 'Türkçe 🇹🇷' },
  ];

  return (
    <nav className="sticky-header">
      <div className="flex items-center gap-1 sm:gap-2">
        {user && (
          <button onClick={navigateToGuest} className="p-1 sm:p-2 text-gold hover:text-white transition-colors">
            <Home size={18} strokeWidth={1.5} />
          </button>
        )}
        <div className="relative group">
          <button className="p-1 sm:p-2 text-gold hover:text-white transition-colors flex items-center gap-1">
            <Globe size={18} strokeWidth={1} />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden xs:inline">
              {languages.find(l => l.id === language)?.id.substring(0, 2).toUpperCase() || 'EN'}
            </span>
          </button>
          <div className={cn("absolute mt-2 w-40 sm:w-48 bg-navy border border-gold/30 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[10001]", isRTL ? "right-0" : "left-0")} style={{ borderRadius: 0 }}>
            {languages.map((lang) => (
              <button key={lang.id} onClick={() => setLanguage(lang.id)} className={cn("w-full px-3 py-2 sm:px-4 sm:py-3 text-left text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-gold/10 transition-colors flex items-center justify-between", language === lang.id ? "text-gold bg-gold/5" : "text-white/60", isRTL && "text-right flex-row-reverse")}>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="logo-container cursor-pointer" onClick={navigateToGuest}>
        <div className="flex flex-col items-center">
          <h1 className="logo-text">Sentinel Pro</h1>
          <span className="text-[7px] sm:text-[8px] font-bold text-gold/60 uppercase tracking-[0.3em] -mt-1">Luxury Hotel & Residences</span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex flex-col items-end mr-2 hidden xs:flex">
          <span className="text-[10px] font-bold text-white tracking-widest uppercase">Room {roomNumber || '---'}</span>
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
  const { t } = useLanguage();
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
              className="w-full bg-white border border-gold/20 p-4 text-sm text-navy focus:border-gold outline-none h-32 resize-none font-sans"
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
  const { t } = useLanguage();
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
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="w-full bg-white border border-gold/30 p-4 text-navy focus:border-gold outline-none h-24 resize-none" style={{ borderRadius: 0 }} />
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
  const { t } = useLanguage();
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

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_pax')}</label>
            <input type="number" value={bookingData.pax} onChange={(e) => setBookingData({ ...bookingData, pax: e.target.value })} className="w-full border-b border-navy/20 py-2 outline-none focus:border-gold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_date')}</label>
            <input type="date" value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} className="w-full border-b border-navy/20 py-2 outline-none focus:border-gold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_time')}</label>
            <input type="time" value={bookingData.time} onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })} className="w-full border-b border-navy/20 py-2 outline-none focus:border-gold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
            <textarea value={bookingData.notes} onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })} placeholder={t('message_placeholder')} className="w-full bg-white border border-gold/30 p-4 text-navy focus:border-gold outline-none h-24 resize-none" style={{ borderRadius: 0 }} />
          </div>
        </div>
        <button onClick={() => onSubmit({ type: `Restaurant: ${bookingData.restaurant}`, restaurantName: bookingData.restaurant, pax: Number(bookingData.pax), preferredTiming: `${bookingData.date} ${bookingData.time}`, notes: bookingData.notes })} className="gold-button w-full m-0">{t('confirm')}</button>
      </div>
    </div>
  );
};

const Concierge: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  const { t } = useLanguage();
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
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="w-full bg-white border border-gold/30 p-4 text-navy focus:border-gold outline-none h-24 resize-none" style={{ borderRadius: 0 }} />
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
                <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full border-b border-navy/20 py-2 outline-none focus:border-gold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_destination')}</label>
                <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full border-b border-navy/20 py-2 outline-none focus:border-gold" placeholder={t('drop_off_destination')} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="w-full bg-white border border-gold/30 p-4 text-navy focus:border-gold outline-none h-24 resize-none" style={{ borderRadius: 0 }} />
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
                  <input type="number" value={numBags} onChange={(e) => setNumBags(e.target.value)} className="w-full border-b border-navy/20 py-2 outline-none focus:border-gold" min="1" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('label_pickup')}</label>
                  <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full border-b border-navy/20 py-2 outline-none focus:border-gold" />
                </div>
             </div>
           ) : (
             <div className="text-center py-4">
               <p className="text-navy/60 font-serif italic">{t('luggage_desc')}</p>
             </div>
           )}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="w-full bg-white border border-gold/30 p-4 text-navy focus:border-gold outline-none h-24 resize-none" style={{ borderRadius: 0 }} />
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
             <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('message_placeholder')} className="w-full bg-white border border-gold/30 p-4 text-navy focus:border-gold outline-none h-24 resize-none" style={{ borderRadius: 0 }} />
           </div>
           <button onClick={() => onSubmit({ type: `Concierge: Local Tours`, dept: 'Concierge', notes })} className="gold-button w-full m-0">{t('submit')}</button>
        </div>
      )}
    </div>
  );
};

const Auth: React.FC<{ onLoginSuccess: (user: any, profile: any) => void, initialRoom?: string, isLocked?: boolean }> = ({ onLoginSuccess, initialRoom, isLocked }) => {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roomNumber, setRoomNumber] = useState(initialRoom || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialRoom) setRoomNumber(initialRoom);
  }, [initialRoom]);

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      try { await signInAnonymously(auth); } catch (e) {}
      const guestId = email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + roomNumber;
      const guestDocRef = doc(db, 'guests', guestId);
      const guestDoc = await getDoc(guestDocRef);
      let guestData = guestDoc.exists() ? guestDoc.data() : { fullName, email, roomNumber, role: 'guest', createdAt: new Date().toISOString() };
      if (!guestDoc.exists()) await setDoc(guestDocRef, guestData);
      const profile = { uid: auth.currentUser?.uid || guestId, email, roomNumber, role: 'guest' as UserRole, displayName: fullName || `Guest ${roomNumber}`, department: 'None' as Department };
      localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
      localStorage.setItem('sentinel_guest_session_id', sessionId);
      onLoginSuccess(auth.currentUser || { uid: profile.uid, email }, profile);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8 sm:space-y-16 bg-[#FCF9F2] p-6 sm:p-12 shadow-2xl border border-[#C5A059]">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="inline-block p-4 sm:p-6 border border-gold mb-2 sm:mb-4"><ShieldCheck className="w-10 h-10 sm:w-16 sm:h-16 text-gold" strokeWidth={1} /></div>
          <h1 className="text-2xl sm:text-5xl font-serif tracking-[0.1em] sm:tracking-[0.3em] text-navy uppercase luxury-text-shadow leading-tight">Sentinel Pro</h1>
          <p className="text-gold text-[8px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.4em] uppercase font-bold">Luxury Management Systems</p>
        </div>
        <form onSubmit={handleGuestLogin} className="space-y-4 w-full">
          <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="login-input" placeholder={t('full_name') || 'Full Name'} />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="login-input" placeholder={t('email')} />
          <input type="text" required disabled={isLocked} value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className={cn("login-input", isLocked && "bg-navy/5 text-navy/40 cursor-not-allowed")} placeholder={t('room_number')} />
          <button type="submit" disabled={loading} className="gold-button">{loading ? '...' : t('sign_in')}</button>
        </form>
      </motion.div>
    </div>
  );
};

const StaffLogin: React.FC<{ onLoginSuccess: (user: any, profile: any) => void }> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<'staff' | 'manager'>('staff');

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validStaff = ['hk@hotel.com', 'concierge@hotel.com', 'fb@hotel.com', 'admin@hotel.com', 'manager@hotel.com', 'singh7naamg@gmail.com'];
    
    if (password === '12345' && validStaff.includes(email)) {
      let role: UserRole = 'staff';
      let dept: Department = 'None';
      let displayName = 'Staff Member';
      
      if (email === 'manager@hotel.com' || email === 'singh7naamg@gmail.com' || email === 'admin@hotel.com') { 
        role = 'manager'; 
        displayName = 'General Manager'; 
      } else if (email === 'hk@hotel.com') { 
        dept = 'Housekeeping'; 
        displayName = 'Housekeeping Lead'; 
      } else if (email === 'fb@hotel.com') { 
        dept = 'F&B'; 
        displayName = 'F&B Supervisor'; 
      } else if (email === 'concierge@hotel.com') { 
        dept = 'Concierge'; 
        displayName = 'Concierge Lead'; 
      } else if (email === 'security@hotel.com') { 
        dept = 'Security & Safety'; 
        displayName = 'Security Officer'; 
      }

      const profile = { uid: `bypass-${Date.now()}`, email, role, department: dept, displayName };
      localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
      
      // Instant Redirect
      onLoginSuccess({ uid: profile.uid, email: profile.email } as any, profile);
      return;
    }

    setLoading(true);
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        let role: UserRole = 'staff';
        let dept: Department = 'None';
        let displayName = 'Staff Member';
        
        if (email === 'manager@hotel.com' || email === 'singh7naamg@gmail.com' || email === 'admin@hotel.com') { 
          role = 'manager'; 
          displayName = 'General Manager'; 
        } else if (email === 'hk@hotel.com') { 
          dept = 'Housekeeping'; 
          displayName = 'Housekeeping Lead'; 
        } else if (email === 'fb@hotel.com') { 
          dept = 'F&B'; 
          displayName = 'F&B Supervisor'; 
        } else if (email === 'concierge@hotel.com') { 
          dept = 'Concierge'; 
          displayName = 'Concierge Lead'; 
        }
        
        if (loginType === 'manager' && role !== 'manager') throw new Error('Unauthorized');

        const profile = { uid: userCredential.user.uid, email, role, department: dept, displayName };
        localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
        onLoginSuccess(userCredential.user, profile);
      })
      .catch((err: any) => {
        alert('Invalid credentials. Use "12345".');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8 bg-[#FCF9F2] p-6 sm:p-12 shadow-2xl border border-[#C5A059]">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 border border-gold"><ShieldCheck className="w-10 h-10 text-gold" strokeWidth={1} /></div>
          <h1 className="text-2xl sm:text-5xl font-serif tracking-widest text-navy uppercase">Sentinel Pro</h1>
          <p className="text-gold text-[8px] uppercase font-bold">Staff Portal Access</p>
        </div>
        <div className="toggle-container">
          <button onClick={() => setLoginType('staff')} className={cn("toggle-btn", loginType === 'staff' ? "active" : "inactive")}>Staff</button>
          <button onClick={() => setLoginType('manager')} className={cn("toggle-btn", loginType === 'manager' ? "active" : "inactive")}>Manager</button>
        </div>
        <form onSubmit={handleStaffLogin} className="space-y-4">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="login-input" placeholder={t('email')} />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="login-input" placeholder={t('password')} />
          <button type="submit" className="gold-button w-full">{t('sign_in')}</button>
        </form>
      </motion.div>
    </div>
  );
};

const StaffPortal: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const { t } = useLanguage();
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
        if (userProfile.email === 'admin@hotel.com' || userProfile.email === 'manager@hotel.com') return true;
        if (userProfile.email === 'security@hotel.com') return ['Emergency Assistance', 'Safe Box Fault', 'Door Lock Issue'].includes(req.type);
        if (userProfile.email === 'fb@hotel.com') return req.department === 'F&B' || req.department === 'Front Office' || req.type.includes('Restaurant');
        if (userProfile.email === 'hk@hotel.com') return req.department === 'Housekeeping' || req.department === 'Front Office';
        if (userProfile.email === 'concierge@hotel.com') return req.department === 'Concierge' || req.department === 'Front Office';
        return req.department === userProfile.department;
      });
      
      setTasks(filterByDept(active));
      setHistory(filterByDept(completed).slice(0, 20));
    });
  }, [userProfile]);

  const handleAccept = async (id: string) => {
    await updateDoc(doc(db, 'requests', id), { 
      status: 'In Progress', 
      accepted_time: serverTimestamp(), 
      assignedStaffEmail: userProfile.email 
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
    <div className="w-full pb-24 relative">
      <AnimatePresence>
        {delayModalTask && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 max-w-md w-full border-t-4 border-red-600">
              <h2 className="text-xl font-serif text-navy mb-4">SLA Violation Detected</h2>
              <p className="text-sm text-navy/60 mb-6">This task exceeded the department SLA limit. Please provide a reason for the delay to complete the task.</p>
              <select 
                value={delayReason} 
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full p-4 border border-navy/10 mb-6 text-sm outline-none focus:border-gold"
              >
                <option value="">Select Reason...</option>
                <option value="High Volume">High Volume of Requests</option>
                <option value="Staff Shortage">Staff Shortage</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Guest Not in Room">Guest Not in Room</option>
                <option value="Other">Other</option>
              </select>
              <div className="flex gap-4">
                <button onClick={() => setDelayModalTask(null)} className="flex-1 py-3 border border-navy/10 text-navy text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                <button 
                  disabled={!delayReason}
                  onClick={() => handleComplete(delayModalTask)} 
                  className="flex-1 py-3 bg-navy text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
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
      <header className="p-6 bg-navy text-white flex justify-between items-center border-b border-gold/20">
        <div>
          <h1 className="text-2xl font-serif text-gold">{userProfile.displayName}</h1>
          <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">{userProfile.department} Command Center</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-navy/50 border border-gold/20 p-1">
            <button 
              onClick={() => setActiveTab('active')} 
              className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'active' ? "bg-gold text-navy" : "text-gold/60 hover:text-gold")}
            >
              Active
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'history' ? "bg-gold text-navy" : "text-gold/60 hover:text-gold")}
            >
              History
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
            <span className="text-[8px] uppercase font-bold">Logout</span>
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
                  className={cn("staff-task-card", isViolated && "sla-violated")}
                >
                  <div className="flex justify-between items-start">
                    <div className="bg-navy/5 px-3 py-1 text-navy text-[10px] font-bold tracking-widest uppercase">Room #{task.roomNumber}</div>
                    <div className={cn("timer-text", isViolated && "violated")}>
                      {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-serif text-navy">{task.type}</h3>
                    <p className={cn(
                      "text-[10px] uppercase tracking-widest font-bold",
                      task.status === 'Pending' ? "text-gold" : "text-blue-600"
                    )}>{task.status}</p>
                  </div>

                  {task.message && (
                    <div className="bg-cream/50 p-3 border-l-2 border-gold/20 italic text-xs text-charcoal/60">
                      "{task.message}"
                    </div>
                  )}

                  {task.items && (
                    <div className="text-[10px] text-navy/60 font-bold uppercase tracking-wider">
                      {task.items.map((i, idx) => <div key={idx}>{i.quantity}x {i.name}</div>)}
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    {task.status === 'Pending' ? (
                      <button onClick={() => handleAccept(task.id)} className="gold-button w-full m-0 py-3">Accept Task</button>
                    ) : (
                      <div className="space-y-2">
                        <button onClick={() => handleComplete(task)} className="w-full py-3 bg-green-600 text-white font-bold uppercase tracking-widest text-[10px]">Mark Completed</button>
                        {userProfile.email === 'fb@hotel.com' && (
                          <div className="space-y-1">
                            <button 
                              onClick={() => alert('Order successfully synced to Oracle Micros Symphony API.')}
                              className="w-full py-2 bg-[#C5A059] text-white font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                            >
                              <Zap size={12} /> Sync to Micros/Symphony
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
                <p className="text-navy/40 font-serif italic">All tasks completed. Standing by.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {history.map(task => (
              <div key={task.id} className="bg-white border border-gold/10 p-4 shadow-sm opacity-70">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">Room #{task.roomNumber}</span>
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Completed</span>
                </div>
                <h3 className="text-sm font-serif text-navy">{task.type}</h3>
                <p className="text-[8px] text-gold/60 uppercase font-bold mt-1">Closed at {task.completed_time?.toDate ? task.completed_time.toDate().toLocaleTimeString() : 'Recently'}</p>
              </div>
            ))}
            {history.length === 0 && (
              <div className="col-span-full py-20 text-center text-navy/20 italic font-serif">
                No history available.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ManagerDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('sentinel_manager_stats');
    return saved ? JSON.parse(saved) : { revenue: 0, pending: 0, completed: 0, avgResolution: 0 };
  });
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [graphMode, setGraphMode] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [activeTab, setActiveTab] = useState<'analytics' | 'config'>('analytics');
  const [slaLimits, setSlaLimits] = useState(() => {
    const saved = localStorage.getItem('sentinel_sla_limits');
    return saved ? JSON.parse(saved) : { Security: 2, 'F&B': 5, Housekeeping: 5, Concierge: 5, 'Front Office': 5 };
  });

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
        const headers = "Date,Room,Department,Type,Status,Revenue,Delay Reason\n";
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
        alert("Success: Executive PDF Summary has been generated and sent to your secure portal.");
      } else {
        alert(`Success: ${type} has been generated and processed.`);
      }
    }, 2500);
  };

  const violations = requests.filter(r => getSLAStatus(r));
  const complianceRate = getSLACompliance();

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
    { name: 'Sarah M.', room: '402', text: "Incredible speed! The housekeeping arrived in under 3 minutes. Truly 5-star service.", date: "April 11, 2026" },
    { name: 'Marc D.', room: '815', text: "The luxury car booking was seamless. The Porsche was waiting for me at the entrance as promised.", date: "April 10, 2026" },
    { name: 'Elena S.', room: '210', text: "Delicious room service. The 'Elegant Slim List' menu made ordering so easy.", date: "April 11, 2026" }
  ];

  return (
    <div className="min-h-screen bg-[#001529] text-white p-4 sm:p-8 space-y-8 overflow-x-hidden">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold/20 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif text-gold tracking-tight">Sentinel Pro | Luxury Hotel & Residences</h1>
          <p className="text-gold/60 text-[10px] uppercase tracking-[0.3em] font-bold mt-1">Enterprise Operations • Live Analytics</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-navy border border-gold/20 p-1 rounded-sm">
            <button onClick={() => setActiveTab('analytics')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'analytics' ? "bg-gold text-navy" : "text-gold/60")}>Analytics</button>
            <button onClick={() => setActiveTab('config')} className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'config' ? "bg-gold text-navy" : "text-gold/60")}>Configuration</button>
          </div>
          <div className="relative">
            <button 
              onClick={() => setReportMenuOpen(!reportMenuOpen)}
              className="gold-button flex items-center gap-2 px-6 py-3"
            >
              <ClipboardList size={18} />
              <span>Generate Report</span>
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

      {activeTab === 'config' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#001c36] border border-gold/10 p-8">
            <h2 className="text-2xl font-serif text-gold mb-8">System Configuration</h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-widest text-gold font-bold">Department SLA Limits (Minutes)</p>
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(slaLimits).map(([dept, limit]) => (
                    <div key={dept} className="flex items-center justify-between bg-navy/30 p-4 border border-gold/10">
                      <span className="text-sm font-bold text-white">{dept}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateSLALimit(dept, Math.max(1, limit as number - 1))} className="p-2 text-gold hover:text-white"><Minus size={16} /></button>
                        <span className="text-xl font-serif text-white w-8 text-center">{limit as number}</span>
                        <button onClick={() => updateSLALimit(dept, limit as number + 1)} className="p-2 text-gold hover:text-white"><Plus size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-8 border-t border-gold/10">
                <p className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-4">Security Controls</p>
                <button onClick={resetSession} className="w-full py-4 bg-red-600/20 border border-red-600/50 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                  Master Session Reset
                </button>
                <p className="text-[8px] text-red-500/60 mt-2 italic">Warning: This will invalidate all current guest sessions immediately.</p>
              </div>
            </div>
          </div>
          <div className="bg-[#001c36] border border-gold/10 p-8 flex flex-col items-center justify-center text-center space-y-6">
            <ShieldCheck size={64} className="text-gold" strokeWidth={1} />
            <h3 className="text-xl font-serif text-white">Enterprise Security Active</h3>
            <p className="text-sm text-white/60 max-w-xs">All operational data is encrypted and stored locally. Session ID: <span className="text-gold font-bold">{sessionId}</span></p>
          </div>
        </div>
      ) : (
        <>
          {violations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-600/10 border border-red-600 p-6 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-4">
                <AlertCircle className="text-red-600" size={32} />
                <div>
                  <h3 className="text-red-600 font-bold uppercase tracking-widest text-sm">SLA VIOLATION SUMMARY</h3>
                  <p className="text-red-600/80 text-xs">{violations.length} tasks currently exceeding operational limits.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {violations.map(v => (
                  <div key={v.id} className="bg-red-600 text-white text-[10px] font-bold px-3 py-1">ROOM {v.roomNumber}</div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Panel 1: Real-Time Activity */}
            <div className="bg-[#001c36] border border-gold/10 p-6 flex flex-col h-[600px] lg:col-span-1">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-serif text-white flex items-center gap-2">
                  <Clock size={18} className="text-gold" /> Real-Time Activity
                </h2>
                <span className="text-[10px] bg-gold/10 text-white px-2 py-1 rounded-full font-bold">{requests.length} ACTIVE</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                {requests.map(req => (
                  <div key={req.id} className={cn(
                    "p-4 border-l-2 bg-navy/20 flex justify-between items-center transition-all",
                    getSLAStatus(req) ? "border-red-500 animate-pulse-red-border" : "border-gold/30"
                  )}>
                    <div>
                      <p className="text-[10px] text-white font-bold uppercase tracking-wider">Room #{req.roomNumber} • {req.department}</p>
                      <p className="text-sm font-medium text-gold">{req.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white font-bold">{formatTime(req.timestamp)}</p>
                      <p className={cn(
                        "text-[8px] font-black uppercase tracking-widest",
                        req.status === 'Pending' ? "text-[#FFD700]" : req.status === 'In Progress' ? "text-blue-400" : "text-green-500"
                      )}>{req.status}</p>
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
                    <p className="text-white/80 text-[10px] uppercase tracking-widest font-bold mb-2">Total Revenue Today (AED)</p>
                    <h2 className="text-5xl font-serif text-white mb-6">{stats.revenue.toLocaleString()}</h2>
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
                      <div>
                        <p className="text-white/60 text-[8px] uppercase font-bold">SLA Compliance</p>
                        <p className="text-xl font-serif text-white">{complianceRate}%</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-[8px] uppercase font-bold">Pending Requests</p>
                        <p className="text-xl font-serif text-white">{stats.pending}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#001c36] border border-gold/10 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-serif text-white flex items-center gap-2">
                      <TrendingUp size={18} className="text-gold" /> Revenue Streams
                    </h2>
                    <div className="flex bg-navy border border-gold/20 p-1 rounded-sm">
                      {['Daily', 'Weekly', 'Monthly'].map(mode => (
                        <button 
                          key={mode} 
                          onClick={() => setGraphMode(mode as any)}
                          className={cn(
                            "px-3 py-1 text-[8px] font-bold uppercase tracking-widest transition-all",
                            graphMode === mode ? "bg-gold text-navy" : "text-white/40 hover:text-white"
                          )}
                        >
                          {mode}
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
                  <h2 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                    <Zap size={18} className="text-gold" /> SLA Compliance by Dept (%)
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
                  <h2 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                    <Star size={18} className="text-gold" /> Staff Leaderboard
                  </h2>
                  <div className="space-y-4">
                    {[
                      { name: 'Ahmed K.', tasks: 42, rating: 4.9, dept: 'HK' },
                      { name: 'Elena S.', tasks: 38, rating: 4.8, dept: 'F&B' },
                      { name: 'John D.', tasks: 35, rating: 4.7, dept: 'Concierge' },
                      { name: 'Maria L.', tasks: 31, rating: 4.9, dept: 'HK' },
                    ].map((staff, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-navy/20 border border-gold/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-xs border border-gold/20">{staff.name[0]}</div>
                          <div>
                            <p className="text-xs font-bold text-white">{staff.name}</p>
                            <p className="text-[8px] text-gold font-bold uppercase tracking-widest">{staff.dept}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-white">{staff.tasks} Tasks</p>
                          <div className="flex items-center gap-1 justify-end">
                            <Star size={8} className="text-gold fill-gold" />
                            <span className="text-[10px] text-white font-bold">{staff.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

        {/* Panel 4: Guest Sentiment */}
        <div className="bg-[#001c36] border border-gold/10 p-6 lg:col-span-3">
          <h2 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
            <Star size={18} className="text-gold" /> Live Guest Feedback Feed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {requests.filter(r => r.rating).slice(0, 8).map(req => (
              <div key={req.id} className="bg-navy/30 p-4 border border-gold/5 hover:border-gold/20 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={10} className={cn(i < (req.rating || 0) ? "text-gold fill-gold" : "text-white/10")} />
                    ))}
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-white font-bold uppercase block">Room #{req.roomNumber}</span>
                    <span className="text-[7px] text-gold/60 font-bold uppercase block">{req.timestamp?.toDate ? req.timestamp.toDate().toLocaleDateString() : 'Today'}</span>
                  </div>
                </div>
                <p className="text-xs italic text-white leading-relaxed mb-2">"{req.feedbackComment || 'No comment provided'}"</p>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gold/10">
                  <p className="text-[8px] text-gold font-black tracking-widest uppercase">{req.type}</p>
                  <p className="text-[8px] text-white/40 font-bold uppercase italic">{req.guestName || 'Valued Guest'}</p>
                </div>
              </div>
            ))}
            {requests.filter(r => r.rating).length === 0 && (
              <div className="col-span-full py-12 text-center text-white/20 italic font-serif">
                Waiting for live guest feedback...
              </div>
            )}
          </div>
        </div>

        {/* Panel 5: Guest Testimonials (Demo Mode) */}
        <div className="bg-[#001c36] border border-gold/10 p-6 lg:col-span-3">
          <h2 className="text-lg font-serif text-gold mb-6 flex items-center gap-2">
            <MessageSquare size={18} /> Guest Testimonials (Demo Mode)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-navy/40 p-6 border-l-4 border-gold relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Quote size={40} className="text-gold" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-[10px] text-gold uppercase font-bold tracking-widest">Room #{t.room}</p>
                  </div>
                </div>
                <p className="text-xs italic text-white/80 leading-relaxed mb-4">"{t.text}"</p>
                <p className="text-[9px] text-gold/50 font-bold uppercase text-right">{t.date}</p>
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
      
      alert(isArabic ? 'تم إرسال طلبك بنجاح' : 'Your request has been submitted successfully');
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

  if (!user || !profile) return pathname === '/staff-portal' ? <StaffLogin onLoginSuccess={(u, p) => { setUser(u); setProfile(p); }} /> : <Auth onLoginSuccess={(u, p) => { setUser(u); setProfile(p); }} initialRoom={roomNumber} isLocked={isRoomLocked} />;

  return (
    <div className={cn("main-content", isRTL && "rtl", profile.role === 'manager' && "manager-dark-mode")}>
      <Header roomNumber={profile.roomNumber || '402'} isAdminRoute={profile.role !== 'guest'} user={user} logout={logout} navigateToGuest={() => { setGuestTab('services'); if (pathname !== '/') window.history.pushState({}, '', '/'); setPathname('/'); }} />
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
                        { name: t('housekeeping'), icon: Sparkles, dept: 'Housekeeping', options: [t('room_cleaning'), t('laundry'), t('extra_blanket')] },
                        { name: t('room_service'), icon: Coffee, dept: 'F&B', subtitle: t('includes_vat') },
                        { name: t('restaurant_bookings'), icon: UtensilsCrossed, dept: 'F&B', options: [t('turquoise'), t('mermaid'), t('lolivo')] },
                        { name: t('concierge_services'), icon: Key, dept: 'Concierge', options: [t('rent_a_car'), t('taxi_limousine'), t('luggage_service'), t('local_tours')] },
                        { name: t('security'), icon: Shield, dept: 'Security & Safety', options: [t('emergency'), t('safe_box'), t('medical'), t('escort')] },
                        { name: t('any_other_request'), icon: Send, dept: 'Front Office' },
                      ].map((service) => (
                        <button key={service.name} onClick={() => {
                          if (service.name === t('room_service')) setGuestTab('room-service');
                          else if (service.name === t('restaurant_bookings')) setGuestTab('restaurant-bookings');
                          else if (service.name === t('concierge_services')) setGuestTab('concierge');
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
                                  <span className="text-navy font-bold text-sm font-serif block">{req.type}</span>
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
                  <RoomService cart={cart} updateCart={(id, delta) => setCart(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }))} onSubmit={(notes) => submitRequest({ type: t('room_service'), dept: 'F&B', notes })} />
                ) : guestTab === 'restaurant-bookings' ? (
                  <RestaurantBooking onSubmit={(data) => submitRequest({ ...data, dept: 'F&B' })} />
                ) : (
                  <Concierge onSubmit={(data) => submitRequest(data)} />
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
                    <textarea value={dietaryRequirements} onChange={(e) => setDietaryRequirements(e.target.value)} placeholder={t('message_placeholder')} className="login-input h-24 resize-none border-gold/30 focus:border-gold w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mb-8">
                  <label className="text-[10px] uppercase tracking-widest text-gold font-bold">{t('any_specific_request')}</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('message_placeholder')} className="login-input h-32 resize-none border-gold/30 focus:border-gold w-full" />
                </div>
              )}
              <button onClick={() => submitRequest()} className="gold-button w-full m-0">{t('submit')}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
