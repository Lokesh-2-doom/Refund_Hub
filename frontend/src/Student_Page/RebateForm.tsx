// ============================================================
//  ClaimFlow.tsx  –  Drop-in replacement for your 3 UI files
//  Combines: SelectCategoryModal + all Forms + Success screens
//  Features:
//    • Fest/Activity card only shown when isFestMember === true
//    • Admin settings (limits, rates, file size) fed via props
//    • Improved UI: refined card design, animated states, badges
// ============================================================

import { useState, useEffect } from 'react'
import {
  UtensilsCrossed, Ticket, Heart, X, CheckCircle, Star,
  Users, DollarSign, FileText, Clock, Eye, Calendar,
  AlertCircle, Info, AlertTriangle, Upload, Trash2,
  Receipt, Hash, Hospital, ChevronRight, Sparkles,
  ShieldCheck, Zap
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Admin Settings Type ──────────────────────────────────────
export interface AdminSettings {
  messRebateRateDaily: number;        // ₹/day
  maxFestReimbursement: number;       // ₹ cap
  maxMedicalReimbursement: number;    // ₹ cap
  maxMessRebateDays: number;          // max days allowed
  maxFileUploadMB: number;            // per-file limit
  autoApproveBelow: number;           // auto-approve threshold
  portalActive: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  claimExpiryDays: number;
  maxClaimsPerMonth: number;
}

export interface UserFest {
  festId: string;
  memberId?: string;
  festName: string;
  committee: string;
  position?: 'FEST_COORDINATOR' | 'COORDINATOR' | 'SUB_COORDINATOR';
}

export const DEFAULT_SETTINGS: AdminSettings = {
  messRebateRateDaily: 150,
  maxFestReimbursement: 5000,
  maxMedicalReimbursement: 10000,
  maxMessRebateDays: 30,
  maxFileUploadMB: 10,
  autoApproveBelow: 500,
  portalActive: true,
  maintenanceMode: false,
  maintenanceMessage: 'System is under maintenance. Please check back shortly.',
  claimExpiryDays: 90,
  maxClaimsPerMonth: 5,
};

// ─── Shared Types ─────────────────────────────────────────────
export interface MessRebateFormData {
  fromDate: Date | null;
  toDate: Date | null;
  reason: string;
  receiptFiles: File[];
}

export interface FestReimbursementFormData {
  festId: string;
  festMemberId?: string;
  festName: string;
  team: string;
  transactionId: string;
  expenseAmount: number;
  expenseDescription: string;
  receiptFiles: File[];
}

export interface MedicalRebateFormData {
  hospitalName: string;
  treatmentDate: Date | null;
  amount: number;
  description: string;
  billFiles: File[];
}

// ─── Shared File Upload Helper ────────────────────────────────
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function FileList({ files, onRemove, accentColor = 'green' }: {
  files: File[]; onRemove: (i: number) => void; accentColor?: string;
}) {
  if (!files.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Uploaded ({files.length})
      </p>
      {files.map((f, i) => (
        <div key={`${f.name}-${i}`}
          className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className={`w-9 h-9 bg-${accentColor}-50 rounded-lg flex items-center justify-center flex-shrink-0`}>
            <FileText size={17} className={`text-${accentColor}-600`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{f.name}</p>
            <p className="text-xs text-gray-400">{formatFileSize(f.size)}</p>
          </div>
          <button onClick={() => onRemove(i)}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={15} className="text-red-500" />
          </button>
        </div>
      ))}
    </div>
  );
}

function DropZone({ onFiles, maxMB, id, error, accentColor = 'green' }: {
  onFiles: (files: FileList) => void; maxMB: number; id: string;
  error?: string; accentColor?: string;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={e => { e.preventDefault(); setDrag(false); }}
        onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files) onFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all duration-200
          ${drag ? `border-${accentColor}-500 bg-${accentColor}-50 scale-[1.01]`
            : error ? 'border-red-400 bg-red-50'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'}`}
      >
        <div className="flex flex-col items-center gap-2.5">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center
            ${drag ? `bg-${accentColor}-100` : 'bg-white shadow-sm'}`}>
            <Upload size={22} className={drag ? `text-${accentColor}-600` : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Drop files here or browse</p>
            <p className="text-xs text-gray-400 mt-0.5">JPG · PNG · PDF — max {maxMB}MB each</p>
          </div>
          <input type="file" multiple accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={e => e.target.files && onFiles(e.target.files)}
            className="hidden" id={id} />
          <label htmlFor={id}
            className={`px-5 py-1.5 bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white
              text-sm rounded-lg font-medium cursor-pointer transition-colors`}>
            Select Files
          </label>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

// ─── STEP 1: Select Category Modal ───────────────────────────

interface SelectCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (category: string) => void;
  isFestMember?: boolean;
  settings?: AdminSettings;
}

export function SelectCategoryModal({
  isOpen, onClose, onNext,
  isFestMember = false,
  settings = DEFAULT_SETTINGS
}: SelectCategoryModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!isOpen) return null;

  // Portal / maintenance guard
  if (settings.maintenanceMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Portal Under Maintenance</h2>
          <p className="text-gray-600 text-sm">{settings.maintenanceMessage}</p>
          <button onClick={onClose}
            className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!settings.portalActive) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Portal Inactive</h2>
          <p className="text-gray-600 text-sm">The claims portal is currently closed. Please check back later.</p>
          <button onClick={onClose}
            className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  const categories = [
    {
      id: 'mess-rebate',
      icon: UtensilsCrossed,
      title: 'Mess Rebate',
      subtitle: 'Absence-based refund',
      note: `Min. 5 days · ₹${settings.messRebateRateDaily}/day · Max ${settings.maxMessRebateDays} days`,
      color: 'emerald',
      badge: null,
    },
    ...(isFestMember ? [{
      id: 'fest-activity',
      icon: Ticket,
      title: 'Fest / Activity Reimbursement',
      subtitle: 'Volunteer expense claim',
      note: `Receipts required · Max ₹${settings.maxFestReimbursement.toLocaleString()}`,
      color: 'violet',
      badge: 'Fest Member',
    }] : []),
    {
      id: 'medical-rebate',
      icon: Heart,
      title: 'Medical Rebate',
      subtitle: 'Hospital & treatment bills',
      note: `Original bills required · Max ₹${settings.maxMedicalReimbursement.toLocaleString()}`,
      color: 'rose',
      badge: null,
    },
  ];

  const colorMap: Record<string, { ring: string; bg: string; icon: string; text: string; badge: string }> = {
    emerald: {
      ring: 'ring-emerald-500 bg-emerald-50/60',
      bg: 'bg-emerald-500',
      icon: 'text-emerald-600',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
    },
    violet: {
      ring: 'ring-violet-500 bg-violet-50/60',
      bg: 'bg-violet-500',
      icon: 'text-violet-600',
      text: 'text-violet-700',
      badge: 'bg-violet-100 text-violet-700',
    },
    rose: {
      ring: 'ring-rose-500 bg-rose-50/60',
      bg: 'bg-rose-500',
      icon: 'text-rose-600',
      text: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-700',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setSelected(null); onClose(); }} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">New Claim</h2>
              <p className="text-sm text-gray-500 mt-0.5">Select the type of rebate or reimbursement</p>
            </div>
            <button onClick={() => { setSelected(null); onClose(); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors -mt-1 -mr-1">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="p-5 space-y-3">
          {categories.map((cat) => {
            const c = colorMap[cat.color];
            const isSelected = selected === cat.id;
            return (
              <button key={cat.id} onClick={() => setSelected(cat.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150
                  ${isSelected ? `ring-2 ${c.ring} border-transparent` : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isSelected ? c.bg : 'bg-gray-100'} transition-colors`}>
                    <cat.icon size={22} className={isSelected ? 'text-white' : c.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${isSelected ? c.text : 'text-gray-800'}`}>
                        {cat.title}
                      </span>
                      {cat.badge && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
                          <Star size={10} fill="currentColor" /> {cat.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{cat.note}</p>
                  </div>
                  <ChevronRight size={16} className={`flex-shrink-0 transition-colors ${isSelected ? c.icon : 'text-gray-300'}`} />
                </div>
              </button>
            );
          })}

          {/* Fest member hint when not a member */}
          {!isFestMember && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl">
              <Sparkles size={15} className="text-violet-500 flex-shrink-0" />
              <p className="text-xs text-violet-700">
                <span className="font-semibold">Fest reimbursement</span> is available exclusively to fest team members.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button onClick={() => { setSelected(null); onClose(); }}
            className="px-5 py-2.5 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={() => { if (selected) { onNext(selected); setSelected(null); } }}
            disabled={!selected}
            className="px-7 py-2.5 text-sm rounded-xl font-semibold transition-all
              disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
              bg-gray-900 hover:bg-gray-800 text-white shadow-sm">
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 2a: Mess Rebate Form ────────────────────────────────

interface MessRebateFormProps {
  isOpen: boolean; onClose: () => void; onBack: () => void;
  onSubmit: (data: MessRebateFormData) => void;
  settings?: AdminSettings;
}

export function MessRebateForm({ isOpen, onClose, onBack, onSubmit, settings = DEFAULT_SETTINGS }: MessRebateFormProps) {
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [durationError, setDurationError] = useState(false);

  if (!isOpen) return null;

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = format(tomorrow, 'yyyy-MM-dd');

  const days = fromDate && toDate
    ? Math.ceil(Math.abs(toDate.getTime() - fromDate.getTime()) / 86400000) + 1 : 0;

  const estimatedAmount = days >= 5 ? days * settings.messRebateRateDaily : 0;

  const handleFiles = (fl: FileList) => {
    const maxBytes = settings.maxFileUploadMB * 1024 * 1024;
    const valid = Array.from(fl).filter(f => {
      if (!['image/jpeg','image/jpg','image/png','application/pdf'].includes(f.type)) {
        alert(`${f.name}: invalid type`); return false;
      }
      if (f.size > maxBytes) { alert(`${f.name}: exceeds ${settings.maxFileUploadMB}MB`); return false; }
      return true;
    });
    setFiles(p => [...p, ...valid]);
  };

  const reset = () => { setFromDate(null); setToDate(null); setReason(''); setFiles([]); setErrors({}); setDurationError(false); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fromDate) e.from = 'From date is required';
    if (!toDate) e.to = 'To date is required';
    if (fromDate && toDate && fromDate > toDate) e.to = 'To date must be after from date';
    if (days > 0 && days < 5) { setDurationError(true); return false; }
    if (days > settings.maxMessRebateDays) e.to = `Exceeds max allowed days (${settings.maxMessRebateDays})`;
    if (!reason.trim()) e.reason = 'Reason is required';
    setErrors(e); return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                <UtensilsCrossed size={18} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mess Rebate Application</h2>
                <p className="text-xs text-gray-500">Rate: ₹{settings.messRebateRateDaily}/day · Max {settings.maxMessRebateDays} days</p>
              </div>
            </div>
            <button onClick={() => { reset(); onClose(); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Duration error */}
          {durationError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 text-sm">Minimum 5 days required</p>
                  <p className="text-xs text-red-700 mt-1">
                    Your selection is only <strong>{days} day{days !== 1 ? 's' : ''}</strong>.
                    Mess rebates require a minimum absence of 5 consecutive days.
                  </p>
                  <button onClick={() => { setDurationError(false); setFromDate(null); setToDate(null); }}
                    className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg">
                    Edit Dates
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notice */}
          {!durationError && (
            <div className="flex gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <AlertCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800">
                Rebates apply for absences of <strong>5+ days</strong>.
                Dates must start from <strong>tomorrow</strong> onward.
                Max allowed: <strong>{settings.maxMessRebateDays} days</strong>.
              </p>
            </div>
          )}

          {/* Dates */}
          <div className={durationError ? 'opacity-40 pointer-events-none' : ''}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Absence Period *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input type="date" value={fromDate ? format(fromDate, 'yyyy-MM-dd') : ''}
                  min={minDate}
                  onChange={e => {
                    const d = e.target.value ? new Date(e.target.value) : null;
                    setFromDate(d);
                    if (d && toDate && toDate < d) setToDate(d);
                    setErrors(p => ({ ...p, from: '' }));
                  }}
                  className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500
                    ${errors.from ? 'border-red-400' : 'border-gray-200'}`} />
                <p className="text-xs text-gray-400 mt-1">From</p>
                {errors.from && <p className="text-xs text-red-500">{errors.from}</p>}
              </div>
              <div>
                <input type="date" value={toDate ? format(toDate, 'yyyy-MM-dd') : ''}
                  min={fromDate ? format(fromDate, 'yyyy-MM-dd') : minDate}
                  onChange={e => {
                    setToDate(e.target.value ? new Date(e.target.value) : null);
                    setErrors(p => ({ ...p, to: '' }));
                  }}
                  className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500
                    ${errors.to ? 'border-red-400' : 'border-gray-200'}`} />
                <p className="text-xs text-gray-400 mt-1">To</p>
                {errors.to && <p className="text-xs text-red-500">{errors.to}</p>}
              </div>
            </div>

            {/* Duration pill */}
            {fromDate && toDate && days > 0 && !durationError && (
              <div className={`mt-2.5 flex items-center justify-between px-4 py-2.5 rounded-xl text-sm
                ${days >= 5 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                <span className={days >= 5 ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                  {days} day{days !== 1 ? 's' : ''} {days >= 5 ? '✓ Eligible' : '✗ Not eligible'}
                </span>
                {days >= 5 && (
                  <span className="text-emerald-600 font-semibold">
                    Est. ₹{estimatedAmount.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className={durationError ? 'opacity-40 pointer-events-none' : ''}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Reason for Absence *
            </label>
            <textarea value={reason}
              onChange={e => { setReason(e.target.value.slice(0, 500)); setErrors(p => ({ ...p, reason: '' })); }}
              placeholder="Describe your reason for absence from mess..."
              rows={3}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500
                ${errors.reason ? 'border-red-400' : 'border-gray-200'}`} />
            <div className="flex justify-between mt-1">
              {errors.reason ? <p className="text-xs text-red-500">{errors.reason}</p> : <span />}
              <p className="text-xs text-gray-400">{reason.length}/500</p>
            </div>
          </div>

          {/* Documents */}
          {!durationError && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Supporting Documents <span className="font-normal text-gray-400">(Optional)</span>
              </label>
              <DropZone onFiles={handleFiles} maxMB={settings.maxFileUploadMB}
                id="mess-upload" accentColor="emerald" />
              <FileList files={files} onRemove={i => setFiles(p => p.filter((_, idx) => idx !== i))}
                accentColor="emerald" />
            </div>
          )}

          {/* Guidelines */}
          {!durationError && (
            <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs font-semibold text-blue-800 mb-1.5">Required Documents</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc ml-4">
                <li>Leave application approved by hostel warden</li>
                <li>Travel tickets (if applicable)</li>
                <li>Any other supporting documentation</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center justify-between">
          <button onClick={onBack} className="px-5 py-2.5 text-sm text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors">
            ← Back
          </button>
          <button onClick={() => { if (validate()) { onSubmit({ fromDate, toDate, reason, receiptFiles: files }); reset(); } }}
            disabled={durationError}
            className="px-7 py-2.5 text-sm rounded-xl font-semibold bg-gray-900 hover:bg-gray-800 text-white
              disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm">
            Submit Claim
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 2b: Fest Reimbursement Form ────────────────────────
// ─── STEP 2b: Fest Reimbursement Form ────────────────────────

interface FestReimbursementFormProps {
  isOpen: boolean; onClose: () => void; onBack: () => void;
  onSubmit: (data: FestReimbursementFormData) => void;
  settings?: AdminSettings;
  userFests: UserFest[]; // We now pass the user's fests into the form
}

export function FestReimbursementForm({ isOpen, onClose, onBack, onSubmit, settings = DEFAULT_SETTINGS, userFests = [] }: FestReimbursementFormProps) {
  const [festId, setFestId] = useState('');
  const [festMemberId, setFestMemberId] = useState('');
  const [festName, setFestName] = useState('');
  const [committee, setCommittee] = useState('');
  const [position, setPosition] = useState('');
  const [txId, setTxId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-select if the user is only in 1 fest
  useEffect(() => {
    if (userFests.length === 1) {
      handleFestSelection(userFests[0].festId, userFests[0].memberId || '');
    }
  }, [userFests]);

  const handleFestSelection = (id: string, selectedMemberId = '') => {
    setFestId(id);
    const matches = userFests.filter(f => f.festId === id);
    const selected = matches.find(f => (f.memberId || '') === selectedMemberId) || matches[0];
    if (selected) {
      setFestMemberId(selected.memberId || '');
      setFestName(selected.festName);
      setCommittee(selected.committee);
      setPosition(selected.position || '');
      setErrors(p => ({ ...p, festId: '' }));
    } else {
      setFestMemberId('');
      setFestName('');
      setCommittee('');
      setPosition('');
    }
  };

  if (!isOpen) return null;

  const maxAmt = settings.maxFestReimbursement;

  const handleFiles = (fl: FileList) => {
    const maxBytes = settings.maxFileUploadMB * 1024 * 1024;
    const valid = Array.from(fl).filter(f => {
      if (!['image/jpeg','image/jpg','image/png','application/pdf'].includes(f.type)) { alert(`${f.name}: invalid type`); return false; }
      if (f.size > maxBytes) { alert(`${f.name}: exceeds ${settings.maxFileUploadMB}MB`); return false; }
      return true;
    });
    setFiles(p => [...p, ...valid]);
    setErrors(p => ({ ...p, receipts: '' }));
  };

  const selectedFestRoles = festId ? userFests.filter(f => f.festId === festId) : [];
  const needsRoleSelection = selectedFestRoles.length > 1;

  const reset = () => { setFestId(''); setFestMemberId(''); setFestName(''); setCommittee(''); setPosition(''); setTxId(''); setAmount(''); setDesc(''); setFiles([]); setErrors({}); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!festId) e.festId = 'Please select a fest';
    if (needsRoleSelection && !festMemberId) e.festMemberId = 'Please select the exact fest role';
    if (!txId.trim()) e.txId = 'Transaction ID is required';
    else if (!/^[A-Za-z0-9._/-]{6,30}$/.test(txId.trim())) e.txId = 'Enter a valid ref (6–30 chars)';
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Valid amount is required';
    else if (parseFloat(amount) > maxAmt) e.amount = `Exceeds max ₹${maxAmt.toLocaleString()}`;
    if (!desc.trim()) e.desc = 'Description is required';
    if (!files.length) e.receipts = 'At least one receipt is required';
    setErrors(e); return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                <Ticket size={18} className="text-violet-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">Fest Reimbursement</h2>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                    <Star size={9} fill="currentColor" /> Fest Member
                  </span>
                </div>
                <p className="text-xs text-gray-500">Max ₹{maxAmt.toLocaleString()} per claim</p>
              </div>
            </div>
            <button onClick={() => { reset(); onClose(); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-2.5 px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl">
            <AlertCircle size={15} className="text-violet-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet-800">
              Submit within <strong>30 days</strong> of expense. All receipts must be clear and legible.
              Maximum reimbursement: <strong>₹{maxAmt.toLocaleString()}</strong>.
            </p>
          </div>

          {/* Fest + Committee (Auto-filled) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fest *</label>
              <select 
                value={festId} 
                onChange={e => handleFestSelection(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white ${errors.festId ? 'border-red-400' : 'border-gray-200'}`}
              >
                <option value="" disabled>Select Fest</option>
                {Array.from(new Map(userFests.map(f => [f.festId, f])).values()).map(f => (
                  <option key={f.festId} value={f.festId}>{f.festName}</option>
                ))}
              </select>
              {errors.festId && <p className="text-xs text-red-500 mt-1">{errors.festId}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Role in Fest {needsRoleSelection ? '*' : '(Auto-filled)'}
              </label>
              <select
                value={festMemberId}
                onChange={e => handleFestSelection(festId, e.target.value)}
                disabled={!festId || !needsRoleSelection}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 ${errors.festMemberId ? 'border-red-400' : 'border-gray-200'}`}
              >
                {!festId ? (
                  <option value="">Select a fest first</option>
                ) : !needsRoleSelection ? (
                  <option value={festMemberId}>{position || 'Fest Member'}</option>
                ) : (
                  <>
                    <option value="">Select Role</option>
                    {selectedFestRoles.map(f => (
                      <option key={f.memberId || `${f.festId}-${f.position}-${f.committee}`} value={f.memberId}>
                        {f.position} - {f.committee || 'General'}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {errors.festMemberId && <p className="text-xs text-red-500 mt-1">{errors.festMemberId}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Committee (Auto-filled)</label>
              <input 
                type="text" 
                value={committee} 
                readOnly
                placeholder="Select a fest first"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed" 
              />
            </div>
          </div>

          {/* Amount + Tx ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₹</span>
                <input type="number" value={amount}
                  onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })); }}
                  placeholder="0.00" step="0.01" min="0" max={maxAmt}
                  className={`w-full pl-8 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.amount ? 'border-red-400' : 'border-gray-200'}`} />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
              {amount && parseFloat(amount) > 0 && parseFloat(amount) <= maxAmt && (
                <p className="text-xs text-gray-400 mt-1">
                  {parseFloat(amount) <= settings.autoApproveBelow ? (
                    <span className="text-emerald-600 font-medium">⚡ Auto-approve eligible</span>
                  ) : ''}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Transaction ID *</label>
              <input type="text" value={txId}
                onChange={e => { setTxId(e.target.value); setErrors(p => ({ ...p, txId: '' })); }}
                placeholder="UPI ref / bill no."
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.txId ? 'border-red-400' : 'border-gray-200'}`} />
              <p className="text-xs text-gray-400 mt-1">6–30 chars: letters, numbers, . _ / -</p>
              {errors.txId && <p className="text-xs text-red-500">{errors.txId}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description *</label>
            <textarea value={desc}
              onChange={e => { setDesc(e.target.value.slice(0, 500)); setErrors(p => ({ ...p, desc: '' })); }}
              placeholder="Describe the expense (e.g., printing posters for MPR team, buying materials...)"
              rows={3}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.desc ? 'border-red-400' : 'border-gray-200'}`} />
            <div className="flex justify-between mt-1">
              {errors.desc ? <p className="text-xs text-red-500">{errors.desc}</p> : <span />}
              <p className="text-xs text-gray-400">{desc.length}/500</p>
            </div>
          </div>

          {/* Upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Receipts / Bills * <span className="font-normal text-gray-400">(at least 1 required)</span>
            </label>
            <DropZone onFiles={handleFiles} maxMB={settings.maxFileUploadMB}
              id="fest-upload" error={errors.receipts} accentColor="violet" />
            <FileList files={files} onRemove={i => setFiles(p => p.filter((_, idx) => idx !== i))}
              accentColor="violet" />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center justify-between">
          <button onClick={onBack} className="px-5 py-2.5 text-sm text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors">
            ← Back
          </button>
          <button onClick={() => {
            if (validate()) {
              onSubmit({ festId, festMemberId, festName, team: committee, transactionId: txId, expenseAmount: parseFloat(amount), expenseDescription: desc, receiptFiles: files });
              reset();
            }
          }} className="px-7 py-2.5 text-sm rounded-xl font-semibold bg-gray-900 hover:bg-gray-800 text-white shadow-sm transition-colors">
            Submit Claim
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 2c: Medical Rebate Form ─────────────────────────────

interface MedicalRebateFormProps {
  isOpen: boolean; onClose: () => void; onBack: () => void;
  onSubmit: (data: MedicalRebateFormData) => void | Promise<void>;
  settings?: AdminSettings;
}

export function MedicalRebateForm({ isOpen, onClose, onBack, onSubmit, settings = DEFAULT_SETTINGS }: MedicalRebateFormProps) {
  const [hospital, setHospital] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const maxAmt = settings.maxMedicalReimbursement;

  const handleFiles = (fl: FileList) => {
    const maxBytes = settings.maxFileUploadMB * 1024 * 1024;
    const valid = Array.from(fl).filter(f => {
      if (!['image/jpeg','image/jpg','image/png','application/pdf'].includes(f.type)) { alert(`${f.name}: invalid type`); return false; }
      if (f.size > maxBytes) { alert(`${f.name}: exceeds ${settings.maxFileUploadMB}MB`); return false; }
      return true;
    });
    setFiles(p => [...p, ...valid]);
    setErrors(p => ({ ...p, bills: '' }));
  };

  const reset = () => { setHospital(''); setDate(null); setAmount(''); setDesc(''); setFiles([]); setErrors({}); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!hospital.trim()) e.hospital = 'Hospital name is required';
    if (!date) e.date = 'Treatment date is required';
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Valid amount is required';
    else if (parseFloat(amount) > maxAmt) e.amount = `Exceeds max ₹${maxAmt.toLocaleString()}`;
    if (!files.length) e.bills = 'At least one medical bill is required';
    setErrors(e); return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!submitting) { reset(); onClose(); } }} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                <Heart size={18} className="text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Medical Rebate</h2>
                <p className="text-xs text-gray-500">Max ₹{maxAmt.toLocaleString()} per semester</p>
              </div>
            </div>
            <button onClick={() => { if (!submitting) { reset(); onClose(); } }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-2.5 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl">
            <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rose-800">
              Claims are verified by the Health Center before settlement.
              Ensure all bills are <strong>genuine and in your name</strong>.
              Submit within <strong>30 days</strong> of treatment.
            </p>
          </div>

          {/* Hospital */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hospital / Clinic *</label>
            <input type="text" value={hospital}
              onChange={e => { setHospital(e.target.value); setErrors(p => ({ ...p, hospital: '' })); }}
              placeholder="e.g. City General Hospital"
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 ${errors.hospital ? 'border-red-400' : 'border-gray-200'}`} />
            {errors.hospital && <p className="text-xs text-red-500 mt-1">{errors.hospital}</p>}
          </div>

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Treatment Date *</label>
              <input type="date" value={date ? format(date, 'yyyy-MM-dd') : ''}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => { setDate(e.target.value ? new Date(e.target.value) : null); setErrors(p => ({ ...p, date: '' })); }}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 ${errors.date ? 'border-red-400' : 'border-gray-200'}`} />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bill Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₹</span>
                <input type="number" value={amount}
                  onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })); }}
                  placeholder="0.00" step="0.01" min="0" max={maxAmt}
                  className={`w-full pl-8 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 ${errors.amount ? 'border-red-400' : 'border-gray-200'}`} />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Treatment Details <span className="font-normal text-gray-400">(Optional)</span>
            </label>
            <textarea value={desc}
              onChange={e => setDesc(e.target.value.slice(0, 300))}
              placeholder="Brief description of the treatment or medical condition..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-rose-500" />
            <p className="text-xs text-gray-400 mt-1 text-right">{desc.length}/300</p>
          </div>

          {/* Upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Medical Bills *</label>
            <DropZone onFiles={handleFiles} maxMB={settings.maxFileUploadMB}
              id="med-upload" error={errors.bills} accentColor="rose" />
            <FileList files={files} onRemove={i => setFiles(p => p.filter((_, idx) => idx !== i))}
              accentColor="rose" />
          </div>

          {/* Guidelines */}
          <div className="px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl">
            <p className="text-xs font-semibold text-rose-800 mb-1.5">⚕️ Requirements</p>
            <ul className="text-xs text-rose-700 space-y-1 list-disc ml-4">
              <li>Original bills with hospital stamp and doctor's signature</li>
              <li>Emergency and planned treatments covered</li>
              <li>Prescription and medication bills must be included</li>
              <li>Insurance-covered treatments require claim settlement proof</li>
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center justify-between">
          <button onClick={onBack} disabled={submitting}
            className="px-5 py-2.5 text-sm text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">
            ← Back
          </button>
          <button disabled={submitting}
            onClick={async () => {
              if (validate()) {
                setSubmitting(true);
                try {
                  await onSubmit({ hospitalName: hospital, treatmentDate: date, amount: parseFloat(amount), description: desc, billFiles: files });
                  reset();
                } finally { setSubmitting(false); }
              }
            }}
            className="px-7 py-2.5 text-sm rounded-xl font-semibold bg-gray-900 hover:bg-gray-800 text-white shadow-sm transition-colors disabled:opacity-60">
            {submitting ? 'Uploading…' : 'Submit Claim'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3a: Fest Claim Success ──────────────────────────────

interface FestClaimSuccessProps {
  isOpen: boolean; onClose: () => void; onTrackStatus: () => void; onViewRecords: () => void;
  claimData: { claimId: string; teamName: string; amount: number; receiptsCount: number; submissionDate: Date; };
  settings?: AdminSettings;
}

export function FestClaimSuccess({ isOpen, onClose, onTrackStatus, onViewRecords, claimData, settings = DEFAULT_SETTINGS }: FestClaimSuccessProps) {
  if (!isOpen) return null;

  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const settlement = new Date(claimData.submissionDate);
  settlement.setDate(settlement.getDate() + 3);
  const autoApproved = claimData.amount <= settings.autoApproveBelow;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[95%] max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Top */}
        <div className="text-center pt-10 pb-5 px-6">
          <div className="flex justify-center mb-5">
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={48} strokeWidth={2} />
              </div>
              <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20" />
            </div>
          </div>
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-100 text-violet-800 text-xs font-bold rounded-full">
              <Star size={10} fill="currentColor" /> VOLUNTEER PRIORITY
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fest Claim Submitted!</h2>
          <p className="text-sm text-gray-500">Sent to Team Lead for verification</p>

          {autoApproved && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700 font-medium">
              <Zap size={13} className="text-emerald-500" /> Auto-approval eligible (under ₹{settings.autoApproveBelow})
            </div>
          )}

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <Clock size={13} /> Est. settlement: 2–3 business days
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 pb-4 space-y-3">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Claim Summary</p>
            <div className="bg-white border border-green-100 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-500 mb-0.5">Claim ID</p>
              <p className="text-xl font-bold text-green-700 font-mono">{claimData.claimId}</p>
              <p className="text-xs text-gray-400 mt-1">Save this for future reference</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white border border-gray-100 rounded-lg p-3 text-center">
                <DollarSign size={16} className="text-green-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Amount</p>
                <p className="font-bold text-green-700">₹{claimData.amount.toLocaleString()}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-lg p-3 text-center">
                <FileText size={16} className="text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Receipts</p>
                <p className="font-bold text-blue-700">{claimData.receiptsCount}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs py-2 border-t border-gray-100">
              <span className="text-gray-500">Team</span>
              <span className="font-semibold text-gray-800">{claimData.teamName}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-2 border-t border-gray-100">
              <span className="text-gray-500">Submitted</span>
              <span className="font-semibold text-gray-800">{fmt(claimData.submissionDate)}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-2 border-t border-gray-100">
              <span className="text-gray-500">Est. Settlement</span>
              <span className="font-semibold text-green-700">{fmt(settlement)}</span>
            </div>
          </div>

          {/* Verification steps */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-violet-800 mb-3">⭐ Verification Process</p>
            {[
              ['Lead Verification', 'Team lead reviews receipts (24 hrs)'],
              ['Admin Approval', 'Final amount verification (24 hrs)'],
              ['Payment', 'Transferred to your account (24 hrs)'],
            ].map(([title, sub], i) => (
              <div key={i} className="flex items-start gap-2.5 mb-2.5 last:mb-0">
                <div className="w-5 h-5 bg-violet-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="text-xs font-semibold text-violet-900">{title}</p>
                  <p className="text-xs text-violet-700">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 rounded-b-2xl space-y-2">
          <button onClick={onViewRecords}
            className="w-full bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-50 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
            <Eye size={16} /> View Digital Records
          </button>
          <button onClick={onTrackStatus}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
            Track Status
          </button>
          <button onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-800 py-2 text-sm font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3b: Generic Success Confirmation ────────────────────

interface SuccessConfirmationProps {
  isOpen: boolean; onClose: () => void; onTrackStatus: () => void;
  claimData: {
    claimId: string; type: string; amount?: number;
    fromDate?: Date | null; toDate?: Date | null; submissionDate: Date;
  };
  settings?: AdminSettings;
}

export function SuccessConfirmation({ isOpen, onClose, onTrackStatus, claimData, settings = DEFAULT_SETTINGS }: SuccessConfirmationProps) {
  if (!isOpen) return null;

  const fmt = (d?: Date | null) => d
    ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
  const days = claimData.fromDate && claimData.toDate
    ? Math.ceil(Math.abs(claimData.toDate.getTime() - claimData.fromDate.getTime()) / 86400000) + 1 : 0;
  const autoApproved = claimData.amount != null && claimData.amount <= settings.autoApproveBelow;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[95%] max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="text-center pt-10 pb-6 px-6">
          <div className="flex justify-center mb-5">
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={48} strokeWidth={2} />
              </div>
              <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Claim Submitted!</h2>
          <p className="text-sm text-gray-500">Your rebate is being processed</p>
          {autoApproved && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700 font-medium">
              <Zap size={13} className="text-emerald-500" /> Auto-approval eligible
            </div>
          )}
        </div>

        <div className="px-6 pb-5">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-1">
            <div className="bg-white border border-green-100 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-500 mb-0.5">Claim ID</p>
              <p className="text-xl font-bold text-green-700 font-mono">{claimData.claimId}</p>
              <p className="text-xs text-gray-400 mt-1">Save this for future reference</p>
            </div>

            {[
              ['Type', claimData.type],
              ...(days > 0 ? [[`Duration`, `${fmt(claimData.fromDate)} – ${fmt(claimData.toDate)} (${days} days)`]] : []),
              ...(claimData.amount != null ? [['Est. Amount', `₹${claimData.amount.toLocaleString('en-IN')}`]] : []),
              ['Submitted', fmt(claimData.submissionDate)],
            ].map(([label, value], i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs font-semibold text-gray-800">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-semibold text-blue-800 mb-1.5">📌 What happens next</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal ml-4">
              <li>Admin team reviews within 2–3 business days</li>
              <li>Email + dashboard updates at each stage</li>
              <li>Uploaded documents are attached to this claim</li>
            </ol>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 rounded-b-2xl space-y-2">
          <button onClick={onTrackStatus}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
            Track Status
          </button>
          <button onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-800 py-2 text-sm font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
