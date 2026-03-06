'use client';
import { useState, useEffect, useCallback } from 'react';

interface Vibe { id:number; title:string; description:string; category:string; emoji:string; upvotes:number; created_at:string; author?:string; }
interface User { id:number; email:string; display_name:string; subscription_status:string; }

const CATS = ['all','food','outdoors','music','wellness','culture','nightlife','general'];
const API = '/api';
const S: Record<string,React.CSSProperties> = {
  inp: {width:'100%',padding:12,marginBottom:10,background:'#222',color:'#fff',border:'1px solid #333',borderRadius:8,boxSizing:'border-box' as const,fontSize:'0.95rem'},
  btn: {width:'100%',padding:14,background:'#6366f1',color:'#fff',border:'none',borderRadius:12,fontSize:'1rem',cursor:'pointer',fontWeight:600},
  card: {background:'#1a1a1a',padding:20,borderRadius:12,marginBottom:20},
};

export default function Home() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({title:'',description:'',category:'general',emoji:'✨'});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User|null>(null);
  const [token, setToken] = useState('');
  const [view, setView] = useState<'home'|'login'|'register'|'subscribe'>('home');
  const [af, setAf] = useState({email:'',password:'',name:'',dob_d:'',dob_m:'',dob_y:''});
  const [err, setErr] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('vl_token');
    if (t) { setToken(t); fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.ok?r.json():null).then(u=>{if(u)setUser(u);else{localStorage.removeItem('vl_token');setToken('');}}).catch(()=>{}); }
  }, []);

  const fetchVibes = useCallback(async () => {
    try { const u = filter==='all'?`${API}/vibes`:`${API}/vibes/category/${filter}`; const r=await fetch(u); if(r.ok)setVibes(await r.json()); } catch{} finally{setLoading(false);}
  }, [filter]);
  useEffect(() => { fetchVibes(); }, [fetchVibes]);

  // Check PayPal return
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sid = p.get('subscription_id');
    if (sid && token) {
      fetch(`${API}/subscription/paypal/activate`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({subscription_id:sid})})
        .then(r=>r.json()).then(d=>{if(d.status==='active'){fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(setUser);alert('🎉 Subscription activated!');}window.history.replaceState({},'','/');});
    }
  }, [token]);

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

  const postVibe = async (e:React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`${API}/vibes`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(form)});
    if (r.ok) { setForm({title:'',description:'',category:'general',emoji:'✨'}); setShowForm(false); fetchVibes(); }
    else { const d=await r.json(); if(d.code==='NO_SUBSCRIPTION')setView('subscribe'); else alert(d.error||'Failed'); }
  };

  const upvote = async (id: number) => {
    await fetch(`${API}/vibes/${id}/upvote`, { method: 'POST' });
    fetchVibes();
  };

  const startPayPal = async () => {
    const r = await fetch(`${API}/subscription/paypal/create`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
    const d = await r.json();
    if (d.approve_url) window.location.href = d.approve_url;
    else alert(d.error || 'PayPal not configured yet. Contact support for manual activation.');
  };

  // ========== AUTH VIEWS ==========
  if (view==='login'||view==='register') return (
    <div style={{maxWidth:440,margin:'0 auto',padding:20}}>
      <h1 style={{textAlign:'center',fontSize:'2.5rem',margin:'40px 0 10px'}}>✨ VibeList</h1>
      <div style={S.card}>
        <h2 style={{margin:'0 0 20px',textAlign:'center'}}>{view==='login'?'Sign In':'Create Account'}</h2>
        {err && <p style={{color:'#ef4444',textAlign:'center',margin:'0 0 10px'}}>{err}</p>}
        <form onSubmit={doAuth}>
          {view==='register' && <input placeholder="Display name" value={af.name} onChange={e=>setAf({...af,name:e.target.value})} style={S.inp} />}
          <input placeholder="Email" type="email" required value={af.email} onChange={e=>setAf({...af,email:e.target.value})} style={S.inp} />
          <input placeholder="Password (8+ chars)" type="password" required minLength={8} value={af.password} onChange={e=>setAf({...af,password:e.target.value})} style={S.inp} />
          {view==='register' && (<>
            <p style={{color:'#aaa',margin:'10px 0 6px',fontSize:'0.85rem'}}>Date of Birth (must be 18+)</p>
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
        <p style={{textAlign:'center',marginTop:8}}><span style={{color:'#666',cursor:'pointer'}} onClick={()=>setView('home')}>← Back to vibes</span></p>
      </div>
    </div>
  );

  // ========== SUBSCRIBE VIEW ==========
  if (view==='subscribe') return (
    <div style={{maxWidth:500,margin:'0 auto',padding:20}}>
      <h1 style={{textAlign:'center',fontSize:'2.5rem',margin:'40px 0 10px'}}>✨ VibeList Pro</h1>
      <div style={S.card}>
        <h2 style={{textAlign:'center',margin:'0 0 10px'}}>Subscription Required</h2>
        <p style={{textAlign:'center',color:'#aaa',margin:'0 0 20px'}}>Post listings and access premium features</p>
        <div style={{background:'#222',borderRadius:12,padding:20,textAlign:'center',marginBottom:20}}>
          <p style={{fontSize:'2.5rem',fontWeight:700,margin:'0 0 4px'}}>£25<span style={{fontSize:'1rem',color:'#888'}}>/month</span></p>
          <ul style={{listStyle:'none',padding:0,margin:'16px 0',textAlign:'left'}}>
            <li style={{padding:'6px 0',color:'#ccc'}}>✅ Post unlimited listings</li>
            <li style={{padding:'6px 0',color:'#ccc'}}>✅ Featured placement</li>
            <li style={{padding:'6px 0',color:'#ccc'}}>✅ Direct messaging</li>
            <li style={{padding:'6px 0',color:'#ccc'}}>✅ Analytics dashboard</li>
          </ul>
        </div>
        <button onClick={startPayPal} style={{...S.btn,background:'#0070ba',marginBottom:10}}>💳 Subscribe with PayPal</button>
        <div style={{textAlign:'center',margin:'16px 0',color:'#666'}}>
          <p style={{fontSize:'0.85rem'}}>🪙 <strong>Crypto payment?</strong> Contact us at <span style={{color:'#6366f1'}}>support@vibelist.uk</span></p>
          <p style={{fontSize:'0.85rem'}}>We accept BTC, ETH via manual activation</p>
        </div>
        <button onClick={()=>setView('home')} style={{...S.btn,background:'transparent',border:'1px solid #333',marginTop:10}}>← Back</button>
      </div>
    </div>
  );

  // ========== HOME VIEW ==========
  return (
    <div style={{maxWidth:800,margin:'0 auto',padding:20}}>
      <header style={{textAlign:'center',padding:'40px 0 10px'}}>
        <h1 style={{fontSize:'3rem',margin:0}}>✨ VibeList</h1>
        <p style={{color:'#888',fontSize:'1.2rem'}}>Discover & share the best vibes in your city</p>
        <div style={{marginTop:12}}>
          {user ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <span style={{color:'#aaa'}}>👤 {user.display_name}</span>
              {user.subscription_status==='active' ? <span style={{background:'#22c55e',color:'#fff',padding:'3px 10px',borderRadius:12,fontSize:'0.8rem'}}>PRO</span>
                : <button onClick={()=>setView('subscribe')} style={{background:'#6366f1',color:'#fff',border:'none',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>Upgrade to Pro</button>}
              <button onClick={logout} style={{background:'none',border:'1px solid #444',color:'#888',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:'0.85rem'}}>Sign Out</button>
            </div>
          ) : (
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button onClick={()=>setView('login')} style={{background:'#6366f1',color:'#fff',border:'none',padding:'8px 20px',borderRadius:8,cursor:'pointer'}}>Sign In</button>
              <button onClick={()=>setView('register')} style={{background:'transparent',color:'#6366f1',border:'1px solid #6366f1',padding:'8px 20px',borderRadius:8,cursor:'pointer'}}>Register</button>
            </div>
          )}
        </div>
      </header>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',margin:'20px 0'}}>
        {CATS.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} style={{padding:'8px 16px',borderRadius:20,border:'none',cursor:'pointer',background:filter===c?'#6366f1':'#222',color:filter===c?'#fff':'#aaa',fontSize:'0.9rem',textTransform:'capitalize'}}>{c}</button>
        ))}
      </div>

      {user && (
        <button onClick={()=>{if(user.subscription_status!=='active'){setView('subscribe');}else setShowForm(!showForm);}}
          style={{...S.btn,display:'block',marginBottom:20}}>
          {showForm?'✕ Cancel':'+ Add a Vibe'}
        </button>
      )}

      {showForm && user?.subscription_status==='active' && (
        <form onSubmit={postVibe} style={S.card}>
          <input placeholder="What's the vibe?" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required style={S.inp} />
          <input placeholder="Tell us more..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={S.inp} />
          <div style={{display:'flex',gap:10,marginBottom:10}}>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{...S.inp,flex:1}}>
              {CATS.filter(c=>c!=='all').map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Emoji" value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})} style={{...S.inp,width:60,textAlign:'center'}} />
          </div>
          <button type="submit" style={{...S.btn,background:'#22c55e'}}>Submit Vibe</button>
        </form>
      )}

      {!user && <div style={{...S.card,textAlign:'center'}}><p style={{color:'#aaa',margin:0}}>🔒 <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>setView('register')}>Create an account</span> and subscribe to post vibes</p></div>}

      {loading ? <p style={{textAlign:'center',color:'#666'}}>Loading vibes...</p> : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {vibes.map(v=>(
            <div key={v.id} style={{background:'#1a1a1a',padding:16,borderRadius:12,display:'flex',alignItems:'center',gap:16}}>
              <span style={{fontSize:'2rem'}}>{v.emoji}</span>
              <div style={{flex:1}}>
                <h3 style={{margin:'0 0 4px'}}>{v.title}</h3>
                <p style={{margin:0,color:'#888',fontSize:'0.9rem'}}>{v.description}</p>
                <div style={{display:'flex',gap:8,marginTop:4}}>
                  <span style={{fontSize:'0.75rem',color:'#6366f1',textTransform:'capitalize'}}>{v.category}</span>
                  {v.author && <span style={{fontSize:'0.75rem',color:'#666'}}>by {v.author}</span>}
                </div>
              </div>
              <button onClick={()=>upvote(v.id)} style={{background:'#222',border:'1px solid #333',borderRadius:8,padding:'8px 12px',color:'#fff',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center'}}>
                <span>▲</span><span style={{fontSize:'0.9rem'}}>{v.upvotes}</span>
              </button>
            </div>
          ))}
          {vibes.length===0 && <p style={{textAlign:'center',color:'#666'}}>No vibes yet. Be the first!</p>}
        </div>
      )}

      <footer style={{textAlign:'center',padding:'40px 0',color:'#444'}}><p>VibeList.uk © 2025 | Users must be 18+</p></footer>
    </div>
  );
}