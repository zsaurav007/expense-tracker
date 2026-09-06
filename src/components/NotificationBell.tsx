'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trash2, Megaphone, Calendar, Wallet } from 'lucide-react';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
};

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optional: Refresh notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { markAll: true }),
      });
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClearRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) handleMarkAsRead(notif.id);
    setIsOpen(false);
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const getIcon = (type: string) => {
    if (type === 'ADMIN_MESSAGE') return <Megaphone className="h-4 w-4 text-blue-500" />;
    if (type === 'RECURRING_BILL') return <Calendar className="h-4 w-4 text-orange-500" />;
    return <Wallet className="h-4 w-4 text-red-500" />; // LEDGER_DUE
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button onClick={() => handleMarkAsRead()} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 flex items-center gap-1">
                    <CheckCheck className="h-3 w-3" /> Mark Read
                  </button>
                )}
                <button onClick={handleClearRead} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* FULLY FIXED SCROLL CONTAINER */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1 max-h-[400px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  All caught up!
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 rounded-xl cursor-pointer transition-colors flex gap-3 ${notif.is_read ? 'bg-transparent hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                  >
                    <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center border ${notif.is_read ? 'bg-white border-slate-100' : 'bg-white border-blue-100'}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div>
                      <p className={`text-sm ${notif.is_read ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'}`}>
                        {notif.title}
                      </p>
                      <p className={`text-xs mt-0.5 leading-snug ${notif.is_read ? 'text-slate-500' : 'text-slate-600 font-medium'}`}>
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1.5 uppercase tracking-wider font-bold">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}