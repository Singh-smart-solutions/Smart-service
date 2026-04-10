import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { useLanguage } from '../contexts/TranslationContext';
import { TrendingUp, Clock, Users, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { ServiceRequest } from '../types';

export const ManagerDashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingCount: 0,
    completedCount: 0,
    avgSla: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'requests'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
      setRequests(reqs);

      // Calculate stats
      let revenue = 0;
      let pending = 0;
      let completed = 0;
      let totalSla = 0;
      let completedWithSla = 0;

      reqs.forEach(req => {
        if (req.status === 'Completed') {
          completed++;
          revenue += (req.totalPrice || 0);
          if (req.completed_time && req.timestamp) {
            const diff = (req.completed_time.toDate().getTime() - req.timestamp.toDate().getTime()) / 60000;
            totalSla += diff;
            completedWithSla++;
          }
        } else {
          pending++;
        }
      });

      setStats({
        totalRevenue: revenue * 1.05, // Including 5% VAT
        pendingCount: pending,
        completedCount: completed,
        avgSla: completedWithSla > 0 ? totalSla / completedWithSla : 0
      });
    });

    return () => unsubscribe();
  }, []);

  const getSlaTime = (timestamp: any) => {
    if (!timestamp) return 0;
    const now = new Date().getTime();
    const start = timestamp.toDate().getTime();
    return Math.floor((now - start) / 60000);
  };

  return (
    <div className="p-6 lg:p-12 space-y-12 bg-black min-h-screen font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-serif text-zinc-100 luxury-text-shadow">
            {t('executive_dashboard')}
          </h1>
          <p className="text-gold text-xs tracking-widest uppercase mt-2 font-bold">
            Real-time Operational Oversight
          </p>
        </div>
        
        <div className="bg-zinc-900/50 border border-gold/20 p-6 rounded-3xl flex items-center gap-6 backdrop-blur-md">
          <div className="p-4 bg-gold/10 rounded-2xl">
            <TrendingUp className="text-gold w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
              {t('daily_revenue')}
            </p>
            <p className="text-3xl font-serif text-gold">
              {stats.totalRevenue.toLocaleString()} <span className="text-xs uppercase ml-1">AED</span>
            </p>
            <p className="text-[8px] text-zinc-600 uppercase tracking-tighter mt-1">
              {t('includes_vat')}
            </p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: t('pending'), value: stats.pendingCount, icon: Clock, color: 'text-gold' },
          { label: t('completed'), value: stats.completedCount, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Avg. SLA', value: `${Math.round(stats.avgSla)} min`, icon: AlertCircle, color: 'text-blue-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">{stat.label}</p>
              <p className="text-3xl font-serif text-zinc-100">{stat.value}</p>
            </div>
            <stat.icon className={`${stat.color} w-10 h-10 opacity-50`} />
          </div>
        ))}
      </div>

      {/* Master Table */}
      <div className="bg-zinc-900/30 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-8 text-[10px] uppercase tracking-widest text-gold font-bold">{t('room_number')}</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-gold font-bold">{t('service_requested')}</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-gold font-bold">{t('time_ordered')}</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-gold font-bold">{t('assigned_staff')}</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-gold font-bold">{t('sla_timer')}</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-gold font-bold">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.map((req) => {
                const sla = getSlaTime(req.timestamp);
                const isOverSla = sla > 10 && req.status !== 'Completed';
                
                return (
                  <motion.tr 
                    key={req.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`group hover:bg-white/5 transition-colors ${isOverSla ? 'bg-red-500/10' : ''}`}
                  >
                    <td className="p-8">
                      <span className="text-lg font-serif text-zinc-100">#{req.roomNumber}</span>
                    </td>
                    <td className="p-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-zinc-300">{req.type}</p>
                          {req.priority === 'High' && req.status !== 'Completed' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-[8px] font-black uppercase tracking-tighter rounded animate-pulse">
                              <AlertCircle size={10} />
                              Emergency
                            </span>
                          )}
                        </div>
                        {req.items && (
                          <p className="text-[10px] text-zinc-500">
                            {req.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-8 text-xs text-zinc-500">
                      {req.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-8">
                      {req.assignedStaffEmail ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gold" />
                          <span className="text-xs text-zinc-400">{req.assignedStaffEmail}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-600 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-8">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase ${isOverSla ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Clock size={12} />
                        {sla} min
                      </div>
                    </td>
                    <td className="p-8">
                      <span className={`text-[10px] uppercase tracking-widest font-bold ${
                        req.status === 'Completed' ? 'text-green-500' :
                        req.status === 'In Progress' ? 'text-blue-500' :
                        'text-gold'
                      }`}>
                        {t(req.status.toLowerCase().replace(' ', '_'))}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
