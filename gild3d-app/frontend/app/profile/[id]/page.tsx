'use client';
import { useEffect, useState } from 'react';
import { profileAPI, messageAPI } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const G = '#c9a84c', BG = '#0d0d14', CARD = '#13111c', BORDER = '#2a2520', TEXT = '#e8d5b7', MUTED = '#9c8c78', DIM = '#6b5e50';

const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', background:BG, border:`1px solid ${BORDER}`, borderRadius:2, color:TEXT, fontSize:13, boxSizing:'border-box' };

function BookingModal({ profile, onClose }: { profile:any; onClose:()=>void }) {
  const router = useRouter();
  const [type, setType] = useState<'OUTCALL'|'INCALL'>(profile.outCall ? 'OUTCALL' : 'INCALL');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [hours, setHours] = useState(profile.minBookingHours||1);
  const [venue, setVenue] = useState({name:'',addr:'',city:'',room:''});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const rate = profile.hourlyRate||0;
  const total = rate*hours;
  const today = new Date().toISOString().split('T')[0];

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const body:any = {profileId:profile.id,type,date,startTime:time,hours,notes};
      if(type==='OUTCALL'){body.hotelName=venue.name;body.hotelAddress=venue.addr;body.hotelCity=venue.city;body.roomNumber=venue.room;}
      const r = await api.post('/bookings',body);
      setOk('Booking submitted! Ref: '+(r.data.booking?.ref||'confirmed'));
      setTimeout(()=>{onClose();router.push('/bookings');},2800);
    } catch(ex:any){setErr(ex.response?.data?.error||'Booking failed.');}
    finally{setBusy(false);}
  };

  return (
    <div style={{position:'fixed',inset:0,background:'#000000cc',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:4,width:'100%',maxWidth:520,maxHeight:'92vh',overflowY:'auto',padding:'28px 32px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22}}>
          <div>
            <h2 style={{fontFamily:'Georgia,serif',color:'#fff',fontSize:20,margin:0}}>Book <span style={{color:G}}>{profile.displayName}</span></h2>
            <p style={{color:DIM,fontSize:12,marginTop:4,marginBottom:0}}>{rate>0?`$${rate.toLocaleString()} / hour`:'Rate to be confirmed'}</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:MUTED,fontSize:24,cursor:'pointer'}}>✕</button>
        </div>
        {ok?(
          <div style={{textAlign:'center',padding:'32px 0'}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <p style={{color:'#6bcc8a',fontSize:14}}>{ok}</p>
            <p style={{color:DIM,fontSize:12,marginTop:6}}>Redirecting to your bookings…</p>
          </div>
        ):(
          <form onSubmit={submit}>
            <div style={{marginBottom:16}}>
              <p style={{color:DIM,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:8}}>Booking Type</p>
              <div style={{display:'flex',gap:10}}>
                {profile.outCall&&<button type="button" onClick={()=>setType('OUTCALL')} style={{flex:1,padding:'10px 6px',fontSize:12,borderRadius:2,cursor:'pointer',border:`1px solid ${type==='OUTCALL'?G:BORDER}`,background:type==='OUTCALL'?'#c9a84c18':BG,color:type==='OUTCALL'?G:MUTED}}>🏨 Out Call</button>}
                {profile.inCall&&<button type="button" onClick={()=>setType('INCALL')} style={{flex:1,padding:'10px 6px',fontSize:12,borderRadius:2,cursor:'pointer',border:`1px solid ${type==='INCALL'?G:BORDER}`,background:type==='INCALL'?'#c9a84c18':BG,color:type==='INCALL'?G:MUTED}}>📍 In Call</button>}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div><p style={{color:DIM,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:6}}>Date</p><input type="date" required value={date} min={today} onChange={e=>setDate(e.target.value)} style={inp}/></div>
              <div><p style={{color:DIM,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:6}}>Start Time</p><input type="time" required value={time} onChange={e=>setTime(e.target.value)} style={inp}/></div>
            </div>
            <div style={{marginBottom:16}}>
              <p style={{color:DIM,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:8}}>Duration (min {profile.minBookingHours||1}h)</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {[1,2,3,4,6,8,12].filter(h=>h>=(profile.minBookingHours||1)).map(h=>(
                  <button key={h} type="button" onClick={()=>setHours(h)} style={{padding:'8px 14px',fontSize:13,borderRadius:2,cursor:'pointer',border:`1px solid ${hours===h?G:BORDER}`,background:hours===h?'#c9a84c18':BG,color:hours===h?G:MUTED}}>{h}h</button>
                ))}
              </div>
            </div>
            {type==='OUTCALL'&&(
              <div style={{background:'#0a0912',border:`1px solid ${BORDER}`,borderRadius:2,padding:14,marginBottom:16}}>
                <p style={{color:G,fontSize:11,letterSpacing:'0.12em',marginBottom:10}}>YOUR LOCATION</p>
                {[['Venue / Hotel',venue.name,(v:string)=>setVenue(x=>({...x,name:v}))],
                  ['Address',venue.addr,(v:string)=>setVenue(x=>({...x,addr:v}))],
                  ['City',venue.city,(v:string)=>setVenue(x=>({...x,city:v}))],
                  ['Room / Apt',venue.room,(v:string)=>setVenue(x=>({...x,room:v}))]].map(([l,v,f])=>(
                  <div key={l as string} style={{marginBottom:8}}>
                    <p style={{color:DIM,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:4}}>{l as string}</p>
                    <input type="text" value={v as string} onChange={e=>(f as any)(e.target.value)} style={inp}/>
                  </div>
                ))}
              </div>
            )}
            <div style={{marginBottom:16}}>
              <p style={{color:DIM,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:6}}>Special Requests</p>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Optional…" style={{...inp,resize:'none'}}/>
            </div>
            <div style={{padding:'14px 18px',background:'#c9a84c0a',border:'1px solid #c9a84c28',borderRadius:2,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <p style={{color:MUTED,fontSize:12,marginBottom:2}}>{hours}h × {rate>0?`$${rate.toLocaleString()}`:'TBC'}/hr</p>
                <p style={{color:G,fontFamily:'Georgia,serif',fontSize:26,fontWeight:700,margin:0}}>{rate>0?`$${total.toLocaleString()}`:'TBC'}</p>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{color:DIM,fontSize:11,letterSpacing:'0.1em'}}>TOTAL DUE</p>
                <p style={{color:DIM,fontSize:11}}>Payable on confirmation</p>
              </div>
            </div>
            {err&&<div style={{background:'#2a1515',border:'1px solid #8b3333',borderRadius:2,padding:12,marginBottom:14,color:'#e88',fontSize:13}}>{err}</div>}
            <button type="submit" disabled={busy} style={{width:'100%',padding:14,background:busy?'#8a7030':`linear-gradient(135deg,${G},#e8cc7a)`,color:BG,fontWeight:700,fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase',border:'none',borderRadius:2,cursor:busy?'not-allowed':'pointer'}}>
              {busy?'Submitting…':`Request Booking${rate>0?` · $${total.toLocaleString()}`:''}` }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function MessageModal({ profile, onClose }: { profile:any; onClose:()=>void }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const send = async (e:React.FormEvent) => {
    e.preventDefault(); if(!msg.trim())return; setBusy(true);
    try { await messageAPI.send(profile.userId,msg); setOk(true); setTimeout(onClose,2000); }
    catch(ex:any){ setErr(ex.response?.data?.error||'Could not send.'); }
    finally { setBusy(false); }
  };
  return (
    <div style={{position:'fixed',inset:0,background:'#000000cc',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:4,width:'100%',maxWidth:460,padding:'28px 32px'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
          <h2 style={{fontFamily:'Georgia,serif',color:'#fff',fontSize:20,margin:0}}>Message <span style={{color:G}}>{profile.displayName}</span></h2>
          <button onClick={onClose} style={{background:'none',border:'none',color:MUTED,fontSize:24,cursor:'pointer'}}>✕</button>
        </div>
        {ok?(
          <div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontSize:36,marginBottom:8}}>✉️</div><p style={{color:'#6bcc8a'}}>Message sent!</p></div>
        ):(
          <form onSubmit={send}>
            <textarea required value={msg} onChange={e=>setMsg(e.target.value)} rows={5} placeholder={`Write to ${profile.displayName}…`}
              style={{...inp,fontSize:14,resize:'none',marginBottom:14}}/>
            {err&&<p style={{color:'#e88',fontSize:13,marginBottom:10}}>{err}</p>}
            <button type="submit" disabled={busy} style={{width:'100%',padding:13,background:`linear-gradient(135deg,${G},#e8cc7a)`,color:BG,fontWeight:700,fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase',border:'none',borderRadius:2,cursor:'pointer'}}>
              {busy?'Sending…':'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'about'|'public'|'private'>('about');
  const [showBook, setShowBook] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => { setAuthed(isAuthenticated()); }, []);

  useEffect(() => {
    profileAPI.getOne(params.id)
      .then((r:any) => { setProfile(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:BG}}><div style={{color:G,fontSize:14}}>Loading…</div></div>;
  if (!profile) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:BG}}><div style={{color:MUTED,textAlign:'center'}}><div style={{fontSize:40,marginBottom:12}}>👤</div><p>Profile not found</p></div></div>;

  const primaryPhoto = profile.photos?.find((p:any)=>p.isPrimary)||profile.photos?.[0];
  const publicPhotos = (profile.photos||[]).slice(0,10);
  const publicVideos: any[] = [];
  const privatePhotos = (profile.privateMedia||[]).filter((m:any)=>m.type==='PHOTO').slice(0,15);
  const privateVideos = (profile.privateMedia||[]).filter((m:any)=>m.type==='VIDEO').slice(0,10);
  const rate = profile.hourlyRate||0;

  const tabs = ['about','public','private'] as const;

  return (
    <div style={{minHeight:'100vh',background:BG,color:TEXT}}>
      {showBook && <BookingModal profile={profile} onClose={()=>setShowBook(false)}/>}
      {showMsg && <MessageModal profile={profile} onClose={()=>setShowMsg(false)}/>}

      {/* ── Hero banner ── */}
      <div style={{position:'relative',width:'100%',height:320,background:'#0a0912',overflow:'hidden'}}>
        {primaryPhoto
          ? <img src={primaryPhoto.url} alt={profile.displayName} style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.45)'}}/>
          : <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,#1a1628,#0d0d14)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:80,opacity:0.3}}>👤</div>
        }
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 30%,#0d0d14 100%)'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'0 24px 24px'}}>
          <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'flex-end',gap:20}}>
            {/* avatar */}
            <div style={{width:100,height:100,borderRadius:4,overflow:'hidden',border:`2px solid ${G}`,flexShrink:0,background:'#1e1b2a'}}>
              {primaryPhoto
                ? <img src={primaryPhoto.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36}}>👤</div>
              }
            </div>
            <div style={{flex:1,paddingBottom:4}}>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <h1 style={{fontFamily:'Georgia,serif',fontSize:28,fontWeight:700,color:'#fff',margin:0}}>
                  {profile.displayName}{profile.age&&`, ${profile.age}`}
                </h1>
                {profile.user?.isVerified&&<span style={{padding:'3px 10px',background:'#c9a84c22',border:`1px solid #c9a84c55`,borderRadius:2,color:G,fontSize:11,letterSpacing:'0.1em'}}>✓ Verified</span>}
                {profile.isVip&&<span style={{padding:'3px 10px',background:'#7c3aed22',border:'1px solid #7c3aed55',borderRadius:2,color:'#a78bfa',fontSize:11}}>VIP</span>}
              </div>
              {profile.location&&<p style={{color:MUTED,fontSize:13,marginTop:4,marginBottom:0}}>📍 {profile.location}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'24px 20px',display:'grid',gridTemplateColumns:'1fr 300px',gap:24,alignItems:'start'}}>

        {/* ── LEFT: tabs ── */}
        <div>
          {/* tab bar */}
          <div style={{display:'flex',gap:0,marginBottom:24,borderBottom:`1px solid ${BORDER}`}}>
            {tabs.map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{padding:'10px 20px',background:'none',border:'none',cursor:'pointer',fontSize:13,letterSpacing:'0.1em',textTransform:'capitalize',color:tab===t?G:MUTED,borderBottom:tab===t?`2px solid ${G}`:'2px solid transparent',marginBottom:-1}}>
                {t==='about'?'About':t==='public'?`Gallery (${publicPhotos.length+publicVideos.length})`:`Private (${privatePhotos.length+privateVideos.length})`}
              </button>
            ))}
          </div>

          {/* ABOUT tab */}
          {tab==='about'&&(
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              {profile.headline&&(
                <div style={{padding:20,background:CARD,border:`1px solid ${BORDER}`,borderRadius:2}}>
                  <p style={{fontFamily:'Georgia,serif',color:G,fontSize:17,fontStyle:'italic',margin:0}}>"{profile.headline}"</p>
                </div>
              )}
              {profile.bio&&(
                <div style={{padding:20,background:CARD,border:`1px solid ${BORDER}`,borderRadius:2}}>
                  <p style={{color:G,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:10}}>About Me</p>
                  <p style={{color:TEXT,fontSize:14,lineHeight:1.8,margin:0}}>{profile.bio}</p>
                </div>
              )}
              {/* attributes grid */}
              <div style={{padding:20,background:CARD,border:`1px solid ${BORDER}`,borderRadius:2}}>
                <p style={{color:G,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:16}}>Details</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:16}}>
                  {[['Location',profile.location],['Age',profile.age?`${profile.age} years`:null],['Height',profile.height?`${profile.height} cm`:null],['Body Type',profile.bodyType],['Hair',profile.hairColor],['Eyes',profile.eyeColor],['Ethnicity',profile.ethnicity],['Nationality',profile.nationality],['Languages',profile.languages],['Services',profile.services]].filter(([,v])=>v).map(([l,v])=>(
                    <div key={l as string}>
                      <p style={{color:DIM,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:3}}>{l as string}</p>
                      <p style={{color:TEXT,fontSize:13,margin:0}}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* availability */}
              <div style={{padding:20,background:CARD,border:`1px solid ${BORDER}`,borderRadius:2}}>
                <p style={{color:G,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:12}}>Availability</p>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  {profile.inCall&&<span style={{padding:'6px 14px',background:'#0a2a1a',border:'1px solid #2a8a4a',borderRadius:2,color:'#6bcc8a',fontSize:13}}>📍 In Call Available</span>}
                  {profile.outCall&&<span style={{padding:'6px 14px',background:'#0a1a2a',border:'1px solid #2a4a8a',borderRadius:2,color:'#6b8acc',fontSize:13}}>🏨 Out Call Available</span>}
                  {profile.travelAvailable&&<span style={{padding:'6px 14px',background:'#1a0a2a',border:'1px solid #6a2a8a',borderRadius:2,color:'#c86bcc',fontSize:13}}>✈️ Travels</span>}
                </div>
              </div>
            </div>
          )}

          {/* PUBLIC GALLERY tab */}
          {tab==='public'&&(
            <div>
              {publicPhotos.length>0&&(
                <div style={{marginBottom:28}}>
                  <p style={{color:G,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:12}}>Public Photos ({publicPhotos.length}/10)</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:6}}>
                    {publicPhotos.map((ph:any,i:number)=>(
                      <div key={i} style={{aspectRatio:'3/4',overflow:'hidden',borderRadius:2,background:'#1e1b2a'}}>
                        <img src={ph.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {publicVideos.length>0&&(
                <div>
                  <p style={{color:G,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:12}}>Public Videos ({publicVideos.length}/5)</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
                    {publicVideos.map((v:any,i:number)=>(
                      <div key={i} style={{aspectRatio:'16/9',overflow:'hidden',borderRadius:2,background:'#1e1b2a'}}>
                        <video src={v.url} controls style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {publicPhotos.length===0&&publicVideos.length===0&&(
                <div style={{textAlign:'center',padding:'48px 0',color:DIM}}>
                  <div style={{fontSize:40,marginBottom:12}}>🖼️</div>
                  <p>No public gallery yet</p>
                </div>
              )}
            </div>
          )}

          {/* PRIVATE GALLERY tab */}
          {tab==='private'&&(
            <div>
              {!authed?(
                <div style={{textAlign:'center',padding:'48px 20px',background:CARD,border:`1px solid ${BORDER}`,borderRadius:2}}>
                  <div style={{fontSize:36,marginBottom:12}}>🔒</div>
                  <p style={{color:MUTED,fontSize:14,marginBottom:16}}>Sign in to request access to the private gallery</p>
                  <Link href="/auth/login" style={{padding:'10px 24px',background:`linear-gradient(135deg,${G},#e8cc7a)`,color:BG,fontWeight:700,fontSize:12,letterSpacing:'0.15em',textTransform:'uppercase',textDecoration:'none',borderRadius:2}}>Sign In</Link>
                </div>
              ):privatePhotos.length===0&&privateVideos.length===0?(
                <div style={{textAlign:'center',padding:'48px 0',color:DIM}}>
                  <div style={{fontSize:40,marginBottom:12}}>🔒</div>
                  <p>Private gallery not yet uploaded</p>
                  <p style={{fontSize:12,marginTop:6}}>Contact {profile.displayName} to request access</p>
                </div>
              ):(
                <div>
                  {privatePhotos.length>0&&(
                    <div style={{marginBottom:28}}>
                      <p style={{color:G,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:12}}>Private Photos ({privatePhotos.length}/15)</p>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:6}}>
                        {privatePhotos.map((ph:any,i:number)=>(
                          <div key={i} style={{aspectRatio:'3/4',overflow:'hidden',borderRadius:2,background:'#1e1b2a'}}>
                            <img src={ph.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {privateVideos.length>0&&(
                    <div>
                      <p style={{color:G,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:12}}>Private Videos ({privateVideos.length}/10)</p>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
                        {privateVideos.map((v:any,i:number)=>(
                          <div key={i} style={{aspectRatio:'16/9',overflow:'hidden',borderRadius:2,background:'#1e1b2a'}}>
                            <video src={v.url} controls style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: action sidebar ── */}
        <div style={{position:'sticky',top:80,display:'flex',flexDirection:'column',gap:14}}>
          {/* rate card */}
          <div style={{padding:20,background:CARD,border:`1px solid ${BORDER}`,borderRadius:2}}>
            <p style={{color:DIM,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:4}}>Hourly Rate</p>
            <p style={{fontFamily:'Georgia,serif',fontSize:28,fontWeight:700,color:G,margin:'0 0 4px'}}>
              {rate>0?`$${rate.toLocaleString()}`:'Contact for Rate'}
            </p>
            {rate>0&&<p style={{color:DIM,fontSize:11,margin:0}}>Per hour · min {profile.minBookingHours||1}h booking</p>}
          </div>

          {/* action buttons */}
          {authed?(
            <>
              <button onClick={()=>setShowBook(true)} style={{width:'100%',padding:'14px 0',background:`linear-gradient(135deg,${G},#e8cc7a)`,color:BG,fontWeight:700,fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase',border:'none',borderRadius:2,cursor:'pointer'}}>
                📅 Book Appointment
              </button>
              <button onClick={()=>setShowMsg(true)} style={{width:'100%',padding:'13px 0',background:'transparent',border:`1px solid ${G}55`,color:G,fontWeight:600,fontSize:12,letterSpacing:'0.15em',textTransform:'uppercase',borderRadius:2,cursor:'pointer'}}>
                ✉️ Send Message
              </button>
            </>
          ):(
            <div style={{padding:16,background:CARD,border:`1px solid ${BORDER}`,borderRadius:2,textAlign:'center'}}>
              <p style={{color:MUTED,fontSize:13,marginBottom:12}}>Sign in to message or book</p>
              <Link href="/auth/login" style={{display:'block',padding:'12px 0',background:`linear-gradient(135deg,${G},#e8cc7a)`,color:BG,fontWeight:700,fontSize:12,letterSpacing:'0.15em',textTransform:'uppercase',textDecoration:'none',borderRadius:2,marginBottom:8}}>Member Login</Link>
              <Link href="/auth/register" style={{display:'block',padding:'11px 0',border:`1px solid ${G}44`,color:G,fontWeight:600,fontSize:12,letterSpacing:'0.15em',textTransform:'uppercase',textDecoration:'none',borderRadius:2}}>Request Access</Link>
            </div>
          )}

          {/* quick stats */}
          <div style={{padding:16,background:CARD,border:`1px solid ${BORDER}`,borderRadius:2}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[['Gallery',`${publicPhotos.length} photos`],['Videos',`${publicVideos.length} clips`],['In Call',profile.inCall?'Available':'No'],['Out Call',profile.outCall?'Available':'No']].map(([l,v])=>(
                <div key={l}>
                  <p style={{color:DIM,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:2}}>{l}</p>
                  <p style={{color:TEXT,fontSize:12,margin:0}}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          <p style={{color:'#2a2520',fontSize:10,textAlign:'center',letterSpacing:'0.1em',textTransform:'uppercase'}}>
            🔒 All communications are private
          </p>
        </div>
      </div>
    </div>
  );
}
