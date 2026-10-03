import React, { useState, useEffect } from 'react';
import {
  Home, Users, CheckSquare, Archive, User,
  Plus, Trash2, Star, Music, Zap, Globe, Mic,
  TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle,
  Search, RefreshCw, Eye, Circle,
  RotateCcw, DollarSign, Pencil, Save, X, KeyRound, Loader2,
} from 'lucide-react';
import {
  SecretaryLayout, ClaimReviewPanel,
  StatCard, StatusBadge, deptConfig,
  type Claim, type SecretaryUser, type StudentUser,
} from './SecretaryShared';
import { apiService } from '../services/db_service';

// ─── Types ─────────────────────────────────────────────────────────────────────
type FestName = 'Celesta' | 'Infinito' | 'Anwesha' | 'TedX';
const FESTS: FestName[] = ['Celesta', 'Infinito', 'Anwesha', 'TedX'];
const festIcons: Record<FestName, any> = { Celesta: Music, Infinito: Zap, Anwesha: Globe, TedX: Mic };
const festColors: Record<FestName, string> = {
  Celesta: 'from-violet-500 to-purple-600',
  Infinito: 'from-blue-500 to-cyan-600',
  Anwesha: 'from-rose-500 to-pink-600',
  TedX: 'from-red-500 to-orange-600',
};

// ─── FestCoordinator type ──────────────────────────────────────────────────────
type FestCoordinator = {
  memberId: string;
  userId: string;
  fullName: string;
  studentRoll: string;
  email: string;
  festName: string;
  assignedAt: string;
  lastLogin?: string | null;
  isActive: boolean;
};

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ─── Check if user is currently online (active within last 10 minutes) ─────────
function isUserOnline(lastLogin: string | null | undefined): boolean {
  if (!lastLogin) return false;
  const date = new Date(lastLogin);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);
  return diffInMins <= 10; // Online if active within last 10 minutes
}

// ─── Status mapper: backend → frontend ────────────────────────────────────────
function mapStatus(backendStatus: string): Claim['status'] {
  const map: Record<string, Claim['status']> = {
    VERIFIED_FEST:      'verified',
    APPROVED:           'approved',
    REJECTED:           'rejected',
    REFUNDED:           'disbursed',
    PUSHED_TO_ACCOUNTS: 'disbursed',
    PENDING_FC:         'pending',
    PENDING_COORD:      'pending',
  };
  return map[backendStatus] ?? 'pending';
}


// ─── Dynamic Profile Page ──────────────────────────────────────────────────────
function DynamicProfilePage({
  user,
  setUser,
}: {
  user: SecretaryUser | null;
  setUser: React.Dispatch<React.SetStateAction<SecretaryUser | null>>;
}) {
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
    if (user) {
      setEditForm({
        fullName: user.fullName ?? '',
        phone: user.phone ?? '',
        institution: user.institution ?? '',
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setEditError('');
    setEditSuccess('');
    if (editForm.phone && !/^\d{10}$/.test(editForm.phone)) {
      setEditError('Phone number must be exactly 10 digits.');
      return;
    }
    setEditLoading(true);
    try {
      const result = await apiService.updateUserData(user._id, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        institution: editForm.institution,
      });
      setUser(prev => prev ? { ...prev, ...result.user } : prev);
      setEditSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError('All fields are required.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (!user) return;
    setPwLoading(true);
    try {
      await apiService.changePassword(user._id, pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPassword(false);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const initials = user.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-5 max-w-3xl mx-auto">
      <div className="rounded-2xl p-5 flex items-center gap-4 bg-gradient-to-r from-violet-500 to-purple-600">
        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg leading-tight">{user.fullName}</p>
          <p className="text-white/80 text-sm">{user.designation} · Cultural &amp; Fest Cell</p>
          <p className="text-white/60 text-xs mt-0.5">{user.employeeId}</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => { setIsEditing(true); setEditSuccess(''); setEditError(''); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-colors"
          >
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
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                <input
                  value={editForm.fullName}
                  onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
                <input
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  maxLength={10}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="10-digit number"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Institution</label>
                <input
                  value={editForm.institution}
                  onChange={e => setEditForm(f => ({ ...f, institution: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>
            {editError && (
              <p className="text-red-500 text-xs flex items-center gap-1"><X size={13} /> {editError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
              >
                {editLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditError(''); }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: 'Full Name', value: user.fullName },
              { label: 'Email', value: user.email },
              { label: 'Phone', value: user.phone || '—' },
              { label: 'Employee ID', value: user.employeeId },
              { label: 'Designation', value: user.designation || '—' },
              { label: 'Institution', value: user.institution || '—' },
              {
                label: 'Member Since',
                value: user.joinDate
                  ? new Date(user.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—',
              },
              {
                label: 'Last Login',
                value: user.lastLogin
                  ? new Date(user.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : '—',
              },
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
        <button
          onClick={() => { setShowPassword(v => !v); setPwError(''); setPwSuccess(''); }}
          className="w-full flex items-center justify-between"
        >
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
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="••••••••"
                />
              </div>
            ))}
            {pwError && (
              <p className="text-red-500 text-xs flex items-center gap-1"><X size={13} /> {pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-green-600 text-xs flex items-center gap-1"><CheckCircle size={13} /> {pwSuccess}</p>
            )}
            <button
              onClick={handleChangePassword}
              disabled={pwLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
            >
              {pwLoading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────────
function OverviewPage({ claims, fcList }: { claims: Claim[]; fcList: FestCoordinator[] }) {
  const stats = {
    total: claims.length,
    verified: claims.filter(c => c.status === 'verified').length,
    approved: claims.filter(c => c.status === 'approved').length,
    totalAmount: claims
      .filter(c => c.status === 'approved' || c.status === 'disbursed')
      .reduce((s, c) => s + c.amount, 0),
  };

  const festStats = FESTS.map(f => ({
    name: f,
    total: claims.filter(c => c.festName === f).length,
    approved: claims.filter(c => c.festName === f && (c.status === 'approved' || c.status === 'disbursed')).length,
    amount: claims
      .filter(c => c.festName === f && (c.status === 'approved' || c.status === 'disbursed'))
      .reduce((s, c) => s + c.amount, 0),
  }));

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Overview</h2>
        <p className="text-slate-500 text-sm mt-0.5">Cultural &amp; Fest reimbursement summary</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Claims" value={stats.total} icon={TrendingUp} color="bg-violet-100 text-violet-600" />
        <StatCard label="Awaiting Action" value={stats.verified} icon={Clock} color="bg-amber-100 text-amber-600" sub="Ready for your approval" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle} color="bg-green-100 text-green-600" />
        <StatCard label="Total Approved ₹" value={`₹${(stats.totalAmount / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-emerald-100 text-emerald-600" />
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Fest-wise Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {festStats.map(f => {
            const Icon = festIcons[f.name as FestName];
            const grad = festColors[f.name as FestName];
            return (
              <div key={f.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{f.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.total} claims · {f.approved} approved</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-700">₹{f.amount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-400">disbursed</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Active Fest Coordinators</h3>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {fcList.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No FCs assigned yet</div>
          ) : fcList.map((fc, i) => {
            const festName = fc.festName as FestName;
            const Icon = festIcons[festName] || Music;
            const grad = festColors[festName] || 'from-slate-400 to-slate-500';
            return (
              <div key={fc.memberId} className={`flex items-center gap-4 px-5 py-3.5 ${i < fcList.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{fc.fullName}</p>
                  <p className="text-xs text-slate-400">{fc.studentRoll} · {fc.festName}</p>
                </div>
                <span className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                  isUserOnline(fc.lastLogin) 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-slate-500 bg-slate-100'
                }`}>
                  <Circle size={4} className={isUserOnline(fc.lastLogin) ? 'fill-green-600' : 'fill-slate-500'} />
                  {isUserOnline(fc.lastLogin) ? 'Online' : 'Offline'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Live Student Search ───────────────────────────────────────────────────────
function LiveStudentSearch({
  fest,
  festId,
  fcList,
  currentUserId,
  onAdd,
}: {
  fest: FestName;
  festId: string;
  fcList: FestCoordinator[];
  currentUserId: string;
  onAdd: (member: FestCoordinator) => void;
}) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  useEffect(() => {
    setQuery('');
    setResult(null);
    setNotFound(false);
    setAddError('');
    setAddSuccess('');
  }, [fest]);

  const resetSearch = () => {
    setResult(null);
    setNotFound(false);
    setAddError('');
    setAddSuccess('');
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearchLoading(true);
    resetSearch();
    try {
      const res = await fetch(`${BASE}/api/users/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) { setNotFound(true); return; }
      const data = await res.json();
      const user = Array.isArray(data) ? data[0] : data;
      if (!user) { setNotFound(true); return; }
      setResult(user);
    } catch {
      setNotFound(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!result) return;
    if (!festId) {
      setAddError('Fest not found in database. Please run the seed script first (node seed-fests.js).');
      return;
    }
    setAddError('');
    setAddSuccess('');
    setAddLoading(true);
    try {
      const res = await fetch(`${BASE}/api/fest-members/assign-fc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: result._id, festId, festName: fest, addedBy: currentUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to assign FC.');
      const m = data.member;
      const newFC: FestCoordinator = {
        memberId: m._id,
        userId: m.user._id,
        fullName: m.user.fullName,
        studentRoll: m.user.studentId,
        email: m.user.email,
        festName: fest,
        assignedAt: m.createdAt,
        lastLogin: m.user.lastLogin || null,
        isActive: true,
      };
      onAdd(newFC);
      setAddSuccess(`${result.fullName} added as ${fest} FC!`);
      setResult(null);
      setQuery('');
    } catch (e: any) {
      setAddError(e.message || 'Failed to assign FC role. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const alreadyAssigned = result && fcList.some(fc => fc.userId === result._id && fc.festName === fest);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); if (result || notFound) resetSearch(); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Roll no. or email address..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searchLoading || !query.trim()}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 transition-colors flex-shrink-0"
        >
          {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {notFound && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <XCircle size={16} className="flex-shrink-0" />
          No user found with that roll number or email.
        </div>
      )}

      {result && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <span className="text-violet-700 font-bold text-xs">
                {result.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{result.fullName}</p>
              <p className="text-xs text-slate-500">{result.studentId} · {result.email}</p>
              {result.department && (
                <p className="text-xs text-slate-400 capitalize mt-0.5">Dept: {result.department}</p>
              )}
            </div>
            <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
          </div>
          {alreadyAssigned ? (
            <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} /> Already assigned as {fest} FC.
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={addLoading || !festId}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors"
            >
              {addLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {addLoading ? 'Assigning…' : `Add as ${fest} FC`}
            </button>
          )}
        </div>
      )}

      {addError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <XCircle size={15} className="flex-shrink-0" /> {addError}
        </div>
      )}
      {addSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          <CheckCircle size={15} className="flex-shrink-0" /> {addSuccess}
        </div>
      )}
    </div>
  );
}

// ─── Appoint FC ────────────────────────────────────────────────────────────────
function AppointFCPage({
  fcList,
  setFcList,
  festIdMap,
  currentUserId,
}: {
  fcList: FestCoordinator[];
  setFcList: React.Dispatch<React.SetStateAction<FestCoordinator[]>>;
  festIdMap: Record<string, string>;
  currentUserId: string;
}) {
  const [selectedFest, setSelectedFest] = useState<FestName>('Celesta');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const festFCs = (fest: FestName) => fcList.filter(fc => fc.festName === fest);
  const canAdd = (fest: FestName) => festFCs(fest).length < 2;

  const handleSelect = (member: FestCoordinator) => {
    setFcList(prev => [...prev, member]);
  };

  const handleRemove = async (memberId: string) => {
    setRemoveLoading(true);
    setRemoveError('');
    try {
      const res = await fetch(`${BASE}/api/fest-members/${memberId}/remove-fc`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove FC.');
      setFcList(prev => prev.filter(fc => fc.memberId !== memberId));
      setConfirmRemoveId(null);
    } catch (e: any) {
      setRemoveError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setRemoveLoading(false);
    }
  };

  const getActiveGradient = (fest: FestName): string => {
    const grad = festColors[fest];
    if (grad.includes('violet')) return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    if (grad.includes('blue'))   return 'linear-gradient(135deg, #3b82f6, #06b6d4)';
    if (grad.includes('rose'))   return 'linear-gradient(135deg, #f43f5e, #ec4899)';
    return 'linear-gradient(135deg, #ef4444, #f97316)';
  };

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Appoint Fest Coordinators</h2>
        <p className="text-slate-500 text-sm mt-0.5">Assign up to 2 FCs per fest. They can verify reimbursement claims.</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FESTS.map(fest => {
          const Icon = festIcons[fest];
          const active = selectedFest === fest;
          return (
            <button
              key={fest}
              onClick={() => setSelectedFest(fest)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                active ? 'text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
              style={active ? { background: getActiveGradient(fest) } : {}}
            >
              <Icon size={15} className={active ? 'text-white' : 'text-slate-400'} />
              {fest}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {festFCs(fest).length}/2
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-700">Assigned to {selectedFest}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{festFCs(selectedFest).length}/2 slots filled</p>
          </div>
          <div className="divide-y divide-slate-100">
            {festFCs(selectedFest).length === 0 ? (
              <div className="py-12 text-center">
                <Star size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No FCs assigned for {selectedFest}</p>
              </div>
            ) : (
              festFCs(selectedFest).map(fc => (
                <div key={fc.memberId} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${festColors[selectedFest]} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-bold text-xs">
                      {fc.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 text-sm">{fc.fullName}</p>
                    <p className="text-xs text-slate-400">{fc.studentRoll} · {fc.email}</p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Since {new Date(fc.assignedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <button
                    onClick={() => { setConfirmRemoveId(fc.memberId); setRemoveError(''); }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                    title="Remove FC"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-700 mb-1">Add New FC for {selectedFest}</h3>
          <p className="text-xs text-slate-400 mb-4">Search by roll number or email</p>
          {canAdd(selectedFest) ? (
            <LiveStudentSearch
              fest={selectedFest}
              festId={festIdMap[selectedFest] || ''}
              fcList={fcList}
              currentUserId={currentUserId}
              onAdd={handleSelect}
            />
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <AlertTriangle size={20} className="text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-amber-700">Maximum 2 FCs reached for {selectedFest}</p>
              <p className="text-xs text-amber-500 mt-1">Remove an existing FC to add a new one</p>
            </div>
          )}
          <div className="mt-4 p-4 bg-violet-50 rounded-xl border border-violet-100">
            <p className="text-xs text-violet-700 leading-relaxed">
              <strong>Note:</strong> Assigned FCs receive the role{' '}
              <code className="bg-violet-100 px-1 rounded">{selectedFest}_FC</code> and can verify
              fest reimbursement claims. Removing them will revoke this role.
            </p>
          </div>
        </div>
      </div>

      {confirmRemoveId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Remove FC?</h4>
                <p className="text-slate-500 text-sm">
                  Their <strong>{selectedFest}_FC</strong> role will be revoked and they will be set back to STUDENT.
                </p>
              </div>
            </div>
            {removeError && (
              <p className="text-red-500 text-xs mb-3 flex items-center gap-1">
                <XCircle size={13} /> {removeError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmRemoveId(null); setRemoveError(''); }}
                disabled={removeLoading}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmRemoveId)}
                disabled={removeLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
              >
                {removeLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                {removeLoading ? 'Removing…' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Approve Reimbursements ────────────────────────────────────────────────────
function ApproveReimbursementsPage({
  claims,
  setClaims,
  currentUser,
}: {
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  currentUser: SecretaryUser | null;
}) {
  const [selected, setSelected] = useState<Claim | null>(null);
  const [festFilter, setFestFilter] = useState<FestName | 'All'>('All');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const queue = claims.filter(c => c.status === 'pending');
  const filtered = queue.filter(c => {
    const ms = search.toLowerCase();
    return (
      (festFilter === 'All' || c.festName === festFilter) &&
      (
        (c.studentName ?? '').toLowerCase().includes(ms) ||
        (c.claimRefId ?? '').toLowerCase().includes(ms) ||
        (c.studentRoll || '').toLowerCase().includes(ms)
      )
    );
  });

  const handleApprove = async (id: string) => {
    const stored = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
    setActionLoading(id);
    setActionError('');
    try {
      const res = await fetch(`${BASE}/api/verify/claims/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: stored._id,
          approvedByName: stored.fullName,
          remarks: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');
      setClaims(prev => prev.map(c => c._id === id ? { ...c, status: 'approved', approvedAt: new Date().toISOString() } : c));
      setSelected(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve claim.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    const stored = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
    setActionLoading(id);
    setActionError('');
    try {
      const res = await fetch(`${BASE}/api/verify/claims/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectedBy: stored._id,
          rejectedByName: stored.fullName,
          rejectionReason: reason,
          stage: 'APPROVAL',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rejection failed');
      setClaims(prev => prev.map(c => c._id === id ? { ...c, status: 'rejected', rejectionReason: reason, rejectedAt: new Date().toISOString() } : c));
      setSelected(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject claim.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Approve Reimbursements</h2>
          <p className="text-slate-500 text-sm mt-0.5">Claims verified by FCs — awaiting your final approval</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-sm font-bold self-start sm:self-auto">
          <Clock size={14} /> {queue.length} pending
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
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, roll no., ref ID..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['All', ...FESTS] as (FestName | 'All')[]).map(f => (
            <button
              key={f}
              onClick={() => setFestFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                festFilter === f ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <CheckCircle size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No claims awaiting approval</p>
          <p className="text-slate-300 text-sm mt-1">All verified claims have been processed</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Ref ID', 'Student', 'Fest', 'Amount', 'FC Note', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(claim => (
                  <tr key={claim._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">{claim.claimRefId ?? '—'}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-700 text-sm">{claim.studentName ?? '—'}</p>
                      <p className="text-xs text-slate-400">{claim.studentRoll}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {claim.festName && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
                          {claim.festName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-bold text-violet-700">₹{claim.amount.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-4 py-4 max-w-[200px]">
                      <p className="text-xs text-slate-500 truncate">{(claim as any).fcComment ?? '—'}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelected(claim)}
                        disabled={actionLoading === claim._id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
                      >
                        {actionLoading === claim._id ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <ClaimReviewPanel
          claim={selected}
          department="fest"
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          mode="approve"
          secretaryId={currentUser?._id || ''}
          secretaryName={currentUser?.fullName || ''}
        />
      )}
    </div>
  );
}

// ─── Verified Reimbursements ───────────────────────────────────────────────────
function VerifiedPage({
  claims,
  setClaims,
  currentUser,
}: {
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  currentUser: SecretaryUser | null;
}) {
  const [selected, setSelected] = useState<Claim | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'approved' | 'rejected' | 'disbursed'>('all');

  const verified = claims.filter(c => c.status === 'verified');
  const filtered = verified.filter(c => {
    const ms = search.toLowerCase();
    return (
      (statusFilter === 'all' || c.status === statusFilter) &&
      (
        (c.studentName ?? '').toLowerCase().includes(ms) ||
        (c.claimRefId ?? '').toLowerCase().includes(ms)
      )
    );
  });

  const handleUnverify = async (id: string) => {
    const stored = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const res = await fetch(`${BASE}/api/admin/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: id,
          status: 'VERIFIED_FEST',
          remarks: `Reverted to Verified by ${stored.fullName}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Revert failed');
      setClaims(prev =>
        prev.map(c => c._id === id ? { ...c, status: 'verified' } : c)
      );
    } catch (err: any) {
      console.error('Revert failed:', err.message);
      // optionally surface this to the user via a toast/alert
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Verified Reimbursements</h2>
        <p className="text-slate-500 text-sm mt-0.5">All processed claims — you can still revert approved ones</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search claims..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'approved', 'rejected', 'disbursed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap flex-shrink-0 transition-colors ${
                statusFilter === s ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No claims found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Ref ID', 'Student', 'Fest', 'Amount', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(claim => (
                  <tr key={claim._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">{claim.claimRefId ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-700 text-sm">{claim.studentName ?? '—'}</p>
                      <p className="text-xs text-slate-400">{claim.studentRoll}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-semibold text-violet-600">{claim.festName}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-violet-700">
                      ₹{claim.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={claim.status} /></td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {claim.submittedAt
                        ? new Date(claim.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelected(claim)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        {claim.status === 'approved' && (
                          <button
                            onClick={() => handleUnverify(claim._id)}
                            className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Revert to Verified"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ClaimReviewPanel
          claim={selected}
          department="fest"
          onClose={() => setSelected(null)}
          mode="view"
          secretaryId=""
          secretaryName=""
        />
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
// ─── Main Component ────────────────────────────────────────────────────────────
export function FestSecretaryDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeView, setActiveView] = useState('overview');
  const [user, setUser] = useState<SecretaryUser | null>(null);

  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState('');

  const [fcList, setFcList] = useState<FestCoordinator[]>([]);
  const [festIdMap, setFestIdMap] = useState<Record<string, string>>({});
  const [fcLoading, setFcLoading] = useState(true);
  const [fcError, setFcError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed._id) {
          setUser({
            _id: parsed._id,
            fullName: parsed.fullName || 'Unknown',
            employeeId: parsed.studentId || parsed.employeeId || '',
            email: parsed.email || '',
            phone: parsed.phone || '',
            department: parsed.department || 'fest',
            designation: parsed.isSecretary ? 'Cultural Secretary' : 'Student',
            institution: parsed.institution || '',
            joinDate: parsed.joinDate || new Date().toISOString(), // 👈 Fixed
            lastLogin: parsed.lastLogin || new Date().toISOString(),
            isVerified: parsed.isVerified ?? true,
            isSecretary: parsed.isSecretary ?? true,
            isSuperAdmin: parsed.isSuperAdmin ?? false,
          });
          return;
        }
      } catch (_) {}
    }
    // Optional: Call onLogout() here if you want to force redirect when no user is found
    // onLogout();
  }, []);

  useEffect(() => {
    const fetchClaims = async () => {
      setClaimsLoading(true);
      setClaimsError('');
      try {
        const statuses = 'VERIFIED_FEST,APPROVED,REJECTED,REFUNDED,PUSHED_TO_ACCOUNTS';
        const res = await fetch(`${BASE}/api/verify/claims?type=FEST_REIMBURSEMENT&status=${statuses}`);
        if (!res.ok) throw new Error('Failed to fetch claims');
        const data = await res.json();

        const mapped: Claim[] = data.map((c: any) => ({
          _id: c._id,
          claimId: c.claimId || c._id.slice(-8).toUpperCase(),
          claimRefId: c.claimRefId || c.claimId || c._id.slice(-8).toUpperCase(),
          studentId: c.student?._id || '',
          studentName: c.student?.fullName || 'Unknown',
          studentRoll: c.student?.studentId || '',
          studentEmail: c.student?.email || '',
          department: 'fest',
          title: c.title || c.requestType || 'Fest Reimbursement',
          description: c.description || '',
          amount: c.amount || 0,
          submittedAt: c.createdAt,
          attachments: c.attachments || [],
          status: mapStatus(c.status),
          festName: c.festName || '',
          fcVerifiedBy: c.verifications?.find((v: any) => v.stage === 'FEST_COORDINATOR')?.verifierName || '',
          fcVerifiedAt: c.verifications?.find((v: any) => v.stage === 'FEST_COORDINATOR')?.verifiedAt || '',
          fcComment: c.verifications?.find((v: any) => v.stage === 'FEST_COORDINATOR')?.remarks || '',
          rejectionReason: c.rejectionReason || '',
        }));

        setClaims(mapped);
      } catch (err: any) {
        console.error('Failed to load claims:', err);
        setClaimsError(err.message || 'Could not load claims.');
      } finally {
        setClaimsLoading(false);
      }
    };
    fetchClaims();
  }, []);

  useEffect(() => {
    const fetchFestData = async () => {
      setFcLoading(true);
      setFcError('');
      try {
        const festRes = await fetch(`${BASE}/api/fests`);
        if (!festRes.ok) throw new Error('Failed to load fests from database.');
        const fests: { _id: string; name: string }[] = await festRes.json();
        const map: Record<string, string> = {};
        fests.forEach(f => { map[f.name] = f._id; });
        setFestIdMap(map);

        const fcRes = await fetch(`${BASE}/api/fest-members/fcs`);
        if (!fcRes.ok) throw new Error('Failed to load FC list from database.');
        const members = await fcRes.json();

        const mapped: FestCoordinator[] = members.map((m: any) => ({
          memberId: m._id,
          userId: m.user._id,
          fullName: m.user.fullName,
          studentRoll: m.user.studentId,
          email: m.user.email,
          festName: m.fest?.name || '',
          assignedAt: m.createdAt,
          lastLogin: m.user.lastLogin || null,
          isActive: m.isActive,
        }));
        setFcList(mapped);
      } catch (e: any) {
        console.error('Fest data load error:', e);
        setFcError(e.message || 'Could not load FC data. Check your connection.');
      } finally {
        setFcLoading(false);
      }
    };
    fetchFestData();
    
    // Auto-refresh fest coordinators every 15 seconds to show real-time online status
    const interval = setInterval(fetchFestData, 15000);
    return () => clearInterval(interval);
  }, []);

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

  const navItems = [
    { id: 'overview', label: 'Overview',       icon: Home },
    { id: 'appoint',  label: 'Appoint FC',     icon: Users },
    { id: 'approve',  label: 'Approve Reimb.',  icon: CheckSquare },
    { id: 'verified', label: 'Verified',        icon: Archive },
    { id: 'profile',  label: 'Profile',         icon: User },
  ];

  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 size={28} className="animate-spin text-violet-400" />
      <p className="text-slate-400 text-sm">Loading data…</p>
    </div>
  );

  const renderAppointPage = () => {
    if (fcLoading) return <LoadingSpinner />;
    if (fcError) {
      return (
        <div className="p-6 flex flex-col items-center justify-center h-64 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 max-w-md text-center">
            <XCircle size={28} className="text-red-400 mx-auto mb-2" />
            <p className="text-red-700 font-semibold text-sm">{fcError}</p>
            <p className="text-red-400 text-xs mt-1">
              Make sure you've run <code className="bg-red-100 px-1 rounded">node seed-fests.js</code> once
              to create the Fest documents in MongoDB.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold mx-auto"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      );
    }
    return (
      <AppointFCPage
        fcList={fcList}
        setFcList={setFcList}
        festIdMap={festIdMap}
        currentUserId={user?._id || ''}
      />
    );
  };

  const renderClaimsError = () => (
    <div className="p-6 flex flex-col items-center justify-center h-64">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 max-w-md text-center">
        <XCircle size={28} className="text-red-400 mx-auto mb-2" />
        <p className="text-red-700 font-semibold text-sm">{claimsError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold mx-auto"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  return (
    <SecretaryLayout
      department="fest"
      navItems={navItems}
      activeView={activeView}
      setActiveView={setActiveView}
      onLogout={onLogout}
      user={user} // 👈 Fixed: Pass the user state directly
      title="Cultural & Fest Cell"
      subtitle="Secretary Dashboard"
    >
      {activeView === 'overview' && <OverviewPage claims={claims} fcList={fcList} />}
      {activeView === 'appoint'  && renderAppointPage()}
      {activeView === 'approve'  && (
        claimsLoading ? <LoadingSpinner /> :
        claimsError   ? renderClaimsError() :
        <ApproveReimbursementsPage claims={claims} setClaims={setClaims} currentUser={user} />
      )}
      {activeView === 'verified' && (
        claimsLoading ? <LoadingSpinner /> :
        claimsError   ? renderClaimsError() :
        <VerifiedPage claims={claims} setClaims={setClaims} currentUser={user} />
      )}
      {activeView === 'profile'  && <DynamicProfilePage user={user} setUser={setUser} />}
    </SecretaryLayout>
  );
}