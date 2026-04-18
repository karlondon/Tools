'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const G = '#c9a84c', BG = '#0d0d14', CARD = '#13111c', BORDER = '#2a2520', TEXT = '#e8d5b7', MUTED = '#9c8c78', DIM = '#6b5e50';
const RED = '#e85555', GREEN = '#4caf7d', BLUE = '#5588e8';

type Tab = 'overview' | 'users' | 'companions' | 'bookings' | 'messages' | 'reports';

const fmt = (n: number) => n?.toLocaleString() ?? '0';
const fmtUSD = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 2, color: TEXT, fontSize: 13, boxSizing: 'border-box' };
const btn = (color = G): React.CSSProperties => ({ padding: '7px 16px', background: color, color: color === RED ? '#fff' : BG, border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' });

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [dash, setDash] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [companions, setCompanions] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month'>('month');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [msgUserId, setMsgUserId] = useState('');
  const [editingCompanion, setEditingCompanion] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [addingCompanion, setAddingCompanion] = useState(false);
  const [addForm, setAddForm] = useState<any>({ inCall: true, outCall: false, isPublished: false });
  const [addLoading, setAddLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const authHeaders = useCallback(() => {
    const token = document.cookie.split(';').find(c => c.trim().startsWith('gc_token='))?.split('=')[1];
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const adminApi = useCallback(async (method: string, path: string, data?: any) => {
    const res = await api({ method, url: `/admin${path}`, data, headers: authHeaders() });
    return res.data;
  }, [authHeaders]);

  useEffect(() => {
    const token = document.cookie.split(';').find(c => c.trim().startsWith('gc_token='))?.split('=')[1];
    if (!token) { router.push('/auth/login'); return; }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const d = await adminApi('GET', '/dashboard');
      setDash(d);
    } catch (e: any) {
      if (e?.response?.status === 403 || e?.response?.status === 401) {
        setError('Access denied — Super Admin only');
      } else {
        setError('Failed to load dashboard');
      }
    } finally { setLoading(false); }
  };

  const loadUsers = useCallback(async () => {
    const q = userFilter === 'all' ? '' : `?status=${userFilter}`;
    const data = await adminApi('GET', `/members${q}`);
    setUsers(data);
  }, [adminApi, userFilter]);

  const loadCompanions = useCallback(async () => {
    const data = await adminApi('GET', '/companions');
    setCompanions(data);
  }, [adminApi]);

  const loadBookings = useCallback(async () => {
    const data = await adminApi('GET', '/audit/bookings');
    setBookings(data);
  }, [adminApi]);

  const loadMessages = useCallback(async () => {
    const q = msgUserId ? `?userId=${msgUserId}` : '';
    const data = await adminApi('GET', `/audit/messages${q}`);
    setMessages(data.messages || []);
  }, [adminApi, msgUserId]);

  const loadReports = useCallback(async () => {
    const data = await adminApi('GET', `/reports?period=${reportPeriod}`);
    setReports(data);
  }, [adminApi, reportPeriod]);

  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, userFilter]);
  useEffect(() => { if (tab === 'companions') loadCompanions(); }, [tab]);
  useEffect(() => { if (tab === 'bookings') loadBookings(); }, [tab]);
  useEffect(() => { if (tab === 'messages') loadMessages(); }, [tab, msgUserId]);
  useEffect(() => { if (tab === 'reports') loadReports(); }, [tab, reportPeriod]);

  const toggleUser = async (userId: string, isActive: boolean) => {
    await adminApi('PATCH', `/users/${userId}/active`, { isActive });
    showToast(`User ${isActive ? 'enabled' : 'disabled'}`);
    loadUsers();
  };

  const setTier = async (userId: string, membershipTier: string) => {
    try {
      await adminApi('PATCH', `/users/${userId}/tier`, { membershipTier });
      showToast(`Tier updated to ${membershipTier}`);
      loadUsers();
    } catch { showToast('Failed to update tier'); }
  };

  const toggleVip = async (userId: string, isVip: boolean) => {
    try {
      await adminApi('PATCH', `/companions/${userId}/vip`, { isVip });
      showToast(isVip ? '⭐ VIP status granted' : 'VIP status removed');
      loadCompanions();
    } catch { showToast('Failed to update VIP status'); }
  };

  const saveCompanion = async () => {
    if (!editingCompanion) return;
    setSaving(true);
    try {
      await adminApi('PATCH', `/companions/${editingCompanion.id}/rate`, editForm);
      showToast('Companion updated');
      setEditingCompanion(null);
      loadCompanions();
    } catch { showToast('Save failed'); }
    finally { setSaving(false); }
  };

  const addCompanion = async () => {
    if (!addForm.email || !addForm.password || !addForm.displayName) {
      showToast('Email, password and display name are required'); return;
    }
    setAddLoading(true);
    try {
      await adminApi('POST', '/companions', addForm);
      showToast('Companion created');
      setAddingCompanion(false);
      setAddForm({ inCall: true, outCall: false, isPublished: false });
      loadCompanions();
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Failed to create companion');
    } finally { setAddLoading(false); }
  };

  const deleteCompanion = async (userId: string) => {
    try {
      await adminApi('DELETE', `/users/${userId}`);
      showToast('Companion deleted');
      setConfirmDeleteId(null);
      loadCompanions();
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Failed to delete companion');
      setConfirmDeleteId(null);
    }
  };

  const statusColor = (s: string) => ({ CONFIRMED: GREEN, COMPLETED: GREEN, CANCELLED: RED, PENDING_PAYMENT: '#e8a84c', NO_SHOW: RED }[s] || MUTED);

  if (loading) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: G }}>Loading admin dashboard…</div>;
  if (error) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: RED, flexDirection: 'column', gap: 12 }}><div style={{ fontSize: 36 }}>🔒</div><p>{error}</p></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'users', label: '👥 Users' },
    { key: 'companions', label: '💎 Companions' },
    { key: 'bookings', label: '📅 Bookings Audit' },
    { key: 'messages', label: '✉️ Messages Audit' },
    { key: 'reports', label: '📈 Reports' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: CARD, border: `1px solid ${G}`, borderRadius: 4, padding: '12px 20px', color: G, zIndex: 999, fontSize: 13 }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', color: G, fontSize: 22, margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: DIM, fontSize: 12, margin: 0 }}>Gilded Companions Platform</p>
        </div>
        <a href="/" style={{ color: MUTED, fontSize: 12, textDecoration: 'none' }}>← Back to Site</a>
      </div>

      {/* Tab nav */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: '0 32px', display: 'flex', gap: 0, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: tab === t.key ? G : MUTED, borderBottom: tab === t.key ? `2px solid ${G}` : '2px solid transparent', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && dash && (
          <div>
            <h2 style={{ color: G, fontFamily: 'Georgia,serif', fontSize: 18, marginBottom: 20 }}>Platform Overview</h2>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Members', value: fmt(dash.totalMembers), color: BLUE },
                { label: 'Active Members', value: fmt(dash.activeMembers), color: GREEN },
                { label: 'Disabled Users', value: fmt(dash.disabledUsers), color: RED },
                { label: 'Pending Verify', value: fmt(dash.pendingVerification), color: '#e8a84c' },
                { label: 'Companions', value: fmt(dash.totalCompanions), color: G },
                { label: 'Bookings (Week)', value: fmt(dash.bookingsThisWeek), color: BLUE },
                { label: 'Bookings (Month)', value: fmt(dash.bookingsThisMonth), color: BLUE },
                { label: 'Revenue (Week)', value: fmtUSD(dash.weekRevenue), color: GREEN },
                { label: 'Revenue (Month)', value: fmtUSD(dash.monthRevenue), color: GREEN },
                { label: 'Total Revenue', value: fmtUSD(dash.totalRevenue), color: G },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: 18, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                  <p style={{ color: DIM, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
                  <p style={{ color, fontSize: 24, fontFamily: 'Georgia,serif', fontWeight: 700, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Recent bookings */}
            <h3 style={{ color: G, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Recent Bookings</h3>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Ref', 'Member', 'Companion', 'Date', 'Hours', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: DIM, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dash.recentBookings.map((b: any) => (
                    <tr key={b.id} style={{ borderBottom: `1px solid ${BORDER}22` }}>
                      <td style={{ padding: '10px 14px', color: MUTED, fontSize: 11 }}>{b.ref?.slice(0, 8)}</td>
                      <td style={{ padding: '10px 14px' }}>{b.member?.email}</td>
                      <td style={{ padding: '10px 14px', color: G }}>{b.profile?.displayName}</td>
                      <td style={{ padding: '10px 14px', color: MUTED, fontSize: 12 }}>{b.date ? fmtDate(b.date) : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{b.hours}h</td>
                      <td style={{ padding: '10px 14px', color: GREEN }}>{fmtUSD(b.totalAmount)}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ padding: '3px 8px', background: `${statusColor(b.status)}22`, color: statusColor(b.status), borderRadius: 2, fontSize: 11 }}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: G, fontFamily: 'Georgia,serif', fontSize: 18, margin: 0 }}>User Management</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'active', 'inactive'] as const).map(f => (
                  <button key={f} onClick={() => setUserFilter(f)}
                    style={{ ...btn(userFilter === f ? G : 'transparent'), border: `1px solid ${userFilter === f ? G : BORDER}`, color: userFilter === f ? BG : MUTED }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Email', 'Type', 'Name', 'Location', 'Tier', 'Verified', 'Active', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: DIM, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}22`, opacity: u.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{u.email}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', background: u.memberType === 'COMPANION' ? `${G}22` : `${BLUE}22`, color: u.memberType === 'COMPANION' ? G : BLUE, borderRadius: 2, fontSize: 11 }}>{u.memberType}</span></td>
                      <td style={{ padding: '10px 14px', color: G }}>{u.profile?.displayName || '—'}</td>
                      <td style={{ padding: '10px 14px', color: MUTED, fontSize: 12 }}>{u.profile?.location || '—'}</td>
                      <td style={{ padding: '6px 14px' }}>
                        {u.memberType === 'MEMBER' ? (
                          <select
                            value={u.membershipTier}
                            onChange={e => setTier(u.id, e.target.value)}
                            style={{ background: '#1a1200', border: `1px solid ${BORDER}`, color: u.membershipTier === 'PLATINUM' ? G : TEXT, borderRadius: 2, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                            {['FREE', 'SILVER', 'GOLD', 'PLATINUM'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: 12, color: MUTED }}>{u.membershipTier}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}><span style={{ color: u.emailVerified ? GREEN : RED, fontSize: 12 }}>{u.emailVerified ? '✓' : '✗'}</span></td>
                      <td style={{ padding: '10px 14px' }}><span style={{ color: u.isActive ? GREEN : RED, fontSize: 12 }}>{u.isActive ? '✓' : '✗'}</span></td>
                      <td style={{ padding: '10px 14px', color: MUTED, fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(u.createdAt)}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => toggleUser(u.id, !u.isActive)}
                          style={{ ...btn(u.isActive ? RED : GREEN), fontSize: 11, padding: '5px 12px' }}>
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: DIM }}>No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMPANIONS */}
        {tab === 'companions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: G, fontFamily: 'Georgia,serif', fontSize: 18, margin: 0 }}>Companion Management</h2>
              <button onClick={() => { setAddingCompanion(true); setAddForm({ inCall: true, outCall: false, isPublished: false }); }} style={btn(G)}>+ Add Companion</button>
            </div>

            {/* Add Companion modal */}
            {addingCompanion && (
              <div style={{ position: 'fixed', inset: 0, background: '#000c', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ color: G, fontFamily: 'Georgia,serif', margin: 0 }}>Add New Companion</h3>
                    <button onClick={() => setAddingCompanion(false)} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 20, cursor: 'pointer' }}>✕</button>
                  </div>
                  <p style={{ color: DIM, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, borderBottom: `1px solid ${BORDER}`, paddingBottom: 6 }}>Account</p>
                  {[['email', 'Email Address *', 'email'], ['password', 'Temporary Password *', 'password']].map(([field, label, type]) => (
                    <div key={field} style={{ marginBottom: 14 }}>
                      <p style={{ color: DIM, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</p>
                      <input type={type} value={addForm[field] ?? ''} onChange={e => setAddForm((f: any) => ({ ...f, [field]: e.target.value }))} style={inp} />
                    </div>
                  ))}
                  <p style={{ color: DIM, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, marginTop: 18, borderBottom: `1px solid ${BORDER}`, paddingBottom: 6 }}>Profile</p>
                  {[
                    ['displayName', 'Display Name *', 'text'],
                    ['age', 'Age', 'number'],
                    ['location', 'Location', 'text'],
                    ['headline', 'Headline', 'text'],
                    ['hourlyRate', 'Hourly Rate (USD)', 'number'],
                  ].map(([field, label, type]) => (
                    <div key={field} style={{ marginBottom: 14 }}>
                      <p style={{ color: DIM, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</p>
                      <input type={type} value={addForm[field] ?? ''} onChange={e => setAddForm((f: any) => ({ ...f, [field]: e.target.value }))} style={inp} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ color: DIM, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Bio</p>
                    <textarea value={addForm.bio ?? ''} onChange={e => setAddForm((f: any) => ({ ...f, bio: e.target.value }))} rows={3} style={{ ...inp, resize: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {[['inCall', 'In Call'], ['outCall', 'Out Call'], ['isPublished', 'Publish Now']].map(([field, label]) => (
                      <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: MUTED, fontSize: 13 }}>
                        <input type="checkbox" checked={!!addForm[field]} onChange={e => setAddForm((f: any) => ({ ...f, [field]: e.target.checked }))} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={addCompanion} disabled={addLoading} style={{ ...btn(G), flex: 1, padding: 12 }}>{addLoading ? 'Creating…' : 'Create Companion'}</button>
                    <button onClick={() => setAddingCompanion(false)} style={{ ...btn('transparent'), flex: 1, padding: 12, border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Companion modal */}
            {editingCompanion && (
              <div style={{ position: 'fixed', inset: 0, background: '#000c', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ color: G, fontFamily: 'Georgia,serif', margin: 0 }}>Edit: {editingCompanion.profile?.displayName}</h3>
                    <button onClick={() => setEditingCompanion(null)} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 20, cursor: 'pointer' }}>✕</button>
                  </div>
                  {[
                    ['displayName', 'Display Name', 'text'],
                    ['age', 'Age', 'number'],
                    ['hourlyRate', 'Hourly Rate (USD)', 'number'],
                    ['minBookingHours', 'Min Booking Hours', 'number'],
                    ['location', 'Location', 'text'],
                    ['headline', 'Headline', 'text'],
                  ].map(([field, label, type]) => (
                    <div key={field} style={{ marginBottom: 14 }}>
                      <p style={{ color: DIM, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</p>
                      <input type={type} value={editForm[field] ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, [field]: e.target.value }))} style={inp} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ color: DIM, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Bio</p>
                    <textarea value={editForm.bio ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, bio: e.target.value }))} rows={4} style={{ ...inp, resize: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {[['inCall', 'In Call'], ['outCall', 'Out Call'], ['isPublished', 'Published'], ['isVip', 'VIP']].map(([field, label]) => (
                      <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: MUTED, fontSize: 13 }}>
                        <input type="checkbox" checked={!!editForm[field]} onChange={e => setEditForm((f: any) => ({ ...f, [field]: e.target.checked }))} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={saveCompanion} disabled={saving} style={{ ...btn(G), flex: 1, padding: 12 }}>{saving ? 'Saving…' : 'Save Changes'}</button>
                    <button onClick={() => setEditingCompanion(null)} style={{ ...btn('transparent'), flex: 1, padding: 12, border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Name', 'Email', 'Age', 'Location', 'Rate/hr', 'In/Out', 'Published', 'VIP', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: DIM, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companions.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}22` }}>
                      <td style={{ padding: '10px 14px', color: G, fontWeight: 600 }}>{c.profile?.displayName || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{c.email}</td>
                      <td style={{ padding: '10px 14px', color: MUTED, fontSize: 12 }}>{c.profile?.age || '—'}</td>
                      <td style={{ padding: '10px 14px', color: MUTED, fontSize: 12 }}>{c.profile?.location || '—'}</td>
                      <td style={{ padding: '10px 14px', color: GREEN }}>{c.profile?.hourlyRate ? fmtUSD(c.profile.hourlyRate) : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        {c.profile?.inCall ? <span style={{ color: GREEN }}>In</span> : <span style={{ color: RED }}>—</span>}
                        {' / '}
                        {c.profile?.outCall ? <span style={{ color: BLUE }}>Out</span> : <span style={{ color: RED }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}><span style={{ color: c.profile?.isPublished ? GREEN : RED }}>{c.profile?.isPublished ? '✓ Live' : '✗ Draft'}</span></td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          onClick={() => toggleVip(c.id, !c.profile?.isVip)}
                          title={c.profile?.isVip ? 'Click to remove VIP status' : 'Click to grant VIP status'}
                          style={{ ...btn(c.profile?.isVip ? G : 'transparent'), fontSize: 11, padding: '4px 10px', border: `1px solid ${c.profile?.isVip ? G : BORDER}`, color: c.profile?.isVip ? BG : DIM }}>
                          {c.profile?.isVip ? '⭐ VIP' : '— VIP'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {confirmDeleteId === c.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ color: RED, fontSize: 11 }}>Sure?</span>
                            <button onClick={() => deleteCompanion(c.id)} style={{ ...btn(RED), fontSize: 11, padding: '5px 10px' }}>Yes, Delete</button>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '5px 10px', background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 2, cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => {
                              setEditingCompanion(c);
                              setEditForm({
                                displayName: c.profile?.displayName || '',
                                age: c.profile?.age || '',
                                hourlyRate: c.profile?.hourlyRate || '',
                                minBookingHours: c.profile?.minBookingHours || 1,
                                location: c.profile?.location || '',
                                headline: c.profile?.headline || '',
                                bio: c.profile?.bio || '',
                                inCall: !!c.profile?.inCall,
                                outCall: !!c.profile?.outCall,
                                isPublished: !!c.profile?.isPublished,
                                isVip: !!c.profile?.isVip,
                              });
                            }} style={{ ...btn(G), fontSize: 11, padding: '5px 12px' }}>Edit</button>
                            <button onClick={() => setConfirmDeleteId(c.id)} style={{ ...btn(RED), fontSize: 11, padding: '5px 12px' }}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {companions.length === 0 && <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: DIM }}>No companions found — click "+ Add Companion" to create one</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOOKINGS AUDIT */}
        {tab === 'bookings' && (
          <div>
            <h2 style={{ color: G, fontFamily: 'Georgia,serif', fontSize: 18, marginBottom: 20 }}>Bookings Audit</h2>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Ref', 'Member', 'Companion', 'Type', 'Date', 'Hrs', 'Amount', 'Currency', 'Pay Status', 'Booking Status', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: DIM, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b: any) => (
                    <tr key={b.id} style={{ borderBottom: `1px solid ${BORDER}22` }}>
                      <td style={{ padding: '9px 12px', color: MUTED }}>{b.ref?.slice(0, 8)}</td>
                      <td style={{ padding: '9px 12px' }}>{b.member?.email}</td>
                      <td style={{ padding: '9px 12px', color: G }}>{b.profile?.displayName}</td>
                      <td style={{ padding: '9px 12px', color: MUTED }}>{b.type}</td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{b.date ? fmtDate(b.date) : '—'}</td>
                      <td style={{ padding: '9px 12px' }}>{b.hours}h</td>
                      <td style={{ padding: '9px 12px', color: GREEN }}>{fmtUSD(b.totalAmount)}</td>
                      <td style={{ padding: '9px 12px', color: MUTED }}>{b.payment?.currency || '—'}</td>
                      <td style={{ padding: '9px 12px' }}><span style={{ padding: '2px 7px', background: `${statusColor(b.payment?.status)}22`, color: statusColor(b.payment?.status), borderRadius: 2 }}>{b.payment?.status || '—'}</span></td>
                      <td style={{ padding: '9px 12px' }}><span style={{ padding: '2px 7px', background: `${statusColor(b.status)}22`, color: statusColor(b.status), borderRadius: 2 }}>{b.status}</span></td>
                      <td style={{ padding: '9px 12px', color: MUTED, fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.notes || '—'}</td>
                    </tr>
                  ))}
                  {bookings.length === 0 && <tr><td colSpan={11} style={{ padding: 32, textAlign: 'center', color: DIM }}>No bookings found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MESSAGES AUDIT */}
        {tab === 'messages' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ color: G, fontFamily: 'Georgia,serif', fontSize: 18, margin: 0 }}>Messages Audit</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input placeholder="Filter by User ID…" value={msgUserId} onChange={e => setMsgUserId(e.target.value)} style={{ ...inp, width: 240 }} />
                <button onClick={loadMessages} style={btn(G)}>Filter</button>
                <button onClick={() => { setMsgUserId(''); }} style={{ ...btn('transparent'), border: `1px solid ${BORDER}`, color: MUTED }}>Clear</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((m: any) => (
                <div key={m.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 2, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: BLUE, fontSize: 12 }}>From: <strong>{m.sender?.profile?.displayName || m.sender?.email}</strong></span>
                      <span style={{ color: DIM }}>→</span>
                      <span style={{ color: G, fontSize: 12 }}>To: <strong>{m.receiver?.profile?.displayName || m.receiver?.email}</strong></span>
                    </div>
                    <span style={{ color: DIM, fontSize: 11 }}>{fmtDate(m.createdAt)}</span>
                  </div>
                  <p style={{ color: TEXT, fontSize: 13, lineHeight: 1.6, margin: 0, background: BG, padding: '10px 14px', borderRadius: 2, border: `1px solid ${BORDER}` }}>{m.content}</p>
                </div>
              ))}
              {messages.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: DIM }}><div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div><p>No messages found</p></div>}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {tab === 'reports' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: G, fontFamily: 'Georgia,serif', fontSize: 18, margin: 0 }}>Reports</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['week', 'month'] as const).map(p => (
                  <button key={p} onClick={() => setReportPeriod(p)}
                    style={{ ...btn(reportPeriod === p ? G : 'transparent'), border: `1px solid ${reportPeriod === p ? G : BORDER}`, color: reportPeriod === p ? BG : MUTED }}>
                    {p === 'week' ? 'Last 7 days' : 'Last 30 days'}
                  </button>
                ))}
              </div>
            </div>

            {reports && (
              <div>
                {/* Summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                  {[
                    { label: 'Total Revenue', value: fmtUSD(reports.totalRevenue), color: GREEN },
                    { label: 'New Members', value: fmt(reports.newUsers), color: BLUE },
                  ].concat(reports.statusBreakdown.map((s: any) => ({ label: s.status, value: fmt(s.count) + ' bookings', color: statusColor(s.status) }))).map(({ label, value, color }) => (
                    <div key={label} style={{ padding: 18, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                      <p style={{ color: DIM, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
                      <p style={{ color, fontSize: 20, fontFamily: 'Georgia,serif', fontWeight: 700, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Companion earnings table */}
                <h3 style={{ color: G, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Earnings Per Companion</h3>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {['Companion', 'Bookings', 'Revenue'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: DIM, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reports.companionEarnings.length === 0 && (
                        <tr><td colSpan={3} style={{ padding: 32, textAlign: 'center', color: DIM }}>No earnings data for this period</td></tr>
                      )}
                      {reports.companionEarnings.map((c: any, i: number) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}22` }}>
                          <td style={{ padding: '12px 16px', color: G, fontWeight: 600 }}>{c.displayName}</td>
                          <td style={{ padding: '12px 16px' }}>{fmt(c.bookings)}</td>
                          <td style={{ padding: '12px 16px', color: GREEN, fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700 }}>{fmtUSD(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}