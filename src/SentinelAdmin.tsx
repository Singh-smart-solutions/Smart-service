import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { cn } from './lib/utils';
import {
  LogOut, Plus, Building2, Users, CheckCircle2, XCircle,
  AlertCircle, Eye, EyeOff, Edit2, Trash2, RefreshCw,
  Phone, Mail, MapPin, Key, Shield, TrendingUp, Clock,
  Copy, Check, X, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface HotelClient {
  id: string;
  hotel_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  city: string;
  country: string;
  rooms_count: number;
  entry_code: string;
  executive_password: string;
  access_mode?: 'open' | 'qr_only';
  services_config?: {
    housekeeping: boolean;
    room_service: boolean;
    restaurant: boolean;
    concierge: boolean;
    security: boolean;
    maintenance: boolean;
    concierge_items: string[];
  };
  status: 'active' | 'trial' | 'suspended' | 'inactive';
  plan: 'trial' | 'basic' | 'premium';
  monthly_fee: number;
  notes: string;
  created_at: string;
  trial_ends_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  trial: 'bg-gold/20 text-gold border-gold/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const PLAN_COLORS: Record<string, string> = {
  trial: 'text-gold',
  basic: 'text-blue-400',
  premium: 'text-purple-400',
};

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// ─── COPY BUTTON ──────────────────────────────────────────────────────────────
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="ml-2 text-gold/40 hover:text-gold transition-colors">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
};

// ─── ADD / EDIT HOTEL MODAL ───────────────────────────────────────────────────
const HotelModal: React.FC<{
  hotel?: HotelClient | null;
  onClose: () => void;
  onSave: () => void;
}> = ({ hotel, onClose, onSave }) => {
  const isEdit = !!hotel;
  const [form, setForm] = useState({
    hotel_name: hotel?.hotel_name || '',
    contact_name: hotel?.contact_name || '',
    contact_email: hotel?.contact_email || '',
    contact_phone: hotel?.contact_phone || '',
    city: hotel?.city || '',
    country: hotel?.country || 'UAE',
    rooms_count: hotel?.rooms_count || 0,
    entry_code: hotel?.entry_code || '',
    executive_password: hotel?.executive_password || '',
    status: hotel?.status || 'trial',
    plan: hotel?.plan || 'trial',
    monthly_fee: hotel?.monthly_fee || 0,
    notes: hotel?.notes || '',
    access_mode: hotel?.access_mode || 'open',
    services_config: hotel?.services_config || {
      housekeeping: true, room_service: true, restaurant: true,
      concierge: true, security: true, maintenance: true,
      concierge_items: ['Car Rental', 'Taxi', 'Limo', 'Luggage Assistance', 'Tours', 'City Guide'],
    },
    trial_ends_at: hotel?.trial_ends_at ? hotel.trial_ends_at.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.hotel_name || !form.entry_code || !form.executive_password) {
      alert('Hotel name, entry code and executive password are required.');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await supabase.from('hotel_clients').update(form).eq('id', hotel!.id);
      } else {
        await supabase.from('hotel_clients').insert(form);
      }
      onSave();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#001c36] border border-gold/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-[#001c36] border-b border-gold/20 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-serif text-gold">{isEdit ? 'Edit Hotel Client' : 'Add New Hotel Client'}</h2>
            <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">Sentinel Pro Admin</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Hotel Info */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gold font-bold mb-3">Hotel Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Hotel Name *</label>
                <input value={form.hotel_name} onChange={e => setForm({ ...form, hotel_name: e.target.value })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" placeholder="e.g. Grand Hyatt Abu Dhabi" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">City</label>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" placeholder="Abu Dhabi" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Country</label>
                <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" placeholder="UAE" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Number of Rooms</label>
                <input type="number" value={form.rooms_count} onChange={e => setForm({ ...form, rooms_count: Number(e.target.value) })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold">
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gold font-bold mb-3">Contact Person</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Contact Name</label>
                <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" placeholder="Hotel Manager Name" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Email</label>
                <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" placeholder="manager@hotel.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Phone</label>
                <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" placeholder="+971 50 123 4567" />
              </div>
            </div>
          </div>

          {/* Access Credentials */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gold font-bold mb-3">Access Credentials</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Staff Portal Entry Code *</label>
                <div className="flex gap-2">
                  <input value={form.entry_code} onChange={e => setForm({ ...form, entry_code: e.target.value.toUpperCase() })} className="flex-1 bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold font-mono" placeholder="e.g. HOTEL1 or 99999" />
                </div>
                <p className="text-[8px] text-white/30">Guest types this to access staff/executive portal</p>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Executive Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.executive_password} onChange={e => setForm({ ...form, executive_password: e.target.value })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold pr-10" placeholder="Strong password" />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[8px] text-white/30">Executive uses this to access operations center</p>
              </div>
            </div>
          </div>

          {/* Plan & Billing */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gold font-bold mb-3">Plan & Billing</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Plan</label>
                <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value as any })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold">
                  <option value="trial">Trial (Free)</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Monthly Fee (AED)</label>
                <input type="number" value={form.monthly_fee} onChange={e => setForm({ ...form, monthly_fee: Number(e.target.value) })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-white/50">Trial Ends</label>
                <input type="date" value={form.trial_ends_at} onChange={e => setForm({ ...form, trial_ends_at: e.target.value })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-white/50">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold h-20 resize-none" placeholder="Any notes about this client..." />
          </div>
        </div>

        {/* ── Services Configuration ── */}
        <div className="px-5 py-4 border-t border-gold/10 space-y-3">
          <label className="text-[10px] text-gold/60 uppercase tracking-wider block">Active Services for This Hotel</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'housekeeping', label: '🏠 Housekeeping' },
              { key: 'room_service', label: '☕ Room Service' },
              { key: 'restaurant', label: '🍽 Restaurant' },
              { key: 'concierge', label: '🔑 Concierge' },
              { key: 'security', label: '🛡 Security' },
              { key: 'maintenance', label: '🔧 Maintenance' },
            ] as const).map(({ key, label }) => (
              <button key={key} type="button"
                onClick={() => setForm({ ...form, services_config: { ...(form.services_config as any), [key]: !(form.services_config as any)?.[key] } })}
                className={cn('flex items-center gap-1.5 px-2 py-2 text-[8px] font-bold uppercase border',
                  (form.services_config as any)?.[key] ? 'bg-gold/20 border-gold text-gold' : 'bg-transparent border-white/10 text-white/30')}>
                <span className={cn('w-1.5 h-1.5 rounded-full', (form.services_config as any)?.[key] ? 'bg-gold' : 'bg-white/20')} />
                {label}
              </button>
            ))}
          </div>
          {(form.services_config as any)?.concierge && (
            <div>
              <label className="text-[9px] text-white/40 uppercase tracking-widest block mb-1.5">Concierge Items</label>
              <div className="flex flex-wrap gap-1.5">
                {['Car Rental','Taxi','Limo','Luggage Assistance','Tours','City Guide'].map(item => {
                  const isActive = (form.services_config as any)?.concierge_items?.includes(item);
                  return (
                    <button key={item} type="button"
                      onClick={() => {
                        const cur = (form.services_config as any)?.concierge_items || [];
                        const upd = isActive ? cur.filter((i: string) => i !== item) : [...cur, item];
                        setForm({ ...form, services_config: { ...(form.services_config as any), concierge_items: upd } });
                      }}
                      className={cn('px-2 py-1 text-[8px] font-bold uppercase border',
                        isActive ? 'bg-gold/20 border-gold/50 text-gold' : 'bg-transparent border-white/10 text-white/20')}>
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-[#001c36] border-t border-gold/20 p-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-gold text-navy text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">
            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Hotel Client')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── HOTEL CARD ───────────────────────────────────────────────────────────────
const HotelCard: React.FC<{
  hotel: HotelClient;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}> = ({ hotel, onEdit, onDelete, onStatusChange }) => {
  const [showCreds, setShowCreds] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const trialDaysLeft = hotel.trial_ends_at
    ? Math.ceil((new Date(hotel.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#001c36] border border-gold/10 hover:border-gold/30 transition-all"
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-lg font-serif text-white">{hotel.hotel_name}</h3>
              <span className={cn('text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase', STATUS_COLORS[hotel.status])}>{hotel.status}</span>
              <span className={cn('text-[9px] font-bold uppercase', PLAN_COLORS[hotel.plan])}>{hotel.plan}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {hotel.city && <span className="flex items-center gap-1 text-[10px] text-white/40"><MapPin size={11} />{hotel.city}, {hotel.country}</span>}
              {hotel.rooms_count > 0 && <span className="flex items-center gap-1 text-[10px] text-white/40"><Building2 size={11} />{hotel.rooms_count} rooms</span>}
              {hotel.contact_phone && <span className="flex items-center gap-1 text-[10px] text-white/40"><Phone size={11} />{hotel.contact_phone}</span>}
              {hotel.contact_email && <span className="flex items-center gap-1 text-[10px] text-white/40"><Mail size={11} />{hotel.contact_email}</span>}
            </div>
            {trialDaysLeft !== null && hotel.status === 'trial' && (
              <p className={cn('text-[9px] font-bold mt-2', trialDaysLeft <= 7 ? 'text-red-400' : 'text-gold/60')}>
                {trialDaysLeft > 0 ? `⏱ Trial ends in ${trialDaysLeft} days` : '⚠ Trial expired'}
              </p>
            )}
            {hotel.monthly_fee > 0 && <p className="text-[9px] text-green-400 font-bold mt-1">AED {hotel.monthly_fee}/month</p>}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button onClick={() => setExpanded(!expanded)} className="p-2 text-gold/40 hover:text-gold">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={onEdit} className="p-2 text-gold/40 hover:text-gold"><Edit2 size={16} /></button>
            <button onClick={onDelete} className="p-2 text-red-400/40 hover:text-red-400"><Trash2 size={16} /></button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-gold/10 pt-4 space-y-4">
              {/* Credentials */}
              <div className="bg-navy/30 border border-gold/10 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] uppercase tracking-widest text-gold font-bold">Access Credentials</p>
                  <button onClick={() => setShowCreds(!showCreds)} className="flex items-center gap-1 text-[9px] text-gold/60 hover:text-gold uppercase font-bold">
                    {showCreds ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Staff Portal Entry Code</p>
                    <div className="flex items-center">
                      <code className="text-gold font-bold text-sm font-mono">{showCreds ? hotel.entry_code : '••••••'}</code>
                      {showCreds && <CopyButton text={hotel.entry_code} />}
                    </div>
                    <p className="text-[8px] text-white/20 mt-1">Guest types this to reach staff/executive login</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Executive Password</p>
                    <div className="flex items-center">
                      <code className="text-gold font-bold text-sm font-mono">{showCreds ? hotel.executive_password : '••••••••••'}</code>
                      {showCreds && <CopyButton text={hotel.executive_password} />}
                    </div>
                    <p className="text-[8px] text-white/20 mt-1">Executive uses this to login to operations center</p>
                  </div>
                </div>
              </div>



              {/* Quick Actions */}
              <div className="flex gap-2 flex-wrap">
                <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold w-full">Quick Actions</p>
                {hotel.status !== 'active' && (
                  <button onClick={() => onStatusChange('active')} className="px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 text-[9px] font-bold uppercase hover:bg-green-600/30">✓ Activate</button>
                )}
                {hotel.status !== 'suspended' && (
                  <button onClick={() => onStatusChange('suspended')} className="px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 text-[9px] font-bold uppercase hover:bg-red-600/30">⊘ Suspend</button>
                )}
                {hotel.status !== 'trial' && (
                  <button onClick={() => onStatusChange('trial')} className="px-3 py-1.5 bg-gold/20 border border-gold/30 text-gold text-[9px] font-bold uppercase hover:bg-gold/30">↺ Reset to Trial</button>
                )}
                <button onClick={onEdit} className="px-3 py-1.5 bg-navy/50 border border-gold/20 text-gold text-[9px] font-bold uppercase hover:bg-gold/10">✎ Edit / Reset Password</button>
              </div>

              {/* Notes */}
              {hotel.notes && (
                <div className="bg-navy/20 p-3 border-l-2 border-gold/30">
                  <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-xs text-white/60 italic">{hotel.notes}</p>
                </div>
              )}

              <p className="text-[8px] text-white/20">Client since: {new Date(hotel.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── MAIN ADMIN DASHBOARD ─────────────────────────────────────────────────────
export default function SentinelAdmin() {
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [hotels, setHotels] = useState<HotelClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelClient | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [adminName, setAdminName] = useState('');
  const [activeTab, setActiveTab] = useState<'hotels' | 'rooms'>('hotels');
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [bulkFloor, setBulkFloor] = useState('1');
  const [bulkStart, setBulkStart] = useState('101');
  const [bulkEnd, setBulkEnd] = useState('110');
  const [bulkType, setBulkType] = useState('Standard');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [singleRoom, setSingleRoom] = useState({ room_number: '', floor: '', room_type: 'Standard' });

  useEffect(() => {
    const saved = localStorage.getItem('sentinel_admin_session');
    if (saved) { setAdminLoggedIn(true); setAdminName(JSON.parse(saved).name); }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const { data, error } = await supabase.from('super_admin').select('*').eq('email', email).eq('password', password).single();
      if (error || !data) { setLoginError('Invalid email or password.'); setLoading(false); return; }
      localStorage.setItem('sentinel_admin_session', JSON.stringify({ email: data.email, name: data.name }));
      setAdminName(data.name);
      setAdminLoggedIn(true);
    } catch { setLoginError('Login failed. Please try again.'); } finally { setLoading(false); }
  };

  const fetchHotels = async () => {
    const { data } = await supabase.from('hotel_clients').select('*').order('created_at', { ascending: false });
    if (data) setHotels(data as HotelClient[]);
  };

  useEffect(() => { if (adminLoggedIn) fetchHotels(); }, [adminLoggedIn]);

  const fetchRoomsForHotel = async (hotelId: string) => {
    if (!hotelId) return;
    setRoomsLoading(true);
    const { data } = await supabase.from('rooms').select('*')
      .eq('hotel_id', hotelId).order('floor').order('room_number');
    if (data) setRooms(data);
    setRoomsLoading(false);
  };

  const handleBulkCreate = async () => {
    if (!selectedHotelId) { alert('Please select a hotel first.'); return; }
    const start = parseInt(bulkStart);
    const end = parseInt(bulkEnd);
    if (isNaN(start) || isNaN(end) || end < start) { alert('Invalid room number range.'); return; }
    if (end - start > 99) { alert('Maximum 100 rooms at a time.'); return; }
    const inserts = [];
    for (let n = start; n <= end; n++) {
      inserts.push({
        room_number: String(n),
        floor: bulkFloor,
        room_type: bulkType,
        status: 'Clean',
        hotel_id: selectedHotelId,
      });
    }
    const { error } = await supabase.from('rooms').insert(inserts);
    if (error) { alert('Error: ' + error.message); return; }
    alert(`✅ ${inserts.length} rooms created successfully!`);
    fetchRoomsForHotel(selectedHotelId);
  };

  const handleAddSingleRoom = async () => {
    if (!selectedHotelId || !singleRoom.room_number) return;
    const { error } = await supabase.from('rooms').insert({
      room_number: singleRoom.room_number,
      floor: singleRoom.floor,
      room_type: singleRoom.room_type,
      status: 'Clean',
      hotel_id: selectedHotelId,
    });
    if (error) { alert('Error: ' + error.message); return; }
    setSingleRoom({ room_number: '', floor: '', room_type: 'Standard' });
    setShowAddRoom(false);
    fetchRoomsForHotel(selectedHotelId);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Delete this room?')) return;
    await supabase.from('rooms').delete().eq('id', roomId);
    fetchRoomsForHotel(selectedHotelId);
  };

  const handleDeleteAllRooms = async () => {
    if (!selectedHotelId) return;
    if (!window.confirm('Delete ALL rooms for this hotel? This cannot be undone.')) return;
    await supabase.from('rooms').delete().eq('hotel_id', selectedHotelId);
    setRooms([]);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    await supabase.from('hotel_clients').delete().eq('id', id);
    fetchHotels();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('hotel_clients').update({ status }).eq('id', id);
    fetchHotels();
  };


  const logout = () => { localStorage.removeItem('sentinel_admin_session'); setAdminLoggedIn(false); setEmail(''); setPassword(''); };

  const filtered = hotels.filter(h => {
    const matchSearch = h.hotel_name.toLowerCase().includes(search.toLowerCase()) || h.city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || h.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats
  const totalRevenue = hotels.filter(h => h.status === 'active').reduce((s, h) => s + (h.monthly_fee || 0), 0);
  const activeCount = hotels.filter(h => h.status === 'active').length;
  const trialCount = hotels.filter(h => h.status === 'trial').length;
  const expiringSoon = hotels.filter(h => {
    if (!h.trial_ends_at || h.status !== 'trial') return false;
    const days = Math.ceil((new Date(h.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 7 && days > 0;
  }).length;

  // ─── LOGIN SCREEN ────────────────────────────────────────────────────────────
  if (!adminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#000d1a] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8 space-y-3">
            <div className="inline-block p-4 border border-gold/30 mb-2">
              <Shield className="w-12 h-12 text-gold" strokeWidth={1} />
            </div>
            <h1 className="text-3xl font-serif text-gold tracking-widest uppercase">Sentinel Pro</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">Super Admin Portal</p>
            <p className="text-[9px] text-red-400/60 uppercase tracking-widest">⚠ Restricted Access — Authorised Personnel Only</p>
          </div>
          <form onSubmit={handleLogin} className="bg-[#001c36] border border-gold/20 p-8 space-y-4 shadow-2xl">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Admin Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" placeholder="your@email.com" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-gold font-bold block">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-navy/50 border border-gold/20 text-white p-3 text-sm outline-none focus:border-gold" placeholder="••••••••••" />
            </div>
            {loginError && <p className="text-red-400 text-xs font-bold">{loginError}</p>}
            <button type="submit" disabled={loading} className="w-full py-4 bg-gold text-navy text-[10px] font-bold uppercase tracking-[0.3em] disabled:opacity-50">
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </form>
          <p className="text-center text-[8px] text-white/10 mt-6 uppercase tracking-widest">Sentinel Pro · Private & Confidential</p>
        </motion.div>
      </div>
    );
  }

  // ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#000d1a] text-white">
      {/* Header */}
      <header className="bg-[#001c36] border-b border-gold/20 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-serif text-gold tracking-wider">Sentinel Pro</h1>
          <p className="text-[9px] text-white/40 uppercase tracking-widest">Super Admin Dashboard · {adminName}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('hotels')}
              className={cn('px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider',
                activeTab === 'hotels' ? 'bg-gold text-navy' : 'bg-transparent text-gold/50 border border-gold/20')}>
              🏨 Hotels
            </button>
            <button onClick={() => { setActiveTab('rooms'); if (hotels.length > 0 && !selectedHotelId) { setSelectedHotelId(hotels[0].id); fetchRoomsForHotel(hotels[0].id); } }}
              className={cn('px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider',
                activeTab === 'rooms' ? 'bg-gold text-navy' : 'bg-transparent text-gold/50 border border-gold/20')}>
              🛏 Rooms
            </button>
          </div>
          <button onClick={fetchHotels} className="p-2 text-gold/40 hover:text-gold"><RefreshCw size={16} /></button>
          <button onClick={logout} className="flex items-center gap-2 border border-gold/20 text-gold px-4 py-2 text-[9px] font-bold uppercase hover:bg-gold/10">
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      {activeTab === 'hotels' && <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Clients', value: hotels.length, color: '#C5A059', icon: Building2 },
            { label: 'Active', value: activeCount, color: '#22c55e', icon: CheckCircle2 },
            { label: 'On Trial', value: trialCount, color: '#C5A059', icon: Clock },
            { label: 'Monthly Revenue', value: `AED ${totalRevenue.toLocaleString()}`, color: '#C5A059', icon: TrendingUp },
          ].map(k => (
            <div key={k.label} className="bg-[#001c36] border border-gold/10 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-serif mb-1" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {expiringSoon > 0 && (
          <div className="bg-gold/10 border border-gold/30 p-4 flex items-center gap-3">
            <AlertCircle className="text-gold flex-shrink-0" size={20} />
            <p className="text-gold text-sm font-bold">{expiringSoon} trial client{expiringSoon > 1 ? 's' : ''} expiring within 7 days — time to convert to paid!</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} className="bg-[#001c36] border border-gold/20 text-white px-4 py-2 text-sm outline-none focus:border-gold w-64" placeholder="Search hotels..." />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#001c36] border border-gold/20 text-white px-4 py-2 text-sm outline-none focus:border-gold">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button onClick={() => { setEditingHotel(null); setShowModal(true); }} className="flex items-center gap-2 bg-gold text-navy px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-gold/90">
            <Plus size={14} /> Add Hotel Client
          </button>
        </div>

        {/* Hotel List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="py-20 text-center bg-[#001c36] border border-gold/10">
              <Building2 className="w-12 h-12 text-gold/20 mx-auto mb-4" strokeWidth={1} />
              <p className="text-white/20 font-serif italic text-lg">No hotel clients yet</p>
              <p className="text-white/10 text-sm mt-2">Click "Add Hotel Client" to onboard your first hotel</p>
              <button onClick={() => { setEditingHotel(null); setShowModal(true); }} className="mt-6 flex items-center gap-2 bg-gold text-navy px-6 py-3 text-[10px] font-bold uppercase tracking-widest mx-auto">
                <Plus size={14} /> Add First Hotel
              </button>
            </div>
          ) : (
            filtered.map(hotel => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                onEdit={() => { setEditingHotel(hotel); setShowModal(true); }}
                onDelete={() => handleDelete(hotel.id, hotel.hotel_name)}
                onStatusChange={(status) => handleStatusChange(hotel.id, status)}
              />
            ))
          )}
        </div>

        {/* Summary */}
        {hotels.length > 0 && (
          <div className="bg-[#001c36] border border-gold/10 p-5">
            <p className="text-[9px] uppercase tracking-widest text-gold font-bold mb-4">Client Summary</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gold/20 text-[9px] uppercase tracking-widest text-gold/60">
                    <th className="p-3 text-left">Hotel</th>
                    <th className="p-3 text-left">City</th>
                    <th className="p-3 text-left">Contact</th>
                    <th className="p-3 text-center">Rooms</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Plan</th>
                    <th className="p-3 text-right">Fee/Month</th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map(h => (
                    <tr key={h.id} className="border-b border-gold/5 hover:bg-gold/5 transition-colors">
                      <td className="p-3 text-sm font-bold text-white">{h.hotel_name}</td>
                      <td className="p-3 text-xs text-white/50">{h.city || '—'}</td>
                      <td className="p-3 text-xs text-white/50">{h.contact_name || '—'}</td>
                      <td className="p-3 text-center text-sm text-white">{h.rooms_count || '—'}</td>
                      <td className="p-3 text-center"><span className={cn('text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase', STATUS_COLORS[h.status])}>{h.status}</span></td>
                      <td className="p-3 text-center"><span className={cn('text-[9px] font-bold uppercase', PLAN_COLORS[h.plan])}>{h.plan}</span></td>
                      <td className="p-3 text-right text-sm font-bold text-gold">{h.monthly_fee > 0 ? `AED ${h.monthly_fee}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-center text-[8px] text-white/10 uppercase tracking-widest pb-4">Sentinel Pro · Super Admin · Private & Confidential</p>
      </div>}

      {/* ── ROOMS MANAGEMENT TAB ── */}
      {activeTab === 'rooms' && (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          <div className="bg-[#001c36] border border-gold/20 p-4">
            <h2 className="text-sm font-serif text-gold mb-3">🛏 Room Management</h2>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[9px] text-white/40 uppercase tracking-widest block mb-1">Select Hotel</label>
                <select value={selectedHotelId} onChange={e => { setSelectedHotelId(e.target.value); fetchRoomsForHotel(e.target.value); }}
                  className="w-full bg-navy/50 border border-gold/20 text-white p-2.5 text-sm outline-none">
                  <option value="">-- Select a hotel --</option>
                  {hotels.map(h => <option key={h.id} value={h.id}>{h.hotel_name} ({h.city})</option>)}
                </select>
              </div>
              {selectedHotelId && <p className="text-[9px] text-white/40 pt-4">{rooms.length} rooms configured</p>}
            </div>
          </div>

          {selectedHotelId && (<>
            {/* Bulk Create */}
            <div className="bg-[#001c36] border border-gold/20 p-4 space-y-3">
              <h3 className="text-[10px] uppercase tracking-widest text-gold font-bold">⚡ Bulk Create Rooms</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 uppercase tracking-widest block mb-1">Floor</label>
                  <input value={bulkFloor} onChange={e => setBulkFloor(e.target.value)}
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" placeholder="e.g. 1" />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 uppercase tracking-widest block mb-1">From Room #</label>
                  <input value={bulkStart} onChange={e => setBulkStart(e.target.value)}
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" placeholder="e.g. 101" />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 uppercase tracking-widest block mb-1">To Room #</label>
                  <input value={bulkEnd} onChange={e => setBulkEnd(e.target.value)}
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none" placeholder="e.g. 120" />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 uppercase tracking-widest block mb-1">Room Type</label>
                  <select value={bulkType} onChange={e => setBulkType(e.target.value)}
                    className="w-full bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none">
                    {['Standard','Deluxe','Suite','Junior Suite','Presidential Suite','Studio','Villa','Penthouse','Connecting Room'].map(t =>
                      <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleBulkCreate}
                  className="bg-gold text-navy px-5 py-2 text-[9px] font-bold uppercase tracking-wider hover:bg-gold/80">
                  Create {Math.max(0, (parseInt(bulkEnd)||0) - (parseInt(bulkStart)||0) + 1)} Rooms
                </button>
                <p className="text-[8px] text-white/30 italic">Max 100 rooms per batch. Repeat for each floor.</p>
              </div>
            </div>

            {/* Add Single Room */}
            <div className="bg-[#001c36] border border-gold/20 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] uppercase tracking-widest text-gold font-bold">+ Add Single Room</h3>
                <button onClick={() => setShowAddRoom(!showAddRoom)} className="text-[9px] text-gold/60 hover:text-gold">
                  {showAddRoom ? '▲ Hide' : '▼ Show'}
                </button>
              </div>
              {showAddRoom && (
                <div className="flex gap-3 flex-wrap">
                  <input value={singleRoom.room_number} onChange={e => setSingleRoom({...singleRoom, room_number: e.target.value})}
                    placeholder="Room #" className="bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none w-24" />
                  <input value={singleRoom.floor} onChange={e => setSingleRoom({...singleRoom, floor: e.target.value})}
                    placeholder="Floor" className="bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none w-20" />
                  <select value={singleRoom.room_type} onChange={e => setSingleRoom({...singleRoom, room_type: e.target.value})}
                    className="bg-navy/50 border border-gold/20 text-white p-2 text-sm outline-none">
                    {['Standard','Deluxe','Suite','Junior Suite','Presidential Suite','Studio','Villa','Penthouse','Connecting Room'].map(t =>
                      <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={handleAddSingleRoom}
                    className="bg-gold text-navy px-4 py-2 text-[9px] font-bold uppercase">+ Add</button>
                </div>
              )}
            </div>

            {/* Rooms Table */}
            <div className="bg-[#001c36] border border-gold/20">
              <div className="flex justify-between items-center p-4 border-b border-gold/10">
                <h3 className="text-[10px] uppercase tracking-widest text-gold font-bold">{rooms.length} Rooms Configured</h3>
                {rooms.length > 0 && (
                  <button onClick={handleDeleteAllRooms} className="text-[9px] text-red-400/60 hover:text-red-400 uppercase font-bold">🗑 Delete All Rooms</button>
                )}
              </div>
              {roomsLoading ? (
                <div className="p-8 text-center text-white/30 text-sm">Loading...</div>
              ) : rooms.length === 0 ? (
                <div className="p-8 text-center text-white/20 italic text-sm">No rooms yet. Use bulk create above.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-navy/60 border-b border-gold/10">
                        <th className="p-3 text-left text-gold/60 uppercase font-bold">Room #</th>
                        <th className="p-3 text-left text-gold/60 uppercase font-bold">Type</th>
                        <th className="p-3 text-left text-gold/60 uppercase font-bold">Floor</th>
                        <th className="p-3 text-left text-gold/60 uppercase font-bold">Status</th>
                        <th className="p-3 text-center text-gold/60 uppercase font-bold">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room, i) => (
                        <tr key={room.id} className={i%2===0?'bg-[#001020]':'bg-[#001530]'}>
                          <td className="p-3 text-gold font-bold">Room {room.room_number}</td>
                          <td className="p-3 text-white/70">{room.room_type}</td>
                          <td className="p-3 text-white/50">Floor {room.floor}</td>
                          <td className="p-3">
                            <span className={cn('text-[8px] font-bold px-2 py-0.5 rounded-full',
                              room.status==='Clean'?'bg-green-900/40 text-green-400':
                              room.status==='Dirty'?'bg-red-900/40 text-red-400':
                              room.status==='Inspected'?'bg-orange-900/40 text-orange-400':'bg-white/10 text-white/50')}>
                              {room.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button onClick={() => handleDeleteRoom(room.id)} className="text-red-400/40 hover:text-red-400"><X size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>)}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <HotelModal
            hotel={editingHotel}
            onClose={() => { setShowModal(false); setEditingHotel(null); }}
            onSave={fetchHotels}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
