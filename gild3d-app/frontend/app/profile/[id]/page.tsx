'use client';
import { useEffect, useState } from 'react';
import { profileAPI, messageAPI } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const authed = typeof window !== 'undefined' ? isAuthenticated() : false;

  useEffect(() => {
    profileAPI.getOne(params.id).then((r: any) => { setProfile(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [params.id]);

  const sendMessage = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await messageAPI.send(params.id, msg);
      toast.success('Message sent!');
      setMsg('');
    } catch (e: any) {
      if (e.response?.data?.upgrade) { toast.error('Upgrade to message members'); }
      else toast.error('Failed to send message');
    }
    setSending(false);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!profile) return <div className="text-center py-20 text-gray-400">Profile not found</div>;

  const primaryPhoto = profile.photos?.find((p: any) => p.isPrimary) || profile.photos?.[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="card-dark">
            <div className="w-full h-64 bg-dark-700 rounded-lg overflow-hidden mb-4">
              {primaryPhoto ? <img src={primaryPhoto.url} alt={profile.displayName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-6xl">👤</div>}
            </div>
            {profile.user?.membershipTier !== 'FREE' && <span className="badge-gold mb-3 inline-block">{profile.user?.membershipTier}</span>}
            <h1 className="text-2xl font-bold text-white mb-1">{profile.displayName}{profile.age && `, ${profile.age}`}</h1>
            {profile.location && <p className="text-gray-400 text-sm mb-1">📍 {profile.location}</p>}
            <span className={`text-xs px-2 py-1 rounded-full ${profile.user?.memberType === 'SUCCESSFUL' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>
              {profile.user?.memberType === 'SUCCESSFUL' ? '💎 Successful' : '✨ Companion'}
            </span>
          </div>

          {authed && (
            <div className="card-dark mt-4">
              <h3 className="text-white font-semibold mb-3">Send a Message</h3>
              <textarea className="input-dark h-24 resize-none mb-3" placeholder="Write something…" value={msg} onChange={e => setMsg(e.target.value)} />
              <button onClick={sendMessage} disabled={sending} className="btn-gold w-full disabled:opacity-50">{sending ? 'Sending…' : 'Send Message'}</button>
            </div>
          )}
          {!authed && <div className="card-dark mt-4 text-center"><p className="text-gray-400 mb-3 text-sm">Sign in to message this member</p><Link href="/auth/login" className="btn-gold">Sign In</Link></div>}
        </div>

        <div className="md:col-span-2 space-y-6">
          {profile.headline && <div className="card-dark"><p className="text-gold-300 text-lg italic">"{profile.headline}"</p></div>}
          {profile.bio && <div className="card-dark"><h3 className="text-white font-semibold mb-2">About</h3><p className="text-gray-300 leading-relaxed">{profile.bio}</p></div>}
          <div className="card-dark grid grid-cols-2 gap-4">
            {[['Occupation',profile.occupation],['Education',profile.education],['Height',profile.height ? `${profile.height}cm` : null],['Body Type',profile.bodyType],['Ethnicity',profile.ethnicity],['Looking For',profile.lookingFor]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k as string}><p className="text-gray-400 text-xs uppercase tracking-wide">{k}</p><p className="text-white">{v}</p></div>
            ))}
          </div>
          {profile.photos?.length > 1 && (
            <div className="card-dark"><h3 className="text-white font-semibold mb-3">Photos</h3>
              <div className="grid grid-cols-3 gap-3">
                {profile.photos.map((p: any, i: number) => <div key={i} className="h-24 rounded-lg overflow-hidden bg-dark-700"><img src={p.url} alt="" className="w-full h-full object-cover" /></div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}