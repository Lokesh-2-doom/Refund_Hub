import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, ChevronDown, Filter, Loader2,
  Clock, ArrowUpRight, FileText, Crown, Shield, User,
  AlertTriangle, Send, SortAsc, Info, Sparkles, BadgeCheck
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

// ─── Types ────────────────────────────────────────────────────────────────────

type Position = 'FEST_COORDINATOR' | 'COORDINATOR' | 'SUB_COORDINATOR';

type ClaimStatus =
  | 'PENDING_TEAM_COORD'
  | 'PENDING_COORD'
  | 'PENDING_FC'
  | 'VERIFIED_COORD'
  | 'VERIFIED_FEST'
  | 'APPROVED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'PUSHED_TO_ACCOUNTS';

interface VerificationRecord {
  verifiedBy: string;
  verifierName: string;
  verifiedAt: string;
  stage: 'COORDINATOR' | 'FEST_COORDINATOR';
  remarks?: string;
}

interface FestClaim {
  _id: string;
  claimId: string;
  student: {
    _id: string;
    fullName: string;
    email: string;
    studentId: string;
  };
  claimantPosition: Position;
  claimantCommittee: string;
  festId: string;
  festName: string;
  actorPosition: Position;
  actorFestMemberId?: string;
  amount: number;
  description: string;
  attachments: { url: string; filename: string; mimetype: string }[];
  status: ClaimStatus;
  verifications: VerificationRecord[];
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  rejectedAtStage?: string;
  createdAt: string;
  transactionId?: string;
}

interface Fest {
  _id: string;
  festName: string;
  academicYear: string;
}

interface VerifyReimbursementViewProps {
  currentUserPosition: Position;
  userFests: Fest[];
  currentUserId: string;
  currentUserName: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<Position, { label: string; color: string; bg: string; icon: typeof Crown }> = {
  FEST_COORDINATOR: { label: 'Fest Coordinator', color: 'text-amber-700', bg: 'bg-amber-50', icon: Crown },
  COORDINATOR:      { label: 'Coordinator',       color: 'text-violet-700', bg: 'bg-violet-50', icon: Shield },
  SUB_COORDINATOR:  { label: 'Sub Coordinator',   color: 'text-teal-700',   bg: 'bg-teal-50',   icon: User },
};

const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  PENDING_TEAM_COORD:  { label: 'Pending (Team Lead)',      color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-400' },
  PENDING_COORD:       { label: 'Pending (Coordinator)',    color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-400' },
  PENDING_FC:          { label: 'Pending (Fest Coord)',     color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-200', dot: 'bg-violet-400' },
  VERIFIED_COORD:      { label: 'Verified by Coordinator',  color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-400'   },
  VERIFIED_FEST:       { label: 'Verified by FC',           color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  dot: 'bg-green-500'  },
  APPROVED:            { label: 'Approved',                 color: 'text-green-800',  bg: 'bg-green-100',  border: 'border-green-300',  dot: 'bg-green-600'  },
  REJECTED:            { label: 'Rejected',                 color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',    dot: 'bg-red-500'    },
  REFUNDED:            { label: 'Refunded',                 color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-500' },
  PUSHED_TO_ACCOUNTS:  { label: 'Pushed to Accounts',       color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-500'   },
};

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['PENDING_COORD'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: Position }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon size={10} />{cfg.label}
    </span>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({
  claimId, onConfirm, onCancel,
}: {
  claimId: string;
  onConfirm: (id: string, reason: string) => void;
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
            <p className="text-xs text-gray-500">A reason is required to reject</p>
          </div>
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Describe why this claim is being rejected (e.g., receipt unclear, amount mismatch, duplicate submission)..."
          rows={4}
          className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none bg-red-50 placeholder-red-300 text-gray-700"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(claimId, reason.trim()); }}
            disabled={!reason.trim()}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Verify Remarks Modal ─────────────────────────────────────────────────────

function VerifyModal({
  claim,
  actorPosition,
  onConfirm,
  onCancel,
}: {
  claim: FestClaim;
  actorPosition: Position;
  onConfirm: (id: string, remarks: string) => void;
  onCancel: () => void;
}) {
  const [remarks, setRemarks] = useState('');
  const isFC = actorPosition === 'FEST_COORDINATOR';
  const label = isFC ? 'Verify as Fest Coordinator' : 'Verify as Coordinator';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <BadgeCheck size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500">{claim.student.fullName} · ₹{claim.amount.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1 border border-gray-100">
          <div className="flex justify-between"><span className="text-gray-400">Claim ID</span><span className="font-mono font-semibold">{claim.claimId}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Committee</span><span className="font-semibold">{claim.claimantCommittee || '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="font-bold text-green-700">₹{claim.amount.toLocaleString()}</span></div>
        </div>
        <textarea
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="Add verification remarks (optional)..."
          rows={3}
          className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 resize-none bg-green-50/40 placeholder-gray-400 text-gray-700"
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(claim._id, remarks.trim())}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <BadgeCheck size={15} /> Confirm Verification
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Claim Card ───────────────────────────────────────────────────────────────

function ClaimCard({
  claim,
  currentUserPosition,
  onVerify,
  onReject,
  loading,
}: {
  claim: FestClaim;
  currentUserPosition: Position;
  onVerify: (claim: FestClaim) => void;
  onReject: (claimId: string) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  /**
   * Verification eligibility:
   * COORDINATOR → can verify SUB_COORDINATOR claims in PENDING_COORD
   * FEST_COORDINATOR → can verify:
   *   - COORDINATOR claims in PENDING_COORD (skip coord stage)
   *   - Any claim in PENDING_FC (after coord verified sub-coord)
   * Anyone can reject if claim is not already terminal
   */
  const canVerify = (() => {
    if (['APPROVED', 'REJECTED', 'REFUNDED', 'PUSHED_TO_ACCOUNTS', 'VERIFIED_FEST'].includes(claim.status)) return false;
    if (currentUserPosition === 'COORDINATOR') {
      return claim.claimantPosition === 'SUB_COORDINATOR' && ['PENDING_TEAM_COORD', 'PENDING_COORD'].includes(claim.status);
    }
    if (currentUserPosition === 'FEST_COORDINATOR') {
      return (
        (claim.claimantPosition === 'COORDINATOR' && ['PENDING_TEAM_COORD', 'PENDING_COORD'].includes(claim.status)) ||
        claim.status === 'PENDING_FC'
      );
    }
    return false;
  })();

  const canReject = !['APPROVED', 'REJECTED', 'REFUNDED', 'PUSHED_TO_ACCOUNTS'].includes(claim.status);

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${loading ? 'opacity-60 pointer-events-none' : 'hover:border-gray-200 hover:shadow-sm'} border-gray-100`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${ROLE_CONFIG[claim.claimantPosition].bg} ${ROLE_CONFIG[claim.claimantPosition].color}`}>
            {initials(claim.student.fullName)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900 truncate">{claim.student.fullName}</p>
              <RoleBadge role={claim.claimantPosition} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {claim.claimantCommittee || 'General'} · <span className="font-mono">{claim.claimId}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(claim.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <p className="text-base font-bold text-gray-900">₹{claim.amount.toLocaleString()}</p>
            <StatusBadge status={claim.status} />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed">{claim.description}</p>

        {/* Transaction ID if present */}
        {claim.transactionId && (
          <p className="text-xs text-gray-400 mt-1 font-mono">TXN: {claim.transactionId}</p>
        )}

        {/* Verification trail */}
        {claim.verifications && claim.verifications.length > 0 && (
          <div className="mt-3 space-y-1.5 bg-green-50 rounded-xl p-2.5 border border-green-100">
            {claim.verifications.map((v, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                <BadgeCheck size={12} className="text-green-500 shrink-0 mt-0.5" />
                <span>
                  Verified by{' '}
                  <span className="font-semibold text-gray-700">{v.verifierName}</span>
                  {' '}({v.stage === 'COORDINATOR' ? 'Coordinator' : 'Fest Coordinator'})
                  {v.remarks && <span className="italic text-gray-400"> · "{v.remarks}"</span>}
                  <span className="text-gray-400"> · {new Date(v.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Rejection info */}
        {claim.status === 'REJECTED' && (
          <div className="mt-2 bg-red-50 rounded-xl p-2.5 border border-red-100 space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold">
              <XCircle size={12} /> Rejected{claim.rejectedAtStage ? ` at stage: ${claim.rejectedAtStage}` : ''}
            </div>
            {claim.rejectedByName && (
              <p className="text-xs text-red-500">By <span className="font-medium">{claim.rejectedByName}</span></p>
            )}
            {claim.rejectionReason && (
              <p className="text-xs text-red-700 italic">"{claim.rejectionReason}"</p>
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
          >
            <FileText size={12} />
            {claim.attachments.length} attachment{claim.attachments.length !== 1 ? 's' : ''}
            <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex items-center gap-2">
            {canReject && (
              <button
                onClick={() => onReject(claim._id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <XCircle size={13} /> Reject
              </button>
            )}
            {canVerify && (
              <button
                onClick={() => onVerify(claim)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
              >
                <BadgeCheck size={13} /> Verify
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attachments */}
      {expanded && claim.attachments.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-600 mb-2">Attachments</p>
          <div className="flex flex-wrap gap-2">
            {claim.attachments.map((att, i) => (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-blue-600 hover:text-blue-700 hover:border-blue-300 transition-colors"
              >
                <FileText size={11} />
                {att.filename?.length > 20 ? att.filename.slice(0, 18) + '…' : (att.filename || `Receipt ${i + 1}`)}
                <ArrowUpRight size={10} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VerifyReimbursementView({
  currentUserPosition, userFests, currentUserId, currentUserName,
}: VerifyReimbursementViewProps) {
  const [claims, setClaims] = useState<FestClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFestId, setSelectedFestId] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'role'>('date');
  const [filterRole, setFilterRole] = useState<Position | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<ClaimStatus | 'ALL'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [verifyTarget, setVerifyTarget] = useState<FestClaim | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/verify/fest/claims?actorId=${currentUserId}`);
      if (res.ok) setClaims(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userFests.length === 1) setSelectedFestId(userFests[0]._id);
  }, [userFests]);

  useEffect(() => { fetchClaims(); }, [currentUserId]);

  // ── Verify handler ──
  const handleVerify = async (claim: FestClaim, remarks: string) => {
    setVerifyTarget(null);
    setActionLoading(claim._id);
    try {
      const isFC = currentUserPosition === 'FEST_COORDINATOR';
      const endpoint = isFC
        ? `/api/verify/fest/claims/${claim._id}/verify-fc`
        : `/api/verify/fest/claims/${claim._id}/verify-coord`;

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifierId: currentUserId,
          verifierName: currentUserName,
          remarks,
        }),
      });
      if (res.ok) {
        const { claim: updated } = await res.json();
        setClaims(prev => prev.map(c => c._id === updated._id
          ? { ...c, ...updated, claimantPosition: c.claimantPosition, claimantCommittee: c.claimantCommittee, festName: c.festName }
          : c
        ));
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reject handler ──
  const handleReject = async (claimId: string, reason: string) => {
    setRejectTargetId(null);
    setActionLoading(claimId);
    try {
      const res = await fetch(`${BASE_URL}/api/verify/claims/${claimId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectedBy: currentUserId,
          rejectedByName: currentUserName,
          rejectionReason: reason,
          stage: currentUserPosition,
        }),
      });
      if (res.ok) {
        const { claim: updated } = await res.json();
        setClaims(prev => prev.map(c => c._id === updated._id
          ? { ...c, ...updated, claimantPosition: c.claimantPosition, claimantCommittee: c.claimantCommittee }
          : c
        ));
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ── Filtering & Sorting ──
  let displayed = claims
    .filter(c => selectedFestId === 'ALL' || c.festId === selectedFestId)
    .filter(c => filterRole === 'ALL' || c.claimantPosition === filterRole)
    .filter(c => filterStatus === 'ALL' || c.status === filterStatus);

  // Coordinators only see sub-coordinator claims
  if (currentUserPosition === 'COORDINATOR') {
    displayed = displayed.filter(c => c.claimantPosition === 'SUB_COORDINATOR');
  }

  if (sortBy === 'amount') displayed = [...displayed].sort((a, b) => b.amount - a.amount);
  else if (sortBy === 'role') {
    const order: Record<Position, number> = { FEST_COORDINATOR: 0, COORDINATOR: 1, SUB_COORDINATOR: 2 };
    displayed = [...displayed].sort((a, b) => order[a.claimantPosition] - order[b.claimantPosition]);
  } else {
    displayed = [...displayed].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const pendingCount = claims.filter(c =>
    c.status === 'PENDING_TEAM_COORD' || c.status === 'PENDING_COORD' || c.status === 'PENDING_FC'
  ).length;
  const verifiedCount = claims.filter(c =>
    c.status === 'VERIFIED_FEST' || c.status === 'VERIFIED_COORD'
  ).length;
  const totalAmount = claims
    .filter(c => !['REJECTED'].includes(c.status))
    .reduce((s, c) => s + c.amount, 0);

  const availableRoleFilters: (Position | 'ALL')[] = currentUserPosition === 'FEST_COORDINATOR'
    ? ['ALL', 'COORDINATOR', 'SUB_COORDINATOR']
    : ['SUB_COORDINATOR'];

  const filterableStatuses: (ClaimStatus | 'ALL')[] = [
    'ALL', 'PENDING_TEAM_COORD', 'PENDING_COORD', 'PENDING_FC', 'VERIFIED_COORD', 'VERIFIED_FEST', 'APPROVED', 'REJECTED',
  ];

  // Group claims by fest
  const festGroups = displayed.reduce((acc, c) => {
    const key = c.festName || 'Unknown Fest';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, FestClaim[]>);

  return (
    <div className="space-y-6">
      {/* Modals */}
      {verifyTarget && (
        <VerifyModal
          claim={verifyTarget}
          actorPosition={currentUserPosition}
          onConfirm={(id, remarks) => handleVerify(verifyTarget, remarks)}
          onCancel={() => setVerifyTarget(null)}
        />
      )}
      {rejectTargetId && (
        <RejectModal
          claimId={rejectTargetId}
          onConfirm={handleReject}
          onCancel={() => setRejectTargetId(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Reimbursements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <RoleBadge role={currentUserPosition} />
            {' '}· {userFests.map(f => f.festName).join(', ')}
          </p>
        </div>
        <button
          onClick={fetchClaims}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-300 shadow-sm transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
          Refresh
        </button>
      </div>

      {/* Info banner for FC */}
      {currentUserPosition === 'FEST_COORDINATOR' && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">As Fest Coordinator</span>, you can verify both Coordinator and Sub-Coordinator claims.
            Coordinator claims can be verified directly by you — they skip the coordinator verification stage.
            You can also reject any claim at any point.
          </p>
        </div>
      )}
      {currentUserPosition === 'COORDINATOR' && (
        <div className="flex items-start gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
          <Info size={15} className="text-violet-600 shrink-0 mt-0.5" />
          <p className="text-xs text-violet-700">
            <span className="font-semibold">As Coordinator</span>, you can verify Sub-Coordinator claims.
            After your verification, claims move to the Fest Coordinator for final verification.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: pendingCount, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Verified', value: verifiedCount, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'Total ₹', value: `₹${totalAmount.toLocaleString()}`, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-3 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {userFests.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Fest Scope</label>
          <select
            value={selectedFestId}
            onChange={e => setSelectedFestId(e.target.value)}
            className="w-full sm:w-auto min-w-[240px] px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="ALL">All Eligible Fests</option>
            {userFests.map(f => (
              <option key={f._id} value={f._id}>
                {f.festName} ({f.academicYear})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Filter size={12} /> Filter:
        </div>

        {currentUserPosition === 'FEST_COORDINATOR' && availableRoleFilters.map(r => (
          <button
            key={r}
            onClick={() => setFilterRole(r as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              filterRole === r ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {r === 'ALL' ? 'All Roles' : ROLE_CONFIG[r as Position].label}
          </button>
        ))}

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {filterableStatuses.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              filterStatus === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {s === 'ALL' ? 'All Status' : STATUS_CONFIG[s as ClaimStatus]?.label || s}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <SortAsc size={12} />
          {(['date', 'amount', 'role'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === s ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Claims list — grouped by fest */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-green-500" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <AlertTriangle size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">No reimbursements found</p>
          <p className="text-xs text-gray-400 mt-1">Try changing the filters above</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(festGroups).map(([festName, festClaims]) => (
            <div key={festName}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-amber-500" />
                <h2 className="text-sm font-bold text-gray-700">{festName}</h2>
                <span className="text-xs text-gray-400">({festClaims.length} claim{festClaims.length !== 1 ? 's' : ''})</span>
              </div>
              <div className="space-y-3">
                {festClaims.map(claim => (
                  <ClaimCard
                    key={claim._id}
                    claim={claim}
                    currentUserPosition={currentUserPosition}
                    onVerify={setVerifyTarget}
                    onReject={setRejectTargetId}
                    loading={actionLoading === claim._id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VerifyReimbursementView;
