'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Trash2, Send, Users, Link as LinkIcon } from 'lucide-react';

type Broadcast = {
  id: string;
  title: string;
  message: string;
  action_url: string | null;
  created_at: string;
};

export default function AdminBroadcastPanel() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [targetUser, setTargetUser] = useState('ALL');

  // Helper to grab the Supabase Native Token securely without guessing your specific library wrapper
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const tokenData = JSON.parse(localStorage.getItem(key) || '{}');
          if (tokenData?.access_token) {
            headers['Authorization'] = `Bearer ${tokenData.access_token}`;
            break;
          }
        }
      }
    } catch (e) {
      console.warn("Could not retrieve local Supabase token.");
    }

    return headers;
  };

  const fetchBroadcasts = async () => {
    try {
      // Added cache-busting timestamp to strictly bypass Next.js aggressive caching
      const res = await fetch(`/api/admin/broadcast?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data.broadcasts || []);
      }
    } catch (error) {
      console.error("Failed to fetch broadcasts", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      const headers = getAuthHeaders();
      headers['Content-Type'] = 'application/json';

      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetUserId: targetUser,
          title: title.trim(),
          message: message.trim(),
          actionUrl: actionUrl.trim() || null,
        })
      });

      if (res.ok) {
        alert("Broadcast sent successfully!");
        setTitle('');
        setMessage('');
        setActionUrl('');
        fetchBroadcasts(); // Refresh history
      } else {
        alert("Failed to send broadcast.");
      }
    } catch (error) {
      alert("An error occurred.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (broadcastTitle: string) => {
    if (!confirm(`Are you sure you want to retract the message: "${broadcastTitle}"? It will be removed from all user inboxes.`)) return;
    
    try {
      const res = await fetch(`/api/admin/broadcast?title=${encodeURIComponent(broadcastTitle)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        fetchBroadcasts();
      } else {
        alert("Failed to delete broadcast.");
      }
    } catch (error) {
      alert("Error deleting broadcast.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      
      {/* SEND BROADCAST FORM */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Megaphone className="h-5 w-5 text-blue-600" /> Send Announcement
        </h3>
        
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target</label>
            <select 
              value={targetUser} 
              onChange={(e) => setTargetUser(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
            >
              <option value="ALL">All Active Users</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notification Title</label>
            <input 
              type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., System Maintenance Update"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message Body</label>
            <textarea 
              required value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want to tell your users?"
              className="w-full p-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> Action URL (Optional)
            </label>
            <input 
              type="text" value={actionUrl} onChange={(e) => setActionUrl(e.target.value)}
              placeholder="E.g., /dashboard/settings"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button 
            type="submit" disabled={isSending || !title || !message}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mt-2"
          >
            <Send className="h-4 w-4" /> {isSending ? 'Broadcasting...' : 'Send Broadcast'}
          </button>
        </form>
      </div>

      {/* BROADCAST HISTORY */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Users className="h-5 w-5 text-slate-600" /> Recent Broadcasts
        </h3>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {isLoading ? (
            <p className="text-slate-400 text-sm text-center py-10">Loading history...</p>
          ) : broadcasts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              No recent announcements.
            </p>
          ) : (
            broadcasts.map((b) => (
              <div key={b.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 relative group">
                <div className="pr-10">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{b.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">{b.message}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Sent: {new Date(b.created_at).toLocaleString()}
                  </p>
                </div>
                
                {/* Delete/Retract Button */}
                <button 
                  onClick={() => handleDelete(b.title)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  title="Retract Message"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  );
}