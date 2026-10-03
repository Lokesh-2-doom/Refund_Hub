import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Search, ChevronDown, Crown, Shield, User,
  X, Check, AlertCircle, Loader2, Building2, GraduationCap,
  Filter, ChevronUp, Users
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

// ─── Types ────────────────────────────────────────────────────────────────────

type Position = 'FEST_COORDINATOR' | 'COORDINATOR' | 'SUB_COORDINATOR';

interface FestMember {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    studentId: string;
  };
  fest: string;
  position: Position;
  committee: string | null;
  academicYear: string;
  addedBy: string;
  isActive: boolean;
  createdAt: string;
}

interface Fest {
  _id: string;
  festName: string;
  academicYear: string;
}

interface StudentSearchResult {
  _id: string;
  fullName: string;
  email: string;
  studentId: string;
  department?: string;
}

interface ManageTeamViewProps {
  currentUserPosition: Position;
  userFests: Fest[];
  currentUserId: string;
  currentUserRollNo: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_OPTIONS = [
  "Media & Public Relations",
  "Marketing & Sponsorship",
  "Events & Management",
  "Web & App Development",
  "Creatives & Design",
  "Logistics & Operations",
  "Registration Security & Planning",
  "Hospitality",
  "Production",
  "Flagship",
  "Other"
];

// ─── Year Calculation ─────────────────────────────────────────────────────────

function getAcademicYear(rollNo: string): number {
  if (!rollNo || rollNo.length < 2) return 0;
  const admissionYear = 2000 + parseInt(rollNo.slice(0, 2), 10);
  const eligibilityStart = new Date(admissionYear, 3, 1);
  const now = new Date();
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  const yearsElapsed = (now.getTime() - eligibilityStart.getTime()) / msPerYear;
  if (yearsElapsed < 0) return 0;
  return Math.floor(yearsElapsed) + 1;
}

function getEligiblePositions(rollNo: string): Position[] {
  const yr = getAcademicYear(rollNo);
  if (yr === 3) return ['COORDINATOR', 'SUB_COORDINATOR'];
  if (yr === 2) return ['SUB_COORDINATOR'];
  return [];
}

// ─── Role Config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<Position, {
  label: string; color: string; bg: string; border: string;
  icon: typeof Crown; rank: number; pill: string; dot: string;
}> = {
  FEST_COORDINATOR: {
    label: 'Fest Coordinator', color: 'text-amber-700', bg: 'bg-amber-50',
    border: 'border-amber-200', icon: Crown, rank: 3,
    pill: 'bg-amber-100 text-amber-700 border border-amber-200',
    dot: 'bg-amber-400',
  },
  COORDINATOR: {
    label: 'Coordinator', color: 'text-violet-700', bg: 'bg-violet-50',
    border: 'border-violet-200', icon: Shield, rank: 2,
    pill: 'bg-violet-100 text-violet-700 border border-violet-200',
    dot: 'bg-violet-400',
  },
  SUB_COORDINATOR: {
    label: 'Sub Coordinator', color: 'text-teal-700', bg: 'bg-teal-50',
    border: 'border-teal-200', icon: User, rank: 1,
    pill: 'bg-teal-100 text-teal-700 border border-teal-200',
    dot: 'bg-teal-400',
  },
};

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function RolePill({ role }: { role: Position }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.pill}`}>
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

function CommitteePill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      <Building2 size={9} />
      {name}
    </span>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({ onClose, onAdd, fest, currentUserPosition }: {
  onClose: () => void;
  onAdd: (data: { userId: string; position: Position; committee: string }) => Promise<void>;
  fest: Fest;
  currentUserPosition: Position;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [selected, setSelected] = useState<StudentSearchResult | null>(null);
  const [position, setPosition] = useState<Position>('SUB_COORDINATOR');
  const [committee, setCommittee] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assignableByRole: Position[] = (() => {
    if (currentUserPosition === 'FEST_COORDINATOR') return ['COORDINATOR', 'SUB_COORDINATOR'];
    if (currentUserPosition === 'COORDINATOR') return ['SUB_COORDINATOR'];
    return [];
  })();

  const assignablePositions = (student: StudentSearchResult | null): Position[] => {
    if (!student) return assignableByRole;
    const eligible = getEligiblePositions(student.studentId);
    return assignableByRole.filter(p => eligible.includes(p));
  };

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${BASE_URL}/api/users/search?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : [data]);
        } else { setResults([]); }
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
  }, [query]);

  const handleSelectStudent = (s: StudentSearchResult) => {
    setSelected(s);
    const eligible = assignablePositions(s);
    if (eligible.length > 0) setPosition(eligible[0]);
    setStep(2);
  };

  const handleAdd = async () => {
    if (!selected || !committee.trim()) { setError('Please fill all fields.'); return; }
    const eligible = assignablePositions(selected);
    if (!eligible.includes(position)) {
      setError(`This student is not eligible for ${ROLE_CONFIG[position].label} based on their academic year.`);
      return;
    }
    setSubmitting(true); setError('');
    try {
      await onAdd({ userId: selected._id, position, committee });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to add member.');
    } finally { setSubmitting(false); }
  };

  const eligiblePositions = assignablePositions(selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Team Member</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{fest.festName} · Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Search by Email, Roll No, or Name</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="e.g. 2401CS001 or student@..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
                  {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
                </div>
              </div>
              {results.length > 0 && (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {results.map(s => {
                    const yr = getAcademicYear(s.studentId);
                    const eligible = getEligiblePositions(s.studentId);
                    const canAssign = assignableByRole.some(p => eligible.includes(p));
                    return (
                      <button key={s._id} onClick={() => canAssign && handleSelectStudent(s)} disabled={!canAssign}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${!canAssign ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">{initials(s.fullName)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.fullName}</p>
                          <p className="text-xs text-gray-500 truncate">{s.studentId} · {s.department}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-right">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{yr > 0 ? `${yr}${['st', 'nd', 'rd'][yr - 1] ?? 'th'} yr` : '?'}</span>
                          {!canAssign && <span className="text-xs text-red-400 font-medium">Ineligible</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {query.length > 1 && !searching && results.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No students found</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 shrink-0">{initials(selected!.fullName)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{selected!.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{selected!.studentId} · {selected!.email}</p>
                  <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 truncate">
                    <GraduationCap size={10} /> {getAcademicYear(selected!.studentId)}yr
                  </span>
                </div>
                <button onClick={() => { setStep(1); setSelected(null); }} className="text-xs text-green-600 hover:underline shrink-0 whitespace-nowrap">Change</button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Assign Position</label>
                {eligiblePositions.length === 0 ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertCircle size={13} />Not eligible for any assignable position.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {eligiblePositions.map(p => {
                      const cfg = ROLE_CONFIG[p]; const Icon = cfg.icon;
                      return (
                        <button key={p} onClick={() => setPosition(p)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left min-w-0 ${position === p ? `${cfg.border} ${cfg.bg}` : 'border-gray-100 hover:border-gray-200'}`}>
                          <Icon size={16} className={`${position === p ? cfg.color : 'text-gray-400'} shrink-0`} />
                          <span className={`text-sm font-medium truncate ${position === p ? cfg.color : 'text-gray-600'}`}>{cfg.label}</span>
                          {position === p && <Check size={14} className={`${cfg.color} ml-auto shrink-0`} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Committee</label>
                <select value={committee} onChange={e => setCommittee(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white text-gray-900">
                  <option value="">Select committee...</option>
                  {TEAM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5 border-t border-gray-100 shrink-0">
          {step === 2 && <button onClick={() => setStep(1)} className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Back</button>}
          {step === 2 && (
            <button onClick={handleAdd} disabled={submitting || eligiblePositions.length === 0}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Member
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Remove Confirm ───────────────────────────────────────────────────────────

function RemoveConfirmDialog({ member, onConfirm, onCancel }: {
  member: FestMember; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Remove Member</h3>
            <p className="text-sm text-gray-500 mt-1">
              Remove <span className="font-semibold text-gray-700">{member.user.fullName}</span> ({ROLE_CONFIG[member.position].label}) from the fest team?
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">Remove</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SortField = 'name' | 'roll' | 'position' | 'committee';
type SortDir = 'asc' | 'desc';

export function ManageTeamView({ currentUserPosition, userFests, currentUserId, currentUserRollNo }: ManageTeamViewProps) {
  const [selectedFest, setSelectedFest] = useState<Fest | null>(userFests[0] || null);
  const [members, setMembers] = useState<FestMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [festDropdownOpen, setFestDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [removeTarget, setRemoveTarget] = useState<FestMember | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [filterPosition, setFilterPosition] = useState<Position | 'ALL'>('ALL');
  const [filterCommittee, setFilterCommittee] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    if (!selectedFest) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/fest-members?festId=${selectedFest._id}`);
        if (res.ok) setMembers(await res.json());
      } finally { setLoading(false); }
    };
    load();
  }, [selectedFest]);

  const canRemoveMember = (member: FestMember) => {
    if (member.user._id === currentUserId) return false;
    return ROLE_CONFIG[currentUserPosition].rank > ROLE_CONFIG[member.position].rank;
  };

  const handleAdd = async (data: { userId: string; position: Position; committee: string }) => {
    if (!selectedFest) return;
    const res = await fetch(`${BASE_URL}/api/fest-members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.userId, festId: selectedFest._id,
        position: data.position, committee: data.committee,
        addedBy: currentUserId, academicYear: selectedFest.academicYear,
      }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Failed to add member'); }
    const newMember = await res.json();
    setMembers(prev => [...prev, newMember]);
  };

  const handleRemove = async (member: FestMember) => {
    setRemoveLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/fest-members/${member._id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removedBy: currentUserId }),
      });
      if (res.ok) { setMembers(prev => prev.filter(m => m._id !== member._id)); setRemoveTarget(null); }
    } finally { setRemoveLoading(false); }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const visiblePositions: Position[] = currentUserPosition === 'FEST_COORDINATOR'
    ? ['FEST_COORDINATOR', 'COORDINATOR', 'SUB_COORDINATOR']
    : ['COORDINATOR', 'SUB_COORDINATOR'];

  const presentCommittees = Array.from(new Set(
    members.filter(m => visiblePositions.includes(m.position)).map(m => m.committee).filter(Boolean)
  )) as string[];

  // This ensures 'm' exists and 'm.user' exists before doing anything else
  let filtered = members.filter(m => m && m.user && visiblePositions.includes(m.position));
  if (filterPosition !== 'ALL') filtered = filtered.filter(m => m.position === filterPosition);
  if (filterCommittee !== 'ALL') filtered = filtered.filter(m => m.committee === filterCommittee);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(m =>
      m.user.fullName.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      m.user.studentId.toLowerCase().includes(q) ||
      (m.committee ?? '').toLowerCase().includes(q)
    );
  }

  const positionOrder: Record<Position, number> = { FEST_COORDINATOR: 0, COORDINATOR: 1, SUB_COORDINATOR: 2 };
  filtered = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.user.fullName.localeCompare(b.user.fullName);
    else if (sortField === 'roll') cmp = a.user.studentId.localeCompare(b.user.studentId);
    else if (sortField === 'position') cmp = positionOrder[a.position] - positionOrder[b.position];
    else if (sortField === 'committee') cmp = (a.committee ?? '').localeCompare(b.committee ?? '');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const fcCount = members.filter(m => m.position === 'FEST_COORDINATOR').length;
  const coordCount = members.filter(m => m.position === 'COORDINATOR').length;
  const subCount = members.filter(m => m.position === 'SUB_COORDINATOR').length;
  const canAdd = currentUserPosition === 'FEST_COORDINATOR' || currentUserPosition === 'COORDINATOR';

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={11} className="text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-green-600" />
      : <ChevronDown size={11} className="text-green-600" />;
  };

  const yrLabels: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">{selectedFest?.festName} · {selectedFest?.academicYear}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {userFests.length > 1 && (
            <div className="relative">
              <button onClick={() => setFestDropdownOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-gray-300 shadow-sm transition-colors max-w-xs sm:max-w-none">
                <span className="truncate">{selectedFest?.festName || 'Select Fest'}</span>
                <ChevronDown size={10} className={`transition-transform shrink-0 ${festDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {festDropdownOpen && (
                <div className="absolute left -2 top-full mt-2 bg-white border border-gray-150 rounded-xl shadow-lg z-10 min-w-[150px] overflow-hidden">
                  {userFests.map((f, idx) => (
                    <button key={f._id} onClick={() => { setSelectedFest(f); setFestDropdownOpen(false); }}
                      className={`w-full text-center px-4 py-3 text-sm transition-colors ${selectedFest?._id === f._id ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <span className="inline-flex items-center gap-2 justify-center">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedFest?._id === f._id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {idx + 1}
                        </span>
                        <span>{f.festName}</span>
                      </span>
                      <span className="text-xs text-gray-400 block mt-0.5">{f.academicYear}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {canAdd && (
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
              <Plus size={16} /> Add Member
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { pos: 'FEST_COORDINATOR' as Position, count: fcCount },
          { pos: 'COORDINATOR' as Position, count: coordCount },
          { pos: 'SUB_COORDINATOR' as Position, count: subCount },
        ]).map(({ pos, count }) => {
          const cfg = ROLE_CONFIG[pos];
          const Icon = cfg.icon;
          return (
            <button key={pos}
              onClick={() => setFilterPosition(filterPosition === pos ? 'ALL' : pos)}
              className={`${filterPosition === pos ? `${cfg.bg} ${cfg.border} border-2` : 'bg-white border border-gray-200 hover:border-gray-300'} rounded-2xl p-3 flex items-center gap-3 transition-all shadow-sm`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <Icon size={18} className={cfg.color} />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className={`text-xl font-bold leading-none ${cfg.color}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters + Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, roll no, email or committee..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
        </div>

        {presentCommittees.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="flex items-center gap-1 text-xs text-gray-400 font-medium shrink-0">
              <Filter size={11} /> Committee:
            </span>
            <button onClick={() => setFilterCommittee('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${filterCommittee === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
              All
            </button>
            {presentCommittees.map(c => (
              <button key={c} onClick={() => setFilterCommittee(filterCommittee === c ? 'ALL' : c)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${filterCommittee === c ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                {c}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">{filtered.length} shown</span>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-green-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <Users size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">No members found</p>
          <p className="text-xs text-gray-300 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <div className="w-full">
              {/* Table header */}
              <div className="grid grid-cols-[3rem_2fr_1fr_1.2fr_1.5fr_3rem] gap-x-4 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                <div />
                {([
                  { label: 'Name', field: 'name' as SortField },
                  { label: 'Roll No', field: 'roll' as SortField },
                  { label: 'Role', field: 'position' as SortField },
                  { label: 'Committee', field: 'committee' as SortField },
                ]).map(col => (
                  <button key={col.field} onClick={() => handleSort(col.field)}
                    className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors text-left">
                    {col.label} <SortIcon field={col.field} />
                  </button>
                ))}
                <div />
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-50">
                {filtered.map(member => {
                  if (!member || !member.user) return null;
                  const cfg = ROLE_CONFIG[member.position];
                  const yr = getAcademicYear(member.user.studentId);
                  return (
                    <div key={member._id}
                      className="grid grid-cols-[2.5rem_1.5fr_1fr_1.2fr_1.2fr_2.5rem] gap-x-4 px-4 py-3 items-center hover:bg-gray-50/60 transition-colors group">
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${cfg.bg} ${cfg.color}`}>
                        {initials(member.user.fullName)}
                      </div>
                      {/* Name */}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{member.user.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                      </div>
                      {/* Roll + year */}
                      <div className="min-w-0">
                        <p className="text-sm font-mono text-gray-700 truncate">{member.user.studentId}</p>
                        {yr > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <GraduationCap size={10} />{yrLabels[yr] ?? `${yr}th`} yr
                          </span>
                        )}
                      </div>
                      {/* Role */}
                      <div><RolePill role={member.position} /></div>
                      {/* Committee */}
                      <div>
                        {member.committee
                          ? <CommitteePill name={member.committee} />
                          : <span className="text-xs text-gray-300">—</span>}
                      </div>
                      {/* Remove */}
                      <div className="flex justify-center">
                        {canRemoveMember(member) && (
                          <button onClick={() => setRemoveTarget(member)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all sm:opacity-0 group-hover:opacity-100"
                            title="Remove member">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(member => {
              if (!member || !member.user) return null;
              const cfg = ROLE_CONFIG[member.position];
              const yr = getAcademicYear(member.user.studentId);
              return (
                <div key={member._id} className="p-4 space-y-3 hover:bg-gray-50/60 transition-colors">
                  {/* Header with avatar and name */}
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {initials(member.user.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{member.user.fullName}</p>
                      <p className="text-xs text-gray-500">{member.user.email}</p>
                    </div>
                    {canRemoveMember(member) && (
                      <button onClick={() => setRemoveTarget(member)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                        title="Remove member">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Roll No */}
                    <div>
                      <p className="text-gray-400 font-medium mb-0.5">Roll No</p>
                      <p className="font-mono text-gray-700">{member.user.studentId}</p>
                      {yr > 0 && (
                        <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                          <GraduationCap size={10} />{yrLabels[yr] ?? `${yr}th`} yr
                        </p>
                      )}
                    </div>

                    {/* Role */}
                    <div>
                      <p className="text-gray-400 font-medium mb-0.5">Role</p>
                      <div><RolePill role={member.position} /></div>
                    </div>
                  </div>

                  {/* Committee */}
                  {member.committee && (
                    <div className="text-xs">
                      <p className="text-gray-400 font-medium mb-0.5">Committee</p>
                      <CommitteePill name={member.committee} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {members.length} members</p>
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${ROLE_CONFIG.FEST_COORDINATOR.dot} inline-block`} />{fcCount} FC</span>
              <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${ROLE_CONFIG.COORDINATOR.dot} inline-block`} />{coordCount} Coord</span>
              <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${ROLE_CONFIG.SUB_COORDINATOR.dot} inline-block`} />{subCount} Sub</span>
            </div>
          </div>
        </div>
      )}

      {showAddModal && selectedFest && (
        <AddMemberModal fest={selectedFest} currentUserPosition={currentUserPosition}
          onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
      )}
      {removeTarget && (
        <RemoveConfirmDialog member={removeTarget}
          onConfirm={() => handleRemove(removeTarget)}
          onCancel={() => setRemoveTarget(null)} />
      )}
    </div>
  );
}