import { useEffect, useState } from 'react';
import { 
    User, Mail, Phone, CreditCard, Landmark, ShieldCheck, Edit3, LogOut, 
    Building, MapPin, GraduationCap, Calendar, Star, X, Info, ChevronRight, Check
} from 'lucide-react';
import { apiService } from '../../services/db_service';

interface ProfileViewProps {
    onEditClick: () => void;
    onLogout: () => void;
}

export function ProfileView({ onEditClick, onLogout }: ProfileViewProps) {
    const normalizeUserProfile = (rawUser: any) => {
        const nestedBank = rawUser?.studentProfile?.bankDetails || {};
        const flatBank = rawUser?.bankDetails || {};

        return {
            ...rawUser,
            bankDetails: {
                accountHolderName: flatBank.accountHolderName || nestedBank.accountHolderName || '',
                bankName: flatBank.bankName || nestedBank.bankName || '',
                accountNumber: flatBank.accountNumber || nestedBank.accountNumber || '',
                ifscCode: flatBank.ifscCode || nestedBank.ifscCode || '',
            },
        };
    };

    const [user, setUser] = useState<any>(() => normalizeUserProfile(JSON.parse(localStorage.getItem('user') || '{}')));
    const bank = user.bankDetails || {};
    
    // Fixed: Added a check to ensure fullName exists before splitting
    const initials = user.fullName && typeof user.fullName === 'string'
        ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        : 'ST';

    const [showFestModal, setShowFestModal] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [festData, setFestData] = useState({
        festName: '',
        committee: '',
        position: ''
    });

    useEffect(() => {
        const loadLatestProfile = async () => {
            try {
                let latestUser = null;

                if (user?._id) {
                    latestUser = await apiService.getUserProfile(user._id);
                } else if (user?.studentId) {
                    latestUser = await apiService.searchUser(user.studentId);
                }

                if (!latestUser) return;
                const normalizedUser = normalizeUserProfile(latestUser);
                setUser(normalizedUser);
                localStorage.setItem('user', JSON.stringify(normalizedUser));
            } catch (error) {
                console.error('Failed to fetch latest profile:', error);
            }
        };

        loadLatestProfile();
    }, [user?._id, user?.studentId]);

    const handleFestVerify = () => {
        if (!festData.festName || !festData.committee || !festData.position) {
            alert("Please fill in all details before submitting.");
            return;
        }
        
        setIsSubmitted(true);
        setTimeout(() => {
            setShowFestModal(false);
            setIsSubmitted(false);
            setFestData({ festName: '', committee: '', position: '' });
        }, 3000);
    };

    return (
        <div className="max-w-7xl mx-auto pb-16 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            
            {/* HERO SECTION */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-left">
                <div className="h-32 sm:h-40 bg-gradient-to-r from-green-600 to-emerald-500 relative">
                    <div className="absolute inset-0 bg-black/10"></div>
                </div>

                <div className="px-6 sm:px-8 pb-8 pt-0 relative flex flex-col sm:flex-row sm:items-end sm:gap-6">
                    <div className="relative -mt-16 w-32 h-32 rounded-3xl bg-white p-1.5 shadow-xl">
                        {user.profilePicUrl ? (
                            <img src={user.profilePicUrl} alt={user.fullName} className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                            <div className="w-full h-full rounded-2xl bg-green-100 flex items-center justify-center text-4xl font-black text-green-700">
                                {initials}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 pt-4 sm:pt-0 pb-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 truncate">
                                {user.fullName || 'Student Name'}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold shrink-0">
                                <ShieldCheck size={14} /> <span className="hidden sm:inline">Verified</span>
                            </span>
                        </div>
                        <p className="text-sm sm:text-base text-gray-500 font-medium">
                            Student ID: <span className="font-mono text-gray-900">{user.studentId || 'Not provided'}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-5 sm:pt-0 pb-1">
                        <button onClick={onEditClick} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-4 sm:px-5 py-2.5 rounded-xl font-bold transition-all text-sm sm:text-base shadow-sm">
                            <Edit3 size={18} /> Edit
                        </button>
                        <button onClick={onLogout} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-4 sm:px-5 py-2.5 rounded-xl font-bold transition-all text-sm sm:text-base shadow-sm">
                            <LogOut size={18} /> Log Out
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    {/* Personal Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm text-left">
                        <h3 className="text-base sm:text-lg font-bold text-gray-950 mb-6 flex items-center gap-2.5">
                            <User className="text-green-600" size={20} /> Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                            <InfoItem icon={<User size={14}/>} label="Full Name" value={user.fullName} />
                            <InfoItem icon={<Mail size={14}/>} label="University Email" value={user.email} />
                            <InfoItem icon={<Phone size={14}/>} label="Phone Number" value={user.phone} />
                            <InfoItem icon={<ShieldCheck size={14}/>} label="University Roll Number" value={user.studentId} mono />
                        </div>
                    </div>

                    {/* Academic Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm text-left">
                        <h3 className="text-base sm:text-lg font-bold text-gray-950 mb-6 flex items-center gap-2.5">
                            <GraduationCap className="text-green-600" size={20} /> Academic & Campus Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">

                            <InfoItem icon={<Building size={14}/>} label="Hostel" value={user.hostel} />
                            <InfoItem icon={<Building size={14}/>} label="Block" value={user.block} />
                            <InfoItem icon={<Building size={14}/>} label="Mess Name" value={user.messName} />
                            <InfoItem icon={<MapPin size={14}/>} label="Room Number" value={user.roomNumber} />
                        </div>
                    </div>

                    {/* Bank Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm text-left">
                        <h3 className="text-base sm:text-lg font-bold text-gray-950 mb-6 flex items-center gap-2.5">
                            <Landmark className="text-green-600" size={20} /> Bank Details for Settlements
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                            <InfoItem icon={<User size={14}/>} label="Account Holder" value={bank.accountHolderName} />
                            <InfoItem icon={<Building size={14}/>} label="Bank Name" value={bank.bankName} />
                            <InfoItem icon={<CreditCard size={14}/>} label="Account Number" value={bank.accountNumber ? `•••• •••• •••• ${bank.accountNumber.slice(-4)}` : ''} mono />
                            <InfoItem icon={<Landmark size={14}/>} label="IFSC Code" value={bank.ifscCode} mono />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6 sm:space-y-8">
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm text-center sticky top-8">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Refund Hub Account</h4>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck size={32} className="sm:w-9 sm:h-9" />
                        </div>
                        <p className="font-bold text-lg text-gray-950">Verified Status</p>
                        <p className="text-sm text-gray-500 mt-2 mb-6 leading-relaxed">
                            You are eligible for rebates reimbursements.
                        </p>
                        <hr className="mb-6 border-gray-100" />
                        {/* <button 
                            onClick={() => setShowFestModal(true)}
                            className="w-full group flex items-center justify-between py-3.5 px-5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-2xl font-bold text-sm transition-all border border-emerald-100 hover:border-emerald-600 shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <Star size={18} className="group-hover:rotate-12 transition-transform" />
                                <span>Verify Fest Team</span>
                            </div>
                            <ChevronRight size={16} />
                        </button> */}
                    </div>
                </div>
            </div>

            {/* FEST MODAL */}
            {showFestModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-6 sm:p-10 text-left animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 relative overflow-hidden">
                        {isSubmitted ? (
                            <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in zoom-in-50">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                    <Check size={40} strokeWidth={3} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900">Request Sent!</h3>
                                <p className="text-gray-500 font-medium">You will get notified once the core team verifies your role.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                                            <Star size={24} fill="currentColor" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900">Fest Team</h3>
                                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Verification Request</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowFestModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5 ml-1">Select Fest</label>
                                        <select 
                                            className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none font-bold text-gray-900"
                                            value={festData.festName}
                                            onChange={(e) => setFestData({...festData, festName: e.target.value})}
                                        >
                                            <option value="">Choose your fest...</option>
                                            <option value="Infinito">Infinito</option>
                                            <option value="Celesta">Celesta</option>
                                            <option value="Anwesha">Anwesha</option>
                                            <option value="TEDx">TEDx</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5 ml-1">Committee</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Media, PR, Technical..."
                                            className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-gray-900"
                                            value={festData.committee}
                                            onChange={(e) => setFestData({...festData, committee: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5 ml-1">Your Position</label>
                                        <select 
                                            className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none font-bold text-gray-900"
                                            value={festData.position}
                                            onChange={(e) => setFestData({...festData, position: e.target.value})}
                                        >
                                            <option value="">Choose position...</option>
                                            <option value="Volunteer">Volunteer</option>
                                            <option value="Sub-coordinator">Sub-coordinator</option>
                                            <option value="Coordinator">Coordinator</option>
                                            <option value="Fest-coordinator">Fest-coordinator</option>
                                        </select>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 text-amber-700 border border-amber-100">
                                        <Info size={20} className="shrink-0 mt-0.5" />
                                        <p className="text-xs font-bold leading-relaxed">Please ensure details match the official fest records to avoid rejection.</p>
                                    </div>
                                    <div className="pt-2 space-y-3">
                                        <button 
                                            onClick={handleFestVerify}
                                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.25rem] font-black shadow-xl shadow-emerald-200 transition-all hover:-translate-y-0.5"
                                        >
                                            Request Verification
                                        </button>
                                        <button 
                                            onClick={() => setShowFestModal(false)}
                                            className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                                        >
                                            Go Back to Profile
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component for rendering data items
function InfoItem({ label, value, icon, mono = false }: { label: string; value?: string; icon?: React.ReactNode; mono?: boolean }) {
    return (
        <div className="group text-left">
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                {icon && <span className="opacity-70">{icon}</span>} {label}
            </label>
            <p className={`text-gray-900 bg-gray-50/50 px-4 py-2.5 rounded-xl border border-gray-100 transition-colors group-hover:border-green-200 ${mono ? 'font-mono uppercase' : 'font-medium'}`}>
                {value || <span className="text-gray-400 italic font-normal">Not provided</span>}
            </p>
        </div>
    );
}
