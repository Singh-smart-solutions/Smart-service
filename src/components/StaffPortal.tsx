import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, query, onSnapshot, where, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useLanguage } from '../contexts/TranslationContext';
import { CheckCircle, Clock, User, ClipboardList } from 'lucide-react';
import { ServiceRequest, UserProfile } from '../types';

interface StaffPortalProps {
  userProfile: UserProfile;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({ userProfile }) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Filter by department
    const q = query(
      collection(db, 'requests'), 
      where('department', '==', userProfile.department),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
      setTasks(taskList.filter(t => t.status !== 'Completed'));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile.department]);

  const handleAccept = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'requests', taskId), {
        status: 'In Progress',
        accepted_time: serverTimestamp(),
        assignedStaffEmail: userProfile.email
      });
    } catch (error) {
      console.error("Error accepting task:", error);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'requests', taskId), {
        status: 'Completed',
        completed_time: serverTimestamp()
      });
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-12 bg-black min-h-screen font-sans">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif text-zinc-100 luxury-text-shadow">
            {userProfile.department} {t('staff_portal')}
          </h1>
          <p className="text-gold text-xs tracking-widest uppercase mt-2 font-bold">
            {t('welcome_back')}, {userProfile.displayName}
          </p>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
            <User className="text-gold w-5 h-5" />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{userProfile.role}</p>
            <p className="text-xs text-zinc-300">{userProfile.email}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900/30 border border-white/5 p-8 rounded-[3rem] space-y-6 backdrop-blur-sm hover:border-gold/20 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="bg-gold/10 px-4 py-2 rounded-full">
                  <span className="text-gold text-[10px] font-bold tracking-widest uppercase">#{task.roomNumber}</span>
                </div>
                <div className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                  task.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500' : 'bg-gold/10 text-gold'
                }`}>
                  {t(task.status.toLowerCase().replace(' ', '_'))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-serif text-zinc-100">{task.type}</h3>
                  {task.priority === 'High' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-[8px] font-black uppercase tracking-tighter rounded animate-pulse">
                      Emergency
                    </span>
                  )}
                </div>
                {task.items && (
                  <ul className="space-y-1">
                    {task.items.map((item, idx) => (
                      <li key={idx} className="text-xs text-zinc-500 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-zinc-700" />
                        {item.quantity}x {item.name}
                      </li>
                    ))}
                  </ul>
                )}
                {task.message && (
                  <p className="text-xs text-zinc-400 italic bg-white/5 p-4 rounded-2xl mt-4">
                    "{task.message}"
                  </p>
                )}
              </div>

              <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                {task.status === 'Pending' ? (
                  <button 
                    onClick={() => handleAccept(task.id)}
                    className="w-full py-4 bg-gold text-black rounded-2xl font-bold hover:bg-champagne transition-all uppercase tracking-widest text-[10px]"
                  >
                    Accept Task
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                      <Clock size={14} className="text-blue-500" />
                      <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">In Progress</span>
                    </div>
                    <button 
                      onClick={() => handleComplete(task.id)}
                      className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-500 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} />
                      Mark Completed
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && !loading && (
          <div className="col-span-full py-24 text-center space-y-6">
            <div className="inline-block p-8 bg-zinc-900/50 rounded-full border border-white/5">
              <ClipboardList className="w-12 h-12 text-zinc-700" />
            </div>
            <p className="text-zinc-500 uppercase tracking-[0.3em] text-xs">No pending tasks for your department</p>
          </div>
        )}
      </div>
    </div>
  );
};
