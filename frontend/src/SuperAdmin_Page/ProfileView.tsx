import { useEffect, useState } from "react";
import {
  User, Edit3, Save, X, Camera, Mail, Phone, Briefcase,
  Shield, Clock, Key, Eye, EyeOff, CheckCircle, AlertTriangle,
  Crown, Calendar, MapPin, RefreshCcw, LogOut,
} from 'lucide-react';
import { apiService } from '../services/db_service';
const API_BASE = '/api';

interface AdminProfile {
  _id: string; fullName: string; employeeId: string; email: string;
  phone: string; department: string; designation: string; institution: string;
  joinDate: string; lastLogin: string; isVerified: boolean; isSecretary: boolean;
  isSuperAdmin: boolean; avatarUrl?: string; address?: string; bio?: string; createdAt?: string;
}

// Mock — replace with real fetch
const mockProfile: AdminProfile = {
  _id: '69c529dfff7d0dd507258c82', fullName: 'Prof. Aditya Verma', employeeId: 'SA001',
  email: 'aditya.verma@institution.edu', phone: '9876543000',
  department: 'Administration', designation: 'Super Administrator',
  institution: 'Indian Institute of Technology Patna', joinDate: '2022-06-01',
  lastLogin: '2025-03-27T08:30:00Z', isVerified: true, isSecretary: false, isSuperAdmin: true,
  bio: 'Central administration oversight for the student welfare portal. Responsible for all departmental coordination and financial approvals.',
  address: 'Admin Block, NIT Campus, New Delhi - 110016',
};

interface PasswordForm { current: string; newPwd: string; confirm: string; }

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-700/40 last:border-0">
      <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-slate-200 text-sm font-semibold mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Editable Input ───────────────────────────────────────────────────────────
function EditableField({ label, value, onChange, type = 'text', placeholder = '', multiline = false, readOnly = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; multiline?: boolean; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => !readOnly && onChange(e.target.value)} readOnly={readOnly} rows={3}
          className={`w-full px-4 py-2.5 rounded-xl text-sm resize-none transition-colors border ${readOnly ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-slate-900 border-slate-700 text-white focus:ring-2 focus:ring-blue-500'}`} />
      ) : (
        <input type={type} value={value} onChange={e => !readOnly && onChange(e.target.value)} readOnly={readOnly}
          className={`w-full px-4 py-2.5 rounded-xl text-sm transition-colors border ${readOnly ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-slate-900 border-slate-700 text-white focus:ring-2 focus:ring-blue-500'}`} />
      )}
    </div>
  );
}

// ─── Success Toast ───────────────────────────────────────────────────────────
function SuccessToast({
  message,
  show,
  onClose,
}: {
  message: string;
  show: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed top-6 right-6 z-50 animate-slideIn">
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-green-400/30 shadow-xl px-5 py-3 rounded-2xl text-white">
        <CheckCircle className="text-green-400" size={22} />
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose}>
          <X size={18} className="opacity-70 hover:opacity-100" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProfileView({ onLogout }: { onLogout?: () => void }) {

  const [profile, setProfile] = useState<AdminProfile>(mockProfile);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<AdminProfile>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwdForm, setPwdForm] = useState<PasswordForm>({ current: '', newPwd: '', confirm: '' });
  const [pwdVisible, setPwdVisible] = useState({ current: false, new: false, confirm: false });
  const [pwdErrors, setPwdErrors] = useState<Partial<PasswordForm>>({});
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);  // ✅ ADD HERE
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  const mapAdminProfile = (data: any): AdminProfile => ({
    _id: data._id || storedUser._id || mockProfile._id,
    fullName: data.fullName || storedUser.fullName || mockProfile.fullName,
    employeeId: data.employeeId || data.studentId || storedUser.studentId || mockProfile.employeeId,
    email: data.email || storedUser.email || mockProfile.email,
    phone: data.phone || storedUser.phone || mockProfile.phone,
    department: data.department || storedUser.department || mockProfile.department,
    designation: data.designation || (data.isSuperAdmin || storedUser.isSuperAdmin ? 'Super Administrator' : mockProfile.designation),
    institution: data.institution || storedUser.institution || mockProfile.institution,
    joinDate: data.joinDate || data.createdAt || storedUser.createdAt || mockProfile.joinDate,
    lastLogin: data.lastLogin || storedUser.lastLogin || mockProfile.lastLogin,
    isVerified: data.isVerified ?? storedUser.isVerified ?? mockProfile.isVerified,
    isSecretary: data.isSecretary ?? storedUser.isSecretary ?? mockProfile.isSecretary,
    isSuperAdmin: data.isSuperAdmin ?? storedUser.isSuperAdmin ?? mockProfile.isSuperAdmin,
    avatarUrl: data.avatarUrl || data.profilePicUrl || storedUser.profilePicUrl,
    address: data.address || storedUser.address || mockProfile.address,
    bio: data.bio || storedUser.bio || mockProfile.bio,
    createdAt: data.createdAt || storedUser.createdAt || mockProfile.createdAt,
  });


  // Replace: useEffect(() => { fetch(`${API_BASE}/admin/profile`).then(r=>r.json()).then(setProfile) }, []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiService.getAdminProfile();
        setProfile(mapAdminProfile(data));
      } catch (error) {
        console.error("Failed to fetch admin profile", error);
        if (storedUser?._id) {
          try {
            const fallbackData = await apiService.getUserProfile(storedUser._id);
            setProfile(mapAdminProfile(fallbackData));
          } catch (fallbackError) {
            console.error("Failed to fetch logged-in admin profile", fallbackError);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Safe check for initials so it doesn't crash before data loads
  const initials = profile?.fullName
    ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';
  if (isLoading) return <div className="p-10 text-white">Loading Admin Profile...</div>;

  const startEdit = () => {
    setEditData({ fullName: profile.fullName, email: profile.email, phone: profile.phone, designation: profile.designation, institution: profile.institution, address: profile.address, bio: profile.bio });
    setEditMode(true);
  };

  const handleSave = async () => {
    // 🔴 NEW: Add 10-digit Phone Validation Here
    if (editData.phone) {
      // This regex checks that it is exactly 10 numbers (0-9) and nothing else
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(editData.phone)) {
        alert("Error: Phone number must be exactly 10 digits.");
        return; // This stops the code from saving!
      }
    }

    setIsSaving(true);
    try {
      const updatePayload = { ...editData };

      // Use your apiService to send data to the backend
      const updatedUser = await apiService.updateUserData(profile._id, updatePayload);

      setProfile(updatedUser.user || updatedUser);
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Save Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    const errors: Partial<PasswordForm> = {};
    if (!pwdForm.current) errors.current = 'Required';
    if (pwdForm.newPwd.length < 8) errors.newPwd = 'Min 8 characters';
    if (pwdForm.newPwd !== pwdForm.confirm) errors.confirm = 'Passwords do not match';
    if (Object.keys(errors).length) { setPwdErrors(errors); return; }

    setPwdSaving(true);
    try {
      // Use your apiService!
      await apiService.changePassword(profile._id, pwdForm.current, pwdForm.newPwd);

      setPwdForm({ current: '', newPwd: '', confirm: '' });
      setPwdErrors({});
      setShowPasswordForm(false);

      setShowToast(true); // ✅ THIS LINE ADDED
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setPwdSaving(false);
    }
  };

  const ef = (key: keyof AdminProfile) => (v: string) => setEditData(prev => ({ ...prev, [key]: v }));
  if (isLoading) {
    return <div className="p-8 text-white font-semibold">Loading Admin Profile...</div>;
  }
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">My Profile</h2>
          <p className="text-slate-400 text-sm mt-0.5">Manage your account information and security</p>
        </div> */}
        <div className="flex items-center gap-2 flex-wrap">
          {saveSuccess && (
            <div className="flex items-center gap-20 px-30 py-1.5 bg-green-500/10 border border-green-500/30 rounded-xl">
              <CheckCircle size={33} className="text-green-400" />
              <span className="text-green-400 text-xs font-medium">Profile updated</span>
            </div>
          )}
          {pwdSuccess && (
            <div className="flex items-center gap-20 px-30 py-1.5 bg-green-500/10 border border-green-500/30 rounded-xl">
              <CheckCircle size={33} className="text-green-400" />
              <span className="text-green-400 text-xs font-medium">Password changed</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Avatar + Name strip */}
      <div className="sm:hidden bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg ring-2 ring-slate-700">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-slate-800">
              <Camera size={11} className="text-white" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">{profile.fullName}</h3>
            <p className="text-slate-400 text-sm">{profile.designation}</p>
            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
              {profile.isSuperAdmin && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  <Crown size={10} /> Admin
                </span>
              )}
              {profile.isVerified && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                  <CheckCircle size={10} /> Verified
                </span>
              )}
            </div>
          </div>
        </div>
        {onLogout && (
          <button onClick={onLogout} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-medium transition-colors">
            <LogOut size={15} /> Sign Out
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left sidebar — hidden on mobile (shown above), visible on xl */}
        <div className="hidden xl:block xl:col-span-1 space-y-4">
          {/* Avatar card */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-xl ring-4 ring-slate-700">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center border-2 border-slate-800 transition-colors">
                  <Camera size={14} className="text-white" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-white">{profile.fullName}</h3>
            <p className="text-slate-400 text-sm mt-0.5">{profile.designation}</p>
            <p className="text-slate-500 text-xs mt-0.5">{profile.employeeId}</p>
            <div className="flex items-center justify-center flex-wrap gap-2 mt-3">
              {profile.isSuperAdmin && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                  <Crown size={11} /> Super Admin
                </span>
              )}
              {profile.isVerified && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/20">
                  <CheckCircle size={11} /> Verified
                </span>
              )}
            </div>
            {profile.bio && <p className="text-slate-500 text-xs mt-4 leading-relaxed text-left border-t border-slate-700 pt-4">{profile.bio}</p>}
          </div>

          {/* Quick Info */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-slate-300 mb-3">Quick Info</h4>
            <InfoRow icon={Calendar} label="Member Since" value={new Date(profile.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
            <InfoRow icon={Clock} label="Last Login" value={new Date(profile.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} />
            <InfoRow icon={Briefcase} label="Department" value={profile.department} />
            {/* {profile.address && <InfoRow icon={MapPin} label="Address" value={profile.address} />} */}
          </div>
        </div>

        {/* Main Content */}
        <div className="xl:col-span-2 space-y-4">

          {/* Personal Information */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-400" />
                <h3 className="font-bold text-slate-200 text-sm sm:text-base">Personal Information</h3>
              </div>
              {!editMode ? (
                <button onClick={startEdit} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  <Edit3 size={13} /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditMode(false)} className="flex items-center gap-1 text-xs sm:text-sm text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                    <X size={13} /> Cancel
                  </button>
                  <button onClick={handleSave} disabled={isSaving}
                    className="flex items-center gap-1.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-70">
                    {isSaving ? <RefreshCcw size={13} className="animate-spin" /> : <Save size={13} />}
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 sm:p-6">
              {!editMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <InfoRow icon={User} label="Full Name" value={profile.fullName} />
                  <InfoRow icon={Mail} label="Email" value={profile.email} />
                  <InfoRow icon={Phone} label="Phone" value={profile.phone} />
                  {/* <InfoRow icon={Briefcase} label="Designation" value={profile.designation} /> */}
                  <InfoRow icon={Shield} label="Institution" value={profile.institution} />
                  {/* {profile.address && <InfoRow icon={MapPin} label="Address" value={profile.address} />} */}
                  {/* {profile.bio && (
                    <div className="col-span-1 sm:col-span-2 py-3">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Bio</p>
                      <p className="text-slate-200 text-sm leading-relaxed">{profile.bio}</p>
                    </div>
                  )} */}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditableField label="Full Name" value={editData.fullName ?? ''} onChange={ef('fullName')} placeholder="Your full name" />
                    <EditableField
                      label="Email Address"
                      value={editData.email ?? ''}
                      onChange={ef('email')}
                      type="email"
                      placeholder="email@institution.edu"
                      readOnly={profile.isSuperAdmin} // 👈 This locks the field if they are a Super Admin
                    />
                    <EditableField label="Phone Number" value={editData.phone ?? ''} onChange={ef('phone')} type="tel" placeholder="10-digit phone" />
                    {/* <EditableField label="Designation" value={editData.designation ?? ''} onChange={ef('designation')} placeholder="Your role/title" /> */}
                    <EditableField label="Institution" value={editData.institution ?? ''} onChange={ef('institution')} placeholder="Institution name" readOnly={profile.isSuperAdmin} />
                    {/* <EditableField label="Address" value={editData.address ?? ''} onChange={ef('address')} placeholder="Office address" /> */}
                  </div>
                  {/* <EditableField label="Bio / Description" value={editData.bio ?? ''} onChange={ef('bio')} placeholder="Brief description..." multiline /> */}
                </div>
              )}
            </div>
          </div>

          {/* Account Info (read-only) */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-slate-700">
              <Shield size={16} className="text-purple-400" />
              <h3 className="font-bold text-slate-200 text-sm sm:text-base">Account Information</h3>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2">
              <InfoRow icon={Key} label="Employee ID" value={profile.employeeId} />
              <InfoRow icon={Shield} label="Role" value={profile.isSuperAdmin ? 'Super Administrator' : profile.isSecretary ? 'Secretary' : 'Staff'} />
              <InfoRow icon={CheckCircle} label="Verification" value={profile.isVerified ? 'Verified ✓' : 'Not Verified'} />
              <InfoRow icon={Clock} label="Account Created" value={new Date(profile.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
            </div>
          </div>

          {/* Quick info on tablet — visible sm to xl */}
          <div className="xl:hidden bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-slate-700">
              <Calendar size={16} className="text-slate-400" />
              <h3 className="font-bold text-slate-200 text-sm sm:text-base">Activity & Location</h3>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2">
              <InfoRow icon={Calendar} label="Member Since" value={new Date(profile.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
              <InfoRow icon={Clock} label="Last Login" value={new Date(profile.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} />
              {profile.address && <InfoRow icon={MapPin} label="Address" value={profile.address} />}
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <button onClick={() => setShowPasswordForm(v => !v)}
              className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-slate-700/20 transition-colors">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-red-400" />
                <h3 className="font-bold text-slate-200 text-sm sm:text-base">Change Password</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">{showPasswordForm ? 'Hide ▲' : 'Show ▼'}</span>
            </button>
            {showPasswordForm && (
              <div className="px-4 sm:px-6 pb-5 pt-1 border-t border-slate-700">
                <div className="space-y-4 mt-4">
                  {(['current', 'newPwd', 'confirm'] as const).map(field => {
                    const labels = { current: 'Current Password', newPwd: 'New Password', confirm: 'Confirm New Password' };
                    const visKey = field === 'newPwd' ? 'new' : field;
                    return (
                      <div key={field}>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{labels[field]}</label>
                        <div className="relative">
                          <input type={(pwdVisible as any)[visKey] ? 'text' : 'password'} value={pwdForm[field]}
                            onChange={e => { setPwdForm(p => ({ ...p, [field]: e.target.value })); setPwdErrors(p => ({ ...p, [field]: '' })); }} placeholder="••••••••"
                            className={`w-full px-4 py-2.5 pr-10 bg-slate-900 border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${pwdErrors[field] ? 'border-red-500' : 'border-slate-700'}`} />
                          <button type="button" onClick={() => setPwdVisible(p => ({ ...p, [visKey]: !(p as any)[visKey] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            {(pwdVisible as any)[visKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {pwdErrors[field] && <p className="text-red-400 text-xs mt-1">{pwdErrors[field]}</p>}
                      </div>
                    );
                  })}
                  <button onClick={handlePasswordChange} disabled={pwdSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-70">
                    {pwdSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Key size={14} />}
                    {pwdSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
</div>
      </div>
      
      <SuccessToast
        message="Password updated successfully"
        show={showToast}
        onClose={() => setShowToast(false)}
      />

    </div>
  );
}
