import React, { useState } from 'react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/TranslationContext';
import { LogIn, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: any, profile: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Logic: Check if guest exists, if not, Auto-Create
      const guestId = email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + roomNumber;
      const guestDocRef = doc(db, 'guests', guestId);
      const guestDoc = await getDoc(guestDocRef);

      let guestData;
      if (!guestDoc.exists()) {
        // Auto-Create guest document
        guestData = {
          fullName,
          email,
          roomNumber,
          role: 'guest',
          createdAt: new Date().toISOString()
        };
        await setDoc(guestDocRef, guestData);
      } else {
        guestData = guestDoc.data();
      }

      // Bypass Auth Errors: Use local session storage instead of firebase.auth().createUser
      const profile = {
        uid: guestId, // Use the guest document ID as the local UID
        email,
        roomNumber,
        role: email === 'singh7naamg@gmail.com' ? 'manager' : 'guest',
        displayName: fullName || guestData.fullName || `Guest ${roomNumber}`,
        department: 'None'
      };

      // Store session locally
      localStorage.setItem('sentinel_local_session', JSON.stringify(profile));
      
      // Still sign in anonymously in background to ensure Firestore works if rules change
      try {
        await signInAnonymously(auth);
      } catch (authErr) {
        console.warn("Anonymous sign-in failed, but continuing with local session", authErr);
      }
      
      onLoginSuccess({ uid: guestId, email }, profile);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-12"
      >
        {/* Branding */}
        <div className="text-center space-y-4">
          <div className="inline-block p-4 border-2 border-gold rounded-full mb-4">
            <ShieldCheck className="w-12 h-12 text-gold" />
          </div>
          <h1 className="text-4xl font-serif tracking-[0.2em] text-gold uppercase luxury-text-shadow">
            Sentinel Pro
          </h1>
          <p className="text-zinc-500 text-xs tracking-[0.3em] uppercase">
            Luxury Management Systems
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleGuestLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-2 block px-1">
                {t('full_name') || 'Full Name'}
              </label>
              <input 
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 text-sm focus:border-gold outline-none transition-all text-zinc-300"
                placeholder="John Doe"
              />
            </div>

            <div className="relative">
              <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-2 block px-1">
                {t('email')}
              </label>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 text-sm focus:border-gold outline-none transition-all text-zinc-300"
                placeholder="email@example.com"
              />
            </div>

            <div className="relative">
              <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-2 block px-1">
                {t('room_number')}
              </label>
              <input 
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 text-sm focus:border-gold outline-none transition-all text-zinc-300"
                placeholder="402"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-[10px] uppercase tracking-widest text-center font-bold">
              {error}
            </p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-gold text-black rounded-2xl font-bold hover:bg-champagne transition-all shadow-xl shadow-gold/10 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                {t('sign_in')}
              </>
            )}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
          © 2026 Sentinel Pro Systems
        </p>
      </motion.div>
    </div>
  );
};
