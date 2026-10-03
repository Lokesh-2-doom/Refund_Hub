import { useState, useEffect, useRef, ReactNode } from 'react';
import { 
    User, Mail, CreditCard, Bell, Eye, EyeOff, Shield, 
    CheckCircle, Building, Edit2, X, Lock, Key, 
    GraduationCap, MapPin, Calendar, Phone, ShieldCheck, Landmark, Camera, Loader2
} from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

import { apiService } from '../../services/db_service';
import { cloudinaryService } from '../../services/cloudinary_service';

// --- INTERFACES ---

interface EditProfileProps {
  onBack: () => void;
  onLogout: () => void; // <--- Add this line!
}

interface EditableFieldProps {
    label: string;
    value: string;
    onSave?: (val: string) => void;
    
    icon?: ReactNode;
    mono?: boolean;
    type?: string;
    readOnly?: boolean;
    options?: string[];
}

interface PasswordInputProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    show: boolean;
    setShow: (show: boolean) => void;
}

// --- MAIN COMPONENT ---

export function EditProfile({ onBack, onLogout }: EditProfileProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get the current user ID from local storage so we know whose DB record to update
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = currentUser._id || currentUser.id; // Adjust based on your MongoDB schema (_id is standard)

    // Grouped state for easier database saving
    const [profileData, setProfileData] = useState({
        fullName: '', studentId: '', email: '', phone: '', profilePicUrl: ''
    });
    
   const [academicData, setAcademicData] = useState({
        hostel: '', block: '', roomNumber: '', messName: ''
    });

    const [bankData, setBankData] = useState({
        accountHolderName: '', bankName: '', accountNumber: '', ifscCode: ''
    });

    // Utility & Loading states
    const [showAccountNumber, setShowAccountNumber] = useState(false);
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [tempAccount, setTempAccount] = useState('');
    const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Password change states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    // --- FETCH DATA ON MOUNT ---
    useEffect(() => {
        // We load initial data from local storage to keep the UI fast
        setProfileData({
            fullName: currentUser.fullName || '',
            studentId: currentUser.studentId || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            profilePicUrl: currentUser.profilePicUrl || ''
        });

      setAcademicData({
            hostel: currentUser.hostel || '',
            block: currentUser.block || '',
            roomNumber: currentUser.roomNumber || '',
            messName: currentUser.messName || '',
        });

        const storedBank = currentUser.bankDetails || {};
        setBankData({
            accountHolderName: storedBank.accountHolderName || '',
            bankName: storedBank.bankName || '',
            accountNumber: storedBank.accountNumber || '',
            ifscCode: storedBank.ifscCode || '',
        });
        
        setTempAccount(storedBank.accountNumber || '');

        const loadLatestProfile = async () => {
            if (!userId) return;

            try {
                const latestUser = await apiService.getUserProfile(userId);
                localStorage.setItem('user', JSON.stringify(latestUser));

                setProfileData({
                    fullName: latestUser.fullName || '',
                    studentId: latestUser.studentId || '',
                    email: latestUser.email || '',
                    phone: latestUser.phone || '',
                    profilePicUrl: latestUser.profilePicUrl || ''
                });

                setAcademicData({
                    hostel: latestUser.hostel || '',
                    block: latestUser.block || '',
                    roomNumber: latestUser.roomNumber || '',
                    messName: latestUser.messName || '',
                });

                const latestBank = latestUser.bankDetails || {};
                setBankData({
                    accountHolderName: latestBank.accountHolderName || '',
                    bankName: latestBank.bankName || '',
                    accountNumber: latestBank.accountNumber || '',
                    ifscCode: latestBank.ifscCode || '',
                });
                setTempAccount(latestBank.accountNumber || '');
            } catch (error) {
                console.error('Failed to hydrate latest profile:', error);
            }
        };

        loadLatestProfile();
    }, []);

    // --- ASYNC SAVE HANDLERS (DATABASE INTEGRATION) ---
    
    const updateDatabase = async (updates: any) => {
        if (!userId) {
            console.error("No user ID found. Make sure user is logged in.");
            return;
        }

        try {
            // 1. Send data to MongoDB via our service
            const response = await apiService.updateUserData(userId, updates);

            // 2. Keep local storage in sync so the rest of the app doesn't break
            if (response?.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            
            // 3. Show success toast
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (error) {
            alert("Failed to save changes to the database. Please try again.");
            console.error(error);
        }
    };

    const handleProfileUpdate = (key: string, value: string) => {
        const newData = { ...profileData, [key]: value };
        setProfileData(newData);
        updateDatabase(newData);
    };

    const handleAcademicUpdate = (key: string, value: string) => {
        const newData = { ...academicData, [key]: value };
        setAcademicData(newData);
        updateDatabase(newData);
    };

    const handleBankUpdate = (key: string, value: string) => {
        const newData = { ...bankData, [key]: value };
        setBankData(newData);
        updateDatabase({ bankDetails: newData });
    };

    const handleAccountSave = () => {
        setIsEditingAccount(false);
        if (tempAccount !== bankData.accountNumber) {
            handleBankUpdate('accountNumber', tempAccount);
        }
    };

    // --- CLOUDINARY UPLOAD HANDLER ---
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingImage(true);
            
            // 1. Upload file to Cloudinary
            const imageUrl = await cloudinaryService.uploadImage(file);
            
            // 2. Update React State
            setProfileData(prev => ({ ...prev, profilePicUrl: imageUrl }));
            
            // 3. Save the new URL to the Database
            await updateDatabase({ profilePicUrl: imageUrl });
            
        } catch (error) {
            alert("Failed to upload image. Please check your Cloudinary configuration.");
            console.error(error);
        } finally {
            setIsUploadingImage(false);
        }
    };

    // --- BACKEND PASSWORD CHANGE HANDLER ---
    const handlePasswordChange = async () => {
        if (!currentPassword) {
            alert('Please enter your current password.');
            return;
        }
        if (newPassword.length < 8) {
            alert('New password must be at least 8 characters long');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            alert('New passwords do not match');
            return;
        }

        try {
            if (!userId) throw new Error("No user ID found.");
            
            // Call the database service to change password securely
            await apiService.changePassword(userId, currentPassword, newPassword);
            
            setShowPasswordModal(false);
            setSaveSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error: any) {
            alert(error.message || "Failed to update password. Please check your current password.");
            console.error(error);
        }
    };

    // --- UTILS ---
    const getMaskedAccountNumber = () => {
        if (showAccountNumber) return bankData.accountNumber;
        return bankData.accountNumber ? '•••• •••• •••• ' + bankData.accountNumber.slice(-4) : 'Click to add...';
    };

    const initials = profileData.fullName ? profileData.fullName.split(' ').map((n) => n[0]).join('').toUpperCase() : 'ST';

return (
  <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
        
        
        {/* Success Toast */}
        {saveSuccess && (
            <div className="fixed top-4 right-4 sm:top-8 sm:right-8 z-50 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg">
                <CheckCircle className="text-green-600" size={20} />
                <p className="text-green-800 font-medium text-sm sm:text-base">Changes saved automatically!</p>
            </div>
        )}
        
        {/* Rest of your code... */}
            {/* Profile Header & Picture Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-left">
                <div className="h-32 sm:h-40 bg-gradient-to-r from-green-600 to-emerald-500 relative">
                    <div className="absolute inset-0 bg-black/10"></div>
                </div>

                <div className="px-6 sm:px-8 pb-8 pt-0 relative flex flex-col sm:flex-row sm:items-end sm:gap-6">
                    {/* Avatar with Upload */}
                    <div className="relative -mt-16 w-32 h-32 rounded-3xl bg-white p-1.5 shadow-xl group">
                        {isUploadingImage ? (
                            <div className="w-full h-full rounded-2xl bg-gray-50 flex flex-col items-center justify-center text-green-600 gap-2">
                                <Loader2 className="animate-spin" size={28} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Uploading</span>
                            </div>
                        ) : profileData.profilePicUrl ? (
                            <img src={profileData.profilePicUrl} alt="Profile" className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                            <div className="w-full h-full rounded-2xl bg-green-100 flex items-center justify-center text-4xl font-black text-green-700">
                                {initials}
                            </div>
                        )}
                        
                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                            disabled={isUploadingImage}
                        />
                        
                        {/* Hover Overlay */}
                        {!isUploadingImage && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-1.5 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 text-white transition-all cursor-pointer"
                            >
                                <Camera size={24} />
                                <span className="text-xs font-bold tracking-wide">Change Photo</span>
                            </button>
                        )}
                        
                    </div>

                    <div className="flex-1 min-w-0 pt-4 sm:pt-0 pb-2">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 truncate mb-1">Edit Profile Settings</h1>
                        <p className="text-sm sm:text-base text-gray-500 font-medium">Click on any field below to instantly update your details.</p>
                    </div>
<div className="flex justify-start px-2 mb-4">
    <button 
        type="button"
        onClick={() => onBack?.()} 
        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-slate-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 group"
    >
        {/* Using X or ArrowLeft to match the 'Edit' icon style */}
        <ArrowLeft size={18} className="text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-[15px]">Back to Profile</span>
    </button>
</div>
                </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left">
                <div className="bg-gray-50/50 border-b border-gray-100 px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2 sm:gap-2.5">
                        <User className="text-green-600" size={20} /> Personal Information
                    </h3>
                </div>

                <div className="p-5 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 sm:gap-y-6 gap-x-8 sm:gap-x-12">
                        <EditableField 
                            icon={<User size={16} />} label="Full Name" 
                            value={profileData.fullName}
                            onSave={(val) => handleProfileUpdate('fullName', val)} 
                        />
                        <EditableField 
                            icon={<Shield size={16} />} label="Student ID" 
                            value={profileData.studentId} readOnly mono
                        />
                        <EditableField 
                            icon={<Mail size={16} />} label="Email Address" type="email"
                            value={profileData.email} readOnly mono
                        />
                        <EditableField 
                            icon={<Phone size={16} />} label="Phone Number" type="tel"
                            value={profileData.phone}
                            onSave={(val) => handleProfileUpdate('phone', val)} 
                        />
                    </div>
                    
                    <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-100">
                        <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 text-green-600 hover:text-green-700 font-bold transition-colors text-sm sm:text-base">
                            <Key size={18} /> Update Password
                        </button>
                    </div>
                </div>
            </div>

            {/* Academic & Campus Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left">
                <div className="bg-gray-50/50 border-b border-gray-100 px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2 sm:gap-2.5">
                        <ShieldCheck className="text-green-600" size={20} /> Academic & Campus Details
                    </h3>
                </div>

                <div className="p-5 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-y-5 sm:gap-y-6 gap-x-8 sm:gap-x-12">
                    <EditableField 
                        icon={<Building size={16} />} label="Hostel" type="select"
                        value={academicData.hostel}
                        options={["C.V.Raman Hostel", "Aryabhatta Hostel", "Kalam Hostel", "Asima Hostel", "Married Hostel"]}
                        onSave={(val) => handleAcademicUpdate('hostel', val)} 
                    />
                    <EditableField 
                        icon={<Building size={16} />} label="Block" type="select"
                        value={academicData.block} 
                        options={["A", "B", "C", "D"]}
                        onSave={(val) => handleAcademicUpdate('block', val)} 
                     />
                    <EditableField 
                        icon={<Building size={16} />} label="Mess Name" 
                        value={academicData.messName}
                        onSave={(val) => handleAcademicUpdate('messName', val)} 
                    />
                    <EditableField 
                        icon={<MapPin size={16} />} label="Room Number" 
                        value={academicData.roomNumber}
                        onSave={(val) => handleAcademicUpdate('roomNumber', val)} 
                    />
                </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left">
                <div className="bg-gray-50/50 border-b border-gray-100 px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2 sm:gap-2.5">
                        <Landmark className="text-green-600" size={20} /> Bank Details for Settlements
                    </h3>
                </div>

                <div className="p-5 sm:p-8">
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3 mb-6 sm:mb-8">
                        <Shield className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                            <h4 className="font-bold text-green-900 text-sm mb-1">Secure Information</h4>
                            <p className="text-xs sm:text-sm text-green-800 leading-relaxed">Your bank details are encrypted and stored securely. Ensure they match your verified ID.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 sm:gap-y-6 gap-x-8 sm:gap-x-12">
                        <EditableField 
                            icon={<User size={16} />} label="Account Holder Name" 
                            value={bankData.accountHolderName}
                            onSave={(val) => handleBankUpdate('accountHolderName', val)} 
                        />
                        <EditableField 
                            icon={<Building size={16} />} label="Bank Name" 
                            value={bankData.bankName}
                            onSave={(val) => handleBankUpdate('bankName', val)} 
                        />
                        
                        {/* Custom inline editor for Account Number to support the Eye toggle */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                <CreditCard size={14} /> Account Number
                            </label>
                            <div className="flex gap-2">
                                {isEditingAccount ? (
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={tempAccount} 
                                        onChange={(e) => setTempAccount(e.target.value)} 
                                        onBlur={handleAccountSave}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAccountSave()}
                                        className="flex-1 w-full px-4 py-3 bg-white border border-green-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 text-gray-900 shadow-sm font-mono" 
                                        placeholder="Enter account number"
                                    />
                                ) : (
                                    <div 
                                        onClick={() => setIsEditingAccount(true)}
                                        className="group flex-1 flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-green-50/50 border border-gray-100 hover:border-green-200 rounded-xl cursor-pointer transition-all text-gray-900 font-mono"
                                    >
                                        <span className={`truncate ${!bankData.accountNumber ? 'text-gray-400 font-sans italic font-normal' : ''}`}>
                                            {getMaskedAccountNumber()}
                                        </span>
                                        <Edit2 size={16} className="text-green-600 opacity-40 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </div>
                                )}
                                {!isEditingAccount && (
                                    <button 
                                        onClick={() => setShowAccountNumber(!showAccountNumber)} 
                                        className="px-4 py-3 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                                        title={showAccountNumber ? "Hide number" : "Show number"}
                                    >
                                        {showAccountNumber ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <EditableField 
                            icon={<Landmark size={16} />} label="IFSC Code" mono
                            value={bankData.ifscCode}
                            onSave={(val) => handleBankUpdate('ifscCode', val.toUpperCase())} 
                        />
                    </div>
                </div>
            </div>

            {/* Notification Toggle */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Bell className="text-green-600" size={24} />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-gray-900 text-sm sm:text-base">Email Notifications</p>
                        <p className="text-xs sm:text-sm text-gray-500">Updates on refund status</p>
                    </div>
                </div>
                <label className="relative cursor-pointer flex-shrink-0">
                    <input 
                        type="checkbox" 
                        checked={emailNotificationsEnabled} 
                        onChange={(e) => setEmailNotificationsEnabled(e.target.checked)} 
                        className="sr-only peer" 
                    />
                    <div className="w-12 sm:w-14 h-7 sm:h-8 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-5 sm:peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 sm:after:h-6 after:w-5 sm:after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                </label>
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-left animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                                    <Lock className="text-green-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-gray-900">Security</h3>
                                    <p className="text-sm text-gray-500">Update your password</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <PasswordInput label="Current Password" value={currentPassword} onChange={setCurrentPassword} show={showCurrentPassword} setShow={setShowCurrentPassword} />
                            <PasswordInput label="New Password" value={newPassword} onChange={setNewPassword} show={showNewPassword} setShow={setShowNewPassword} />
                            <PasswordInput label="Confirm New Password" value={confirmNewPassword} onChange={setConfirmNewPassword} show={showConfirmNewPassword} setShow={setShowConfirmNewPassword} />
                            
                            <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                                <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-bold transition-colors">Cancel</button>
                                <button onClick={handlePasswordChange} className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors shadow-sm">Update</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- HELPER COMPONENTS ---

function EditableField({ label, value, onSave, icon, mono = false, type = "text", readOnly = false, options }: EditableFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    // Keep tempValue synced if parent value changes
    useEffect(() => {
        setTempValue(value);
    }, [value]);

    const handleSave = () => {
        setIsEditing(false);
        if (tempValue !== value && onSave) {
            onSave(tempValue);
        }
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newVal = e.target.value;
        setTempValue(newVal);
        setIsEditing(false);
        if (newVal !== value && onSave) {
            onSave(newVal);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
        }
    };

    return (
        <div className="relative">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                {icon && <span className="opacity-70">{icon}</span>} {label}
            </label>
            
            {readOnly ? (
                <div className={`px-4 py-3 bg-gray-50/50 border border-transparent rounded-xl text-gray-500 ${mono ? 'font-mono' : 'font-medium'}`}>
                    {value || 'Not provided'}
                </div>
            ) : isEditing ? (
                type === 'select' && options ? (
                    <select
                        autoFocus
                        value={tempValue || ''}
                        onChange={handleSelectChange}
                        onBlur={handleSave}
                        className={`w-full px-4 py-3 bg-white border border-green-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 text-gray-900 shadow-sm transition-all appearance-none cursor-pointer`}
                    >
                        <option value="" disabled>Select {label}</option>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        autoFocus
                        type={type}
                        value={tempValue || ''}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className={`w-full px-4 py-3 bg-white border border-green-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 text-gray-900 shadow-sm transition-all ${mono ? 'font-mono uppercase' : ''}`}
                        placeholder={`Enter ${label.toLowerCase()}`}
                    />
                )
            ) : (
                <div 
                    onClick={() => setIsEditing(true)}
                    className={`group flex items-center justify-between w-full px-4 py-3 bg-gray-50/50 hover:bg-green-50/50 border border-gray-100 hover:border-green-200 rounded-xl cursor-pointer transition-all text-gray-900 ${mono ? 'font-mono' : 'font-medium'}`}
                    title="Click to edit"
                >
                    <span className={`truncate ${!value ? 'text-gray-400 italic font-normal' : ''}`}>
                        {value || 'Click to add...'}
                    </span>
                    <Edit2 size={16} className="text-green-600 opacity-40 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
            )}
        </div>
    );
}

function PasswordInput({ label, value, onChange, show, setShow }: PasswordInputProps) {
    return (
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{label} *</label>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 sm:pl-12 pr-11 sm:pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all font-mono text-sm sm:text-base"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );
}
