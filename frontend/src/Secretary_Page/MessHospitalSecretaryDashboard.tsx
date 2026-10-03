import React, { useState, useEffect } from 'react';
import {
  Home, ClipboardList, Archive, User,
  TrendingUp, Clock, CheckCircle, DollarSign,
  Search, Eye, RotateCcw, Pencil, Save, X,
  KeyRound, Loader2, RefreshCw, XCircle, AlertTriangle,
  BadgeCheck,
} from 'lucide-react';
import {
  SecretaryLayout, ClaimReviewPanel,
  StatCard, StatusBadge, deptConfig,
  type Claim, type SecretaryUser, type Department,
} from './SecretaryShared';
import { apiService } from '../services/db_service';

// ─── API Base ──────────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

// ─── Map backend status → frontend status ─────────────────────────────────────
function mapStatus(s: string): string {
  const map: Record<string, string> = {
    PENDING_MESS_MANAGER: 'pending',
    PENDING_ACADEMIC:     'pending',
    VERIFIED_MESS:        'verified',
    VERIFIED_MEDICAL:     'verified',
    APPROVED:             'approved',
    PUSHED_TO_ACCOUNTS:   'disbursed',
    REFUNDED:             'disbursed',
    REJECTED:             'rejected',
  };
  return map[s] ?? s.toLowerCase();
}

// ─── Map frontend status → real backend status ────────────────────────────────
function toBackendStatus(dept: Department, frontendStatus: string): string {
  if (frontendStatus === 'pending') return dept === 'mess' ? 'PENDING_MESS_MANAGER' : 'PENDING_ACADEMIC';
  if (frontendStatus === 'verified') return dept === 'mess' ? 'VERIFIED_MESS' : 'VERIFIED_MEDICAL';
  return frontendStatus.toUpperCase();
}

// ─── Fetch claims from backend ─────────────────────────────────────────────────
async function fetchClaimsFromAPI(dept: Department): Promise<Claim[]> {
  const typeMap: Record<string, string> = {
    mess:     'MESS_REBATE',
    hospital: 'MEDICAL_REBATE',
  };
  const statusMap: Record<string, string> = {
    mess:     'PENDING_MESS_MANAGER,VERIFIED_MESS,APPROVED,REJECTED,PUSHED_TO_ACCOUNTS,REFUNDED',
    hospital: 'PENDING_ACADEMIC,VERIFIED_MEDICAL,APPROVED,REJECTED,PUSHED_TO_ACCOUNTS,REFUNDED',
  };
  const res = await fetch(
    `${BASE}/api/verify/claims?type=${typeMap[dept]}&status=${statusMap[dept]}`
  );
  if (!res.ok) throw new Error('Failed to fetch claims');
  const data = await res.json();
  return data.map((c: any): Claim => ({
    _id:               c._id,
    claimId:           c.claimId || c._id.slice(-8).toUpperCase(),
    claimRefId:        c.claimRefId || c.claimId || c._id.slice(-8).toUpperCase(),
    studentId:         c.student?._id || '',
    studentName:       c.student?.fullName || 'Unknown',
    studentRoll:       c.student?.studentId || '',
    studentEmail:      c.student?.email || '',
    student:           c.student,
    department:        dept,
    requestType:       c.requestType,
    title:             c.title || c.requestType || 'Claim',
    description:       c.description || '',
    amount:            c.amount || 0,
    effectiveAmount:   c.effectiveAmount,
    effectiveMessDays: c.effectiveMessDays,
    messAbsenceDays:   c.messAbsenceDays,
    messAbsenceFrom:   c.messAbsenceFrom,
    messAbsenceTo:     c.messAbsenceTo,
    submittedAt:       c.createdAt,
    attachments:       c.attachments || [],
    status:            mapStatus(c.status),
    verifiedBy:        c.verifiedBy,
    verifiedByName:    c.verifiedByName,
    verifiedAt:        c.verifiedAt,
    verifierRemarks:   c.verifierRemarks,
    verifications:     c.verifications,
    approvedBy:        c.approvedBy,
    approvedByName:    c.approvedByName,
    approvedAt:        c.approvedAt,
    approverRemarks:   c.approverRemarks,
    rejectedBy:        c.rejectedBy,
    rejectedByName:    c.rejectedByName,
    rejectedAt:        c.rejectedAt,
    rejectionReason:   c.rejectionReason,
    rejectedAtStage:   c.rejectedAtStage,
    refundedBy:        c.refundedBy,
    refundedByName:    c.refundedByName,
    refundedAt:        c.refundedAt,
    disbursedAmount:   c.disbursedAmount,
    disbursementRef:   c.disbursementRef,
    disbursementNotes: c.disbursementNotes,
  }));
}

// ─── Empty fallback user (no mock data) ───────────────────────────────────────
function makeFallbackUser(dept: Department): SecretaryUser {
  return {
    _id: '',
    fullName: '',
    employeeId: '',
    email: '',
    phone: '',
    department: dept,
    designation: dept === 'mess' ? 'Mess Secretary' : 'Medical Secretary',
    institution: '',
    joinDate: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    isVerified: true,
    isSecretary: true,
    isSuperAdmin: false,
  };
}

// ─── Dynamic Profile Page ──────────────────────────────────────────────────────
function DynamicProfilePage({
  user, setUser, department,
}: {
  user: SecretaryUser | null;
  setUser: React.Dispatch<React.SetStateAction<SecretaryUser | null>>;
  department: Department;
}) {
  const cfg = deptConfig[department];
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', institution: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    if (user) setEditForm({ fullName: user.fullName ?? '', phone: user.phone ?? '', institution: user.institution ?? '' });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setEditError(''); setEditSuccess('');
    if (editForm.phone && !/^\d{10}$/.test(editForm.phone)) { setEditError('Phone must be exactly 10 digits.'); return; }
    setEditLoading(true);
    try {
      const result = await apiService.updateUserData(user._id, { fullName: editForm.fullName, phone: editForm.phone, institution: editForm.institution });
      setUser(prev => prev ? { ...prev, ...result.user } : prev);
      setEditSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile.');
    } finally { setEditLoading(false); }
  };

  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess('');
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) { setPwError('All fields are required.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match.'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('Min 6 characters.'); return; }
    if (!user) return;
    setPwLoading(true);
    try {
      await apiService.changePassword(user._id, pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPassword(false);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    } finally { setPwLoading(false); }
  };

  if (!user) return (
    <div className="p-6 flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-slate-400" />
    </div>
  );

  const initials = user.fullName
    ? user.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-5 max-w-3xl mx-auto">
      <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: cfg.accent }}>
        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl flex-shrink-0">{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg leading-tight">{user.fullName || '—'}</p>
          <p className="text-white/80 text-sm">{user.designation} · {cfg.label}</p>
          <p className="text-white/60 text-xs mt-0.5">{user.employeeId || '—'}</p>
        </div>
        {!isEditing && (
          <button onClick={() => { setIsEditing(true); setEditSuccess(''); setEditError(''); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-colors">
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>

      {editSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          <CheckCircle size={16} /> {editSuccess}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
        <h3 className="font-bold text-slate-700">Personal Information</h3>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'fullName', label: 'Full Name' },
                { key: 'phone', label: 'Phone' },
                { key: 'institution', label: 'Institution', span: true },
              ].map(field => (
                <div key={field.key} className={field.span ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{field.label}</label>
                  <input
                    value={(editForm as any)[field.key]}
                    onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                    maxLength={field.key === 'phone' ? 10 : undefined}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': cfg.accent } as any}
                  />
                </div>
              ))}
            </div>
            {editError && <p className="text-red-500 text-xs flex items-center gap-1"><X size={13} /> {editError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={handleSaveProfile} disabled={editLoading}
                className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ background: cfg.accent }}>
                {editLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => { setIsEditing(false); setEditError(''); }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: 'Full Name',    value: user.fullName || '—' },
              { label: 'Email',        value: user.email || '—' },
              { label: 'Phone',        value: user.phone || '—' },
              { label: 'Employee ID',  value: user.employeeId || '—' },
              { label: 'Designation',  value: user.designation || '—' },
              { label: 'Institution',  value: user.institution || '—' },
              { label: 'Member Since', value: user.joinDate ? new Date(user.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Last Login',   value: user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' },
            ].map(field => (
              <div key={field.label}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{field.label}</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{field.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <button onClick={() => { setShowPassword(v => !v); setPwError(''); setPwSuccess(''); }} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-slate-500" />
            <span className="font-bold text-slate-700 text-sm">Change Password</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">{showPassword ? '▲ Hide' : '▼ Show'}</span>
        </button>
        {showPassword && (
          <div className="mt-5 space-y-4">
            {[
              { label: 'Current Password', key: 'currentPassword' },
              { label: 'New Password', key: 'newPassword' },
              { label: 'Confirm New Password', key: 'confirmPassword' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{field.label}</label>
                <input
                  type="password"
                  value={pwForm[field.key as keyof typeof pwForm]}
                  onChange={e => setPwForm(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': cfg.accent } as any}
                  placeholder="••••••••"
                />
              </div>
            ))}
            {pwError && <p className="text-red-500 text-xs flex items-center gap-1"><X size={13} /> {pwError}</p>}
            {pwSuccess && <p className="text-green-600 text-xs flex items-center gap-1"><CheckCircle size={13} /> {pwSuccess}</p>}
            <button onClick={handleChangePassword} disabled={pwLoading}
              className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-60"
              style={{ background: cfg.accent }}>
              {pwLoading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Overview Page ─────────────────────────────────────────────────────────────
function OverviewPage({ claims, dept }: { claims: Claim[]; dept: Department }) {
  const cfg = deptConfig[dept];
  const stats = {
    total:    claims.length,
    pending:  claims.filter(c => c.status === 'pending').length,
    verified: claims.filter(c => c.status === 'verified').length,
    approved: claims.filter(c => c.status === 'approved' || c.status === 'disbursed').length,
    totalAmt: claims
      .filter(c => c.status === 'approved' || c.status === 'disbursed')
      .reduce((s, c) => s + (c.effectiveAmount ?? c.amount), 0),
    rejected: claims.filter(c => c.status === 'rejected').length,
  };
  const recent = [...claims]
    .sort((a, b) => new Date(b.submittedAt ?? '').getTime() - new Date(a.submittedAt ?? '').getTime())
    .slice(0, 5);

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Overview</h2>
        <p className="text-slate-500 text-sm mt-0.5">{cfg.label} claim summary</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Claims"    value={stats.total}    icon={TrendingUp}  color={`bg-${dept === 'mess' ? 'emerald' : 'blue'}-100 text-${dept === 'mess' ? 'emerald' : 'blue'}-600`} />
        <StatCard label="Pending Review"  value={stats.pending}  icon={Clock}       color="bg-amber-100 text-amber-600" />
        <StatCard label="Approved"        value={stats.approved} icon={CheckCircle} color="bg-green-100 text-green-600" />
        <StatCard label="Approved Value"  value={`₹${(stats.totalAmt / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-teal-100 text-teal-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-bold text-slate-700 mb-4 text-sm">Status Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Pending',  count: stats.pending,  color: 'bg-amber-400' },
            { label: 'Verified', count: stats.verified, color: 'bg-blue-400' },
            { label: 'Approved', count: stats.approved, color: 'bg-green-400' },
            { label: 'Rejected', count: stats.rejected, color: 'bg-red-400' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-16 text-right font-medium">{row.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${row.color} transition-all`}
                  style={{ width: stats.total ? `${(row.count / stats.total) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700 w-6 text-right">{row.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Recent Submissions</h3>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
          {recent.length === 0
            ? <div className="py-10 text-center text-slate-400 text-sm">No claims yet</div>
            : recent.map(c => {
              const name = c.student?.fullName || c.studentName || '—';
              return (
                <div key={c._id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{name}</p>
                    <p className="text-xs text-slate-400">
                      {c.claimRefId} · {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </p>
                  </div>
                  <span className="font-bold text-slate-700 text-sm whitespace-nowrap">
                    ₹{(c.effectiveAmount ?? c.amount).toLocaleString('en-IN')}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─── Claims Page ───────────────────────────────────────────────────────────────
function ClaimsPage({
  claims, setClaims, dept, secretary,
}: {
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  dept: Department;
  secretary: SecretaryUser | null;
}) {
  const [selected, setSelected] = useState<Claim | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const cfg = deptConfig[dept];

  const filtered = claims.filter(c => {
    const ms = search.toLowerCase();
    const name = c.student?.fullName || c.studentName || '';
    const roll = c.student?.studentId || c.studentRoll || '';
    const ref  = c.claimRefId || c.claimId || '';
    return (
      (statusFilter === 'all' || c.status === statusFilter) &&
      (name.toLowerCase().includes(ms) || roll.toLowerCase().includes(ms) || ref.toLowerCase().includes(ms))
    );
  });

  const handleVerify = async (id: string, remarks: string) => {
    if (!secretary) return;
    setActionError('');
    const endpointMap: Record<string, string> = {
      mess:     `/api/verify/mess/claims/${id}/verify`,
      hospital: `/api/verify/medical/claims/${id}/verify`,
    };
    try {
      const res = await fetch(`${BASE}${endpointMap[dept]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifierId: secretary._id, verifierName: secretary.fullName, remarks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      const updated = data.claim;
      setClaims(prev => prev.map(c => c._id === id ? { ...c, ...updated, status: mapStatus(updated.status) } : c));
      setSelected(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to verify claim.');
    }
  };

  const handleReject = async (id: string, reason: string, stage: string) => {
    if (!secretary) return;
    setActionError('');
    try {
      const res = await fetch(`${BASE}/api/verify/claims/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectedBy: secretary._id,
          rejectedByName: secretary.fullName,
          rejectionReason: reason,
          stage: `SECRETARY_${dept.toUpperCase()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rejection failed');
      const updated = data.claim;
      setClaims(prev => prev.map(c => c._id === id ? { ...c, ...updated, status: mapStatus(updated.status) } : c));
      setSelected(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject claim.');
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{dept === 'mess' ? 'Mess Rebate Claims' : 'Medical Claims'}</h2>
          <p className="text-slate-500 text-sm mt-0.5">Review, verify or reject incoming claims</p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-sm font-bold">
          <Clock size={14} /> {claims.filter(c => c.status === 'pending').length} pending
        </span>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <XCircle size={15} /> {actionError}
          <button onClick={() => setActionError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, roll no., ref ID..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': cfg.accent } as any} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'pending', 'verified', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap flex-shrink-0 transition-colors ${statusFilter === s ? 'text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}
              style={statusFilter === s ? { background: cfg.accent } : {}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0
          ? <div className="py-16 text-center text-slate-400"><p className="text-sm">No claims found</p></div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Ref ID', 'Student', ...(dept === 'mess' ? ['Days'] : []), 'Amount', 'Date', 'Status', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(claim => {
                    const name = claim.student?.fullName || claim.studentName || '—';
                    const roll = claim.student?.studentId || claim.studentRoll || '—';
                    return (
                      <tr key={claim._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">{claim.claimRefId || claim.claimId}</td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-700 text-sm">{name}</p>
                          <p className="text-xs text-slate-400">{roll}</p>
                        </td>
                        {dept === 'mess' && (
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded-full">
                              {claim.messAbsenceDays ?? '—'} days
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-bold" style={{ color: cfg.accent }}>
                            ₹{(claim.effectiveAmount ?? claim.amount).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-400">
                          {claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                        <td className="px-4 py-4"><StatusBadge status={claim.status} /></td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button onClick={() => setSelected(claim)}
                            className="flex items-center gap-1.5 px-3 py-2 text-white rounded-xl text-xs font-bold transition-colors"
                            style={{ background: cfg.accent }}>
                            <Eye size={13} /> {claim.status === 'pending' ? 'Review' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {selected && (
        <ClaimReviewPanel
          claim={selected}
          department={dept}
          onClose={() => setSelected(null)}
          onVerify={handleVerify}
          onReject={handleReject}
          mode={selected.status === 'pending' ? 'verify' : 'view'}
          secretaryId={secretary?._id}
          secretaryName={secretary?.fullName}
        />
      )}
    </div>
  );
}

// ─── Verified & Approved Page ─────────────────────────────────────────────────
function VerifiedRebatesPage({
  claims, setClaims, dept, secretary,
}: {
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  dept: Department;
  secretary: SecretaryUser | null;
}) {
  const [selected, setSelected] = useState<Claim | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'approved' | 'disbursed' | 'rejected'>('all');
  const [actionError, setActionError] = useState('');
  const cfg = deptConfig[dept];

  const processedClaims = claims.filter(c => ['verified', 'approved', 'disbursed', 'rejected'].includes(c.status));
  const filtered = processedClaims.filter(c => {
    const ms = search.toLowerCase();
    const name = c.student?.fullName || c.studentName || '';
    const ref  = c.claimRefId || c.claimId || '';
    return (statusFilter === 'all' || c.status === statusFilter) &&
      (name.toLowerCase().includes(ms) || ref.toLowerCase().includes(ms));
  });

  // ── APPROVE a verified claim
  const handleApprove = async (id: string) => {
    if (!secretary) return;
    setActionError('');
    try {
      const res = await fetch(`${BASE}/api/verify/claims/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: secretary._id, approvedByName: secretary.fullName, remarks: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');
      const updated = data.claim;
      setClaims(prev => prev.map(c => c._id === id ? { ...c, ...updated, status: mapStatus(updated.status) } : c));
      setSelected(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve claim.');
    }
  };

  // ── REJECT from verified/approved stage
  const handleReject = async (id: string, reason: string, stage: string) => {
    if (!secretary) return;
    setActionError('');
    try {
      const res = await fetch(`${BASE}/api/verify/claims/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectedBy: secretary._id,
          rejectedByName: secretary.fullName,
          rejectionReason: reason,
          stage: stage || `SECRETARY_${dept.toUpperCase()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rejection failed');
      const updated = data.claim;
      setClaims(prev => prev.map(c => c._id === id ? { ...c, ...updated, status: mapStatus(updated.status) } : c));
      setSelected(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject claim.');
    }
  };

  // ── UNVERIFY — revert verified → pending
  const handleUnverify = async (id: string) => {
    setActionError('');
    const backendPending = toBackendStatus(dept, 'pending');
    try {
      const res = await fetch(`${BASE}/api/admin/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: id,
          status: backendPending,
          remarks: `Reverted to pending by ${secretary?.fullName || 'Secretary'}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Revert failed');
      setClaims(prev => prev.map(c =>
        c._id === id ? { ...c, status: 'pending', verifiedBy: undefined, verifiedByName: undefined, verifiedAt: undefined, verifierRemarks: undefined } : c
      ));
      setSelected(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to revert claim.');
    }
  };

  // ── UNAPPROVE — revert approved → verified
  const handleUnapprove = async (id: string) => {
    setActionError('');
    const backendVerified = toBackendStatus(dept, 'verified');
    try {
      const res = await fetch(`${BASE}/api/admin/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: id,
          status: backendVerified,
          remarks: `Reverted to verified by ${secretary?.fullName || 'Secretary'}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Revert failed');
      setClaims(prev => prev.map(c =>
        c._id === id ? { ...c, status: 'verified', approvedBy: undefined, approvedByName: undefined, approvedAt: undefined } : c
      ));
      setSelected(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to revert approval.');
    }
  };

  const getPanelMode = (claim: Claim): 'approve' | 'view' => {
    if (claim.status === 'verified') return 'approve';
    return 'view';
  };

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Verified {dept === 'mess' ? 'Rebates' : 'Claims'}</h2>
        <p className="text-slate-500 text-sm mt-0.5">Approve verified claims or revert them if needed</p>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <XCircle size={15} /> {actionError}
          <button onClick={() => setActionError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search verified claims..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': cfg.accent } as any} />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'verified', 'approved', 'disbursed', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap flex-shrink-0 transition-colors ${statusFilter === s ? 'text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}
            style={statusFilter === s ? { background: cfg.accent } : {}}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Verified',  count: claims.filter(c => c.status === 'verified').length,  color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: 'Approved',  count: claims.filter(c => c.status === 'approved').length,  color: 'bg-green-50 text-green-700 border-green-100' },
          { label: 'Disbursed', count: claims.filter(c => c.status === 'disbursed').length, color: 'bg-purple-50 text-purple-700 border-purple-100' },
          { label: 'Rejected',  count: claims.filter(c => c.status === 'rejected').length,  color: 'bg-red-50 text-red-700 border-red-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 border text-center ${s.color}`}>
            <p className="text-xl font-black">{s.count}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0
          ? <div className="py-16 text-center text-slate-400"><p className="text-sm">No claims found</p></div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Ref ID', 'Student', 'Amount', 'Status', 'Remarks', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(claim => {
                    const name = claim.student?.fullName || claim.studentName || '—';
                    const roll = claim.student?.studentId || claim.studentRoll || '—';
                    return (
                      <tr key={claim._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">{claim.claimRefId || claim.claimId}</td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-700 text-sm">{name}</p>
                          <p className="text-xs text-slate-400">{roll}</p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold" style={{ color: cfg.accent }}>
                          ₹{(claim.effectiveAmount ?? claim.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5"><StatusBadge status={claim.status} /></td>
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <p className="text-xs text-slate-500 truncate">
                            {claim.verifierRemarks || claim.approverRemarks || claim.rejectionReason || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setSelected(claim)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-white rounded-lg text-xs font-bold transition-colors"
                              style={{ background: cfg.accent }}>
                              {claim.status === 'verified'
                                ? <><BadgeCheck size={12} /> Approve</>
                                : <><Eye size={12} /> View</>
                              }
                            </button>
                            {claim.status === 'verified' && (
                              <button onClick={() => handleUnverify(claim._id)}
                                className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Revert to Pending">
                                <RotateCcw size={14} />
                              </button>
                            )}
                            {claim.status === 'approved' && (
                              <button onClick={() => handleUnapprove(claim._id)}
                                className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Revert to Verified">
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* ── FIXED: onApprove now passed so Approve button appears in panel ── */}
      {selected && (
        <ClaimReviewPanel
          claim={selected}
          department={dept}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          mode={getPanelMode(selected)}
          secretaryId={secretary?._id}
          secretaryName={secretary?.fullName}
        />
      )}
    </div>
  );
}

// ─── Shared Dashboard Shell ────────────────────────────────────────────────────
function SecretaryDashboardShell({
  department, onLogout, navItems, title, subtitle,
}: {
  department: Department;
  onLogout: () => void;
  navItems: { id: string; label: string; icon: any }[];
  title: string;
  subtitle: string;
}) {
  const [activeView, setActiveView] = useState('overview');
  const [user, setUser] = useState<SecretaryUser | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState('');

  // Load user from localStorage — no hardcoded fallback data
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed._id) {
          setUser({
            _id:         parsed._id,
            fullName:    parsed.fullName    || '',
            employeeId:  parsed.studentId   || parsed.employeeId || '',
            email:       parsed.email       || '',
            phone:       parsed.phone       || '',
            department:  parsed.department  || department,
            designation: parsed.designation || (department === 'mess' ? 'Mess Secretary' : 'Medical Secretary'),
            institution: parsed.institution || '',
            joinDate:    parsed.joinDate    || new Date().toISOString(),
            lastLogin:   parsed.lastLogin   || new Date().toISOString(),
            isVerified:  parsed.isVerified  ?? true,
            isSecretary: parsed.isSecretary ?? true,
            isSuperAdmin: parsed.isSuperAdmin ?? false,
          });
          return;
        }
      } catch (_) {}
    }
    setUser(makeFallbackUser(department));
  }, []);

  useEffect(() => {
    const load = async () => {
      setClaimsLoading(true);
      setClaimsError('');
      try {
        const data = await fetchClaimsFromAPI(department);
        setClaims(data);
      } catch (err: any) {
        setClaimsError(err.message || 'Failed to load claims.');
      } finally {
        setClaimsLoading(false);
      }
    };
    load();
  }, [department]);

  // ─── Heartbeat: Update secretary's lastLogin every 30 seconds ────────────────
  useEffect(() => {
    if (!user?._id) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`${BASE}/api/heartbeat/${user._id}`, { method: 'POST' });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };

    sendHeartbeat(); // Send immediately on mount
    const interval = setInterval(sendHeartbeat, 30000); // Then every 30 seconds
    return () => clearInterval(interval);
  }, [user?._id]);

  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 size={28} className="animate-spin text-slate-400" />
      <p className="text-slate-400 text-sm">Loading claims…</p>
    </div>
  );

  const ErrorState = () => (
    <div className="p-6 flex flex-col items-center justify-center h-64">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 max-w-md text-center">
        <AlertTriangle size={28} className="text-red-400 mx-auto mb-2" />
        <p className="text-red-700 font-semibold text-sm">{claimsError}</p>
        <button onClick={() => window.location.reload()}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-bold mx-auto"
          style={{ background: deptConfig[department].accent }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeView === 'overview') return <OverviewPage claims={claims} dept={department} />;
    if (activeView === 'profile')  return <DynamicProfilePage user={user} setUser={setUser} department={department} />;
    if (claimsLoading) return <LoadingSpinner />;
    if (claimsError)   return <ErrorState />;
    if (activeView === 'claims')   return <ClaimsPage claims={claims} setClaims={setClaims} dept={department} secretary={user} />;
    if (activeView === 'verified') return <VerifiedRebatesPage claims={claims} setClaims={setClaims} dept={department} secretary={user} />;
    return null;
  };

  return (
    <SecretaryLayout
      department={department}
      navItems={navItems}
      activeView={activeView}
      setActiveView={setActiveView}
      onLogout={onLogout}
      user={user ?? makeFallbackUser(department)}
      title={title}
      subtitle={subtitle}
    >
      {renderContent()}
    </SecretaryLayout>
  );
}

// ─── Mess Secretary Dashboard ──────────────────────────────────────────────────
export function MessSecretaryDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <SecretaryDashboardShell
      department="mess"
      onLogout={onLogout}
      navItems={[
        { id: 'overview', label: 'Overview',         icon: Home },
        { id: 'claims',   label: 'Mess Claims',      icon: ClipboardList },
        { id: 'verified', label: 'Verified Rebates', icon: Archive },
        { id: 'profile',  label: 'Profile',          icon: User },
      ]}
      title="Mess Department"
      subtitle="Secretary Dashboard"
    />
  );
}

// ─── Hospital Secretary Dashboard ─────────────────────────────────────────────
export function HospitalSecretaryDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <SecretaryDashboardShell
      department="hospital"
      onLogout={onLogout}
      navItems={[
        { id: 'overview', label: 'Overview',       icon: Home },
        { id: 'claims',   label: 'Medical Claims', icon: ClipboardList },
        { id: 'verified', label: 'Verified Claims', icon: Archive },
        { id: 'profile',  label: 'Profile',         icon: User },
      ]}
      title="Medical Department"
      subtitle="Secretary Dashboard"
    />
  );
}