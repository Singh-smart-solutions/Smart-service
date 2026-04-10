import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously,
  signOut, 
  User 
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
import { auth, db, googleProvider } from './firebase';
import { 
  UserProfile, 
  ServiceRequest, 
  Department, 
  RequestStatus, 
  OperationType,
  MenuItem,
  UserRole
} from './types';
import { cn } from './lib/utils';
import { 
  LogOut, 
  User as UserIcon, 
  Bell, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Plus,
  LayoutDashboard,
  Shield,
  Coffee,
  Trash2,
  Car,
  Key,
  Lock,
  Bed,
  ShieldAlert,
  Briefcase,
  Minus,
  ShoppingCart,
  Settings,
  Globe,
  Sparkles,
  UtensilsCrossed,
  ConciergeBell,
  Heart,
  Star,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDocs } from 'firebase/firestore';

import { useLanguage } from './contexts/TranslationContext';
import { Header } from './components/Header';
import { RoomService } from './components/RoomService';
import { RestaurantBooking } from './components/RestaurantBooking';
import { ConciergeMenu } from './components/ConciergeMenu';
import { Auth } from './components/Auth';
import { ManagerDashboard } from './components/ManagerDashboard';
import { StaffPortal } from './components/StaffPortal';
import { StaffLogin } from './components/StaffLogin';
import FeedbackModal from './components/FeedbackModal';

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName,
        email: p.email,
        photoUrl: p.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
      let message = "Something went wrong. Please try again later.";
      try {
        const errInfo = JSON.parse(this.state.error.message);
        if (errInfo.error.toLowerCase().includes('insufficient permissions')) {
          message = "Access Denied: You do not have the required permissions for this action. Please contact management if you believe this is an error.";
        } else if (errInfo.error.toLowerCase().includes('quota exceeded')) {
          message = "The daily service quota has been reached. Please try again tomorrow.";
        }
      } catch (e) {
        // Not a JSON error or other issue
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4">
          <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-serif text-[#D4AF37] mb-4">Service Interruption</h2>
            <p className="text-white/60 mb-8 leading-relaxed">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#D4AF37] text-[#121212] py-4 rounded-xl font-semibold hover:bg-[#F7E7CE] transition-all active:scale-95 shadow-lg shadow-gold/20"
            >
              Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [guestTab, setGuestTab] = useState<'services' | 'room-service' | 'restaurant-bookings'>('services');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeFeedbackRequest, setActiveFeedbackRequest] = useState<ServiceRequest | null>(null);
  const [selectedService, setSelectedService] = useState<{ type: string, dept: Department } | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [message, setMessage] = useState('');
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [pax, setPax] = useState('2');
  const [preferredTiming, setPreferredTiming] = useState('');
  const [roomFromUrl, setRoomFromUrl] = useState<string | null>(null);
  const [housekeepingOption, setHousekeepingOption] = useState<string>('Room Cleaning');
  const [securityOption, setSecurityOption] = useState<string>('Emergency Assistance');
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [specialOccasion, setSpecialOccasion] = useState<'None' | 'Birthday' | 'Anniversary'>('None');
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [weather, setWeather] = useState({ temp: 32, condition: 'Sunny' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Greeting Logic ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting_morning');
    if (hour < 17) return t('greeting_afternoon');
    return t('greeting_evening');
  };

  // --- Connection Test ---
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase Connection Error: The client is offline or configuration is incorrect.");
        }
        // Skip logging for other errors (like permission denied on this test doc)
      }
    }
    testConnection();
  }, []);

  // --- Weather Simulation ---
  useEffect(() => {
    const interval = setInterval(() => {
      setWeather(prev => ({ ...prev, temp: 30 + Math.floor(Math.random() * 5) }));
    }, 300000); // Update every 5 mins
    return () => clearInterval(interval);
  }, []);

  // --- Persistent Language ---
  useEffect(() => {
    localStorage.setItem('hotel_lang', language);
  }, [language]);

  // --- Navigation ---
  const navigateToGuest = () => {
    window.history.pushState({}, '', '/');
  };

  // --- QR Code Simulation & Guest Bypass ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomFromUrl(room);
      setRoomNumber(room);
      
      // Auto-login anonymously for guests if not already logged in
      if (!user && !loading) {
        signInAnonymously(auth).catch(err => console.error("Anon login failed", err));
      }
    }
  }, [user, loading]);

  // --- Seed Menu ---
  const seedMenu = async () => {
    const menuItems = [
      {
        id: 'orange_juice',
        name: 'fresh_orange_juice', // Store the key
        description: 'orange_juice_desc',
        price: 45,
        category: 'Beverage',
        image: "https://images.unsplash.com/photo-1547514701-42782101795e?q=80&w=800"
      },
      {
        id: 'espresso',
        name: 'signature_espresso',
        description: 'espresso_desc',
        price: 35,
        category: 'Beverage',
        image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=800"
      },
      // Food
      { name: 'Classic Wagyu Burger', description: 'Caramelized onions, truffle aioli, brioche bun.', price: 28, category: 'Main' },
      { name: 'Lobster Bisque', description: 'Cognac cream, chive oil, lobster chunks.', price: 18, category: 'Appetizer' },
      { name: 'Caesar Salad', description: 'Parmesan crisps, garlic croutons, house dressing.', price: 16, category: 'Salad' },
      { name: 'Truffle Fries', description: 'Parmesan, parsley, truffle oil.', price: 12, category: 'Side' },
      { name: 'Chocolate Lava Cake', description: 'Vanilla bean gelato, berry coulis.', price: 14, category: 'Dessert' },
      { name: 'Wild Mushroom Risotto', description: 'Arborio rice, porcini, truffle zest, parmesan.', price: 24, category: 'Main' },
      { name: 'Pan-Seared Salmon', description: 'Asparagus, lemon butter sauce, baby potatoes.', price: 32, category: 'Main' },
    ];

    for (const item of menuItems) {
      // Use setDoc if id is provided, otherwise addDoc
      if ('id' in item && item.id) {
        await setDoc(doc(db, 'menu', item.id), item);
      } else {
        await addDoc(collection(db, 'menu'), item);
      }
    }
  };

  // --- Auth & Profile ---
  useEffect(() => {
    // Check for local session first (Bypass Auth Errors)
    const localSession = localStorage.getItem('sentinel_local_session');
    if (localSession) {
      const parsed = JSON.parse(localSession);
      setUser({ uid: parsed.uid, email: parsed.email });
      setProfile(parsed);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Master Manager Logic - check email first
          if (firebaseUser.email === 'singh7naamg@gmail.com') {
            const managerProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: 'Master Manager',
              role: 'manager',
              department: 'None'
            };
            setProfile(managerProfile);
            setLoading(false);
            return;
          }

          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Check if we have session data in localStorage for anonymous users
            const sessionData = localStorage.getItem('sentinel_session');
            if (sessionData) {
              const parsed = JSON.parse(sessionData);
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: parsed.email || '',
                displayName: parsed.fullName || `Guest ${parsed.roomNumber}`,
                roomNumber: parsed.roomNumber,
                role: 'guest',
                department: 'None'
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
              setProfile(newProfile);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // --- Real-time Menu ---
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
      setMenu(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'menu');
    });
    return unsubscribe;
  }, [user]);

  // --- Real-time Requests ---
  useEffect(() => {
    if (!user || !profile) return;

    let q;
    if (profile.role === 'guest') {
      q = query(
        collection(db, 'requests'), 
        where('guestId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
    } else {
      // Staff/Manager see all for now, or filter in component
      q = query(collection(db, 'requests'), orderBy('timestamp', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRequest));
      setRequests(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests');
    });

    return unsubscribe;
  }, [user, profile]);

  // --- Feedback Logic ---
  useEffect(() => {
    if (profile?.role === 'guest' && requests.length > 0) {
      const completedUnrated = requests.find(r => r.status === 'Completed' && !(r as any).rating);
      if (completedUnrated) {
        const seenKey = `feedback_seen_${completedUnrated.id}`;
        if (!sessionStorage.getItem(seenKey)) {
          setActiveFeedbackRequest(completedUnrated);
          setShowFeedbackModal(true);
          sessionStorage.setItem(seenKey, 'true');
        }
      }
    }
  }, [requests, profile]);

  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    if (!activeFeedbackRequest) return;
    try {
      await updateDoc(doc(db, 'requests', activeFeedbackRequest.id), {
        rating,
        feedback: comment,
        isCritical: rating <= 3,
        updatedAt: serverTimestamp()
      });
      setShowFeedbackModal(false);
      setActiveFeedbackRequest(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${activeFeedbackRequest.id}`);
    }
  };

  const login = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login failed', error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError('The login popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setAuthError('Login failed. Please try again.');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('sentinel_local_session');
    signOut(auth);
  };

  const submitRequest = async () => {
    if (!user || !selectedService || !roomNumber) return;

    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const item = menu.find(m => m.id === id);
      return { name: item?.name || 'Unknown', quantity: qty };
    });

    const totalPrice = Object.entries(cart).reduce((acc, [id, qty]) => {
      const item = menu.find(m => m.id === id);
      return acc + (item?.price || 0) * Number(qty);
    }, 0);

    try {
      const requestData: any = {
        roomNumber,
        type: selectedService.type,
        message,
        restaurantName: selectedService.type === 'Restaurant Bookings' ? selectedRestaurant : null,
        pax: selectedService.type === 'Restaurant Bookings' ? Number(pax) : null,
        preferredTiming: selectedService.type === 'Restaurant Bookings' ? preferredTiming : null,
        items: orderItems.length > 0 ? orderItems : null,
        totalPrice: totalPrice > 0 ? totalPrice : null,
        department: selectedService.dept,
        status: 'Pending',
        guestId: user.uid,
        timestamp: serverTimestamp(), // request_time
        updatedAt: serverTimestamp(),
        language,
        dietaryRequirements: selectedService.type === 'Room Service' ? dietaryRequirements : null,
        specialOccasion: selectedService.type === 'Restaurant Bookings' ? specialOccasion : null,
      };

      // Ensure correct departmental routing
      if (selectedService.type === 'Room Service' || selectedService.type === 'Restaurant Bookings') {
        requestData.department = 'F&B';
      } else if (selectedService.type === 'Housekeeping') {
        requestData.department = 'Housekeeping';
        requestData.housekeepingOption = housekeepingOption;
        if (housekeepingOption !== 'Other Housekeeping Request') {
          requestData.message = housekeepingOption;
        }
      } else if (selectedService.type === 'Security') {
        requestData.department = 'Security & Safety';
        requestData.type = securityOption;
        if (securityOption === 'Emergency Assistance' || securityOption === 'Medical Emergency') {
          requestData.priority = 'High';
        }
      } else if (selectedService.type === 'Any Other Request') {
        requestData.department = 'Front Office';
      }

      await addDoc(collection(db, 'requests'), requestData);
      setShowRequestModal(false);
      setRoomNumber(roomFromUrl || '');
      setMessage('');
      setSelectedRestaurant(null);
      setPax('2');
      setPreferredTiming('');
      setHousekeepingOption('Room Cleaning');
      setDietaryRequirements('');
      setSpecialOccasion('None');
      setSecurityOption('Emergency Assistance');
      setSelectedService(null);
      setCart({});
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'requests');
    }
  };

  const updateRole = async (uid: string, role: UserRole, dept: Department = 'None') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role, department: dept });
      // Force profile refresh
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) setProfile(userDoc.data() as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const updateStatus = async (requestId: string, newStatus: RequestStatus) => {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'Accepted' || newStatus === 'In Progress') {
        updateData.accepted_time = serverTimestamp();
      }
      if (newStatus === 'Completed') {
        updateData.completed_time = serverTimestamp();
      }

      await updateDoc(doc(db, 'requests', requestId), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${requestId}`);
    }
  };

  const handleLoginSuccess = (user: any, profile: any) => {
    setUser(user);
    setProfile(profile);
    if (profile.role === 'guest') {
      setRoomNumber(profile.roomNumber);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!user || !profile) {
    if (pathname === '/staff-management') {
      return <StaffLogin onLoginSuccess={handleLoginSuccess} />;
    }
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={cn("min-h-screen bg-black text-white font-sans selection:bg-gold/30", isRTL && "font-arabic")}>
      {/* Navigation */}
      <Header 
        roomNumber={profile.roomNumber || '402'}
        weather={weather}
        isAdminRoute={profile.role !== 'guest'}
        user={user}
        logout={logout}
        navigateToGuest={() => {}}
      />

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {profile.role === 'manager' ? (
            <motion.div
              key="manager-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ManagerDashboard />
            </motion.div>
          ) : profile.role === 'staff' ? (
            <motion.div
              key="staff-portal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StaffPortal userProfile={profile} />
            </motion.div>
          ) : (
            <motion.div
              key="guest-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              {!welcomeDismissed && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-900/50 border border-gold/20 p-8 rounded-[3rem] relative overflow-hidden backdrop-blur-xl"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles size={120} className="text-gold" />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-4xl font-serif tracking-tight luxury-text-shadow">
                      {getGreeting()}, <span className="text-gold italic">{profile.displayName}</span>
                    </h2>
                    <p className="text-zinc-400 mt-4 max-w-xl font-light leading-relaxed">
                      {t('welcome_sanctuary')} {t('how_enhance')}
                    </p>
                    <button 
                      onClick={() => setWelcomeDismissed(true)}
                      className="mt-8 text-[10px] uppercase tracking-[0.3em] text-gold font-bold hover:text-champagne transition-colors flex items-center gap-2"
                    >
                      {t('back_home')} <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="flex items-center gap-6 overflow-x-auto pb-4 no-scrollbar mt-12">
                {[
                  { id: 'services', label: t('home'), icon: LayoutDashboard },
                  { id: 'room-service', label: t('room_service'), icon: Coffee },
                  { id: 'restaurant-bookings', label: t('restaurant_bookings'), icon: UtensilsCrossed },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setGuestTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all whitespace-nowrap border",
                      guestTab === tab.id 
                        ? "bg-gold text-black border-gold shadow-xl shadow-gold/10" 
                        : "bg-zinc-900/50 text-zinc-500 border-white/5 hover:border-gold/20"
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {guestTab === 'services' ? (
                  <motion.div
                    key="services"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-12 mt-12"
                  >
                    <section className="space-y-8">
                      <div className="flex justify-between items-end">
                        <h2 className="text-3xl font-serif tracking-tight text-zinc-100">{t('how_enhance')}</h2>
                      </div>
                      <div className="dashboard-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[
                          { name: t('housekeeping'), icon: Sparkles, dept: 'Housekeeping', color: 'bg-blue-500/10 text-blue-500' },
                          { name: t('room_service'), icon: Coffee, dept: 'F&B', color: 'bg-gold/10 text-gold' },
                          { name: t('restaurant_bookings'), icon: UtensilsCrossed, dept: 'F&B', color: 'bg-amber-500/10 text-amber-500' },
                          { name: t('concierge_services'), icon: Key, dept: 'Concierge', color: 'bg-gold/10 text-gold' },
                          { name: t('taxi_limousine'), icon: Car, dept: 'Concierge', color: 'bg-zinc-500/10 text-zinc-300' },
                          { name: t('security'), icon: Shield, dept: 'Security & Safety', color: 'bg-red-500/10 text-red-500' },
                          { name: t('any_other_request'), icon: Send, dept: 'Front Office', color: 'bg-emerald-500/10 text-emerald-500' },
                        ].map((service) => (
                          <button 
                            key={service.name}
                            onClick={() => {
                              if (service.name === t('room_service')) setGuestTab('room-service');
                              else if (service.name === t('restaurant_bookings')) setGuestTab('restaurant-bookings');
                              else {
                                setSelectedService({ type: service.name, dept: service.dept as Department });
                                setShowRequestModal(true);
                              }
                            }}
                            className="dashboard-card group bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem] text-start hover:border-gold/20 transition-all flex flex-col justify-between aspect-square"
                          >
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", service.color)}>
                              <service.icon size={28} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-serif text-zinc-100 leading-tight">{service.name}</h3>
                          </button>
                        ))}
                      </div>
                    </section>

                    {requests.length > 0 && (
                      <section className="space-y-8">
                        <h2 className="text-3xl font-serif tracking-tight text-zinc-100">{t('your_requests')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {requests.map((req) => (
                            <div key={req.id} className="bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group hover:border-gold/10 transition-all">
                              <div className="flex items-center gap-6">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                                  req.status === 'Completed' ? "bg-green-500/10 text-green-500" : "bg-gold/10 text-gold"
                                )}>
                                  {req.status === 'Completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-zinc-100">{req.type}</p>
                                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1 font-bold">
                                    {t(req.status.toLowerCase().replace(' ', '_'))} • {req.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="text-zinc-700 group-hover:text-gold transition-colors" size={20} />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </motion.div>
                ) : guestTab === 'room-service' ? (
                  <motion.div
                    key="room-service"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-12"
                  >
                    <RoomService 
                      cart={cart} 
                      updateCart={(id, delta) => {
                        setCart(prev => {
                          const newQty = (prev[id] || 0) + delta;
                          if (newQty <= 0) {
                            const { [id]: _, ...rest } = prev;
                            return rest;
                          }
                          return { ...prev, [id]: newQty };
                        });
                      }} 
                    />
                    {/* Hidden trigger for checkout from RoomService bottom bar */}
                    <button 
                      id="checkout-trigger"
                      className="hidden"
                      onClick={() => {
                        setSelectedService({ type: 'Room Service', dept: 'F&B' });
                        setShowRequestModal(true);
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="restaurant-bookings"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-12"
                  >
                    <RestaurantBooking 
                      onSubmit={async (data) => {
                        try {
                          await addDoc(collection(db, 'requests'), {
                            ...data,
                            guestId: user.uid,
                            roomNumber: profile?.roomNumber || '402',
                            status: 'Pending',
                            timestamp: serverTimestamp(),
                            department: 'F&B'
                          });
                          setGuestTab('services');
                        } catch (error) {
                          handleFirestoreError(error, OperationType.CREATE, 'requests');
                        }
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        requestType={activeFeedbackRequest?.type || ''}
      />

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowRequestModal(false);
                setCart({});
                setSecurityOption('Emergency Assistance');
                if (selectedService?.type === 'Restaurant Bookings') {
                  setSelectedRestaurant(null);
                }
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white/5 border border-gold/20 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] backdrop-blur-2xl"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-serif tracking-tight text-zinc-100">{t(selectedService?.type.toLowerCase().replace(/ /g, '_') || '') || selectedService?.type}</h3>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold mt-2 font-bold">Sanctuary Service</p>
                </div>
                <button 
                  onClick={() => {
                    setShowRequestModal(false);
                    setCart({});
                    setSecurityOption('Emergency Assistance');
                    if (selectedService?.type === 'Restaurant Bookings') {
                      setSelectedRestaurant(null);
                    }
                  }}
                  className="text-zinc-500 hover:text-gold transition-colors"
                >
                  <Trash2 size={20} strokeWidth={1.5} />
                </button>
              </div>
              
              {selectedService?.type === 'Concierge Services' ? (
                <ConciergeMenu 
                  roomNumber={roomNumber}
                  onSubmit={async (data) => {
                    try {
                      const requestData = {
                        ...data,
                        department: 'Concierge',
                        status: 'Pending',
                        guestId: user?.uid,
                        timestamp: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        language
                      };
                      await addDoc(collection(db, 'requests'), requestData);
                      setShowRequestModal(false);
                      setCart({});
                    } catch (error) {
                      handleFirestoreError(error, OperationType.WRITE, 'requests');
                    }
                  }}
                />
              ) : (
                <>
                  {selectedService?.type === 'Room Service' && (
                    <div className="mb-8 space-y-8">
                      <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold mb-4">{t('your_requests')}</h4>
                      <div className="bg-black/40 border border-gold/10 p-8 rounded-[2rem] space-y-4">
                        {Object.entries(cart).map(([id, qty]) => {
                          const item = menu.find(m => m.id === id);
                          if (!item) return null;
                          const nameKey = `item_${item.name.toLowerCase().replace(/ /g, '_')}_name`;
                          const translatedName = t(nameKey) !== nameKey ? t(nameKey) : item.name;
                          return (
                            <div key={id} className="flex justify-between text-sm">
                              <span className="text-zinc-400 font-light">{translatedName} x{qty}</span>
                              <span className="text-gold font-medium">{(item.price * Number(qty)).toLocaleString()} {t('currency_label')}</span>
                            </div>
                          );
                        })}
                        {Object.keys(cart).length === 0 && (
                          <p className="text-xs text-zinc-600 italic">{t('no_active_requests')}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-3 block">{t('label_dietary')}</label>
                        <textarea 
                          value={dietaryRequirements}
                          onChange={(e) => setDietaryRequirements(e.target.value)}
                          placeholder="e.g. Nut allergy, Gluten-free..."
                          className="w-full bg-black/40 border border-gold/10 rounded-2xl p-5 text-sm focus:border-gold outline-none transition-colors h-24 resize-none text-zinc-300"
                        />
                      </div>
                    </div>
                  )}

                  {selectedService?.type === 'Restaurant Bookings' && (
                    <div className="mb-8 space-y-8">
                      <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold mb-4">{t('restaurant_bookings')}</h4>
                      <div className="bg-black/40 border border-gold/10 p-8 rounded-[2rem] space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400 font-light">{t('restaurant_bookings')}</span>
                          <span className="text-gold font-medium">{selectedRestaurant}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400 font-light">{t('label_pax')}</span>
                          <span className="text-gold font-medium">{pax} {t('label_pax')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400 font-light">{t('label_time')}</span>
                          <span className="text-gold font-medium">{preferredTiming}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-4 block">{t('label_occasion')}</label>
                        <div className="flex gap-4">
                          {[
                            { id: 'None', key: 'occ_none' },
                            { id: 'Birthday', key: 'occ_birthday' },
                            { id: 'Anniversary', key: 'occ_anniversary' }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setSpecialOccasion(opt.id as any)}
                              className={cn(
                                "flex-1 py-4 px-4 rounded-2xl text-[10px] uppercase tracking-widest font-bold border transition-all flex items-center justify-center gap-2",
                                specialOccasion === opt.id ? "bg-gold text-black border-gold" : "bg-black/40 text-zinc-400 border-gold/10 hover:border-gold/30"
                              )}
                            >
                              {opt.id === 'Birthday' && <Sparkles size={14} />}
                              {opt.id === 'Anniversary' && <Heart size={14} />}
                              {t(opt.key)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedService?.type === 'Housekeeping' && (
                    <div className="mb-8 space-y-6">
                      <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-3 block">{t('housekeeping')}</label>
                      <select 
                        value={housekeepingOption}
                        onChange={(e) => setHousekeepingOption(e.target.value)}
                        className="w-full bg-black/40 border border-gold/10 rounded-2xl p-5 text-sm focus:border-gold outline-none transition-colors appearance-none cursor-pointer text-zinc-300"
                      >
                        <option value="Turndown Service">{t('hk_turndown')}</option>
                        <option value="Room Cleaning">{t('hk_cleaning')}</option>
                        <option value="Extra Linens">{t('hk_linens')}</option>
                        <option value="Pillow Menu">{t('hk_pillow')}</option>
                        <option value="Other Housekeeping Request">{t('hk_other')}</option>
                      </select>
                    </div>
                  )}

                  {selectedService?.type === 'Security' && (
                    <div className="mb-8 space-y-6">
                      <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-3 block">{t('security_assistance')}</label>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: 'Emergency Assistance', key: 'emergency_assistance', priority: 'High' },
                          { id: 'Medical Emergency', key: 'medical_emergency', priority: 'High' },
                          { id: 'Safe Box Support', key: 'safe_box_support', priority: 'Normal' },
                          { id: 'Door Lock / Access Issue', key: 'door_lock_issue', priority: 'Normal' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setSecurityOption(opt.id)}
                            className={cn(
                              "w-full p-5 rounded-2xl text-start border transition-all flex items-center justify-between group",
                              securityOption === opt.id 
                                ? "bg-gold/10 border-gold text-gold" 
                                : "bg-black/40 border-gold/10 text-zinc-400 hover:border-gold/30"
                            )}
                          >
                            <span className="text-sm font-light">{t(opt.key)}</span>
                            {opt.priority === 'High' && (
                              <span className="text-[8px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full font-bold uppercase tracking-widest">{t('high_priority')}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-3 block">{t('label_room_number')}</label>
                      <input 
                        type="text" 
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="e.g. 402"
                        className="w-full bg-black/40 border border-gold/10 rounded-2xl p-5 text-sm focus:border-gold outline-none transition-colors text-zinc-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-3 block">
                        {selectedService?.type === 'Any Other Request' ? t('any_other_request') : (selectedService?.type === 'Housekeeping' && housekeepingOption === 'Other Housekeeping Request' ? t('hk_other') : t('label_notes'))}
                      </label>
                      <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={selectedService?.type === 'Any Other Request' ? t('message_placeholder') : t('message_placeholder')}
                        className="w-full bg-black/40 border border-gold/10 rounded-2xl p-5 text-sm focus:border-gold outline-none transition-colors h-28 resize-none text-zinc-300"
                      />
                    </div>

                    {selectedService?.type === 'Room Service' && Object.keys(cart).length > 0 && (
                      <div className="bg-gold/5 border border-gold/20 p-8 rounded-[2rem]">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gold flex items-center gap-3">
                            <ShoppingCart size={18} strokeWidth={1.5} />
                            {t('label_total')}
                          </span>
                          <span className="text-3xl font-serif text-gold">
                            {Object.entries(cart).reduce((acc, [id, qty]) => {
                              const item = menu.find(m => m.id === id);
                              return acc + (item?.price || 0) * Number(qty);
                            }, 0).toLocaleString()} AED
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-6 pt-8">
                      <button 
                        onClick={() => {
                          setShowRequestModal(false);
                          setCart({});
                          if (selectedService?.type === 'Restaurant Bookings') {
                            setSelectedRestaurant(null);
                          }
                        }}
                        className="flex-1 py-5 text-zinc-500 font-bold hover:text-white transition-colors uppercase tracking-[0.2em] text-[10px]"
                      >
                        {t('cancel')}
                      </button>
                      <button 
                        onClick={submitRequest}
                        disabled={
                          !roomNumber || 
                          (selectedService?.type === 'Room Service' && Object.keys(cart).length === 0) || 
                          (selectedService?.type === 'Restaurant Bookings' && (!selectedRestaurant || !preferredTiming)) ||
                          (selectedService?.type === 'Any Other Request' && !message) ||
                          (selectedService?.type === 'Housekeeping' && housekeepingOption === 'Other Housekeeping Request' && !message)
                        }
                        className="flex-1 py-5 bg-gold text-black rounded-2xl font-bold hover:bg-champagne transition-all uppercase tracking-[0.2em] text-[10px] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gold/20"
                      >
                        {t('confirm')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
