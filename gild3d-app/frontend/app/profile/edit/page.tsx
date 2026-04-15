'use client';
import { useState, useEffect } from 'react';
import { profileAPI, authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({ displayName:'', age:'', gender:'', location:'', country:'', bio:'', headline:'', occupation:'', lookingFor:'' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authAPI.getMe().then((r: any) => {
      const p = r.data.profile;
      if (p) setForm({ displayName:p.displayName||'', age:p.age||'', gender:p.gender||'', location:p.location||'', country:p.country||'', bio:p.bio||'', headline:p.headline||'', occupation:p.occupation||'', lookingFor:p.lookingFor||'' });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await profileAPI.update({ ...form, age: form.age ? parseInt(form.age) : undefined });
      toast.success('Profile updated!');
      router.push('/browse');
    } catch { toast.error('Update failed'); }
    setLoading(false);
  };

  const f = (k: string) => ({ value: (form as any)[k], onChange: (e: any) => setForm({...form, [k]: e.target.value}) });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl font-bold text-white mb-8">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="card-dark space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Display Name *</label><input className="input-dark" {...f('displayName')} required /></div>
          <div><label className="label">Age</label><input className="input-dark" type="number" min="18" max="99" {...f('age')} /></div>
          <div><label className="label">Gender</label>
            <select className="input-dark" {...f('gender')}>
              <option value="">Select…</option>
              <option>Male</option><option>Female</option><option>Non-binary</option><option>Other</option>
            </select>
          </div>
          <div><label className="label">Location / City</label><input className="input-dark" placeholder="New York" {...f('location')} /></div>
          <div><label className="label">Country</label><input className="input-dark" placeholder="USA" {...f('country')} /></div>
          <div><label className="label">Occupation</label><input className="input-dark" {...f('occupation')} /></div>
        </div>
        <div><label className="label">Headline</label><input className="input-dark" placeholder="A short tagline…" {...f('headline')} /></div>
        <div><label className="label">About Me</label><textarea className="input-dark h-32 resize-none" placeholder="Tell us about yourself…" {...f('bio')} /></div>
        <div><label className="label">Looking For</label><input className="input-dark" placeholder="What type of connection are you seeking?" {...f('lookingFor')} /></div>
        <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}