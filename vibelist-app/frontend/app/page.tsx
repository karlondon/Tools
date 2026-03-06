'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// Types
interface Listing { id:number; title:string; description:string; category:string; city:string; price:string|null; contact_info:string|null; status:string; views:number; featured:boolean; created_at:string; updated_at:string; author?:string; author_id?:number; user_id?:number; image?:string; images?:{id:number;file_path:string;thumbnail_path:string|null;sort_order:number}[]; }
interface User { id:number; email:string; display_name:string; subscription_status:string; is_admin?:boolean; is_founding_member?:boolean; founding_member_number?:number; }
interface AdminUser { id:number; email:string; display_name:string; subscription_status:string; subscription_provider?:string; is_admin:boolean; is_founding_member:boolean; founding_member_number:number|null; created_at:string; }
interface Message { id:number; sender_id:number; receiver_id:number; listing_id:number|null; message_text:string; read:boolean; created_at:string; sender_name?:string; }

const CATEGORIES = ['all','services','events','jobs','property','vehicles','electronics','fashion','beauty','health','community','other'];
const CITIES = ['all','london','manchester','birmingham','leeds','glasgow','liverpool','bristol','edinburgh','cardiff','belfast','sheffield','nottingham','other'];
const CAT_ICONS: Record<string,string> = {all:'🌐',services:'🔧',events:'🎉',jobs:'💼',property:'🏠',vehicles:'🚗',electronics:'💻',fashion:'👗',beauty:'💄',health:'💪',community:'🤝',other:'📦'};
const CITY_ICONS: Record<string,string> = {all:'🌍',london:'🇬🇧',manchester:'⚽',birmingham:'🏭',leeds:'🦁',glasgow:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',liverpool:'🎸',bristol:'🌉',edinburgh:'🏰',cardiff:'🐉',belfast:'☘️',sheffield:'⚒️',nottingham:'🏹',other:'📍'};
const EMOJIS = ['✨','🔥','💎','⭐','🎯','💡','🚀','❤️','🎨','🎵','🌟','💰','📸','🏆','🌈','🍕','🎁','🔑','💼','🏠','🚗','💻','👗','💄','💪','🤝','📦','🎉','🔧','📍'];
const API = '/api';

// Styles
const S: Record<string,React.CSSProperties> = {
  inp: {width:'100%',padding:'12px 14px',marginBottom:10,background:'#181818',color:'#fff',border:'1px solid #2a2a2a',borderRadius:10,boxSizing:'border-box' as const,fontSize:'0.95rem',outline:'none',transition:'border 0.2s'},
  btn: {width:'100%',padding:14,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:12,fontSize:'1rem',cursor:'pointer',fontWeight:600,transition:'opacity 0.2s'},
  btnSec: {padding:'10px 20px',background:'transparent',color:'#888',border:'1px solid #333',borderRadius:10,cursor:'pointer',fontSize:'0.9rem',transition:'all 0.2s'},
  card: {background:'#141414',padding:24,borderRadius:16,marginBottom:16,border:'1px solid #1e1e1e',transition:'border 0.2s'},
  tag: {display:'inline-block',padding:'4px 12px',borderRadius:20,fontSize:'0.8rem',fontWeight:500},
};

export default function Home() {
  // State
  const [listings, setListings] = useState<Listing[]>([]);
  const [catFilter, setCatFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User|null>(null);
  const [token, setToken] = useState('');
  const [view, setView] = useState<'home'|'login'|'register'|'subscribe'|'create'|'detail'|'my-listings'|'messages'|'admin'>('home');
  const [af, setAf] = useState({email:'',password:'',name:'',dob_d:'',dob_m:'',dob_y:''});
  const [err, setErr] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing|null>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminListings, setAdminListings] = useState<Listing[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminTab, setAdminTab] = useState<'overview'|'users'|'pending'>('overview');
  const [msgText, setMsgText] = useState('');
  const [page, setPage] = useState(1);

  // Create form state
  const [form, setForm] = useState({title:'',description:'',category:'services',city:'london',price:'',contact_info:'',emoji:'✨'});
  const [formImages, setFormImages] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auth init
  useEffect(() => {
    const t = localStorage.getItem('vl_token');
    if (t) { setToken(t); fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.ok?r.json():null).then(u=>{if(u)setUser(u);else{localStorage.removeItem('vl_token');setToken('');}}).catch(()=>{}); }
  }, []);

  // Fetch listings
  const fetchListings = useCallback(async () => {
    try {
      let url = `${API}/listings?page=${page}&limit=20`;
      if (catFilter !== 'all') url += `&category=${catFilter}`;
      if (cityFilter !== 'all') url += `&city=${cityFilter}`;
      const r = await fetch(url);
      if (r.ok) { const d = await r.json(); setListings(d.listings || []); }
    } catch {} finally { setLoading(false); }
  }, [catFilter, cityFilter, page]);
  useEffect(() => { fetchListings(); }, [fetchListings]);

  // PayPal return handler
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sid = p.get('subscription_id');
    if (sid && token) {
      fetch(`${API}/subscription/paypal/activate`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({subscription_id:sid})})
        .then(r=>r.json()).then(d=>{if(d.status==='active'){fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(setUser);alert('🎉 Subscription activated!');}window.history.replaceState({},'','/');});
    }
  }, [token]);

  // Auth handler
  const doAuth = async (e:React.FormEvent) => {
    e.preventDefault(); setErr('');
    const isReg = view==='register';
    const body: any = {email:af.email,password:af.password};
    if (isReg) { body.display_name=af.name; body.date_of_birth=`${af.dob_y}-${af.dob_m.padStart(2,'0')}-${af.dob_d.padStart(2,'0')}`; }
    const r = await fetch(`${API}/auth/${isReg?'register':'login'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await r.json();
    if (r.ok) { setToken(d.token); localStorage.setItem('vl_token',d.token); setUser(d.user); setView('home'); setAf({email:'',password:'',name:'',dob_d:'',dob_m:'',dob_y:''}); }
    else setErr(d.error);
  };

  const logout = () => { setUser(null); setToken(''); localStorage.removeItem('vl_token'); setView('home'); };

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (formImages.length >= 5) return;
      if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
      const reader = new FileReader();
      reader.onload = () => { setFormImages(prev => prev.length < 5 ? [...prev, reader.result as string] : prev); };
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (idx: number) => { setFormImages(prev => prev.filter((_,i) => i !== idx)); };

  // Insert emoji into description
  const insertEmoji = (emoji: string) => { setForm(f => ({...f, description: f.description + emoji})); setShowEmojiPicker(false); };

  // Create listing
  const createListing = async (e:React.FormEvent) => {
    e.preventDefault(); setUploading(true); setErr('');
    try {
      const r = await fetch(`${API}/listings`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({
        title: `${form.emoji} ${form.title}`,
        description: form.description,
        category: form.category,
        city: form.city,
        price: form.price ? parseFloat(form.price) : null,
        contact_info: form.contact_info || null,
      })});
      if (!r.ok) { const d = await r.json(); if (d.code === 'NO_SUBSCRIPTION') { setView('subscribe'); return; } setErr(d.error || 'Failed to create listing'); return; }
      const listing = await r.json();
      // Upload images
      for (const img of formImages) {
        await fetch(`${API}/listings/${listing.id}/images`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({image_data:img})});
      }
      setForm({title:'',description:'',category:'services',city:'london',price:'',contact_info:'',emoji:'✨'});
      setFormImages([]);
      setView('home');
      fetchListings();
    } catch { setErr('Failed to create listing'); } finally { setUploading(false); }
  };

  // View listing detail
  const viewListing = async (id: number) => {
    try {
      const r = await fetch(`${API}/listings/${id}`);
      if (r.ok) { setSelectedListing(await r.json()); setView('detail'); }
    } catch {}
  };

  // My listings
  const fetchMyListings = async () => {
    const r = await fetch(`${API}/listings/user/mine`,{headers:{Authorization:`Bearer ${token}`}});
    if (r.ok) setMyListings(await r.json());
  };

  // Messages
  const fetchMessages = async () => {
    const r = await fetch(`${API}/messages`,{headers:{Authorization:`Bearer ${token}`}});
    if (r.ok) setMessages(await r.json());
  };

  const sendMessage = async (receiverId: number, listingId?: number) => {
    if (!msgText.trim()) return;
    await fetch(`${API}/messages`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({receiver_id:receiverId,listing_id:listingId,message_text:msgText})});
    setMsgText('');
    alert('📨 Message sent!');
  };

  // Admin
  const fetchAdmin = async () => {
    const [l, s] = await Promise.all([
      fetch(`${API}/admin/listings?status=pending`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()),
      fetch(`${API}/admin/stats`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()),
    ]);
    setAdminListings(l);
    setAdminStats(s);
  };

  const fetchAdminUsers = async () => {
    const r = await fetch(`${API}/admin/users`,{headers:{Authorization:`Bearer ${token}`}});
    if (r.ok) setAdminUsers(await r.json());
  };

  const adminUserAction = async (userId: number, action: string) => {
    const r = await fetch(`${API}/admin/users/${userId}/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}});
    const d = await r.json();
    alert(d.message || d.error);
    fetchAdminUsers();
    fetchAdmin();
  };

  const adminAction = async (id: number, action: 'approve'|'reject') => {
    await fetch(`${API}/admin/listings/${id}/${action}`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
    fetchAdmin();
  };

  const startPayPal = async () => {
    const r = await fetch(`${API}/subscription/paypal/create`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json();
    if (d.approve_url) window.location.href = d.approve_url;
    else alert(d.error || 'PayPal not configured. Contact support@vibelist.uk');
  };

  const deleteListing = async (id: number) => {
    if (!confirm('Delete this listing?')) return;
    await fetch(`${API}/listings/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
    fetchMyListings();
    if (view === 'detail') { setView('home'); fetchListings(); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const formatPrice = (p: string|null) => p ? `£${parseFloat(p).toFixed(2)}` : 'Free';

  // ========== AUTH VIEWS ==========
  if (view === 'login' || view === 'register') return (
    <div style={{maxWidth:440,margin:'0 auto',padding:20}}>
      <h1 style={{textAlign:'center',fontSize:'2.5rem',margin:'40px 0 10px',background:'linear-gradient(135deg,#6366f1,#ec4899)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✨ VibeList</h1>
      <div style={S.card}>
        <h2 style={{margin:'0 0 20px',textAlign:'center'}}>{view==='login'?'Welcome Back':'Create Account'}</h2>
        {err && <p style={{color:'#ef4444',textAlign:'center',margin:'0 0 10px',fontSize:'0.9rem'}}>{err}</p>}
        <form onSubmit={doAuth}>
          {view==='register' && <input placeholder="Display name" value={af.name} onChange={e=>setAf({...af,name:e.target.value})} style={S.inp} />}
          <input placeholder="Email" type="email" required value={af.email} onChange={e=>setAf({...af,email:e.target.value})} style={S.inp} />
          <input placeholder="Password (8+ characters)" type="password" required minLength={8} value={af.password} onChange={e=>setAf({...af,password:e.target.value})} style={S.inp} />
          {view==='register' && (<>
            <p style={{color:'#888',margin:'10px 0 6px',fontSize:'0.85rem'}}>📅 Date of Birth (must be 18+)</p>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <input placeholder="DD" required maxLength={2} value={af.dob_d} onChange={e=>setAf({...af,dob_d:e.target.value})} style={{...S.inp,width:'30%',textAlign:'center'}} />
              <input placeholder="MM" required maxLength={2} value={af.dob_m} onChange={e=>setAf({...af,dob_m:e.target.value})} style={{...S.inp,width:'30%',textAlign:'center'}} />
              <input placeholder="YYYY" required maxLength={4} value={af.dob_y} onChange={e=>setAf({...af,dob_y:e.target.value})} style={{...S.inp,width:'40%',textAlign:'center'}} />
            </div>
          </>)}
          <button type="submit" style={S.btn}>{view==='login'?'Sign In':'Create Account'}</button>
        </form>
        <p style={{textAlign:'center',marginTop:16,color:'#888'}}>
          {view==='login'?<>No account? <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>{setView('register');setErr('');}}>Register</span></>
            :<>Have an account? <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>{setView('login');setErr('');}}>Sign in</span></>}
        </p>
        <p style={{textAlign:'center',marginTop:8}}><span style={{color:'#555',cursor:'pointer'}} onClick={()=>setView('home')}>← Back</span></p>
      </div>
    </div>
  );

  // ========== SUBSCRIBE VIEW ==========
  if (view === 'subscribe') return (
    <div style={{maxWidth:500,margin:'0 auto',padding:20}}>
      <h1 style={{textAlign:'center',fontSize:'2.5rem',margin:'40px 0 10px',background:'linear-gradient(135deg,#6366f1,#ec4899)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✨ VibeList Pro</h1>
      <div style={S.card}>
        <h2 style={{textAlign:'center',margin:'0 0 10px'}}>🚀 Unlock Full Access</h2>
        <p style={{textAlign:'center',color:'#888',margin:'0 0 20px'}}>Post listings, upload images, and connect with buyers</p>
        <div style={{background:'#1a1a1a',borderRadius:12,padding:24,textAlign:'center',marginBottom:20,border:'1px solid #2a2a2a'}}>
          <p style={{fontSize:'2.5rem',fontWeight:700,margin:'0 0 4px'}}>£25<span style={{fontSize:'1rem',color:'#666'}}>/month</span></p>
          <ul style={{listStyle:'none',padding:0,margin:'16px 0',textAlign:'left',maxWidth:280,marginLeft:'auto',marginRight:'auto'}}>
            {['📝 Post unlimited listings','📸 Upload up to 5 images each','💬 Direct messaging','🎯 Featured placement','📊 Analytics dashboard','🛡️ Priority support'].map(f=>
              <li key={f} style={{padding:'8px 0',color:'#ccc',fontSize:'0.95rem'}}>{f}</li>)}
          </ul>
        </div>
        <button onClick={startPayPal} style={{...S.btn,background:'linear-gradient(135deg,#0070ba,#00457c)',marginBottom:12}}>💳 Subscribe with PayPal</button>
        <div style={{textAlign:'center',margin:'16px 0',color:'#555',fontSize:'0.85rem'}}>
          <p>🪙 <strong>Crypto payment?</strong> Contact <span style={{color:'#6366f1'}}>support@vibelist.uk</span></p>
          <p>We accept BTC, ETH via manual activation</p>
        </div>
        <button onClick={()=>setView('home')} style={{...S.btnSec,width:'100%',marginTop:10}}>← Back</button>
      </div>
    </div>
  );

  // ========== CREATE LISTING VIEW ==========
  if (view === 'create') return (
    <div style={{maxWidth:640,margin:'0 auto',padding:20}}>
      <h1 style={{textAlign:'center',fontSize:'2rem',margin:'30px 0 10px'}}>📝 Create a Listing</h1>
      <p style={{textAlign:'center',color:'#888',marginBottom:24}}>Share what you&apos;re offering with the community</p>
      {err && <p style={{color:'#ef4444',textAlign:'center',margin:'0 0 10px'}}>{err}</p>}
      <form onSubmit={createListing} style={S.card}>
        {/* Emoji + Title */}
        <label style={{color:'#888',fontSize:'0.85rem',marginBottom:4,display:'block'}}>Title *</label>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <div style={{position:'relative'}}>
            <button type="button" onClick={()=>setShowEmojiPicker(!showEmojiPicker)} style={{width:50,height:48,background:'#181818',border:'1px solid #2a2a2a',borderRadius:10,fontSize:'1.5rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{form.emoji}</button>
            {showEmojiPicker && (
              <div style={{position:'absolute',top:54,left:0,background:'#1a1a1a',border:'1px solid #333',borderRadius:12,padding:12,display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,zIndex:100,width:240}}>
                {EMOJIS.map(e=><button key={e} type="button" onClick={()=>insertEmoji(e)} style={{background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',padding:6,borderRadius:8,transition:'background 0.2s'}} onMouseOver={ev=>(ev.target as HTMLElement).style.background='#333'} onMouseOut={ev=>(ev.target as HTMLElement).style.background='none'}>{e}</button>)}
              </div>
            )}
          </div>
          <input placeholder="e.g. Professional Photography Services" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required minLength={5} style={{...S.inp,flex:1,marginBottom:0}} />
        </div>

        {/* Description with formatting toolbar */}
        <label style={{color:'#888',fontSize:'0.85rem',marginBottom:4,display:'block'}}>Description *</label>
        <div style={{marginBottom:10}}>
          <div style={{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'}}>
            {['✅','⭐','📍','📞','💰','🕐','🔗','❤️','🎯','💡'].map(e=>
              <button key={e} type="button" onClick={()=>setForm(f=>({...f,description:f.description+e}))} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:6,padding:'4px 8px',fontSize:'1rem',cursor:'pointer'}} title={`Insert ${e}`}>{e}</button>
            )}
            <button type="button" onClick={()=>setForm(f=>({...f,description:f.description+'\n• '}))} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:6,padding:'4px 10px',fontSize:'0.8rem',cursor:'pointer',color:'#888'}}>• List</button>
            <button type="button" onClick={()=>setForm(f=>({...f,description:f.description+'\n---\n'}))} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:6,padding:'4px 10px',fontSize:'0.8rem',cursor:'pointer',color:'#888'}}>— Line</button>
          </div>
          <textarea placeholder={'Describe your listing in detail...\n\n✅ What you offer\n📍 Location details\n💰 Pricing info\n📞 How to contact you'} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required minLength={10} rows={8} style={{...S.inp,resize:'vertical',minHeight:160,lineHeight:1.6}} />
          <p style={{color:'#555',fontSize:'0.75rem',margin:'4px 0 0',textAlign:'right'}}>{form.description.length} characters</p>
        </div>

        {/* Category & City */}
        <div style={{display:'flex',gap:10,marginBottom:10}}>
          <div style={{flex:1}}>
            <label style={{color:'#888',fontSize:'0.85rem',marginBottom:4,display:'block'}}>Category *</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={S.inp}>
              {CATEGORIES.filter(c=>c!=='all').map(c=><option key={c} value={c}>{CAT_ICONS[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={{color:'#888',fontSize:'0.85rem',marginBottom:4,display:'block'}}>City *</label>
            <select value={form.city} onChange={e=>setForm({...form,city:e.target.value})} style={S.inp}>
              {CITIES.filter(c=>c!=='all').map(c=><option key={c} value={c}>{CITY_ICONS[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Price & Contact */}
        <div style={{display:'flex',gap:10,marginBottom:10}}>
          <div style={{flex:1}}>
            <label style={{color:'#888',fontSize:'0.85rem',marginBottom:4,display:'block'}}>Price (£)</label>
            <input type="number" step="0.01" min="0" placeholder="0.00 (leave blank for free)" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} style={S.inp} />
          </div>
          <div style={{flex:1}}>
            <label style={{color:'#888',fontSize:'0.85rem',marginBottom:4,display:'block'}}>Contact Info</label>
            <input placeholder="Email, phone, or website" value={form.contact_info} onChange={e=>setForm({...form,contact_info:e.target.value})} style={S.inp} />
          </div>
        </div>

        {/* Image Upload */}
        <label style={{color:'#888',fontSize:'0.85rem',marginBottom:8,display:'block'}}>📸 Images (up to 5)</label>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
          {formImages.map((img,i) => (
            <div key={i} style={{position:'relative',width:100,height:100,borderRadius:10,overflow:'hidden',border:'1px solid #2a2a2a'}}>
              <img src={img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
              <button type="button" onClick={()=>removeImage(i)} style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.7)',color:'#fff',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:'0.8rem',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
          ))}
          {formImages.length < 5 && (
            <button type="button" onClick={()=>fileRef.current?.click()} style={{width:100,height:100,background:'#181818',border:'2px dashed #333',borderRadius:10,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#666',fontSize:'0.8rem',gap:4}}>
              <span style={{fontSize:'1.5rem'}}>📷</span>
              Add Photo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelect} style={{display:'none'}} />

        <button type="submit" disabled={uploading} style={{...S.btn,opacity:uploading?0.6:1}}>{uploading ? '⏳ Creating...' : '🚀 Publish Listing'}</button>
        <button type="button" onClick={()=>{setView('home');setErr('');}} style={{...S.btnSec,width:'100%',marginTop:10}}>Cancel</button>
      </form>
    </div>
  );

  // ========== LISTING DETAIL VIEW ==========
  if (view === 'detail' && selectedListing) {
    const l = selectedListing;
    return (
      <div style={{maxWidth:700,margin:'0 auto',padding:20}}>
        <button onClick={()=>{setView('home');setSelectedListing(null);}} style={{...S.btnSec,marginBottom:20}}>← Back to listings</button>
        <div style={S.card}>
          {/* Images gallery */}
          {l.images && l.images.length > 0 && (
            <div style={{display:'flex',gap:8,marginBottom:20,overflowX:'auto',paddingBottom:8}}>
              {l.images.map((img,i) => (
                <img key={i} src={`/uploads/${img.file_path}`} alt="" style={{width:l.images!.length===1?'100%':280,height:220,objectFit:'cover',borderRadius:12,flexShrink:0}} />
              ))}
            </div>
          )}

          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <span style={{...S.tag,background:'#1e1b4b',color:'#818cf8'}}>{CAT_ICONS[l.category]} {l.category}</span>
            <span style={{...S.tag,background:'#1a1a2e',color:'#888'}}>{CITY_ICONS[l.city] || '📍'} {l.city}</span>
            <span style={{...S.tag,background:'#1a1a2e',color:'#666'}}>👁 {l.views} views</span>
            {l.status === 'pending' && <span style={{...S.tag,background:'#422006',color:'#f59e0b'}}>⏳ Pending approval</span>}
          </div>

          <h1 style={{margin:'0 0 12px',fontSize:'1.8rem',lineHeight:1.3}}>{l.title}</h1>
          <p style={{color:'#aaa',fontSize:'1rem',lineHeight:1.8,whiteSpace:'pre-wrap',margin:'0 0 20px'}}>{l.description}</p>

          <div style={{background:'#1a1a1a',borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
              <div>
                <p style={{margin:'0 0 4px',fontSize:'1.4rem',fontWeight:700,color:'#22c55e'}}>{formatPrice(l.price)}</p>
                <p style={{margin:0,color:'#666',fontSize:'0.85rem'}}>Posted by <strong style={{color:'#aaa'}}>{l.author || 'Anonymous'}</strong> on {formatDate(l.created_at)}</p>
              </div>
              {l.contact_info && <p style={{margin:0,color:'#6366f1',fontSize:'0.9rem'}}>📞 {l.contact_info}</p>}
            </div>
          </div>

          {/* Message seller */}
          {user && l.author_id && l.author_id !== user.id && (
            <div style={{marginBottom:16}}>
              <h3 style={{margin:'0 0 8px',fontSize:'1rem',color:'#888'}}>💬 Message the seller</h3>
              <div style={{display:'flex',gap:8}}>
                <input placeholder="Type your message..." value={msgText} onChange={e=>setMsgText(e.target.value)} style={{...S.inp,flex:1,marginBottom:0}} />
                <button onClick={()=>sendMessage(l.author_id!, l.id)} style={{padding:'12px 20px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:600}}>Send</button>
              </div>
            </div>
          )}

          {/* Owner/Admin actions */}
          {user && (l.user_id === user.id || user.is_admin) && (
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {user.is_admin && l.status === 'pending' && <>
                <button onClick={()=>{adminAction(l.id,'approve');setSelectedListing({...l,status:'approved'});}} style={{padding:'10px 20px',background:'#22c55e',color:'#fff',border:'none',borderRadius:10,cursor:'pointer'}}>✅ Approve</button>
                <button onClick={()=>{adminAction(l.id,'reject');setView('home');}} style={{padding:'10px 20px',background:'#ef4444',color:'#fff',border:'none',borderRadius:10,cursor:'pointer'}}>❌ Reject</button>
              </>}
              <button onClick={()=>deleteListing(l.id)} style={{padding:'10px 20px',background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:10,cursor:'pointer'}}>🗑 Delete</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== MY LISTINGS VIEW ==========
  if (view === 'my-listings') {
    if (myListings.length === 0 && loading) fetchMyListings();
    return (
      <div style={{maxWidth:700,margin:'0 auto',padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h1 style={{margin:0}}>📋 My Listings</h1>
          <button onClick={()=>setView('home')} style={S.btnSec}>← Back</button>
        </div>
        {myListings.length === 0 ? <p style={{color:'#666',textAlign:'center',padding:40}}>No listings yet. Create your first one!</p> :
          myListings.map(l => (
            <div key={l.id} style={{...S.card,display:'flex',gap:16,alignItems:'center',cursor:'pointer'}} onClick={()=>viewListing(l.id)}>
              {l.image ? <img src={`/uploads/${l.image}`} alt="" style={{width:80,height:80,objectFit:'cover',borderRadius:10}} /> :
                <div style={{width:80,height:80,background:'#1a1a1a',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem'}}>{CAT_ICONS[l.category]}</div>}
              <div style={{flex:1}}>
                <h3 style={{margin:'0 0 4px'}}>{l.title}</h3>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span style={{...S.tag,background: l.status==='approved'?'#052e16':'#422006',color:l.status==='approved'?'#22c55e':'#f59e0b'}}>{l.status}</span>
                  <span style={{color:'#666',fontSize:'0.8rem'}}>👁 {l.views} views</span>
                </div>
              </div>
              <span style={{color:'#22c55e',fontWeight:700}}>{formatPrice(l.price)}</span>
            </div>
          ))}
      </div>
    );
  }

  // ========== MESSAGES VIEW ==========
  if (view === 'messages') {
    if (messages.length === 0) fetchMessages();
    return (
      <div style={{maxWidth:700,margin:'0 auto',padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h1 style={{margin:0}}>💬 Messages</h1>
          <button onClick={()=>setView('home')} style={S.btnSec}>← Back</button>
        </div>
        {messages.length === 0 ? <p style={{color:'#666',textAlign:'center',padding:40}}>No messages yet.</p> :
          messages.map(m => (
            <div key={m.id} style={{...S.card,opacity:m.read?0.7:1}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{color:'#6366f1',fontWeight:600}}>From: {m.sender_name}</span>
                <span style={{color:'#555',fontSize:'0.8rem'}}>{formatDate(m.created_at)}</span>
              </div>
              <p style={{margin:0,color:'#ccc',lineHeight:1.6}}>{m.message_text}</p>
              {!m.read && <span style={{...S.tag,background:'#1e1b4b',color:'#818cf8',marginTop:8,display:'inline-block'}}>New</span>}
            </div>
          ))}
      </div>
    );
  }

  // ========== ADMIN VIEW ==========
  if (view === 'admin' && user?.is_admin) {
    if (!adminStats) fetchAdmin();
    return (
      <div style={{maxWidth:900,margin:'0 auto',padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h1 style={{margin:0}}>🛡️ Admin Dashboard</h1>
          <button onClick={()=>setView('home')} style={S.btnSec}>← Back</button>
        </div>

        {/* Admin Tabs */}
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          {(['overview','users','pending'] as const).map(tab => (
            <button key={tab} onClick={()=>{setAdminTab(tab); if(tab==='users' && adminUsers.length===0) fetchAdminUsers();}}
              style={{padding:'10px 20px',borderRadius:10,border:'none',cursor:'pointer',background:adminTab===tab?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#181818',color:adminTab===tab?'#fff':'#888',fontWeight:adminTab===tab?600:400,fontSize:'0.9rem',textTransform:'capitalize'}}>
              {tab === 'overview' ? '📊 Overview' : tab === 'users' ? '👥 Users' : '⏳ Pending'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {adminTab === 'overview' && adminStats && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:24}}>
              {[['👥 Users',adminStats.total_users],['📋 Listings',adminStats.total_listings],['⏳ Pending',adminStats.pending_listings],['💳 Subscribers',adminStats.active_subscribers],['🚨 Reports',adminStats.pending_reports],['🌟 Founders',`${adminStats.founding_members || 0}/${adminStats.founding_member_limit || 25}`]].map(([label,val]) =>
                <div key={label as string} style={{background:'#141414',borderRadius:12,padding:16,textAlign:'center',border:'1px solid #1e1e1e'}}>
                  <p style={{margin:'0 0 4px',fontSize:'0.85rem',color:'#888'}}>{label as string}</p>
                  <p style={{margin:0,fontSize:'1.6rem',fontWeight:700}}>{val as any}</p>
                </div>
              )}
            </div>

            {/* Founding Member Progress */}
            {adminStats && (
              <div style={{...S.card,background:'linear-gradient(135deg,#1a1a2e,#0f172a)',border:'1px solid #2d2b55',marginBottom:20}}>
                <h3 style={{margin:'0 0 12px',color:'#f59e0b'}}>🌟 Founding Members Programme</h3>
                <p style={{color:'#aaa',margin:'0 0 12px',fontSize:'0.9rem'}}>First 25 members get <strong style={{color:'#f59e0b'}}>permanent free access</strong> — no subscription needed. They help spread the word!</p>
                <div style={{background:'#0a0a0a',borderRadius:8,height:24,overflow:'hidden',marginBottom:8}}>
                  <div style={{height:'100%',background:'linear-gradient(90deg,#f59e0b,#eab308)',borderRadius:8,width:`${Math.min(100,((adminStats.founding_members||0)/(adminStats.founding_member_limit||25))*100)}%`,transition:'width 0.5s'}} />
                </div>
                <p style={{margin:0,color:'#666',fontSize:'0.85rem'}}>{adminStats.founding_members || 0} of {adminStats.founding_member_limit || 25} founding member slots filled ({Math.max(0,(adminStats.founding_member_limit||25)-(adminStats.founding_members||0))} remaining)</p>
              </div>
            )}
          </>
        )}

        {/* Users Tab */}
        {adminTab === 'users' && (
          <>
            <h2 style={{margin:'0 0 16px',fontSize:'1.2rem'}}>👥 All Users ({adminUsers.length})</h2>
            {adminUsers.length === 0 ? <p style={{color:'#666'}}>Loading users...</p> :
              adminUsers.map(u => (
                <div key={u.id} style={{...S.card,padding:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                    <div style={{flex:1,minWidth:200}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <strong style={{fontSize:'1rem'}}>{u.display_name}</strong>
                        {u.is_founding_member && <span style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#000',padding:'2px 8px',borderRadius:10,fontSize:'0.7rem',fontWeight:700}}>🌟 FOUNDER #{u.founding_member_number}</span>}
                        {u.is_admin && <span style={{background:'#7c3aed',color:'#fff',padding:'2px 8px',borderRadius:10,fontSize:'0.7rem',fontWeight:600}}>ADMIN</span>}
                        {u.subscription_status === 'active' && !u.is_founding_member && <span style={{background:'#22c55e',color:'#fff',padding:'2px 8px',borderRadius:10,fontSize:'0.7rem',fontWeight:600}}>PRO</span>}
                      </div>
                      <p style={{margin:0,color:'#666',fontSize:'0.85rem'}}>{u.email} • Joined {formatDate(u.created_at)} • Status: <span style={{color:u.subscription_status==='active'?'#22c55e':u.subscription_status==='suspended'?'#ef4444':'#888'}}>{u.subscription_status}</span></p>
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {!u.is_founding_member && (
                        <button onClick={()=>{if(confirm(`Grant founding member status to ${u.display_name}? This gives permanent free access.`)) adminUserAction(u.id,'grant-founding');}}
                          style={{padding:'6px 12px',background:'#422006',color:'#f59e0b',border:'1px solid #f59e0b',borderRadius:8,cursor:'pointer',fontSize:'0.8rem'}}>🌟 Grant Founder</button>
                      )}
                      {u.is_founding_member && (
                        <button onClick={()=>{if(confirm(`Revoke founding member status from ${u.display_name}?`)) adminUserAction(u.id,'revoke-founding');}}
                          style={{padding:'6px 12px',background:'#1a1a1a',color:'#888',border:'1px solid #333',borderRadius:8,cursor:'pointer',fontSize:'0.8rem'}}>Revoke Founder</button>
                      )}
                      {!u.is_founding_member && u.subscription_status !== 'active' && (
                        <button onClick={()=>adminUserAction(u.id,'activate')}
                          style={{padding:'6px 12px',background:'#052e16',color:'#22c55e',border:'1px solid #22c55e',borderRadius:8,cursor:'pointer',fontSize:'0.8rem'}}>✅ Activate</button>
                      )}
                      <button onClick={()=>adminUserAction(u.id,'toggle-admin')}
                        style={{padding:'6px 12px',background:u.is_admin?'#1a1a1a':'#1e1b4b',color:u.is_admin?'#888':'#818cf8',border:`1px solid ${u.is_admin?'#333':'#818cf8'}`,borderRadius:8,cursor:'pointer',fontSize:'0.8rem'}}>{u.is_admin ? 'Remove Admin' : '🛡️ Make Admin'}</button>
                      {u.subscription_status !== 'suspended' && (
                        <button onClick={()=>{if(confirm(`Suspend ${u.display_name}?`)) adminUserAction(u.id,'suspend');}}
                          style={{padding:'6px 12px',background:'#1a1a1a',color:'#ef4444',border:'1px solid #333',borderRadius:8,cursor:'pointer',fontSize:'0.8rem'}}>⛔ Suspend</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </>
        )}

        {/* Pending Tab */}
        {adminTab === 'pending' && (
          <>
            <h2 style={{margin:'0 0 16px',fontSize:'1.2rem'}}>⏳ Pending Listings</h2>
            {adminListings.length === 0 ? <p style={{color:'#666'}}>No pending listings.</p> :
              adminListings.map(l => (
                <div key={l.id} style={{...S.card,display:'flex',gap:16,alignItems:'center'}}>
                  <div style={{width:50,height:50,background:'#1a1a1a',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem'}}>{CAT_ICONS[l.category]}</div>
                  <div style={{flex:1,cursor:'pointer'}} onClick={()=>viewListing(l.id)}>
                    <h3 style={{margin:'0 0 4px'}}>{l.title}</h3>
                    <p style={{margin:0,color:'#666',fontSize:'0.85rem'}}>by {l.author} • {l.city} • {formatDate(l.created_at)}</p>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>adminAction(l.id,'approve')} style={{padding:'8px 14px',background:'#22c55e',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>✅</button>
                    <button onClick={()=>adminAction(l.id,'reject')} style={{padding:'8px 14px',background:'#ef4444',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>❌</button>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    );
  }

  // ========== HOME VIEW ==========
  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:20}}>
      {/* Header */}
      <header style={{textAlign:'center',padding:'40px 0 20px'}}>
        <h1 style={{fontSize:'3rem',margin:'0 0 8px',background:'linear-gradient(135deg,#6366f1,#ec4899)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✨ VibeList</h1>
        <p style={{color:'#666',fontSize:'1.1rem',margin:0}}>UK&apos;s classifieds marketplace — find &amp; post services, jobs, property &amp; more</p>

        {/* User bar */}
        <div style={{marginTop:16}}>
          {user ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,flexWrap:'wrap'}}>
              <span style={{color:'#aaa'}}>👤 {user.display_name}</span>
              {user.is_founding_member ?
                <span style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#000',padding:'4px 12px',borderRadius:12,fontSize:'0.8rem',fontWeight:700}}>🌟 FOUNDER #{user.founding_member_number}</span> :
               user.subscription_status === 'active' ?
                <span style={{background:'linear-gradient(135deg,#22c55e,#16a34a)',color:'#fff',padding:'4px 12px',borderRadius:12,fontSize:'0.8rem',fontWeight:600}}>PRO</span> :
                <button onClick={()=>setView('subscribe')} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>⚡ Upgrade</button>}
              <button onClick={()=>{setView('my-listings');fetchMyListings();}} style={S.btnSec}>📋 My Listings</button>
              <button onClick={()=>{setView('messages');fetchMessages();}} style={S.btnSec}>💬 Messages</button>
              {user.is_admin && <button onClick={()=>{setView('admin');fetchAdmin();}} style={{...S.btnSec,borderColor:'#f59e0b',color:'#f59e0b'}}>🛡️ Admin</button>}
              <button onClick={logout} style={S.btnSec}>Sign Out</button>
            </div>
          ) : (
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button onClick={()=>setView('login')} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'10px 24px',borderRadius:10,cursor:'pointer',fontWeight:600}}>Sign In</button>
              <button onClick={()=>setView('register')} style={{background:'transparent',color:'#6366f1',border:'1px solid #6366f1',padding:'10px 24px',borderRadius:10,cursor:'pointer',fontWeight:600}}>Register</button>
            </div>
          )}
        </div>
      </header>

      {/* Category Filter */}
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={()=>{setCatFilter(c);setPage(1);}} style={{padding:'8px 14px',borderRadius:20,border:'none',cursor:'pointer',background:catFilter===c?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#181818',color:catFilter===c?'#fff':'#888',fontSize:'0.85rem',fontWeight:catFilter===c?600:400,transition:'all 0.2s',textTransform:'capitalize'}}>
              {CAT_ICONS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {/* City Filter */}
      <div style={{marginBottom:20}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
          {CITIES.map(c => (
            <button key={c} onClick={()=>{setCityFilter(c);setPage(1);}} style={{padding:'6px 12px',borderRadius:16,border:cityFilter===c?'1px solid #6366f1':'1px solid #222',cursor:'pointer',background:'transparent',color:cityFilter===c?'#6366f1':'#666',fontSize:'0.8rem',transition:'all 0.2s',textTransform:'capitalize'}}>
              {CITY_ICONS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Create Button */}
      {user && (
        <button onClick={()=>{if(!user.is_founding_member && user.subscription_status!=='active'){setView('subscribe');}else{setView('create');setErr('');}}} style={{...S.btn,display:'block',marginBottom:24,maxWidth:400,marginLeft:'auto',marginRight:'auto'}}>
          ✨ Create a Listing
        </button>
      )}
      {!user && (
        <div style={{...S.card,textAlign:'center',maxWidth:500,margin:'0 auto 24px'}}>
          <p style={{color:'#888',margin:0}}>🔒 <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>setView('register')}>Create an account</span> and subscribe to post listings</p>
        </div>
      )}

      {/* Listings Grid */}
      {loading ? <p style={{textAlign:'center',color:'#555',padding:40}}>Loading listings...</p> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
          {listings.map(l => (
            <div key={l.id} onClick={()=>viewListing(l.id)} style={{...S.card,cursor:'pointer',padding:0,overflow:'hidden',transition:'border 0.2s,transform 0.2s'}} onMouseOver={e=>(e.currentTarget.style.borderColor='#333')} onMouseOut={e=>(e.currentTarget.style.borderColor='#1e1e1e')}>
              {/* Image or placeholder */}
              {l.image ? <img src={`/uploads/${l.image}`} alt="" style={{width:'100%',height:180,objectFit:'cover'}} /> :
                <div style={{width:'100%',height:180,background:'linear-gradient(135deg,#1a1a2e,#0f172a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'3rem'}}>{CAT_ICONS[l.category]}</div>}
              <div style={{padding:16}}>
                <div style={{display:'flex',gap:6,marginBottom:8}}>
                  <span style={{...S.tag,background:'#1e1b4b',color:'#818cf8',fontSize:'0.75rem'}}>{l.category}</span>
                  <span style={{...S.tag,background:'#1a1a2e',color:'#666',fontSize:'0.75rem'}}>{CITY_ICONS[l.city]} {l.city}</span>
                </div>
                <h3 style={{margin:'0 0 6px',fontSize:'1.05rem',lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>{l.title}</h3>
                <p style={{margin:'0 0 10px',color:'#666',fontSize:'0.85rem',overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any,lineHeight:1.5}}>{l.description}</p>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{color:'#22c55e',fontWeight:700,fontSize:'1.1rem'}}>{formatPrice(l.price)}</span>
                  <span style={{color:'#555',fontSize:'0.75rem'}}>{l.author} • {formatDate(l.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
          {listings.length === 0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:60,color:'#555'}}><p style={{fontSize:'2rem',margin:'0 0 8px'}}>🔍</p><p>No listings found. Try changing your filters or be the first to post!</p></div>}
        </div>
      )}

      {/* Pagination */}
      {listings.length > 0 && (
        <div style={{display:'flex',justifyContent:'center',gap:8,margin:'30px 0'}}>
          {page > 1 && <button onClick={()=>setPage(p=>p-1)} style={S.btnSec}>← Previous</button>}
          <span style={{padding:'10px 16px',color:'#666'}}>Page {page}</span>
          {listings.length === 20 && <button onClick={()=>setPage(p=>p+1)} style={S.btnSec}>Next →</button>}
        </div>
      )}

      <footer style={{textAlign:'center',padding:'40px 0 20px',color:'#333',borderTop:'1px solid #1a1a1a',marginTop:20}}>
        <p style={{margin:0}}>VibeList.uk © 2025 | UK Classifieds Marketplace | Users must be 18+</p>
      </footer>
    </div>
  );
}