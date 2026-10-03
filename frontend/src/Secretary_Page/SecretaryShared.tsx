import React, { useState, useEffect, useRef } from 'react';
import {
  Home, LogOut, User, Menu, X, ChevronRight,
  CheckCircle, XCircle, Clock, AlertTriangle, Eye,
  Search, RefreshCw, BadgeCheck, Shield, FileText,
  ArrowUpRight, ChevronDown, DollarSign, Inbox,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type Department = 'fest' | 'mess' | 'hospital' | 'account';

export interface SecretaryUser {
  _id: string;
  fullName: string;
  employeeId: string;
  email: string;
  phone: string;
  department: Department;
  designation: string;
  institution: string;
  joinDate: string;
  lastLogin: string;
  isVerified: boolean;
  isSecretary: boolean;
  isSuperAdmin: boolean;
}

export interface Claim {
  _id: string;
  claimId: string;
  claimRefId?: string;
  studentId?: string;
  studentName?: string;
  studentRoll?: string;
  studentEmail?: string;
  student?: {
    _id: string;
    fullName: string;
    email: string;
    studentId: string;
    phone?: string;
    hostel?: string;
    block?: string;
    roomNumber?: string;
  };
  requestType: 'MESS_REBATE' | 'FEST_REIMBURSEMENT' | 'MEDICAL_REBATE';
  department?: Department;
  title: string;
  description: string;
  amount: number;
  effectiveAmount?: number;
  effectiveMessDays?: number;
  messAbsenceDays?: number;
  submittedAt?: string;
  createdAt?: string;
  attachments: { url: string; filename: string; mimetype?: string }[];
  status: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  verifierRemarks?: string;
  verifications?: { stage: string; verifierName: string; verifiedAt: string; remarks?: string }[];
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approverRemarks?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  rejectedAtStage?: string;
  refundedBy?: string;
  refundedByName?: string;
  refundedAt?: string;
  disbursedAmount?: number;
  disbursementRef?: string;
  disbursementNotes?: string;
  messAbsenceFrom?: string;
  messAbsenceTo?: string;
  festName?: string;
  teamName?: string;
  transactionId?: string;
}

export interface StudentUser {
  _id: string;
  fullName: string;
  studentId: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
}

export interface RefundRecord {
  _id: string;
  claimId: string;
  studentName: string;
  studentRoll: string;
  department: Department;
  amount: number;
  refundedAt: string;
  refundedBy: string;
  transactionRef: string;
  notes?: string;
}

// ─── API Base ──────────────────────────────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

// ─── Department Config ─────────────────────────────────────────────────────────
export const deptConfig = {
  fest: {
    label: 'Cultural & Fest Cell',
    shortLabel: 'Fest',
    accent: '#8b5cf6',
    accentLight: '#ede9fe',
    accentDark: '#6d28d9',
    gradient: 'from-violet-700 via-purple-700 to-indigo-700',
    headerBg: 'bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700',
    sidebarBg: 'bg-[#1e1332]',
    activeNav: 'bg-violet-600 text-white',
    hoverNav: 'hover:bg-violet-900/40',
    badge: 'bg-violet-100 text-violet-700',
    btn: 'bg-violet-600 hover:bg-violet-700',
    ring: 'ring-violet-500',
    tag: 'text-violet-600',
    claimType: 'FEST_REIMBURSEMENT' as const,
    pendingStatus: 'VERIFIED_FEST',
    verifyLabel: 'Verified Fest Claims',
  },
  mess: {
    label: 'Mess Department',
    shortLabel: 'Mess',
    accent: '#10b981',
    accentLight: '#d1fae5',
    accentDark: '#047857',
    gradient: 'from-emerald-700 via-teal-700 to-green-700',
    headerBg: 'bg-gradient-to-r from-emerald-700 via-teal-700 to-green-700',
    sidebarBg: 'bg-[#0d1f1a]',
    activeNav: 'bg-emerald-600 text-white',
    hoverNav: 'hover:bg-emerald-900/40',
    badge: 'bg-emerald-100 text-emerald-700',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'ring-emerald-500',
    tag: 'text-emerald-600',
    claimType: 'MESS_REBATE' as const,
    pendingStatus: 'PENDING_MESS_MANAGER',
    verifyLabel: 'Mess Rebate Claims',
  },
  hospital: {
    label: 'Medical Department',
    shortLabel: 'Medical',
    accent: '#3b82f6',
    accentLight: '#dbeafe',
    accentDark: '#1d4ed8',
    gradient: 'from-blue-700 via-sky-700 to-cyan-700',
    headerBg: 'bg-gradient-to-r from-blue-700 via-sky-700 to-cyan-700',
    sidebarBg: 'bg-[#0b1a2e]',
    activeNav: 'bg-blue-600 text-white',
    hoverNav: 'hover:bg-blue-900/40',
    badge: 'bg-blue-100 text-blue-700',
    btn: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-500',
    tag: 'text-blue-600',
    claimType: 'MEDICAL_REBATE' as const,
    pendingStatus: 'PENDING_ACADEMIC',
    verifyLabel: 'Medical Rebate Claims',
  },
  account: {
    label: 'Accounts Department',
    shortLabel: 'Accounts',
    accent: '#f59e0b',
    accentLight: '#fef3c7',
    accentDark: '#b45309',
    gradient: 'from-amber-600 via-orange-600 to-yellow-600',
    headerBg: 'bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600',
    sidebarBg: 'bg-[#1e1505]',
    activeNav: 'bg-amber-600 text-white',
    hoverNav: 'hover:bg-amber-900/40',
    badge: 'bg-amber-100 text-amber-700',
    btn: 'bg-amber-500 hover:bg-amber-600',
    ring: 'ring-amber-500',
    tag: 'text-amber-600',
    claimType: null,
    pendingStatus: 'PUSHED_TO_ACCOUNTS',
    verifyLabel: 'Claims Ready for Disbursement',
  },
};

// ─── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING_MESS_MANAGER: { label: 'Pending Verification', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    PENDING_ACADEMIC: { label: 'Pending Verification', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    PENDING_COORD: { label: 'Pending Coordinator', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
    PENDING_FC: { label: 'Pending FC', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
    VERIFIED_MESS: { label: 'Verified', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    VERIFIED_MEDICAL: { label: 'Verified', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    VERIFIED_FEST: { label: 'Verified by FC', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    APPROVED: { label: 'Approved', cls: 'bg-green-100 text-green-700 border-green-200' },
    PUSHED_TO_ACCOUNTS: { label: 'Sent to Accounts', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700 border-red-200' },
    REFUNDED: { label: 'Refunded', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
    // frontend-mapped statuses
    pending: { label: 'Pending Verification', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    verified: { label: 'Verified', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    approved: { label: 'Approved', cls: 'bg-green-100 text-green-700 border-green-200' },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700 border-red-200' },
    disbursed: { label: 'Disbursed', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  };
  const entry = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">{value}</p>
        <p className="text-sm font-semibold text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Shared Secretary Layout (Sidebar + Topbar) ────────────────────────────────
interface SecretaryLayoutProps {
  department: Department;
  navItems: { id: string; label: string; icon: any }[];
  activeView: string;
  setActiveView: (v: string) => void;
  onLogout: () => void;
  user?: SecretaryUser | null;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function SecretaryLayout({
  department, navItems, activeView, setActiveView,
  onLogout, user, title, subtitle, children,
}: SecretaryLayoutProps) {
  const cfg = deptConfig[department];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarInner = ({ onClose }: { onClose?: () => void }) => (
    <div className={`flex flex-col h-full ${cfg.sidebarBg}`}>
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cfg.accent }}>
            <span className="text-white font-black text-sm">{cfg.shortLabel[0]}</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{cfg.shortLabel}</p>
            <p className="text-white/40 text-xs">Secretary Portal</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      {user && (
        <div className="mx-3 mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
              style={{ background: cfg.accent }}>
              {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-bold truncate">{user.fullName}</p>
              <p className="text-white/40 text-xs truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button key={item.id}
              onClick={() => { setActiveView(item.id); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group ${active ? cfg.activeNav + ' shadow-lg' : 'text-white/60 ' + cfg.hoverNav + ' hover:text-white'}`}>
              <Icon size={18} className={active ? 'text-white' : 'text-white/50 group-hover:text-white'} />
              <span className="font-medium text-sm">{item.label}</span>
              {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all">
          <LogOut size={18} />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 shadow-xl">
        <SidebarInner />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 shadow-2xl flex flex-col">
            <SidebarInner onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className={`${cfg.headerBg} px-4 sm:px-6 py-4 flex-shrink-0 shadow-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                <Menu size={22} />
              </button>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-white leading-tight">{title}</h1>
                <p className="text-xs text-white/70 hidden sm:block">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </div>
<nav
  className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t"
  style={{
    background: '#ffffff',
    borderColor: '#e2e8f0'
  }}
>
  <div className="flex items-stretch h-16">
    {navItems.slice(0, 4).map(item => {
      const active = activeView === item.id;
      const Icon = item.icon;

      return (
        <button
          key={item.id}
          onClick={() => setActiveView(item.id)}
          className="flex flex-col items-center justify-center flex-1 relative transition-all"
        >
          {/* Active indicator line */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full transition-all ${
              active ? '' : 'opacity-0'
            }`}
            style={{ background: cfg.accent }}
          />

          {/* Icon */}
          <Icon
            size={20}
            className={`transition-all ${
              active
                ? 'scale-110'
                : ''
            }`}
            style={{
              color: active ? cfg.accent : '#64748b'
            }}
          />

          {/* Label */}
          <span
            className="text-xs mt-1 font-semibold"
            style={{
              color: active ? cfg.accent : '#64748b'
            }}
          >
            {item.label}
          </span>
        </button>
      );
    })}
  </div>
</nav>
      </div>
    </div>
  );
}

// ─── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ claimId, onConfirm, onCancel }: {
  claimId: string;
  onConfirm: (id: string, reason: string, stage: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Reject Claim</h3>
            <p className="text-xs text-gray-500">A rejection reason is required</p>
          </div>
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Describe why this claim is being rejected..."
          rows={4}
          className="w-full text-sm px-4 py-3 border border-red-200 rounded-xl bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400/30 resize-none placeholder-red-300 text-gray-700"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(claimId, reason.trim(), 'SECRETARY'); }}
            disabled={!reason.trim()}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-40"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Claim Review Panel ────────────────────────────────────────────────────────
interface ClaimPanelProps {
  claim: Claim;
  department: Department;
  onClose: () => void;
  onVerify?: (id: string, remarks: string) => void;
  onReject?: (id: string, reason: string, stage: string) => void;
  onRefund?: (id: string, ref: string, amount: number, notes: string) => void;
  onApprove?: (id: string) => void;
  mode: 'verify' | 'approve' | 'view' | 'refund';
  secretaryId?: string;
  secretaryName?: string;
}

export function ClaimReviewPanel({
  claim, department, onClose, onVerify, onApprove, onReject, onRefund, mode, secretaryId, secretaryName,
}: ClaimPanelProps) {
  const cfg = deptConfig[department];
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [refundRef, setRefundRef] = useState('');
  const [refundAmount, setRefundAmount] = useState(String(claim.effectiveAmount ?? claim.amount));
  const [refundNotes, setRefundNotes] = useState('');
  const [tab, setTab] = useState<'details' | 'docs' | 'history'>('details');

  const studentName = claim.student?.fullName || claim.studentName || '—';
  const studentRoll = claim.student?.studentId || claim.studentRoll || '—';
  const studentEmail = claim.student?.email || claim.studentEmail || '—';
  const submittedAt = claim.createdAt || claim.submittedAt || '';

  const canVerify = mode === 'verify' && (
    (department === 'mess' && claim.status === 'PENDING_MESS_MANAGER') ||
    (department === 'hospital' && claim.status === 'PENDING_ACADEMIC') ||
    (department === 'fest' && claim.status === 'VERIFIED_FEST') ||
    // also handle frontend-mapped statuses
    (department === 'mess' && claim.status === 'pending') ||
    (department === 'hospital' && claim.status === 'pending')
  );

  const canApprove = mode === 'approve';
  const canReject = !['REJECTED', 'REFUNDED', 'PUSHED_TO_ACCOUNTS', 'rejected', 'disbursed'].includes(claim.status);

  return (
    <>
      {showRejectModal && (
        <RejectModal
          claimId={claim._id}
          onConfirm={(id, reason, stage) => { onReject?.(id, reason, stage); setShowRejectModal(false); onClose(); }}
          onCancel={() => setShowRejectModal(false)}
        />
      )}

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-end z-40">
        <div className="bg-white w-full sm:w-[600px] h-full sm:h-full overflow-y-auto shadow-2xl flex flex-col">
          {/* Header */}
          <div className={`${cfg.headerBg} p-5 flex-shrink-0`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/60 text-xs font-mono mb-1">{claim.claimId}</p>
                <h3 className="text-xl font-bold text-white">{claim.title}</h3>
                <p className="text-white/80 text-sm mt-1">{studentName} · {studentRoll}</p>
              </div>
              <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-colors flex-shrink-0">
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <span className="text-2xl font-black text-white">
                ₹{(claim.effectiveAmount ?? claim.amount).toLocaleString()}
              </span>
              {claim.effectiveAmount && claim.effectiveAmount !== claim.amount && (
                <span className="text-white/60 text-sm line-through">₹{claim.amount.toLocaleString()}</span>
              )}
              <StatusBadge status={claim.status} />
            </div>
            {claim.requestType === 'MESS_REBATE' && claim.effectiveMessDays !== undefined && (
              <p className="text-white/70 text-xs mt-2">
                Requested: {claim.messAbsenceDays} days → Effective refund: <span className="font-bold text-white">{claim.effectiveMessDays} days</span> (capped at max allowed)
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 flex-shrink-0">
            {(['details', 'docs', 'history'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${tab === t ? 'border-b-2 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                style={{ borderColor: tab === t ? cfg.accent : 'transparent' }}>
                {t === 'details' ? 'Details' : t === 'docs' ? 'Documents' : 'History'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === 'details' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Student', studentName],
                    ['Roll No', studentRoll],
                    ['Email', studentEmail],
                    ['Submitted', submittedAt ? new Date(submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
                    ...(claim.messAbsenceFrom ? [
                      ['Leave From', new Date(claim.messAbsenceFrom).toLocaleDateString('en-IN')],
                      ['Leave To', claim.messAbsenceTo ? new Date(claim.messAbsenceTo).toLocaleDateString('en-IN') : '—'],
                      ['Days Requested', String(claim.messAbsenceDays ?? '—')],
                      ['Days Effective', String(claim.effectiveMessDays ?? '—')],
                    ] : []),
                    ...(claim.festName ? [['Fest', claim.festName], ['Committee', claim.teamName || '—']] : []),
                    ...(claim.transactionId ? [['Transaction ID', claim.transactionId]] : []),
                    ...(claim.student?.hostel ? [['Hostel', claim.student.hostel + (claim.student.block ? ` Block ${claim.student.block}` : '') + (claim.student.roomNumber ? ` Room ${claim.student.roomNumber}` : '')]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
                      <p className="text-sm font-semibold text-slate-700 break-words">{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 border border-slate-100 leading-relaxed">{claim.description}</p>
                </div>

                {claim.verifications && claim.verifications.length > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Verification Chain</p>
                    {claim.verifications.map((v, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <BadgeCheck size={13} className="text-green-500 mt-0.5 shrink-0" />
                        <span>
                          <span className="font-semibold">{v.verifierName}</span> ({v.stage})
                          {v.remarks && <span className="italic text-gray-400"> · "{v.remarks}"</span>}
                          <span className="text-gray-400"> · {new Date(v.verifiedAt).toLocaleDateString('en-IN')}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {claim.verifiedByName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Secretary Verification</p>
                    <p className="text-sm text-blue-800">{claim.verifierRemarks || 'Verified.'}</p>
                    <p className="text-xs text-blue-400 mt-1">By {claim.verifiedByName} · {claim.verifiedAt ? new Date(claim.verifiedAt).toLocaleDateString('en-IN') : ''}</p>
                  </div>
                )}

                {(claim.status === 'REJECTED' || claim.status === 'rejected') && claim.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Rejection Reason</p>
                    <p className="text-sm text-red-800">{claim.rejectionReason}</p>
                    {claim.rejectedByName && <p className="text-xs text-red-400 mt-1">By {claim.rejectedByName}{claim.rejectedAtStage ? ` (stage: ${claim.rejectedAtStage})` : ''}</p>}
                  </div>
                )}

                {(claim.status === 'REFUNDED' || claim.status === 'disbursed') && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">Refund Info</p>
                    <p className="text-sm text-purple-800">₹{(claim.disbursedAmount ?? 0).toLocaleString()} disbursed via {claim.disbursementRef}</p>
                    {claim.refundedByName && <p className="text-xs text-purple-400 mt-1">By {claim.refundedByName}</p>}
                    {claim.disbursementNotes && <p className="text-xs text-purple-600 mt-1 italic">{claim.disbursementNotes}</p>}
                  </div>
                )}
              </div>
            )}

            {tab === 'docs' && (
              <div className="space-y-4">
                {claim.attachments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400"><p className="text-sm">No documents attached</p></div>
                ) : claim.attachments.map((att, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                    {att.mimetype?.startsWith('image/') || att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={att.url} alt={att.filename} className="w-full object-contain max-h-96 bg-slate-100" />
                    ) : (
                      <div className="flex items-center justify-center h-32 bg-slate-100">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-blue-600 hover:border-blue-300">
                          <FileText size={16} /> Open Document <ArrowUpRight size={14} />
                        </a>
                      </div>
                    )}
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-mono truncate">{att.filename}</p>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                        Open <ArrowUpRight size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Claim Timeline</p>
                <p className="text-xs text-slate-400 italic">Full timeline tracked in claim history array.</p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-5 border-t border-slate-200 space-y-3 flex-shrink-0 bg-white">
            {(canVerify || canApprove) && (
              <>
                <textarea
                  value={verifyRemarks}
                  onChange={e => setVerifyRemarks(e.target.value)}
                  rows={2}
                  placeholder={canApprove ? 'Approval remarks (optional)...' : 'Verification remarks (optional)...'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 resize-none"
                />
                <button
                  onClick={() => {
                    if (canApprove) onApprove?.(claim._id);
                    else { onVerify?.(claim._id, verifyRemarks); onClose(); }
                  }}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: cfg.accent }}
                >
                  <BadgeCheck size={16} />
                  {canApprove ? 'Approve Claim' : 'Verify Claim'}
                </button>
              </>
            )}

            {mode === 'refund' && (claim.status === 'PUSHED_TO_ACCOUNTS' || claim.status === 'disbursed') && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Refund Amount (₹)</label>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={e => setRefundAmount(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Transaction / UTR Ref</label>
                    <input
                      type="text"
                      value={refundRef}
                      onChange={e => setRefundRef(e.target.value)}
                      placeholder="e.g. UTR123456789"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-slate-50"
                    />
                  </div>
                </div>
                <textarea
                  value={refundNotes}
                  onChange={e => setRefundNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes (optional)..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 resize-none"
                />
                <button
                  onClick={() => {
                    if (refundRef.trim() && parseFloat(refundAmount) > 0) {
                      onRefund?.(claim._id, refundRef.trim(), parseFloat(refundAmount), refundNotes);
                      onClose();
                    }
                  }}
                  disabled={!refundRef.trim() || !(parseFloat(refundAmount) > 0)}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: cfg.accent }}
                >
                  <DollarSign size={16} /> Mark as Refunded
                </button>
              </div>
            )}

            {canReject && mode !== 'view' && (
              <button
                onClick={() => setShowRejectModal(true)}
                className="w-full py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 text-sm transition-all border border-red-200"
              >
                <XCircle size={16} className="inline mr-2" /> Reject Claim
              </button>
            )}

            <button onClick={onClose} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">Close</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Claims List ───────────────────────────────────────────────────────────────
interface ClaimsListViewProps {
  department: Department;
  secretary: SecretaryUser;
}

export function SecretaryClaimsView({ department, secretary }: ClaimsListViewProps) {
  const cfg = deptConfig[department];
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Claim | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchClaims = async () => {
    setLoading(true);
    try {
      let url = '';
      if (department === 'account') {
        url = `${API_BASE}/api/verify/accounts/claims`;
      } else {
        const typeMap: Record<string, string> = {
          mess: 'MESS_REBATE',
          hospital: 'MEDICAL_REBATE',
          fest: 'FEST_REIMBURSEMENT',
        };
        const statusMap: Record<string, string> = {
          mess: 'PENDING_MESS_MANAGER,VERIFIED_MESS,APPROVED,REJECTED',
          hospital: 'PENDING_ACADEMIC,VERIFIED_MEDICAL,APPROVED,REJECTED',
          fest: 'VERIFIED_FEST,APPROVED,REJECTED,PUSHED_TO_ACCOUNTS',
        };
        url = `${API_BASE}/api/verify/claims/department?type=${typeMap[department]}&status=${statusMap[department]}`;
      }
      const res = await fetch(url);
      if (res.ok) setClaims(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClaims(); }, [department]);

  const handleVerify = async (claimId: string, remarks: string) => {
    const endpointMap: Record<string, string> = {
      mess: `/api/verify/mess/claims/${claimId}/verify`,
      hospital: `/api/verify/medical/claims/${claimId}/verify`,
    };
    const endpoint = endpointMap[department];
    if (!endpoint) return;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifierId: secretary._id, verifierName: secretary.fullName, remarks }),
    });
    if (res.ok) {
      const { claim: updated } = await res.json();
      setClaims(prev => prev.map(c => c._id === updated._id ? updated : c));
    }
  };

  const handleReject = async (claimId: string, reason: string, stage: string) => {
    const res = await fetch(`${API_BASE}/api/verify/claims/${claimId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rejectedBy: secretary._id,
        rejectedByName: secretary.fullName,
        rejectionReason: reason,
        stage: `SECRETARY_${department.toUpperCase()}`,
      }),
    });
    if (res.ok) {
      const { claim: updated } = await res.json();
      setClaims(prev => prev.map(c => c._id === updated._id ? updated : c));
    }
  };

  const handleRefund = async (claimId: string, ref: string, amount: number, notes: string) => {
    const res = await fetch(`${API_BASE}/api/verify/claims/${claimId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refundedBy: secretary._id,
        refundedByName: secretary.fullName,
        transactionRef: ref,
        refundedAmount: amount,
        notes,
      }),
    });
    if (res.ok) {
      const { claim: updated } = await res.json();
      setClaims(prev => prev.map(c => c._id === updated._id ? updated : c));
    }
  };

  const getPanelMode = (claim: Claim): 'verify' | 'view' | 'refund' => {
    if (department === 'account') return 'refund';
    const pendingStatuses: Record<string, string> = {
      mess: 'PENDING_MESS_MANAGER',
      hospital: 'PENDING_ACADEMIC',
      fest: 'VERIFIED_FEST',
    };
    if (claim.status === pendingStatuses[department]) return 'verify';
    return 'view';
  };

  const displayed = claims
    .filter(c => {
      const name = c.student?.fullName || c.studentName || '';
      const roll = c.student?.studentId || c.studentRoll || '';
      const q = search.toLowerCase();
      return !q || name.toLowerCase().includes(q) || roll.toLowerCase().includes(q) || c.claimId.toLowerCase().includes(q);
    })
    .filter(c => filterStatus === 'ALL' || c.status === filterStatus);

  const pendingKey: Record<string, string> = {
    mess: 'PENDING_MESS_MANAGER',
    hospital: 'PENDING_ACADEMIC',
    fest: 'VERIFIED_FEST',
    account: 'PUSHED_TO_ACCOUNTS',
  };
  const pendingCount = claims.filter(c => c.status === pendingKey[department]).length;
  const verifiedCount = claims.filter(c => ['VERIFIED_MESS', 'VERIFIED_MEDICAL', 'APPROVED', 'REFUNDED'].includes(c.status)).length;
  const totalAmount = displayed.reduce((s, c) => s + (c.effectiveAmount ?? c.amount), 0);

  const statusFilters: string[] = ({
    mess: ['ALL', 'PENDING_MESS_MANAGER', 'VERIFIED_MESS', 'APPROVED', 'REJECTED'],
    hospital: ['ALL', 'PENDING_ACADEMIC', 'VERIFIED_MEDICAL', 'APPROVED', 'REJECTED'],
    fest: ['ALL', 'VERIFIED_FEST', 'APPROVED', 'PUSHED_TO_ACCOUNTS', 'REJECTED'],
    account: ['ALL', 'PUSHED_TO_ACCOUNTS', 'REFUNDED'],
  } as Record<string, string[]>)[department] || ['ALL'];

  const statusLabelMap: Record<string, string> = {
    ALL: 'All',
    PENDING_MESS_MANAGER: 'Pending',
    PENDING_ACADEMIC: 'Pending',
    VERIFIED_MESS: 'Verified',
    VERIFIED_MEDICAL: 'Verified',
    VERIFIED_FEST: 'FC Verified',
    APPROVED: 'Approved',
    PUSHED_TO_ACCOUNTS: 'Ready to Refund',
    REJECTED: 'Rejected',
    REFUNDED: 'Refunded',
  };

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-5 max-w-5xl mx-auto">
      {selected && (
        <ClaimReviewPanel
          claim={selected}
          department={department}
          onClose={() => setSelected(null)}
          onVerify={handleVerify}
          onReject={handleReject}
          onRefund={handleRefund}
          mode={getPanelMode(selected)}
          secretaryId={secretary._id}
          secretaryName={secretary.fullName}
        />
      )}
      {rejectTarget && (
        <RejectModal
          claimId={rejectTarget}
          onConfirm={(id, reason, stage) => { handleReject(id, reason, stage); setRejectTarget(null); }}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{cfg.verifyLabel}</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {department === 'account'
              ? 'Claims approved and pushed by admin — process disbursements here.'
              : `Verify ${cfg.shortLabel.toLowerCase()} claims submitted by students.`
            }
          </p>
        </div>
        <button
          onClick={fetchClaims}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-slate-300 shadow-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {department === 'account' && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Inbox size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Read-only until pushed.</span>{' '}
            You only see claims that the central admin has approved and pushed to Accounts.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: department === 'account' ? 'To Disburse' : 'Pending Verification', value: pendingCount, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Processed', value: verifiedCount, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'Total ₹', value: `₹${totalAmount.toLocaleString()}`, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-3 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, roll no, claim ID..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${filterStatus === s ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              style={filterStatus === s ? { background: cfg.accent, borderColor: cfg.accent } : {}}
            >
              {statusLabelMap[s] || s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={24} className="animate-spin text-slate-300" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
          <AlertTriangle size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">No claims found</p>
          <p className="text-xs text-slate-300 mt-1">Try changing filters or refreshing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(claim => {
            const name = claim.student?.fullName || claim.studentName || '—';
            const roll = claim.student?.studentId || claim.studentRoll || '—';
            const date = claim.createdAt || claim.submittedAt || '';
            const amount = claim.effectiveAmount ?? claim.amount;
            const panelMode = getPanelMode(claim);
            const isActionable = panelMode !== 'view';

            return (
              <div
                key={claim._id}
                className={`bg-white border rounded-2xl p-4 transition-all ${isActionable ? 'border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer' : 'border-slate-100'}`}
                onClick={() => setSelected(claim)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-slate-100 text-slate-600">
                    {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{name}</p>
                      {isActionable && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.accentLight, color: cfg.accentDark }}>
                          {panelMode === 'refund' ? 'Refund Pending' : 'Action Required'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{claim.claimId} · {roll}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-base font-bold text-gray-900">₹{amount.toLocaleString()}</p>
                    <StatusBadge status={claim.status} />
                  </div>
                </div>

                {claim.description && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-1 leading-relaxed">{claim.description}</p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <FileText size={11} />
                    {claim.attachments.length} document{claim.attachments.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    {(claim.status === 'REJECTED' || claim.status === 'rejected') && (
                      <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <XCircle size={11} /> Rejected
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setSelected(claim); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
                      style={isActionable
                        ? { background: cfg.accentLight, color: cfg.accentDark, borderColor: cfg.accentLight }
                        : { background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }
                      }
                    >
                      <Eye size={12} /> {isActionable ? (panelMode === 'refund' ? 'Process' : 'Verify') : 'View'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Profile View ──────────────────────────────────────────────────────────────
export function SecretaryProfileView({ user, department, onSave }: {
  user: SecretaryUser;
  department: Department;
  onSave: (data: Partial<SecretaryUser>, newPassword?: string) => void;
}) {
  const cfg = deptConfig[department];
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    fullName: user.fullName, email: user.email, phone: user.phone,
    designation: user.designation,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const initials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    onSave(editData);
    setSaving(false);
    setEditMode(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-slate-800">My Profile</h2><p className="text-slate-500 text-sm mt-0.5">View and edit your account details</p></div>
        {success && <span className="text-green-600 text-sm font-semibold flex items-center gap-1"><CheckCircle size={14} /> Saved</span>}
      </div>

      <div className={`rounded-2xl p-6 text-white bg-gradient-to-r ${cfg.gradient} flex items-center gap-5`}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black bg-white/20 flex-shrink-0">{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold truncate">{user.fullName}</p>
          <p className="text-white/80 text-sm">{user.designation} · {cfg.label}</p>
          <p className="text-white/60 text-xs mt-0.5">{user.employeeId}</p>
        </div>
        {!editMode && (
          <button onClick={() => setEditMode(true)} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors flex-shrink-0">Edit</button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-700 text-sm">Personal Information</h3>
          {editMode && (
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-xs text-slate-500 bg-slate-100 rounded-lg font-semibold">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs text-white rounded-lg font-semibold disabled:opacity-60" style={{ background: cfg.accent }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {editMode ? (
            <>
              {[['fullName', 'Full Name', 'text'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel'], ['designation', 'Designation', 'text']].map(([key, label, type]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
                  <input type={type} value={(editData as any)[key]} onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': cfg.accent } as any} />
                </div>
              ))}
            </>
          ) : (
            [
              ['Full Name', user.fullName], ['Email', user.email], ['Phone', user.phone],
              ['Employee ID', user.employeeId], ['Designation', user.designation], ['Institution', user.institution],
              ['Member Since', new Date(user.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
              ['Last Login', new Date(user.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })],
            ].map(([label, value]) => (
              <div key={label} className="py-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5 break-words">{value}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => setShowPwd(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
          <h3 className="font-bold text-slate-700 text-sm">Change Password</h3>
          <span className="text-xs text-slate-400">{showPwd ? '▲ Hide' : '▼ Show'}</span>
        </button>
        {showPwd && (
          <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
            {[['current', 'Current Password'], ['newPwd', 'New Password'], ['confirm', 'Confirm New Password']].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
                <input type="password" value={(pwdForm as any)[key]} onChange={e => setPwdForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': cfg.accent } as any} />
              </div>
            ))}
            <button onClick={() => {
              if (pwdForm.newPwd === pwdForm.confirm && pwdForm.newPwd.length >= 8) {
                onSave({}, pwdForm.newPwd); setShowPwd(false); setPwdForm({ current: '', newPwd: '', confirm: '' });
              }
            }} className="px-5 py-2.5 text-white rounded-xl text-sm font-bold" style={{ background: cfg.accent }}>
              Update Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Student Search ────────────────────────────────────────────────────────────
export function StudentSearchInput({ placeholder, onSelect, className }: {
  placeholder: string;
  onSelect: (user: StudentUser) => void;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentUser[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/search?query=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {loading && <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20">
          {results.map(u => (
            <button key={u._id} onClick={() => { onSelect(u); setQuery(''); setResults([]); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0 first:rounded-t-xl last:rounded-b-xl">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{u.fullName}</p>
                <p className="text-xs text-slate-400">{u.studentId} · {u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
