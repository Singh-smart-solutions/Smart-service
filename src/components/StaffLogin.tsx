import React, { useState } from 'react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/TranslationContext';
import { LogIn, ShieldCheck } from 'lucide-react';

interface StaffLoginProps {
  onLoginSuccess: (user: any, profile: any) => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        onLoginSuccess(userCredential.user, userDoc.data());
      } else {
        setError('User profile not found. Please contact management.');
      }
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
            Staff Portal Access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleStaffLogin} className="space-y-6">
          <div className="space-y-4">
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
                placeholder="staff@sentinel.pro"
              />
            </div>

            <div className="relative">
              <label className="text-[10px] uppercase tracking-widest text-gold font-bold mb-2 block px-1">
                {t('password')}
              </label>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 text-sm focus:border-gold outline-none transition-all text-zinc-300"
                placeholder="••••••••"
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
          Restricted Access Area
        </p>
      </motion.div>
    </div>
  );
};
