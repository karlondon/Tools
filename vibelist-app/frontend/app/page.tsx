'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// Types
interface TierLimits { max_listings:number; max_images_per_listing:number; max_private_images:number; allow_videos:boolean; price_monthly:number; label:string; }
interface Listing { id:number; title:string; description:string; category:string; city:string; price:string|null; contact_info:string|null; status:string; views:number; featured:boolean; created_at:string; updated_at:string; author?:string; author_id?:number; user_id?:number; image?:string; images?:{id:number;file_path:string;thumbnail_path:string|null;is_private?:boolean;sort_order:number}[]; }
interface User { id:number; email:string; display_name:string; subscription_status:string; subscription_tier?:string; subscription_expires_at?:string; pending_downgrade_tier?:string; is_admin?:boolean; is_founding_member?:boolean; founding_member_number?:number; id_verified?:boolean; has_id_document?:boolean; cancelled_at?:string; tier_limits?:TierLimits; }
interface AdminUser { id:number; email:string; display_name:string; subscription_status:string; subscription_tier?:string; subscription_provider?:string; is_admin:boolean; is_founding_member:boolean; founding_member_number:number|null; id_verified:boolean; has_id_document:boolean; effective_tier?:string; pending_downgrade_tier?:string; cancelled_at?:string; created_at:string; }
interface Message { id:number; sender_id:number; receiver_id:number; listing_id:number|null; message_text:string; read:boolean; created_at:string; sender_name?:string; }
interface Report { id:number; listing_id:number; reporter_email:string; reason:string; details:string; status:string; listing_title:string; listing_status:string; created_at:string; }

const CATEGORIES = ['all','services','events','jobs','property','vehicles','electronics','fashion','beauty','health','community','other'];
const CITIES = ['all','london','manchester','birmingham','leeds','glasgow','liverpool','bristol','edinburgh','cardiff','belfast','sheffield','nottingham','other'];
const CAT_ICONS: Record<string,string> = {all:'🌐',services:'🔧',events:'🎉',jobs:'💼',property:'🏠',vehicles:'🚗',electronics:'💻',fashion:'👗',beauty:'💄',health:'💪',community:'🤝',other:'📦'};
const CITY_ICONS: Record<string,string> = {all:'🌍',london:'🇬🇧',manchester:'⚽',birmingham:'🏭',leeds:'🦁',glasgow:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',liverpool:'🎸',bristol:'🌉',edinburgh:'🏰',cardiff:'🐉',belfast:'☘️',sheffield:'⚒️',nottingham:'🏹',other:'📍'};
const EMOJIS = ['✨','🔥','💎','⭐','🎯','💡','🚀','❤️','🎨','🎵','🌟','💰','📸','🏆','🌈','🍕','🎁','🔑','💼','🏠','🚗','💻','👗','💄','💪','🤝','📦','🎉','🔧','📍'];
const API = '/api';

type ViewType = 'home'|'login'|'register'|'subscribe'|'create'|'detail'|'my-listings'|'messages'|'admin'|'privacy'|'terms'|'cookies'|'account'|'upload-id'|'pricing'|'help';

const S: Record<string,React.CSSProperties> = {
  inp: {width:'100%',padding:'12px 14px',marginBottom:10,background:'#181818',color:'#fff',border:'1px solid #2a2a2a',borderRadius:10,boxSizing:'border-box' as const,fontSize:'0.95rem',outline:'none',transition:'border 0.2s'},
  btn: {width:'100%',padding:14,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:12,fontSize:'1rem',cursor:'pointer',fontWeight:600,transition:'opacity 0.2s'},
  btnSec: {padding:'10px 20px',background:'transparent',color:'#888',border:'1px solid #333',borderRadius:10,cursor:'pointer',fontSize:'0.9rem',transition:'all 0.2s'},
  card: {background:'#141414',padding:24,borderRadius:16,marginBottom:16,border:'1px solid #1e1e1e',transition:'border 0.2s'},
  tag: {display:'inline-block',padding:'4px 12px',borderRadius:20,fontSize:'0.8rem',fontWeight:500},
};

const TIER_COLORS: Record<string,{bg:string;text:string;border:string;gradient:string}> = {
  free: {bg:'#1a1a1a',text:'#888',border:'#333',gradient:'linear-gradient(135deg,#333,#555)'},
  silver: {bg:'#1a1a2e',text:'#c0c0c0',border:'#6b7280',gradient:'linear-gradient(135deg,#6b7280,#9ca3af)'},
  pro: {bg:'#1e1b4b',text:'#818cf8',border:'#6366f1',gradient:'linear-gradient(135deg,#6366f1,#8b5cf6)'},
};

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [catFilter, setCatFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User|null>(null);
  const [token, setToken] = useState('');
  const [view, setView] = useState<ViewType>('home');
  const [af, setAf] = useState({email:'',password:'',name:'',dob_d:'',dob_m:'',dob_y:''});
  const [err, setErr] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing|null>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminListings, setAdminListings] = useState<Listing[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminReports, setAdminReports] = useState<Report[]>([]);
  const [adminTab, setAdminTab] = useState<'overview'|'users'|'pending'|'reports'|'hidden'|'dormant'>('overview');
  const [msgText, setMsgText] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({title:'',description:'',category:'services',city:'london',price:'',contact_info:'',emoji:'✨'});
  const [formImages, setFormImages] = useState<{data:string;isPrivate:boolean}[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportForm, setReportForm] = useState({reason:'scam',details:'',reporter_email:''});
  const [dormantAccounts, setDormantAccounts] = useState<any[]>([]);
  const [hiddenListings, setHiddenListings] = useState<Listing[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const idFileRef = useRef<HTMLInputElement>(null);

  const userTier = user?.subscription_tier || 'free';
  const tierLimits = user?.tier_limits;

  useEffect(() => {
    const t = localStorage.getItem('vl_token');
    if (t) { setToken(t); fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.ok?r.json():null).then(u=>{if(u)setUser(u);else{localStorage.removeItem('vl_token');setToken('');}}).catch(()=>{}); }
  }, []);

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

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sid = p.get('subscription_id');
    const tier = p.get('tier');
    if (sid && token) {
      fetch(`${API}/subscription/paypal/activate`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({subscription_id:sid,tier:tier||'pro'})})
        .then(r=>r.json()).then(d=>{if(d.status==='active'){fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(setUser);alert(`🎉 ${d.tier ? d.tier.charAt(0).toUpperCase()+d.tier.slice(1) : 'Pro'} subscription activated!`);}window.history.replaceState({},'','/');});
    }
  }, [token]);

  const refreshUser = () => { if(token) fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(setUser); };

  const doAuth = async (e:React.FormEvent) => {
    e.preventDefault(); setErr('');
    const isReg = view==='register';
    const body: any = {email:af.email,password:af.password};
    if (isReg) { body.display_name=af.name; body.date_of_birth=`${af.dob_y}-${af.dob_m.padStart(2,'0')}-${af.dob_d.padStart(2,'0')}`; }
    const r = await fetch(`${API}/auth/${isReg?'register':'login'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await r.json();
    if (r.ok) {
      setToken(d.token); localStorage.setItem('vl_token',d.token); setUser(d.user);
      setAf({email:'',password:'',name:'',dob_d:'',dob_m:'',dob_y:''});
      if (d.requires_id_upload) { setView('upload-id'); } else { setView('home'); }
    } else setErr(d.error);
  };

  const logout = () => { setUser(null); setToken(''); localStorage.removeItem('vl_token'); setView('home'); };

  const getMaxImages = () => {
    if (!tierLimits) return 2;
    return tierLimits.max_images_per_listing === -1 ? 50 : tierLimits.max_images_per_listing;
  };
  const getMaxPrivateImages = () => tierLimits?.max_private_images || 0;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isPrivate = false) => {
    const files = e.target.files; if (!files) return;
    const maxPublic = getMaxImages();
    const maxPrivate = getMaxPrivateImages();
    Array.from(files).forEach(file => {
      const currentPublic = formImages.filter(i => !i.isPrivate).length;
      const currentPrivate = formImages.filter(i => i.isPrivate).length;
      if (isPrivate && currentPrivate >= maxPrivate) { alert(`Maximum ${maxPrivate} private images on your plan`); return; }
      if (!isPrivate && currentPublic >= maxPublic) { alert(`Maximum ${maxPublic} images on your plan`); return; }
      if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
      const reader = new FileReader();
      reader.onload = () => { setFormImages(prev => [...prev, {data: reader.result as string, isPrivate}]); };
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = '';
  };
  const removeImage = (idx: number) => { setFormImages(prev => prev.filter((_,i) => i !== idx)); };

  const insertEmoji = (emoji: string) => { setForm(f => ({...f, description: f.description + emoji})); setShowEmojiPicker(false); };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('ID document must be under 10MB'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const r = await fetch(`${API}/auth/upload-id`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({image_data:reader.result})});
        const d = await r.json();
        if (r.ok) { alert('✅ ' + d.message); setUser(u => u ? {...u, has_id_document: true} : u); setView('home'); }
        else alert(d.error);
      } catch { alert('Upload failed'); } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const createListing = async (e:React.FormEvent) => {
    e.preventDefault(); setUploading(true); setErr('');
    try {
      const r = await fetch(`${API}/listings`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({
        title:`${form.emoji} ${form.title}`,description:form.description,category:form.category,city:form.city,price:form.price?parseFloat(form.price):null,contact_info:form.contact_info||null})});
      if (!r.ok) { const d = await r.json(); if (d.code === 'NO_SUBSCRIPTION' || d.code === 'LISTING_LIMIT_REACHED') { setErr(d.error); return; } setErr(d.error || 'Failed'); return; }
      const listing = await r.json();
      for (const img of formImages) { await fetch(`${API}/listings/${listing.id}/images`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({image_data:img.data, is_private:img.isPrivate})}); }
      setForm({title:'',description:'',category:'services',city:'london',price:'',contact_info:'',emoji:'✨'}); setFormImages([]); setView('home'); fetchListings();
    } catch { setErr('Failed to create listing'); } finally { setUploading(false); }
  };

  const viewListing = async (id: number) => { try { const r = await fetch(`${API}/listings/${id}`,{headers:token?{Authorization:`Bearer ${token}`}:{}}); if (r.ok) { setSelectedListing(await r.json()); setView('detail'); setShowReport(false); } } catch {} };
  const fetchMyListings = async () => { const r = await fetch(`${API}/listings/user/mine`,{headers:{Authorization:`Bearer ${token}`}}); if (r.ok) setMyListings(await r.json()); };
  const fetchMessages = async () => { const r = await fetch(`${API}/messages`,{headers:{Authorization:`Bearer ${token}`}}); if (r.ok) setMessages(await r.json()); };
  const sendMessage = async (receiverId: number, listingId?: number) => { if (!msgText.trim()) return; await fetch(`${API}/messages`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({receiver_id:receiverId,listing_id:listingId,message_text:msgText})}); setMsgText(''); alert('📨 Message sent!'); };

  const fetchAdmin = async () => {
    const [l, s, rp] = await Promise.all([
      fetch(`${API}/admin/listings?status=pending`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()),
      fetch(`${API}/admin/stats`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()),
      fetch(`${API}/admin/reports`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()),
    ]);
    setAdminListings(l); setAdminStats(s); setAdminReports(rp);
  };
  const fetchAdminUsers = async () => { const r = await fetch(`${API}/admin/users`,{headers:{Authorization:`Bearer ${token}`}}); if (r.ok) setAdminUsers(await r.json()); };
  const fetchHiddenListings = async () => { const r = await fetch(`${API}/admin/listings?status=hidden`,{headers:{Authorization:`Bearer ${token}`}}); if (r.ok) setHiddenListings(await r.json()); };
  const fetchDormant = async () => { const r = await fetch(`${API}/admin/dormant-accounts`,{headers:{Authorization:`Bearer ${token}`}}); if (r.ok) setDormantAccounts(await r.json()); };

  const adminUserAction = async (userId: number, action: string) => { const r = await fetch(`${API}/admin/users/${userId}/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}}); const d = await r.json(); alert(d.message || d.error); fetchAdminUsers(); fetchAdmin(); };
  const adminAction = async (id: number, action: string) => { await fetch(`${API}/admin/listings/${id}/${action}`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); fetchAdmin(); };
  const resolveReport = async (id: number, action: string) => { await fetch(`${API}/admin/reports/${id}/resolve`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action})}); fetchAdmin(); };
  const deleteAccount = async (userId: number, email: string) => { if (!confirm(`PERMANENTLY delete user ${email}? All data will be removed.`)) return; await fetch(`${API}/admin/users/${userId}/delete-account`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({reason:'admin_action'})}); alert('User deleted and archived.'); fetchAdminUsers(); fetchAdmin(); fetchDormant(); };

  const submitReport = async () => {
    if (!selectedListing) return;
    const r = await fetch(`${API}/listings/${selectedListing.id}/report`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(reportForm)});
    const d = await r.json();
    if (r.ok) { alert('✅ ' + d.message); setShowReport(false); setReportForm({reason:'scam',details:'',reporter_email:''}); } else alert(d.error);
  };

  const cancelSubscription = async () => {
    if (!confirm('Cancel your subscription? You will revert to the Free plan. If you have paid time remaining, your current access continues until the billing period ends.')) return;
    const r = await fetch(`${API}/subscription/cancel`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json();
    alert(d.message || d.error);
    refreshUser();
  };

  const downgradeSubscription = async (newTier: string) => {
    const tierLabel = newTier === 'free' ? 'Free' : 'Silver (£5/mo)';
    if (!confirm(`Downgrade to ${tierLabel}? If you have paid time remaining, your current plan stays until the billing period ends.`)) return;
    const r = await fetch(`${API}/subscription/downgrade`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({new_tier:newTier})});
    const d = await r.json();
    alert(d.message || d.error);
    refreshUser();
  };

  const cancelPendingDowngrade = async () => {
    const r = await fetch(`${API}/subscription/cancel-downgrade`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json();
    alert(d.message || d.error);
    refreshUser();
  };

  const startPayPal = async (tier: string) => {
    const r = await fetch(`${API}/subscription/paypal/create`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({tier})});
    const d = await r.json();
    if (d.status === 'downgrade_scheduled') { alert(d.message); refreshUser(); return; }
    if (d.approve_url) window.location.href = d.approve_url;
    else alert(d.error || 'PayPal not configured. Contact support@vibelist.uk');
  };

  const deleteListing = async (id: number) => { if (!confirm('Delete this listing?')) return; await fetch(`${API}/listings/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}}); fetchMyListings(); if (view === 'detail') { setView('home'); fetchListings(); } };
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const formatPrice = (p: string|null) => p ? `£${parseFloat(p).toFixed(2)}` : 'Free';

  const tierBadge = (tier: string) => {
    const c = TIER_COLORS[tier] || TIER_COLORS.free;
    const labels: Record<string,string> = {free:'FREE',silver:'🥈 SILVER',pro:'⚡ PRO'};
    return <span style={{background:c.gradient,color:'#fff',padding:'4px 12px',borderRadius:12,fontSize:'0.8rem',fontWeight:600}}>{labels[tier]||tier.toUpperCase()}</span>;
  };

  // ========== LEGAL PAGES ==========
  if (view === 'privacy') return (
    <div style={{maxWidth:800,margin:'0 auto',padding:20}}>
      <button onClick={()=>setView('home')} style={{...S.btnSec,marginBottom:20}}>← Back</button>
      <div style={S.card}>
        <h1 style={{margin:'0 0 20px'}}>🔒 Privacy Policy</h1>
        <p style={{color:'#888',marginBottom:8}}>Last updated: March 2026 | VibeList.uk</p>
        <div style={{color:'#ccc',lineHeight:1.8,fontSize:'0.95rem'}}>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>1. Data Controller</h2>
          <p>VibeList.uk (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates as the data controller for personal data collected through this website. We are committed to protecting your privacy in accordance with the <strong>UK General Data Protection Regulation (UK GDPR)</strong> and the <strong>Data Protection Act 2018</strong>.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>2. Data We Collect</h2>
          <p>We collect the following personal data:</p>
          <ul><li><strong>Account data:</strong> email address, display name, date of birth (for age verification)</li>
          <li><strong>Identity verification:</strong> government-issued photo ID (for non-founding members)</li>
          <li><strong>Listing data:</strong> titles, descriptions, images, contact information you choose to publish</li>
          <li><strong>Payment data:</strong> processed by PayPal; we store subscription IDs only</li>
          <li><strong>Usage data:</strong> IP addresses, browser type, pages visited (for security and analytics)</li>
          <li><strong>Communications:</strong> messages sent through our platform, report submissions</li></ul>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>3. Lawful Basis for Processing</h2>
          <p>We process your data under the following legal bases:</p>
          <ul><li><strong>Contract:</strong> to provide our marketplace services</li>
          <li><strong>Legitimate interests:</strong> to prevent fraud, ensure platform safety</li>
          <li><strong>Legal obligation:</strong> age verification, record keeping</li>
          <li><strong>Consent:</strong> for marketing communications (where applicable)</li></ul>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>4. How We Use Your Data</h2>
          <ul><li>To create and manage your account</li><li>To verify your identity and age</li><li>To display your listings to other users</li><li>To process payments</li><li>To facilitate messaging between users</li><li>To investigate reports and maintain platform safety</li><li>To send service-related communications</li></ul>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>5. Data Retention</h2>
          <p>Active accounts: data retained while account is active. Cancelled accounts: data retained for 90 days, after which you will be contacted about account retention. If no response or deletion requested, all personal data, listings, images, and messages are permanently deleted. A minimal archived record (email, deletion date) is kept for legal compliance.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>6. Your Rights (UK GDPR)</h2>
          <p>You have the right to:</p>
          <ul><li><strong>Access</strong> your personal data</li><li><strong>Rectification</strong> of inaccurate data</li><li><strong>Erasure</strong> (&quot;right to be forgotten&quot;)</li><li><strong>Restrict processing</strong></li><li><strong>Data portability</strong></li><li><strong>Object</strong> to processing</li><li><strong>Withdraw consent</strong> at any time</li></ul>
          <p>To exercise these rights, contact: <strong style={{color:'#6366f1'}}>privacy@vibelist.uk</strong></p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>7. ID Document Handling</h2>
          <p>Government ID documents are stored securely and encrypted at rest. They are only accessible to authorised administrators for verification purposes. Once verified, the document is retained for legal compliance but access is strictly limited. You may request deletion of your ID document at any time.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>8. Data Sharing</h2>
          <p>We do not sell your personal data. We share data only with: PayPal (payment processing), hosting providers (AWS), and law enforcement (when legally required).</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>9. Cookies</h2>
          <p>We use essential cookies for authentication. See our <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>setView('cookies')}>Cookie Policy</span> for details.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>10. Complaints</h2>
          <p>You have the right to lodge a complaint with the <strong>Information Commissioner&apos;s Office (ICO)</strong> at <a href="https://ico.org.uk" target="_blank" rel="noopener" style={{color:'#6366f1'}}>ico.org.uk</a> or call 0303 123 1113.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>11. Contact</h2>
          <p>Data Protection queries: <strong style={{color:'#6366f1'}}>privacy@vibelist.uk</strong></p>
        </div>
      </div>
    </div>
  );

  if (view === 'terms') return (
    <div style={{maxWidth:800,margin:'0 auto',padding:20}}>
      <button onClick={()=>setView('home')} style={{...S.btnSec,marginBottom:20}}>← Back</button>
      <div style={S.card}>
        <h1 style={{margin:'0 0 20px'}}>📜 Terms of Service</h1>
        <p style={{color:'#888',marginBottom:8}}>Last updated: March 2026 | VibeList.uk</p>
        <div style={{color:'#ccc',lineHeight:1.8,fontSize:'0.95rem'}}>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>1. Acceptance</h2>
          <p>By using VibeList.uk you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>2. Eligibility</h2>
          <p>You must be at least 18 years old and a resident of the United Kingdom to use this service. Age verification is required at registration.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>3. Account Responsibilities</h2>
          <ul><li>You must provide accurate information during registration</li><li>You are responsible for maintaining account security</li><li>Non-founding members must upload a valid government-issued ID for verification</li><li>One account per person — duplicate accounts will be removed</li></ul>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>4. Founding Members</h2>
          <p>The first 25 registered users receive permanent free Pro access as Founding Members. This privilege is non-transferable and may be revoked for Terms violations.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>5. Subscriptions &amp; Payments</h2>
          <ul><li><strong>Free tier:</strong> Up to 3 listings, 2 images each, no private gallery</li>
          <li><strong>Silver tier:</strong> £5/month — Up to 10 listings, 5 images + 2 private gallery images each</li>
          <li><strong>Pro tier:</strong> £15/month — Unlimited listings &amp; images, up to 10 private gallery images/videos</li>
          <li>Subscriptions auto-renew unless cancelled</li>
          <li>You may cancel or downgrade at any time; paid access continues until the billing period ends</li>
          <li>No refunds for partial months</li>
          <li>Accounts cancelled for 90+ days will receive a retention email; no response leads to account deletion</li></ul>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>6. Listing Rules</h2>
          <ul><li>Listings must be truthful and not misleading</li><li>No illegal goods, services, or content</li><li>No adult content, weapons, drugs, or counterfeit goods</li><li>All listings are subject to admin review and may be hidden or removed</li><li>Repeated violations will result in account suspension</li></ul>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>7. Reporting &amp; Moderation</h2>
          <p>Users may report listings they believe are scams or violate our terms. Reports require a valid email address and detailed justification. We reserve the right to hide or remove any listing and suspend accounts at our sole discretion.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>8. Limitation of Liability</h2>
          <p>VibeList.uk is a platform connecting buyers and sellers. We do not guarantee the quality, safety, or legality of listed items or services. Users transact at their own risk.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>9. Account Deletion</h2>
          <p>You may request account deletion at any time. Upon deletion: all listings, images, messages, and personal data are permanently removed. A minimal archived record is kept for legal compliance (email, deletion date).</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>10. Governing Law</h2>
          <p>These terms are governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the English courts.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>11. Contact</h2>
          <p>General: <strong style={{color:'#6366f1'}}>support@vibelist.uk</strong> | Legal: <strong style={{color:'#6366f1'}}>legal@vibelist.uk</strong></p>
        </div>
      </div>
    </div>
  );

  if (view === 'cookies') return (
    <div style={{maxWidth:800,margin:'0 auto',padding:20}}>
      <button onClick={()=>setView('home')} style={{...S.btnSec,marginBottom:20}}>← Back</button>
      <div style={S.card}>
        <h1 style={{margin:'0 0 20px'}}>🍪 Cookie Policy</h1>
        <p style={{color:'#888',marginBottom:8}}>Last updated: March 2026 | VibeList.uk</p>
        <div style={{color:'#ccc',lineHeight:1.8,fontSize:'0.95rem'}}>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>What Cookies We Use</h2>
          <p>We use only <strong>essential cookies</strong> required for the platform to function:</p>
          <ul><li><strong>Authentication token</strong> (localStorage): keeps you signed in</li><li><strong>Cloudflare cookies</strong>: security and performance (if using Cloudflare proxy)</li></ul>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>No Tracking Cookies</h2>
          <p>We do <strong>not</strong> use: advertising cookies, third-party analytics cookies (e.g. Google Analytics), social media tracking pixels, or any cookies for profiling or behavioural advertising.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>Managing Cookies</h2>
          <p>You can delete cookies through your browser settings. Note that clearing the authentication token will sign you out.</p>
          <h2 style={{color:'#fff',fontSize:'1.2rem',marginTop:24}}>Contact</h2>
          <p>Questions: <strong style={{color:'#6366f1'}}>privacy@vibelist.uk</strong></p>
        </div>
      </div>
    </div>
  );

  // ========== UPLOAD ID VIEW ==========
  if (view === 'upload-id') return (
    <div style={{maxWidth:500,margin:'0 auto',padding:20}}>
      <h1 style={{textAlign:'center',fontSize:'2rem',margin:'40px 0 10px'}}>🪪 Identity Verification</h1>
      <div style={S.card}>
        <p style={{color:'#ccc',lineHeight:1.6,marginBottom:16}}>As a new member, we require a <strong>valid government-issued photo ID</strong> to verify your identity. This helps keep our community safe and trustworthy.</p>
        <p style={{color:'#888',fontSize:'0.9rem',marginBottom:16}}>Accepted documents: UK driving licence, passport, national ID card, or BRP card.</p>
        <div style={{background:'#1a1a1a',borderRadius:12,padding:16,marginBottom:16,border:'1px solid #2a2a2a'}}>
          <p style={{margin:'0 0 8px',color:'#f59e0b',fontWeight:600}}>🔒 Your ID is stored securely</p>
          <ul style={{margin:0,paddingLeft:20,color:'#888',fontSize:'0.85rem',lineHeight:1.8}}>
            <li>Encrypted at rest on secure servers</li><li>Only accessible to verified administrators</li><li>Used solely for identity verification</li><li>You can request deletion at any time</li></ul>
        </div>
        <button onClick={()=>idFileRef.current?.click()} disabled={uploading} style={{...S.btn,opacity:uploading?0.6:1}}>{uploading ? '⏳ Uploading...' : '📤 Upload Government ID'}</button>
        <input ref={idFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleIdUpload} style={{display:'none'}} />
        <button onClick={()=>setView('home')} style={{...S.btnSec,width:'100%',marginTop:10}}>Skip for now (required before posting)</button>
      </div>
    </div>
  );

  // ========== ACCOUNT VIEW ==========
  if (view === 'account' && user) return (
    <div style={{maxWidth:600,margin:'0 auto',padding:20}}>
      <button onClick={()=>setView('home')} style={{...S.btnSec,marginBottom:20}}>← Back</button>
      <h1 style={{margin:'0 0 20px'}}>⚙️ Account Settings</h1>
      <div style={S.card}>
        <h2 style={{margin:'0 0 16px',fontSize:'1.2rem'}}>👤 Profile</h2>
        <p style={{color:'#ccc'}}><strong>Name:</strong> {user.display_name}</p>
        <p style={{color:'#ccc'}}><strong>Email:</strong> {user.email}</p>
        <p style={{color:'#ccc'}}><strong>Plan:</strong> {user.is_founding_member ? <span style={{color:'#f59e0b'}}>🌟 Founding Member #{user.founding_member_number} (Pro)</span> : <>{tierBadge(userTier)}</>}</p>
        {!user.is_founding_member && <p style={{color:'#ccc'}}><strong>ID Verified:</strong> {user.id_verified ? '✅ Verified' : user.has_id_document ? '⏳ Pending review' : <span style={{color:'#ef4444'}}>❌ Not uploaded — <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>setView('upload-id')}>Upload now</span></span>}</p>}
        {user.pending_downgrade_tier && (
          <div style={{background:'#422006',borderRadius:10,padding:12,marginTop:12,border:'1px solid #f59e0b'}}>
            <p style={{margin:'0 0 8px',color:'#f59e0b'}}>⏳ Pending downgrade to <strong>{user.pending_downgrade_tier === 'free' ? 'Free' : 'Silver'}</strong> at end of billing period{user.subscription_expires_at ? ` (${formatDate(user.subscription_expires_at)})` : ''}</p>
            <button onClick={cancelPendingDowngrade} style={{padding:'6px 14px',background:'transparent',color:'#f59e0b',border:'1px solid #f59e0b',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>Cancel Downgrade — Keep Current Plan</button>
          </div>
        )}
      </div>

      {/* Subscription Management */}
      {!user.is_founding_member && (
        <div style={S.card}>
          <h2 style={{margin:'0 0 16px',fontSize:'1.2rem'}}>💳 Subscription</h2>
          {userTier === 'pro' && user.subscription_status === 'active' ? (<>
            <p style={{color:'#818cf8',marginBottom:12}}>⚡ Pro — £15/month</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button onClick={()=>downgradeSubscription('silver')} style={{padding:'10px 16px',background:'#1a1a2e',color:'#9ca3af',border:'1px solid #6b7280',borderRadius:10,cursor:'pointer',fontSize:'0.85rem'}}>🥈 Downgrade to Silver (£5/mo)</button>
              <button onClick={cancelSubscription} style={{padding:'10px 16px',background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:10,cursor:'pointer',fontSize:'0.85rem'}}>Cancel Subscription</button>
            </div>
            <p style={{color:'#555',fontSize:'0.8rem',marginTop:8}}>Your access continues until the end of your current billing period.</p>
          </>) : userTier === 'silver' && user.subscription_status === 'active' ? (<>
            <p style={{color:'#c0c0c0',marginBottom:12}}>🥈 Silver — £5/month</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button onClick={()=>startPayPal('pro')} style={{padding:'10px 16px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontSize:'0.85rem'}}>⚡ Upgrade to Pro (£15/mo)</button>
              <button onClick={()=>downgradeSubscription('free')} style={{padding:'10px 16px',background:'#1a1a1a',color:'#888',border:'1px solid #333',borderRadius:10,cursor:'pointer',fontSize:'0.85rem'}}>Downgrade to Free</button>
              <button onClick={cancelSubscription} style={{padding:'10px 16px',background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:10,cursor:'pointer',fontSize:'0.85rem'}}>Cancel</button>
            </div>
          </>) : user.subscription_status === 'cancelled' ? (<>
            <p style={{color:'#f59e0b',marginBottom:12}}>⚠️ Subscription cancelled{user.cancelled_at ? ` on ${formatDate(user.cancelled_at)}` : ''}</p>
            <p style={{color:'#888',fontSize:'0.9rem',marginBottom:12}}>After 90 days with no active subscription, you&apos;ll receive an email about keeping or deleting your account.</p>
            <button onClick={()=>setView('subscribe')} style={S.btn}>🔄 Resubscribe</button>
          </>) : (<>
            <p style={{color:'#888',marginBottom:12}}>📋 Free plan — {tierLimits?.max_listings || 3} listings, {tierLimits?.max_images_per_listing || 2} images each</p>
            <button onClick={()=>setView('subscribe')} style={S.btn}>⚡ Upgrade Your Plan</button>
          </>)}
        </div>
      )}

      {/* Tier Limits Info */}
      {tierLimits && (
        <div style={S.card}>
          <h2 style={{margin:'0 0 12px',fontSize:'1.2rem'}}>📊 Your Plan Limits</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'#1a1a1a',padding:12,borderRadius:10,textAlign:'center'}}><p style={{margin:0,color:'#888',fontSize:'0.8rem'}}>Listings</p><p style={{margin:0,fontSize:'1.2rem',fontWeight:700}}>{tierLimits.max_listings === -1 ? '∞' : tierLimits.max_listings}</p></div>
            <div style={{background:'#1a1a1a',padding:12,borderRadius:10,textAlign:'center'}}><p style={{margin:0,color:'#888',fontSize:'0.8rem'}}>Images/listing</p><p style={{margin:0,fontSize:'1.2rem',fontWeight:700}}>{tierLimits.max_images_per_listing === -1 ? '∞' : tierLimits.max_images_per_listing}</p></div>
            <div style={{background:'#1a1a1a',padding:12,borderRadius:10,textAlign:'center'}}><p style={{margin:0,color:'#888',fontSize:'0.8rem'}}>Private Gallery</p><p style={{margin:0,fontSize:'1.2rem',fontWeight:700}}>{tierLimits.max_private_images === 0 ? '—' : tierLimits.max_private_images}</p></div>
            <div style={{background:'#1a1a1a',padding:12,borderRadius:10,textAlign:'center'}}><p style={{margin:0,color:'#888',fontSize:'0.8rem'}}>Videos</p><p style={{margin:0,fontSize:'1.2rem',fontWeight:700}}>{tierLimits.allow_videos ? '✅' : '—'}</p></div>
          </div>
        </div>
      )}

      {/* Delete Account */}
      <div style={{...S.card,borderColor:'#7f1d1d'}}>
        <h2 style={{margin:'0 0 12px',fontSize:'1.2rem',color:'#ef4444'}}>⚠️ Danger Zone</h2>
        <p style={{color:'#888',fontSize:'0.9rem',marginBottom:12}}>Permanently delete your account, all listings, images, and messages. This action cannot be undone.</p>
        <button onClick={async()=>{if(!confirm('Are you SURE? This will permanently delete your entire account and all data.')) return; const r = await fetch(`${API}/account/delete`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); const d = await r.json(); if(r.ok){alert(d.message);logout();}else alert(d.error);}} style={{padding:'10px 20px',background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:10,cursor:'pointer',fontSize:'0.9rem'}}>🗑️ Delete My Account</button>
      </div>
    </div>
  );

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
            <p style={{color:'#555',fontSize:'0.8rem',margin:'0 0 10px'}}>By registering, you agree to our <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>setView('terms')}>Terms of Service</span> and <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>setView('privacy')}>Privacy Policy</span>. You start on the <strong>Free plan</strong> — upgrade anytime.</p>
          </>)}
          <button type="submit" style={S.btn}>{view==='login'?'Sign In':'Create Free Account'}</button>
        </form>
        <p style={{textAlign:'center',marginTop:16,color:'#888'}}>
          {view==='login'?<>No account? <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>{setView('register');setErr('');}}>Register</span></>
            :<>Have an account? <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>{setView('login');setErr('');}}>Sign in</span></>}
        </p>
        <p style={{textAlign:'center',marginTop:8}}><span style={{color:'#555',cursor:'pointer'}} onClick={()=>setView('home')}>← Back</span></p>
      </div>
    </div>
  );

  // ========== SUBSCRIBE VIEW (3 tiers) ==========
  if (view === 'subscribe') return (
    <div style={{maxWidth:900,margin:'0 auto',padding:20}}>
      <h1 style={{textAlign:'center',fontSize:'2.5rem',margin:'40px 0 10px',background:'linear-gradient(135deg,#6366f1,#ec4899)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✨ VibeList Plans</h1>
      <p style={{textAlign:'center',color:'#888',margin:'0 0 30px'}}>Choose the plan that works for you</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20,marginBottom:30}}>
        {/* FREE TIER */}
        <div style={{...S.card,border:userTier==='free'?'2px solid #555':'1px solid #1e1e1e',position:'relative'}}>
          {userTier === 'free' && <div style={{position:'absolute',top:-10,right:16,background:'#333',color:'#fff',padding:'2px 12px',borderRadius:10,fontSize:'0.75rem'}}>Current Plan</div>}
          <div style={{textAlign:'center',marginBottom:16}}>
            <p style={{fontSize:'1.5rem',margin:'0 0 4px'}}>📋</p>
            <h3 style={{margin:'0 0 4px',fontSize:'1.3rem'}}>Free</h3>
            <p style={{fontSize:'2rem',fontWeight:700,margin:'0 0 4px'}}>£0<span style={{fontSize:'0.9rem',color:'#666'}}>/month</span></p>
          </div>
          <ul style={{listStyle:'none',padding:0,margin:'0 0 20px'}}>
            <li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📝 Up to 3 listings</li>
            <li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📸 2 images per listing</li>
            <li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>💬 Direct messaging</li>
            <li style={{padding:'6px 0',color:'#555',fontSize:'0.9rem'}}>🔒 No private gallery</li>
            <li style={{padding:'6px 0',color:'#555',fontSize:'0.9rem'}}>🎥 No video support</li>
          </ul>
          {userTier === 'free' ? <div style={{textAlign:'center',color:'#666',padding:10}}>✓ Active</div> :
            <button onClick={()=>downgradeSubscription('free')} style={{...S.btnSec,width:'100%'}}>Downgrade to Free</button>}
        </div>

        {/* SILVER TIER */}
        <div style={{...S.card,border:userTier==='silver'?'2px solid #9ca3af':'1px solid #1e1e1e',position:'relative',background:'linear-gradient(180deg,#141414,#1a1a24)'}}>
          {userTier === 'silver' && <div style={{position:'absolute',top:-10,right:16,background:'linear-gradient(135deg,#6b7280,#9ca3af)',color:'#fff',padding:'2px 12px',borderRadius:10,fontSize:'0.75rem'}}>Current Plan</div>}
          <div style={{textAlign:'center',marginBottom:16}}>
            <p style={{fontSize:'1.5rem',margin:'0 0 4px'}}>🥈</p>
            <h3 style={{margin:'0 0 4px',fontSize:'1.3rem',color:'#c0c0c0'}}>Silver</h3>
            <p style={{fontSize:'2rem',fontWeight:700,margin:'0 0 4px'}}>£5<span style={{fontSize:'0.9rem',color:'#666'}}>/month</span></p>
          </div>
          <ul style={{listStyle:'none',padding:0,margin:'0 0 20px'}}>
            <li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📝 Up to 10 listings</li>
            <li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📸 5 images per listing</li>
            <li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>💬 Direct messaging</li>
            <li style={{padding:'6px 0',color:'#c0c0c0',fontSize:'0.9rem'}}>🔓 2 private gallery images</li>
            <li style={{padding:'6px 0',color:'#555',fontSize:'0.9rem'}}>🎥 No video support</li>
          </ul>
          {userTier === 'silver' ? <div style={{textAlign:'center',color:'#9ca3af',padding:10}}>✓ Active</div> :
            userTier === 'pro' ? <button onClick={()=>downgradeSubscription('silver')} style={{...S.btnSec,width:'100%',borderColor:'#9ca3af',color:'#c0c0c0'}}>Downgrade to Silver</button> :
            <button onClick={()=>startPayPal('silver')} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#6b7280,#9ca3af)',color:'#fff',border:'none',borderRadius:12,fontSize:'1rem',cursor:'pointer',fontWeight:600}}>🥈 Subscribe — £5/mo</button>}
        </div>

        {/* PRO TIER */}
        <div style={{...S.card,border:userTier==='pro'?'2px solid #6366f1':'1px solid #1e1e1e',position:'relative',background:'linear-gradient(180deg,#141414,#1e1b3a)'}}>
          {userTier === 'pro' && <div style={{position:'absolute',top:-10,right:16,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',padding:'2px 12px',borderRadius:10,fontSize:'0.75rem'}}>Current Plan</div>}
          <div style={{position:'absolute',top:-10,left:16,background:'linear-gradient(135deg,#ec4899,#f43f5e)',color:'#fff',padding:'2px 12px',borderRadius:10,fontSize:'0.75rem',fontWeight:600}}>Best Value</div>
          <div style={{textAlign:'center',marginBottom:16}}>
            <p style={{fontSize:'1.5rem',margin:'0 0 4px'}}>⚡</p>
            <h3 style={{margin:'0 0 4px',fontSize:'1.3rem',color:'#818cf8'}}>Pro</h3>
            <p style={{fontSize:'2rem',fontWeight:700,margin:'0 0 4px'}}>£15<span style={{fontSize:'0.9rem',color:'#666'}}>/month</span></p>
          </div>
          <ul style={{listStyle:'none',padding:0,margin:'0 0 20px'}}>
            <li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📝 Unlimited listings</li>
            <li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📸 Unlimited images</li>
            <li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>💬 Direct messaging</li>
            <li style={{padding:'6px 0',color:'#818cf8',fontSize:'0.9rem'}}>🔓 10 private gallery images</li>
            <li style={{padding:'6px 0',color:'#818cf8',fontSize:'0.9rem'}}>🎥 Video support</li>
            <li style={{padding:'6px 0',color:'#818cf8',fontSize:'0.9rem'}}>🛡️ Priority support</li>
          </ul>
          {userTier === 'pro' ? <div style={{textAlign:'center',color:'#818cf8',padding:10}}>✓ Active</div> :
            <button onClick={()=>startPayPal('pro')} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:12,fontSize:'1rem',cursor:'pointer',fontWeight:600}}>⚡ Subscribe — £15/mo</button>}
        </div>
      </div>

      <div style={{textAlign:'center',margin:'16px 0',color:'#555',fontSize:'0.85rem'}}>
        <p>🪙 <strong>Crypto payment?</strong> Contact <span style={{color:'#6366f1'}}>support@vibelist.uk</span></p>
      </div>
      <div style={{textAlign:'center'}}><button onClick={()=>setView('home')} style={{...S.btnSec,marginTop:10}}>← Back</button></div>
    </div>
  );

  // ========== CREATE LISTING VIEW ==========
  if (view === 'create') {
    const maxPublic = getMaxImages();
    const maxPrivate = getMaxPrivateImages();
    const currentPublic = formImages.filter(i => !i.isPrivate).length;
    const currentPrivate = formImages.filter(i => i.isPrivate).length;

    return (
    <div style={{maxWidth:640,margin:'0 auto',padding:20}}>
      <h1 style={{textAlign:'center',fontSize:'2rem',margin:'30px 0 10px'}}>📝 Create a Listing</h1>
      <p style={{textAlign:'center',color:'#888',marginBottom:8}}>Share what you&apos;re offering with the community</p>
      <p style={{textAlign:'center',color:'#555',marginBottom:24,fontSize:'0.85rem'}}>Your plan: {tierBadge(userTier)} — {tierLimits?.max_listings === -1 ? 'unlimited' : tierLimits?.max_listings} listings, {tierLimits?.max_images_per_listing === -1 ? 'unlimited' : tierLimits?.max_images_per_listing} images/listing</p>
      {err && <p style={{color:'#ef4444',textAlign:'center',margin:'0 0 10px'}}>{err}</p>}
      <form onSubmit={createListing} style={S.card}>
        <label style={{color:'#888',fontSize:'0.85rem',marginBottom:4,display:'block'}}>Title *</label>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <div style={{position:'relative'}}>
            <button type="button" onClick={()=>setShowEmojiPicker(!showEmojiPicker)} style={{width:50,height:48,background:'#181818',border:'1px solid #2a2a2a',borderRadius:10,fontSize:'1.5rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{form.emoji}</button>
            {showEmojiPicker && (
              <div style={{position:'absolute',top:54,left:0,background:'#1a1a1a',border:'1px solid #333',borderRadius:12,padding:12,display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,zIndex:100,width:240}}>
                {EMOJIS.map(e=><button key={e} type="button" onClick={()=>insertEmoji(e)} style={{background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',padding:6,borderRadius:8}}>{e}</button>)}
              </div>
            )}
          </div>
          <input placeholder="e.g. Professional Photography Services" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required minLength={5} style={{...S.inp,flex:1,marginBottom:0}} />
        </div>
        <label style={{color:'#888',fontSize:'0.85rem',marginBottom:4,display:'block'}}>Description *</label>
        <textarea placeholder={'Describe your listing in detail...\n\nThis is a free-text area — write whatever you like.'} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required minLength={10} rows={8} style={{...S.inp,resize:'vertical',minHeight:160,lineHeight:1.6}} />
        <div style={{display:'flex',gap:10,marginBottom:10}}>
          <div style={{flex:1}}><label style={{color:'#888',fontSize:'0.85rem',display:'block'}}>Category *</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={S.inp}>{CATEGORIES.filter(c=>c!=='all').map(c=><option key={c} value={c}>{CAT_ICONS[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
          <div style={{flex:1}}><label style={{color:'#888',fontSize:'0.85rem',display:'block'}}>City *</label>
            <select value={form.city} onChange={e=>setForm({...form,city:e.target.value})} style={S.inp}>{CITIES.filter(c=>c!=='all').map(c=><option key={c} value={c}>{CITY_ICONS[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
        </div>
        <div style={{display:'flex',gap:10,marginBottom:10}}>
          <div style={{flex:1}}><label style={{color:'#888',fontSize:'0.85rem',display:'block'}}>Price (£) <span style={{color:'#555',fontStyle:'italic'}}>optional</span></label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} style={S.inp} /></div>
          <div style={{flex:1}}><label style={{color:'#888',fontSize:'0.85rem',display:'block'}}>Contact Info <span style={{color:'#555',fontStyle:'italic'}}>optional</span></label>
            <input placeholder="Email, phone, or website" value={form.contact_info} onChange={e=>setForm({...form,contact_info:e.target.value})} style={S.inp} /></div>
        </div>

        {/* Public images */}
        <label style={{color:'#888',fontSize:'0.85rem',marginBottom:8,display:'block'}}>📸 Images ({currentPublic}/{maxPublic === 50 ? '∞' : maxPublic})</label>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
          {formImages.filter(i=>!i.isPrivate).map((img,i) => {
            const realIdx = formImages.indexOf(img);
            return (
            <div key={realIdx} style={{position:'relative',width:100,height:100,borderRadius:10,overflow:'hidden',border:'1px solid #2a2a2a'}}>
              <img src={img.data} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
              <button type="button" onClick={()=>removeImage(realIdx)} style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.7)',color:'#fff',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:'0.8rem'}}>✕</button>
            </div>
          );})}
          {currentPublic < maxPublic && <button type="button" onClick={()=>fileRef.current?.click()} style={{width:100,height:100,background:'#181818',border:'2px dashed #333',borderRadius:10,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#666',fontSize:'0.8rem',gap:4}}><span style={{fontSize:'1.5rem'}}>📷</span>Add Photo</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e)=>handleImageSelect(e,false)} style={{display:'none'}} />

        {/* Private gallery images */}
        {maxPrivate > 0 && (<>
          <label style={{color:'#888',fontSize:'0.85rem',marginBottom:8,display:'block'}}>🔒 Private Gallery ({currentPrivate}/{maxPrivate}) <span style={{color:'#555',fontSize:'0.8rem'}}>— visible only to registered users</span></label>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
            {formImages.filter(i=>i.isPrivate).map((img,i) => {
              const realIdx = formImages.indexOf(img);
              return (
              <div key={realIdx} style={{position:'relative',width:100,height:100,borderRadius:10,overflow:'hidden',border:'2px solid #6366f1'}}>
                <img src={img.data} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(99,102,241,0.8)',color:'#fff',fontSize:'0.65rem',textAlign:'center',padding:'2px 0'}}>🔒 Private</div>
                <button type="button" onClick={()=>removeImage(realIdx)} style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.7)',color:'#fff',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:'0.8rem'}}>✕</button>
              </div>
            );})}
            {currentPrivate < maxPrivate && <button type="button" onClick={()=>{const inp=document.createElement('input');inp.type='file';inp.accept='image/jpeg,image/png,image/webp';inp.multiple=true;inp.onchange=(e:any)=>handleImageSelect(e,true);inp.click();}} style={{width:100,height:100,background:'#1e1b4b',border:'2px dashed #6366f1',borderRadius:10,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#818cf8',fontSize:'0.8rem',gap:4}}><span style={{fontSize:'1.5rem'}}>🔒</span>Private</button>}
          </div>
        </>)}
        {maxPrivate === 0 && userTier === 'free' && (
          <div style={{background:'#1a1a2e',borderRadius:10,padding:12,marginBottom:16,border:'1px solid #2d2b55'}}>
            <p style={{margin:0,color:'#818cf8',fontSize:'0.85rem'}}>🔒 <strong>Private gallery</strong> is available on Silver (£5/mo) and Pro (£15/mo) plans. <span style={{cursor:'pointer',textDecoration:'underline'}} onClick={()=>setView('subscribe')}>Upgrade now</span></p>
          </div>
        )}

        <button type="submit" disabled={uploading} style={{...S.btn,opacity:uploading?0.6:1}}>{uploading ? '⏳ Creating...' : '🚀 Publish Listing'}</button>
        <button type="button" onClick={()=>{setView('home');setErr('');}} style={{...S.btnSec,width:'100%',marginTop:10}}>Cancel</button>
      </form>
    </div>
  );}

  // ========== LISTING DETAIL VIEW ==========
  if (view === 'detail' && selectedListing) {
    const l = selectedListing;
    const publicImages = l.images?.filter(i => !i.is_private) || [];
    const privateImages = l.images?.filter(i => i.is_private) || [];
    return (
      <div style={{maxWidth:700,margin:'0 auto',padding:20}}>
        <button onClick={()=>{setView('home');setSelectedListing(null);}} style={{...S.btnSec,marginBottom:20}}>← Back to listings</button>
        <div style={S.card}>
          {publicImages.length > 0 && (
            <div style={{display:'flex',gap:8,marginBottom:20,overflowX:'auto',paddingBottom:8}}>
              {publicImages.map((img,i) => (<img key={i} src={`/uploads/${img.file_path}`} alt="" style={{width:publicImages.length===1?'100%':280,height:220,objectFit:'cover',borderRadius:12,flexShrink:0}} />))}
            </div>
          )}
          {privateImages.length > 0 && (
            <div style={{marginBottom:20}}>
              <p style={{color:'#818cf8',fontSize:'0.85rem',margin:'0 0 8px'}}>🔒 Private Gallery ({privateImages.length} images — visible to registered users only)</p>
              <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:8}}>
                {privateImages.map((img,i) => (
                  <div key={i} style={{position:'relative',flexShrink:0}}>
                    <img src={`/uploads/${img.file_path}`} alt="" style={{width:200,height:160,objectFit:'cover',borderRadius:12,border:'2px solid #6366f1'}} />
                    <div style={{position:'absolute',bottom:8,left:8,background:'rgba(99,102,241,0.8)',color:'#fff',fontSize:'0.7rem',padding:'2px 8px',borderRadius:6}}>🔒 Private</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <span style={{...S.tag,background:'#1e1b4b',color:'#818cf8'}}>{CAT_ICONS[l.category]} {l.category}</span>
            <span style={{...S.tag,background:'#1a1a2e',color:'#888'}}>{CITY_ICONS[l.city] || '📍'} {l.city}</span>
            <span style={{...S.tag,background:'#1a1a2e',color:'#666'}}>👁 {l.views} views</span>
            {l.status === 'pending' && <span style={{...S.tag,background:'#422006',color:'#f59e0b'}}>⏳ Pending</span>}
            {l.status === 'hidden' && <span style={{...S.tag,background:'#7f1d1d',color:'#fca5a5'}}>🚫 Hidden</span>}
          </div>
          <h1 style={{margin:'0 0 12px',fontSize:'1.8rem',lineHeight:1.3}}>{l.title}</h1>
          <p style={{color:'#aaa',fontSize:'1rem',lineHeight:1.8,whiteSpace:'pre-wrap',margin:'0 0 20px'}}>{l.description}</p>
          <div style={{background:'#1a1a1a',borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
              <div>
                {l.price && <p style={{margin:'0 0 4px',fontSize:'1.4rem',fontWeight:700,color:'#22c55e'}}>{formatPrice(l.price)}</p>}
                <p style={{margin:0,color:'#666',fontSize:'0.85rem'}}>Posted by <strong style={{color:'#aaa'}}>{l.author || 'Anonymous'}</strong> on {formatDate(l.created_at)}</p>
              </div>
              {l.contact_info && <p style={{margin:0,color:'#6366f1',fontSize:'0.9rem'}}>📞 {l.contact_info}</p>}
            </div>
          </div>

          {user && l.author_id && l.author_id !== user.id && (
            <div style={{marginBottom:16}}>
              <h3 style={{margin:'0 0 8px',fontSize:'1rem',color:'#888'}}>💬 Message the seller</h3>
              <div style={{display:'flex',gap:8}}>
                <input placeholder="Type your message..." value={msgText} onChange={e=>setMsgText(e.target.value)} style={{...S.inp,flex:1,marginBottom:0}} />
                <button onClick={()=>sendMessage(l.author_id!, l.id)} style={{padding:'12px 20px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontWeight:600}}>Send</button>
              </div>
            </div>
          )}

          <div style={{marginBottom:16}}>
            <button onClick={()=>setShowReport(!showReport)} style={{padding:'8px 16px',background:'#1a1a1a',color:'#ef4444',border:'1px solid #333',borderRadius:10,cursor:'pointer',fontSize:'0.85rem'}}>🚨 Report this listing</button>
            {showReport && (
              <div style={{background:'#1a1a1a',borderRadius:12,padding:16,marginTop:12,border:'1px solid #2a2a2a'}}>
                <h3 style={{margin:'0 0 12px',fontSize:'1rem'}}>Report Listing</h3>
                <label style={{color:'#888',fontSize:'0.85rem',display:'block',marginBottom:4}}>Your Email (required) *</label>
                <input placeholder="your@email.com" type="email" required value={reportForm.reporter_email} onChange={e=>setReportForm({...reportForm,reporter_email:e.target.value})} style={S.inp} />
                <label style={{color:'#888',fontSize:'0.85rem',display:'block',marginBottom:4}}>Reason *</label>
                <select value={reportForm.reason} onChange={e=>setReportForm({...reportForm,reason:e.target.value})} style={S.inp}>
                  <option value="scam">🚨 Scam</option><option value="spam">📧 Spam</option><option value="misleading">⚠️ Misleading</option>
                  <option value="inappropriate">🚫 Inappropriate</option><option value="duplicate">📋 Duplicate</option><option value="other">📝 Other</option>
                </select>
                <label style={{color:'#888',fontSize:'0.85rem',display:'block',marginBottom:4}}>Detailed justification (min 20 chars) *</label>
                <textarea placeholder="Please explain in detail why you are reporting this listing..." value={reportForm.details} onChange={e=>setReportForm({...reportForm,details:e.target.value})} rows={4} style={{...S.inp,resize:'vertical'}} />
                <button onClick={submitReport} style={{...S.btn,background:'#ef4444',marginTop:8}}>Submit Report</button>
              </div>
            )}
          </div>

          {user && (l.user_id === user.id || user.is_admin) && (
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {user.is_admin && l.status === 'pending' && <>
                <button onClick={()=>{adminAction(l.id,'approve');setSelectedListing({...l,status:'approved'});}} style={{padding:'10px 20px',background:'#22c55e',color:'#fff',border:'none',borderRadius:10,cursor:'pointer'}}>✅ Approve</button>
                <button onClick={()=>{adminAction(l.id,'reject');setView('home');}} style={{padding:'10px 20px',background:'#ef4444',color:'#fff',border:'none',borderRadius:10,cursor:'pointer'}}>❌ Reject</button>
              </>}
              {user.is_admin && l.status === 'approved' && <button onClick={()=>{adminAction(l.id,'hide');setSelectedListing({...l,status:'hidden'});}} style={{padding:'10px 20px',background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:10,cursor:'pointer'}}>🚫 Hide Listing</button>}
              {user.is_admin && l.status === 'hidden' && <button onClick={()=>{adminAction(l.id,'unhide');setSelectedListing({...l,status:'approved'});}} style={{padding:'10px 20px',background:'#052e16',color:'#22c55e',border:'none',borderRadius:10,cursor:'pointer'}}>👁 Unhide</button>}
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
        {myListings.length === 0 ? <p style={{color:'#666',textAlign:'center',padding:40}}>No listings yet.</p> :
          myListings.map(l => (
            <div key={l.id} style={{...S.card,display:'flex',gap:16,alignItems:'center',cursor:'pointer'}} onClick={()=>viewListing(l.id)}>
              {l.image ? <img src={`/uploads/${l.image}`} alt="" style={{width:80,height:80,objectFit:'cover',borderRadius:10}} /> :
                <div style={{width:80,height:80,background:'#1a1a1a',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem'}}>{CAT_ICONS[l.category]}</div>}
              <div style={{flex:1}}>
                <h3 style={{margin:'0 0 4px'}}>{l.title}</h3>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span style={{...S.tag,background:l.status==='approved'?'#052e16':l.status==='hidden'?'#7f1d1d':'#422006',color:l.status==='approved'?'#22c55e':l.status==='hidden'?'#fca5a5':'#f59e0b'}}>{l.status}</span>
                  <span style={{color:'#666',fontSize:'0.8rem'}}>👁 {l.views} views</span>
                </div>
              </div>
              {l.price && <span style={{color:'#22c55e',fontWeight:700}}>{formatPrice(l.price)}</span>}
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
        <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
          {(['overview','users','pending','reports','hidden','dormant'] as const).map(tab => (
            <button key={tab} onClick={()=>{setAdminTab(tab); if(tab==='users'&&adminUsers.length===0)fetchAdminUsers(); if(tab==='hidden')fetchHiddenListings(); if(tab==='dormant')fetchDormant();}}
              style={{padding:'8px 16px',borderRadius:10,border:'none',cursor:'pointer',background:adminTab===tab?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#181818',color:adminTab===tab?'#fff':'#888',fontWeight:adminTab===tab?600:400,fontSize:'0.85rem',textTransform:'capitalize'}}>
              {tab === 'overview' ? '📊' : tab === 'users' ? '👥' : tab === 'pending' ? '⏳' : tab === 'reports' ? '🚨' : tab === 'hidden' ? '🚫' : '💤'} {tab}
            </button>
          ))}
        </div>

        {adminTab === 'overview' && adminStats && (<>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:20}}>
            {[['👥 Users',adminStats.total_users],['📋 Listings',adminStats.total_listings],['⏳ Pending',adminStats.pending_listings],['🚫 Hidden',adminStats.hidden_listings||0],['💳 Active',adminStats.active_subscribers],['🚨 Reports',adminStats.pending_reports],['🌟 Founders',`${adminStats.founding_members||0}/25`],['📋 Free',adminStats.free_tier_users||0],['🥈 Silver',adminStats.silver_subscribers||0],['⚡ Pro',adminStats.pro_subscribers||0],['💤 Dormant',adminStats.dormant_accounts||0],['🪪 ID Pending',adminStats.pending_id_verifications||0]].map(([label,val]) =>
              <div key={label as string} style={{background:'#141414',borderRadius:12,padding:14,textAlign:'center',border:'1px solid #1e1e1e'}}>
                <p style={{margin:'0 0 4px',fontSize:'0.8rem',color:'#888'}}>{label as string}</p>
                <p style={{margin:0,fontSize:'1.4rem',fontWeight:700}}>{val as any}</p>
              </div>
            )}
          </div>
          <div style={{...S.card,background:'linear-gradient(135deg,#1a1a2e,#0f172a)',border:'1px solid #2d2b55'}}>
            <h3 style={{margin:'0 0 12px',color:'#f59e0b'}}>🌟 Founding Members</h3>
            <div style={{background:'#0a0a0a',borderRadius:8,height:24,overflow:'hidden',marginBottom:8}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#f59e0b,#eab308)',borderRadius:8,width:`${Math.min(100,((adminStats.founding_members||0)/25)*100)}%`}} />
            </div>
            <p style={{margin:0,color:'#666',fontSize:'0.85rem'}}>{adminStats.founding_members||0}/25 slots filled</p>
          </div>
        </>)}

        {adminTab === 'users' && (<>
          <h2 style={{margin:'0 0 16px',fontSize:'1.2rem'}}>👥 All Users ({adminUsers.length})</h2>
          {adminUsers.map(u => (
            <div key={u.id} style={{...S.card,padding:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                    <strong>{u.display_name}</strong>
                    {u.is_founding_member && <span style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#000',padding:'2px 8px',borderRadius:10,fontSize:'0.7rem',fontWeight:700}}>🌟 #{u.founding_member_number}</span>}
                    {u.is_admin && <span style={{background:'#7c3aed',color:'#fff',padding:'2px 8px',borderRadius:10,fontSize:'0.7rem'}}>ADMIN</span>}
                    {u.effective_tier && tierBadge(u.effective_tier)}
                    {u.id_verified && <span style={{background:'#052e16',color:'#22c55e',padding:'2px 8px',borderRadius:10,fontSize:'0.7rem'}}>🪪 ID ✓</span>}
                    {u.has_id_document && !u.id_verified && <span style={{background:'#422006',color:'#f59e0b',padding:'2px 8px',borderRadius:10,fontSize:'0.7rem'}}>🪪 Pending</span>}
                    {!u.has_id_document && !u.is_founding_member && <span style={{background:'#1a1a1a',color:'#666',padding:'2px 8px',borderRadius:10,fontSize:'0.7rem'}}>No ID</span>}
                    {u.pending_downgrade_tier && <span style={{background:'#422006',color:'#f59e0b',padding:'2px 8px',borderRadius:10,fontSize:'0.7rem'}}>↓ {u.pending_downgrade_tier}</span>}
                  </div>
                  <p style={{margin:0,color:'#666',fontSize:'0.8rem'}}>{u.email} • {formatDate(u.created_at)} • {u.subscription_status}{u.cancelled_at ? ` (cancelled ${formatDate(u.cancelled_at)})` : ''}</p>
                </div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {u.has_id_document && !u.id_verified && <>
                    <button onClick={()=>adminUserAction(u.id,'verify-id')} style={{padding:'5px 10px',background:'#052e16',color:'#22c55e',border:'1px solid #22c55e',borderRadius:8,cursor:'pointer',fontSize:'0.75rem'}}>✅ Verify ID</button>
                    <button onClick={()=>adminUserAction(u.id,'reject-id')} style={{padding:'5px 10px',background:'#7f1d1d',color:'#fca5a5',border:'1px solid #ef4444',borderRadius:8,cursor:'pointer',fontSize:'0.75rem'}}>❌ Reject ID</button>
                  </>}
                  {!u.is_founding_member && <button onClick={()=>{if(confirm(`Grant founder to ${u.display_name}?`))adminUserAction(u.id,'grant-founding');}} style={{padding:'5px 10px',background:'#422006',color:'#f59e0b',border:'1px solid #f59e0b',borderRadius:8,cursor:'pointer',fontSize:'0.75rem'}}>🌟 Founder</button>}
                  {u.is_founding_member && <button onClick={()=>{if(confirm('Revoke?'))adminUserAction(u.id,'revoke-founding');}} style={{padding:'5px 10px',background:'#1a1a1a',color:'#888',border:'1px solid #333',borderRadius:8,cursor:'pointer',fontSize:'0.75rem'}}>Revoke</button>}
                  <button onClick={()=>adminUserAction(u.id,'toggle-admin')} style={{padding:'5px 10px',background:'#1a1a1a',color:'#888',border:'1px solid #333',borderRadius:8,cursor:'pointer',fontSize:'0.75rem'}}>{u.is_admin?'Remove Admin':'🛡️ Admin'}</button>
                  <button onClick={()=>deleteAccount(u.id,u.email)} style={{padding:'5px 10px',background:'#7f1d1d',color:'#fca5a5',border:'1px solid #333',borderRadius:8,cursor:'pointer',fontSize:'0.75rem'}}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </>)}

        {adminTab === 'pending' && (<>
          <h2 style={{margin:'0 0 16px',fontSize:'1.2rem'}}>⏳ Pending Listings</h2>
          {adminListings.length === 0 ? <p style={{color:'#666'}}>No pending listings.</p> :
            adminListings.map(l => (
              <div key={l.id} style={{...S.card,display:'flex',gap:16,alignItems:'center'}}>
                <div style={{width:50,height:50,background:'#1a1a1a',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem'}}>{CAT_ICONS[l.category]}</div>
                <div style={{flex:1,cursor:'pointer'}} onClick={()=>viewListing(l.id)}><h3 style={{margin:'0 0 4px'}}>{l.title}</h3><p style={{margin:0,color:'#666',fontSize:'0.85rem'}}>by {l.author} • {l.city}</p></div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>adminAction(l.id,'approve')} style={{padding:'8px 14px',background:'#22c55e',color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>✅</button>
                  <button onClick={()=>adminAction(l.id,'reject')} style={{padding:'8px 14px',background:'#ef4444',color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>❌</button>
                </div>
              </div>
            ))}
        </>)}

        {adminTab === 'reports' && (<>
          <h2 style={{margin:'0 0 16px',fontSize:'1.2rem'}}>🚨 Pending Reports ({adminReports.length})</h2>
          {adminReports.length === 0 ? <p style={{color:'#666'}}>No pending reports.</p> :
            adminReports.map(r => (
              <div key={r.id} style={S.card}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8}}>
                  <h3 style={{margin:0,fontSize:'1rem'}}>Listing: {r.listing_title}</h3>
                  <span style={{...S.tag,background:'#7f1d1d',color:'#fca5a5'}}>{r.reason}</span>
                </div>
                <p style={{color:'#ccc',margin:'0 0 8px',lineHeight:1.6}}>{r.details}</p>
                <p style={{color:'#666',fontSize:'0.8rem',margin:'0 0 12px'}}>From: {r.reporter_email} • {formatDate(r.created_at)} • Listing status: {r.listing_status}</p>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>resolveReport(r.id,'hide_listing')} style={{padding:'8px 14px',background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>🚫 Hide Listing</button>
                  <button onClick={()=>resolveReport(r.id,'dismiss')} style={{padding:'8px 14px',background:'#1a1a1a',color:'#888',border:'1px solid #333',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>✓ Dismiss</button>
                </div>
              </div>
            ))}
        </>)}

        {adminTab === 'hidden' && (<>
          <h2 style={{margin:'0 0 16px',fontSize:'1.2rem'}}>🚫 Hidden Listings ({hiddenListings.length})</h2>
          {hiddenListings.length === 0 ? <p style={{color:'#666'}}>No hidden listings.</p> :
            hiddenListings.map(l => (
              <div key={l.id} style={{...S.card,display:'flex',gap:16,alignItems:'center'}}>
                <div style={{flex:1,cursor:'pointer'}} onClick={()=>viewListing(l.id)}><h3 style={{margin:'0 0 4px'}}>{l.title}</h3><p style={{margin:0,color:'#666',fontSize:'0.85rem'}}>by {l.author} • {l.city}</p></div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>{adminAction(l.id,'unhide');fetchHiddenListings();}} style={{padding:'8px 14px',background:'#052e16',color:'#22c55e',border:'none',borderRadius:8,cursor:'pointer'}}>👁 Unhide</button>
                  <button onClick={()=>{deleteListing(l.id);fetchHiddenListings();}} style={{padding:'8px 14px',background:'#ef4444',color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>🗑</button>
                </div>
              </div>
            ))}
        </>)}

        {adminTab === 'dormant' && (<>
          <h2 style={{margin:'0 0 16px',fontSize:'1.2rem'}}>💤 Dormant Accounts (90+ days cancelled)</h2>
          {dormantAccounts.length === 0 ? <p style={{color:'#666'}}>No dormant accounts.</p> :
            dormantAccounts.map(u => (
              <div key={u.id} style={{...S.card,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                <div><strong>{u.display_name}</strong><p style={{margin:0,color:'#666',fontSize:'0.8rem'}}>{u.email} • Cancelled {formatDate(u.cancelled_at)}</p></div>
                <button onClick={()=>deleteAccount(u.id,u.email)} style={{padding:'8px 14px',background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>🗑 Delete &amp; Archive</button>
              </div>
            ))}
        </>)}
      </div>
    );
  }

  // ========== PUBLIC PRICING PAGE ==========
  if (view === 'pricing') return (
    <div style={{maxWidth:900,margin:'0 auto',padding:20}}>
      <button onClick={()=>setView('home')} style={{...S.btnSec,marginBottom:20}}>← Back</button>
      <h1 style={{textAlign:'center',fontSize:'2.5rem',margin:'20px 0 10px',background:'linear-gradient(135deg,#6366f1,#ec4899)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>💰 Pricing Plans</h1>
      <p style={{textAlign:'center',color:'#888',margin:'0 0 30px'}}>Simple, transparent pricing. Start free, upgrade when you need more.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20,marginBottom:30}}>
        <div style={{...S.card,border:'1px solid #333'}}>
          <div style={{textAlign:'center',marginBottom:16}}><p style={{fontSize:'1.5rem',margin:'0 0 4px'}}>📋</p><h3 style={{margin:'0 0 4px',fontSize:'1.3rem'}}>Free</h3><p style={{fontSize:'2rem',fontWeight:700,margin:'0 0 4px'}}>£0<span style={{fontSize:'0.9rem',color:'#666'}}>/month</span></p></div>
          <ul style={{listStyle:'none',padding:0,margin:'0 0 20px'}}><li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📝 Up to 3 listings</li><li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📸 2 images per listing</li><li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>💬 Direct messaging</li><li style={{padding:'6px 0',color:'#555',fontSize:'0.9rem'}}>🔒 No private gallery</li><li style={{padding:'6px 0',color:'#555',fontSize:'0.9rem'}}>🎥 No video support</li></ul>
          <button onClick={()=>setView('register')} style={{...S.btnSec,width:'100%'}}>Get Started Free</button>
        </div>
        <div style={{...S.card,border:'1px solid #6b7280',background:'linear-gradient(180deg,#141414,#1a1a24)'}}>
          <div style={{textAlign:'center',marginBottom:16}}><p style={{fontSize:'1.5rem',margin:'0 0 4px'}}>🥈</p><h3 style={{margin:'0 0 4px',fontSize:'1.3rem',color:'#c0c0c0'}}>Silver</h3><p style={{fontSize:'2rem',fontWeight:700,margin:'0 0 4px'}}>£5<span style={{fontSize:'0.9rem',color:'#666'}}>/month</span></p></div>
          <ul style={{listStyle:'none',padding:0,margin:'0 0 20px'}}><li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📝 Up to 10 listings</li><li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📸 5 images per listing</li><li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>💬 Direct messaging</li><li style={{padding:'6px 0',color:'#c0c0c0',fontSize:'0.9rem'}}>🔓 2 private gallery images</li><li style={{padding:'6px 0',color:'#555',fontSize:'0.9rem'}}>🎥 No video support</li></ul>
          <button onClick={()=>user?setView('subscribe'):setView('register')} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#6b7280,#9ca3af)',color:'#fff',border:'none',borderRadius:12,fontSize:'1rem',cursor:'pointer',fontWeight:600}}>🥈 Choose Silver</button>
        </div>
        <div style={{...S.card,border:'1px solid #6366f1',background:'linear-gradient(180deg,#141414,#1e1b3a)',position:'relative'}}>
          <div style={{position:'absolute',top:-10,left:16,background:'linear-gradient(135deg,#ec4899,#f43f5e)',color:'#fff',padding:'2px 12px',borderRadius:10,fontSize:'0.75rem',fontWeight:600}}>Best Value</div>
          <div style={{textAlign:'center',marginBottom:16}}><p style={{fontSize:'1.5rem',margin:'0 0 4px'}}>⚡</p><h3 style={{margin:'0 0 4px',fontSize:'1.3rem',color:'#818cf8'}}>Pro</h3><p style={{fontSize:'2rem',fontWeight:700,margin:'0 0 4px'}}>£15<span style={{fontSize:'0.9rem',color:'#666'}}>/month</span></p></div>
          <ul style={{listStyle:'none',padding:0,margin:'0 0 20px'}}><li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📝 Unlimited listings</li><li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>📸 Unlimited images</li><li style={{padding:'6px 0',color:'#ccc',fontSize:'0.9rem'}}>💬 Direct messaging</li><li style={{padding:'6px 0',color:'#818cf8',fontSize:'0.9rem'}}>🔓 10 private gallery images</li><li style={{padding:'6px 0',color:'#818cf8',fontSize:'0.9rem'}}>🎥 Video support</li><li style={{padding:'6px 0',color:'#818cf8',fontSize:'0.9rem'}}>🛡️ Priority support</li></ul>
          <button onClick={()=>user?setView('subscribe'):setView('register')} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:12,fontSize:'1rem',cursor:'pointer',fontWeight:600}}>⚡ Choose Pro</button>
        </div>
      </div>
      <div style={S.card}><h3 style={{margin:'0 0 12px'}}>📋 Plan Comparison</h3>
        <table style={{width:'100%',borderCollapse:'collapse',color:'#ccc',fontSize:'0.9rem'}}>
          <thead><tr style={{borderBottom:'1px solid #333'}}><th style={{textAlign:'left',padding:8,color:'#888'}}>Feature</th><th style={{padding:8,color:'#888'}}>Free</th><th style={{padding:8,color:'#c0c0c0'}}>Silver</th><th style={{padding:8,color:'#818cf8'}}>Pro</th></tr></thead>
          <tbody>
            <tr style={{borderBottom:'1px solid #1e1e1e'}}><td style={{padding:8}}>Listings</td><td style={{padding:8,textAlign:'center'}}>3</td><td style={{padding:8,textAlign:'center'}}>10</td><td style={{padding:8,textAlign:'center'}}>Unlimited</td></tr>
            <tr style={{borderBottom:'1px solid #1e1e1e'}}><td style={{padding:8}}>Images per listing</td><td style={{padding:8,textAlign:'center'}}>2</td><td style={{padding:8,textAlign:'center'}}>5</td><td style={{padding:8,textAlign:'center'}}>Unlimited</td></tr>
            <tr style={{borderBottom:'1px solid #1e1e1e'}}><td style={{padding:8}}>Private gallery</td><td style={{padding:8,textAlign:'center'}}>—</td><td style={{padding:8,textAlign:'center'}}>2 images</td><td style={{padding:8,textAlign:'center'}}>10 images</td></tr>
            <tr style={{borderBottom:'1px solid #1e1e1e'}}><td style={{padding:8}}>Video uploads</td><td style={{padding:8,textAlign:'center'}}>—</td><td style={{padding:8,textAlign:'center'}}>—</td><td style={{padding:8,textAlign:'center'}}>✅</td></tr>
            <tr style={{borderBottom:'1px solid #1e1e1e'}}><td style={{padding:8}}>Direct messaging</td><td style={{padding:8,textAlign:'center'}}>✅</td><td style={{padding:8,textAlign:'center'}}>✅</td><td style={{padding:8,textAlign:'center'}}>✅</td></tr>
            <tr><td style={{padding:8}}>Priority support</td><td style={{padding:8,textAlign:'center'}}>—</td><td style={{padding:8,textAlign:'center'}}>—</td><td style={{padding:8,textAlign:'center'}}>✅</td></tr>
          </tbody>
        </table>
      </div>
      <div style={{...S.card,textAlign:'center',marginTop:16}}>
        <p style={{color:'#888',margin:'0 0 8px'}}>🌟 <strong style={{color:'#f59e0b'}}>Founding Members</strong> — The first 25 users get <strong>permanent free Pro access!</strong></p>
        <p style={{color:'#555',fontSize:'0.85rem',margin:0}}>Other payment options? Email <strong style={{color:'#6366f1'}}>support@vibelist.uk</strong></p>
      </div>
    </div>
  );

  // ========== HELP PAGE ==========
  if (view === 'help') {
    const [helpContact, setHelpContact] = useState({email:'',subject:'',message:''});
    const [helpSending, setHelpSending] = useState(false);
    const [openFaq, setOpenFaq] = useState<number|null>(null);
    const faqs = [
      {q:'How do I create a listing?',a:'Register for a free account, then click "Create a Listing" on the homepage. Fill in the title, description, category, city, and optionally add images. Your listing will be reviewed by our team before going live.'},
      {q:'What are the subscription tiers?',a:'We offer 3 plans: Free (£0/mo — 3 listings, 2 images), Silver (£5/mo — 10 listings, 5 images, 2 private gallery), and Pro (£15/mo — unlimited listings & images, 10 private gallery, video support). Visit our Pricing page for full details.'},
      {q:'How does the private gallery work?',a:'Silver and Pro members can upload private gallery images that are only visible to registered, logged-in users. This gives you more control over who sees certain content.'},
      {q:'Can I downgrade or cancel my subscription?',a:'Yes! Go to Account Settings → Subscription. If you downgrade or cancel, your current plan stays active until the end of your billing period. No partial refunds are given.'},
      {q:'What is a Founding Member?',a:'The first 25 registered users receive permanent free Pro access as Founding Members. This is a special thank-you for early supporters and cannot be transferred.'},
      {q:'Why do I need to upload an ID?',a:'For safety and trust, non-founding members must upload a government-issued photo ID. This helps prevent scams and keeps our community secure. Your ID is stored securely and encrypted.'},
      {q:'How long before my listing is approved?',a:'Our admin team reviews new listings as quickly as possible, usually within a few hours. You\'ll see your listing status change from "Pending" to "Approved" in My Listings.'},
      {q:'How do I report a suspicious listing?',a:'Click on any listing and scroll down to the "Report this listing" button. Provide your email, select a reason, and write a detailed justification. Our team will review it promptly.'},
      {q:'What payment methods do you accept?',a:'We accept PayPal for subscription payments. For alternative payment methods (crypto, bank transfer), contact support@vibelist.uk.'},
      {q:'How do I delete my account?',a:'Go to Account Settings → Danger Zone → Delete My Account. This permanently removes all your data including listings, images, and messages.'},
    ];
    const sendHelpMessage = async () => {
      if (!helpContact.email || !helpContact.message) { alert('Please fill in your email and message.'); return; }
      setHelpSending(true);
      try {
        if (user && token) {
          // Use messaging system to send to admin (user ID 1)
          await fetch(`${API}/messages`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({receiver_id:1,message_text:`[HELP REQUEST] Subject: ${helpContact.subject || 'General'}\n\n${helpContact.message}\n\nFrom: ${helpContact.email}`})});
          alert('✅ Your message has been sent to our support team. We\'ll get back to you soon!');
        } else {
          alert('✅ Please email support@vibelist.uk with your question. We respond within 24 hours.');
        }
        setHelpContact({email:'',subject:'',message:''});
      } catch { alert('Failed to send. Please email support@vibelist.uk directly.'); } finally { setHelpSending(false); }
    };
    return (
      <div style={{maxWidth:800,margin:'0 auto',padding:20}}>
        <button onClick={()=>setView('home')} style={{...S.btnSec,marginBottom:20}}>← Back</button>
        <h1 style={{textAlign:'center',fontSize:'2.5rem',margin:'20px 0 10px',background:'linear-gradient(135deg,#6366f1,#ec4899)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>❓ Help Centre</h1>
        <p style={{textAlign:'center',color:'#888',margin:'0 0 30px'}}>Find answers to common questions or contact our team</p>

        {/* FAQ Section */}
        <div style={S.card}>
          <h2 style={{margin:'0 0 16px',fontSize:'1.3rem'}}>📚 Frequently Asked Questions</h2>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{borderBottom:idx<faqs.length-1?'1px solid #1e1e1e':'none',padding:'12px 0'}}>
              <div onClick={()=>setOpenFaq(openFaq===idx?null:idx)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
                <p style={{margin:0,color:'#ccc',fontWeight:500,fontSize:'0.95rem'}}>{faq.q}</p>
                <span style={{color:'#6366f1',fontSize:'1.2rem',transition:'transform 0.2s',transform:openFaq===idx?'rotate(45deg)':'none'}}>+</span>
              </div>
              {openFaq === idx && <p style={{margin:'10px 0 0',color:'#888',lineHeight:1.7,fontSize:'0.9rem'}}>{faq.a}</p>}
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div style={S.card}>
          <h2 style={{margin:'0 0 16px',fontSize:'1.3rem'}}>🔗 Quick Links</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
            <div onClick={()=>setView('pricing')} style={{background:'#1a1a1a',padding:16,borderRadius:12,cursor:'pointer',textAlign:'center',border:'1px solid #2a2a2a'}}><p style={{margin:0,fontSize:'1.5rem'}}>💰</p><p style={{margin:'8px 0 0',color:'#ccc',fontSize:'0.9rem'}}>View Pricing Plans</p></div>
            <div onClick={()=>setView('terms')} style={{background:'#1a1a1a',padding:16,borderRadius:12,cursor:'pointer',textAlign:'center',border:'1px solid #2a2a2a'}}><p style={{margin:0,fontSize:'1.5rem'}}>📜</p><p style={{margin:'8px 0 0',color:'#ccc',fontSize:'0.9rem'}}>Terms of Service</p></div>
            <div onClick={()=>setView('privacy')} style={{background:'#1a1a1a',padding:16,borderRadius:12,cursor:'pointer',textAlign:'center',border:'1px solid #2a2a2a'}}><p style={{margin:0,fontSize:'1.5rem'}}>🔒</p><p style={{margin:'8px 0 0',color:'#ccc',fontSize:'0.9rem'}}>Privacy Policy</p></div>
          </div>
        </div>

        {/* Contact Form */}
        <div style={S.card}>
          <h2 style={{margin:'0 0 16px',fontSize:'1.3rem'}}>✉️ Contact Support</h2>
          <p style={{color:'#888',margin:'0 0 16px',fontSize:'0.9rem'}}>Can&apos;t find what you need? Send us a message and we&apos;ll get back to you within 24 hours.</p>
          <input placeholder="Your email address" type="email" value={helpContact.email} onChange={e=>setHelpContact({...helpContact,email:e.target.value})} style={S.inp} />
          <input placeholder="Subject (e.g. billing, technical, general)" value={helpContact.subject} onChange={e=>setHelpContact({...helpContact,subject:e.target.value})} style={S.inp} />
          <textarea placeholder="How can we help you?" value={helpContact.message} onChange={e=>setHelpContact({...helpContact,message:e.target.value})} rows={5} style={{...S.inp,resize:'vertical'}} />
          <button onClick={sendHelpMessage} disabled={helpSending} style={{...S.btn,opacity:helpSending?0.6:1}}>{helpSending ? '⏳ Sending...' : '📨 Send Message'}</button>
          <p style={{color:'#555',fontSize:'0.8rem',textAlign:'center',marginTop:12}}>Or email us directly at <strong style={{color:'#6366f1'}}>support@vibelist.uk</strong></p>
        </div>
      </div>
    );
  }

  // ========== HOME VIEW ==========
  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:20}}>
      <header style={{textAlign:'center',padding:'40px 0 20px'}}>
        <h1 style={{fontSize:'3rem',margin:'0 0 8px',background:'linear-gradient(135deg,#6366f1,#ec4899)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✨ VibeList</h1>
        <p style={{color:'#666',fontSize:'1.1rem',margin:0}}>UK&apos;s classifieds marketplace — find &amp; post services, jobs, property &amp; more</p>
        <div style={{marginTop:16}}>
          {user ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap'}}>
              <span style={{color:'#aaa'}}>👤 {user.display_name}</span>
              {user.is_founding_member ?
                <span style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#000',padding:'4px 12px',borderRadius:12,fontSize:'0.8rem',fontWeight:700}}>🌟 FOUNDER #{user.founding_member_number}</span> :
                tierBadge(userTier)
              }
              {userTier === 'free' && !user.is_founding_member && <button onClick={()=>setView('subscribe')} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>⚡ Upgrade</button>}
              <button onClick={()=>{setView('my-listings');fetchMyListings();}} style={S.btnSec}>📋 My Listings</button>
              <button onClick={()=>{setView('messages');fetchMessages();}} style={S.btnSec}>💬</button>
              <button onClick={()=>setView('account')} style={S.btnSec}>⚙️</button>
              {user.is_admin && <button onClick={()=>{setView('admin');fetchAdmin();}} style={{...S.btnSec,borderColor:'#f59e0b',color:'#f59e0b'}}>🛡️</button>}
              <button onClick={logout} style={S.btnSec}>Sign Out</button>
            </div>
          ) : (
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button onClick={()=>setView('login')} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'10px 24px',borderRadius:10,cursor:'pointer',fontWeight:600}}>Sign In</button>
              <button onClick={()=>setView('register')} style={{background:'transparent',color:'#6366f1',border:'1px solid #6366f1',padding:'10px 24px',borderRadius:10,cursor:'pointer',fontWeight:600}}>Register Free</button>
            </div>
          )}
        </div>
      </header>

      <div style={{marginBottom:12}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={()=>{setCatFilter(c);setPage(1);}} style={{padding:'8px 14px',borderRadius:20,border:'none',cursor:'pointer',background:catFilter===c?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#181818',color:catFilter===c?'#fff':'#888',fontSize:'0.85rem',fontWeight:catFilter===c?600:400,textTransform:'capitalize'}}>
              {CAT_ICONS[c]} {c}
            </button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:20}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
          {CITIES.map(c => (
            <button key={c} onClick={()=>{setCityFilter(c);setPage(1);}} style={{padding:'6px 12px',borderRadius:16,border:cityFilter===c?'1px solid #6366f1':'1px solid #222',cursor:'pointer',background:'transparent',color:cityFilter===c?'#6366f1':'#666',fontSize:'0.8rem',textTransform:'capitalize'}}>
              {CITY_ICONS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {user && (
        <button onClick={()=>{setView('create');setErr('');}} style={{...S.btn,display:'block',marginBottom:24,maxWidth:400,marginLeft:'auto',marginRight:'auto'}}>
          ✨ Create a Listing
        </button>
      )}
      {!user && (
        <div style={{...S.card,textAlign:'center',maxWidth:500,margin:'0 auto 24px'}}>
          <p style={{color:'#888',margin:0}}>🆓 <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>setView('register')}>Create a free account</span> to start posting listings</p>
        </div>
      )}

      {loading ? <p style={{textAlign:'center',color:'#555',padding:40}}>Loading listings...</p> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
          {listings.map(l => (
            <div key={l.id} onClick={()=>viewListing(l.id)} style={{...S.card,cursor:'pointer',padding:0,overflow:'hidden'}} onMouseOver={e=>(e.currentTarget.style.borderColor='#333')} onMouseOut={e=>(e.currentTarget.style.borderColor='#1e1e1e')}>
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
                  {l.price ? <span style={{color:'#22c55e',fontWeight:700,fontSize:'1.1rem'}}>{formatPrice(l.price)}</span> : <span/>}
                  <span style={{color:'#555',fontSize:'0.75rem'}}>{l.author} • {formatDate(l.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
          {listings.length === 0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:60,color:'#555'}}><p style={{fontSize:'2rem',margin:'0 0 8px'}}>🔍</p><p>No listings found.</p></div>}
        </div>
      )}

      {listings.length > 0 && (
        <div style={{display:'flex',justifyContent:'center',gap:8,margin:'30px 0'}}>
          {page > 1 && <button onClick={()=>setPage(p=>p-1)} style={S.btnSec}>← Previous</button>}
          <span style={{padding:'10px 16px',color:'#666'}}>Page {page}</span>
          {listings.length === 20 && <button onClick={()=>setPage(p=>p+1)} style={S.btnSec}>Next →</button>}
        </div>
      )}

      <footer style={{textAlign:'center',padding:'40px 0 20px',color:'#444',borderTop:'1px solid #1a1a1a',marginTop:20}}>
        <div style={{display:'flex',gap:16,justifyContent:'center',marginBottom:12,flexWrap:'wrap'}}>
          <span style={{cursor:'pointer',color:'#6366f1',fontWeight:600}} onClick={()=>setView('pricing')}>💰 Pricing</span>
          <span style={{cursor:'pointer',color:'#6366f1',fontWeight:600}} onClick={()=>setView('help')}>❓ Help</span>
          <span style={{cursor:'pointer',color:'#666'}} onClick={()=>setView('privacy')}>🔒 Privacy</span>
          <span style={{cursor:'pointer',color:'#666'}} onClick={()=>setView('terms')}>📜 Terms</span>
          <span style={{cursor:'pointer',color:'#666'}} onClick={()=>setView('cookies')}>🍪 Cookies</span>
        </div>
        <p style={{margin:0,fontSize:'0.85rem'}}>VibeList.uk © 2025–2026 | UK Classifieds Marketplace | Users must be 18+</p>
        <p style={{margin:'4px 0 0',fontSize:'0.8rem',color:'#333'}}>Data Protection: privacy@vibelist.uk | ICO Registered</p>
      </footer>
    </div>
  );
}