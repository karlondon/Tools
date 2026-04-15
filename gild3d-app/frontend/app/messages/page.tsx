'use client';
import { useState, useEffect } from 'react';
import { messageAPI } from '@/lib/api';
import Link from 'next/link';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    messageAPI.getConversations().then(r => { setConversations(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl font-bold text-white mb-6">Messages</h1>
      {loading ? <p className="text-gray-400">Loading…</p> : conversations.length === 0 ? (
        <div className="card-dark text-center py-12">
          <p className="text-gray-400 mb-4">No conversations yet</p>
          <Link href="/browse" className="btn-gold">Browse Members</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((msg: any) => {
            const other = msg.sender?.profile || msg.receiver?.profile;
            const photo = other?.photos?.[0];
            return (
              <Link key={msg.id} href={`/messages/${msg.senderId === msg.receiverId ? msg.receiverId : msg.senderId}`} className="card-dark flex items-center gap-4 hover:border-gold-500 transition-colors">
                <div className="w-12 h-12 rounded-full bg-dark-600 flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                  {photo ? <img src={photo.url} alt="" className="w-full h-full object-cover" /> : '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{other?.displayName || 'Member'}</p>
                  <p className="text-gray-400 text-sm truncate">{msg.content}</p>
                </div>
                <span className="text-gray-500 text-xs flex-shrink-0">{new Date(msg.createdAt).toLocaleDateString()}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}