import { useState, useEffect } from 'react';
import { Plus, DollarSign, Clock, CheckCircle, Home, FileText, User, Users, Shield } from 'lucide-react';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

// Layout
import { Sidebar, MobileHeader } from './Sidebar';

// Dashboard Sections
import { ClaimStatusCard, Claim, StatsCard } from './StatsCard';
import { MyClaimsView } from './MyClaimsView';
import { HistoryView } from './HistoryView';

// Forms & Modals
import {
  SelectCategoryModal,
  MessRebateForm, MessRebateFormData,
  FestReimbursementForm, FestReimbursementFormData,
  MedicalRebateForm, MedicalRebateFormData,
  SuccessConfirmation,FestClaimSuccess,
  AdminSettings,DEFAULT_SETTINGS,
} from './RebateForm';

// Profile
import { ProfileView } from './Profile_Page/Profile_VIew_Page';
import { EditProfile } from './Profile_Page/Edit_Profile_Page';

// Fest Management Views
import { ManageTeamView } from './FestTeam_View/ManageTeamView';
import { VerifyReimbursementView } from './FestTeam_View/VerifyReimbursement';

// ─── Types ────────────────────────────────────────────────────────────────────

type FestRole = 'FEST_COORDINATOR' | 'COORDINATOR' | 'SUB_COORDINATOR';

interface UserFest {
  festId: string;
  memberId?: string;
  festName: string;
  academicYear: string;
  committee: string;
  position: FestRole;
}

interface StudentDashboardProps {
  onLogout: () => void;
}

// ─── Bottom Nav Component (Mobile) ────────────────────────────────────────
function BottomNav({ 
  activeView, 
  setActiveView, 
  userRole
}: { 
  activeView: string; 
  setActiveView: (v: string) => void;
  userRole: FestRole | null;
}) {
  const items = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'claims', label: 'My Claims', icon: FileText },
    { id: 'history', label: 'History', icon: Clock },
    ...(userRole && (userRole === 'FEST_COORDINATOR' || userRole === 'COORDINATOR') 
      ? [{ id: 'manage-team', label: 'Team', icon: Users }]
      : []),
    ...(userRole && (userRole === 'FEST_COORDINATOR' || userRole === 'COORDINATOR')
      ? [{ id: 'approve-reimbursement', label: 'Approve', icon: Shield }]
      : []),
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 safe-area-bottom">
      <div className="flex items-stretch h-16">
        {items.map(item => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => setActiveView(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active 
                  ? 'text-green-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-b-full" />}
              <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentDashboard({ onLogout }: StudentDashboardProps) {
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');

  // ── Navigation ──
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Modals & Forms ──
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [showMessRebateForm, setShowMessRebateForm] = useState(false);
  const [showFestReimbursementForm, setShowFestReimbursementForm] = useState(false);
  const [showMedicalRebateForm, setShowMedicalRebateForm] = useState(false);
  const [showSuccessConfirmation, setShowSuccessConfirmation] = useState(false);
  const [showFestClaimSuccess, setShowFestClaimSuccess] = useState(false);
  const [successClaimData, setSuccessClaimData] = useState<any>(null);
  const [festClaimData, setFestClaimData] = useState<any>(null);

  // ── Dashboard Data ──
  const [dashboardClaims, setDashboardClaims] = useState<Claim[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalRefunded: 0,
    pendingCount: 0,
    approvedThisMonth: 0,
  });
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  
  // ── Fest / Role Data ──
  const [userFests, setUserFests] = useState<UserFest[]>([]);

  // ── Derived role & fest lists ──
  // effectiveRole: the highest role this user holds across all their fests.
  // This controls what sidebar items are visible:
  //   - FEST_COORDINATOR → sees "Manage Team" + "Approve Reimbursements"
  //   - COORDINATOR      → sees "Manage Team" + "Approve Reimbursements"
  //   - SUB_COORDINATOR  → sees neither (no management pages)
  //   - null             → regular student, no fest pages
  const effectiveRole: FestRole | null = (() => {
    if (userFests.some(f => f.position === 'FEST_COORDINATOR')) return 'FEST_COORDINATOR';
    if (userFests.some(f => f.position === 'COORDINATOR')) return 'COORDINATOR';
    if (userFests.some(f => f.position === 'SUB_COORDINATOR')) return 'SUB_COORDINATOR';
    return null;
  })();
  const isFestMember = userFests.length > 0;

  // managementFests: only fests where user is FC or Coordinator.
  // These are the fests shown in the fest-switcher dropdown inside ManageTeamView
  // and VerifyReimbursementView. Sub-coordinators don't get these pages.
  const managementFests: UserFest[] = Array.from(
    userFests
      .filter(f => f.position === 'FEST_COORDINATOR' || f.position === 'COORDINATOR')
      .reduce((map, fest) => {
        const existing = map.get(fest.festId);
        if (!existing) {
          map.set(fest.festId, fest);
          return map;
        }

        if (existing.position !== 'FEST_COORDINATOR' && fest.position === 'FEST_COORDINATOR') {
          map.set(fest.festId, fest);
        }
        return map;
      }, new Map<string, UserFest>())
      .values()
  );

  // ── Fetch Admin Settings ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setAdminSettings(data);
        }
      } catch (e) {
        console.error('Could not load admin settings:', e);
      }
    };
    fetchSettings();
  }, []);

  // ── Fetch Fest Memberships ─────────────────────────────────────────────────

  useEffect(() => {
    const userId = loggedInUser?._id;
    if (!userId) {
      console.warn('No _id found in localStorage user — cannot load fests');
      return;
    }

    const loadFests = async () => {
      try {
        console.log('Fetching fests for userId:', userId);
        const res = await fetch(`${BASE_URL}/api/fest-members/my-fests/${userId}`);
        const data = await res.json();
        console.log('my-fests API response:', data);

        if (!res.ok) {
          console.error('my-fests API error:', data.message);
          return;
        }

        if (!Array.isArray(data)) {
          console.error('my-fests returned non-array:', data);
          return;
        }

        // Map API response to UserFest shape.
        // API returns: { festId, festName, academicYear, position, committee, memberId }
        const mapped: UserFest[] = data.map((m: any) => ({
          festId: String(m.festId),
          memberId: m.memberId ? String(m.memberId) : undefined,
          festName: m.festName || '',
          academicYear: m.academicYear || '',
          committee: m.committee || 'Member',
          position: m.position,
        }));

        console.log('Mapped userFests:', mapped);
        setUserFests(mapped);
      } catch (e) {
        console.error('Could not load user fests:', e);
      }
    };

    loadFests();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debug — logs whenever userFests changes so you can see effectiveRole
  useEffect(() => {
    console.log('=== FEST DEBUG ===');
    console.log('userFests:', userFests);
    console.log('effectiveRole:', effectiveRole);
    console.log('managementFests:', managementFests);
  }, [userFests]);

  // ─── Fetch Dashboard Data ──────────────────────────────────────────────────

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!loggedInUser?.studentId) return;

      try {
        setIsDashboardLoading(true);
        const response = await fetch(
          `${BASE_URL}/api/dashboard/${loggedInUser.studentId}`
        );

        if (response.ok) {
          const data = await response.json();
          setDashboardStats(data.stats);

          const formatStatus = (dbStatus: string): string => {
            switch (dbStatus) {
              case 'PENDING_TEAM_COORD':   return 'Pending (Team Coord)';
              case 'PENDING_FEST_COORD':   return 'Pending (Fest Coord)';
              case 'PENDING_COORD':        return 'Pending (Coordinator)';
              case 'PENDING_FC':           return 'Pending (Fest Coord)';
              case 'PENDING_MESS_MANAGER': return 'Pending (Mess Mgr)';
              case 'PENDING_VP':           return 'Pending (VP)';
              case 'PENDING_ACADEMIC':     return 'Pending (Academic)';
              case 'VERIFIED_FEST':        return 'Verified';
              case 'UNDER_PROCESS':        return 'Sent to Accounts';
              case 'PUSHED_TO_ACCOUNTS':   return 'Sent to Accounts';
              case 'APPROVED':             return 'Approved';
              case 'REFUNDED':             return 'Refunded';
              case 'REJECTED':             return 'Rejected';
              default:                     return dbStatus;
            }
          };

          const formattedClaims: Claim[] = data.recentClaims.map((claim: any) => ({
            id: claim.claimId,
            type:
              claim.requestType === 'FEST_REIMBURSEMENT'
                ? 'Fest Rebate'
                : claim.requestType === 'MESS_REBATE'
                ? 'Mess Rebate'
                : 'Medical Refund',
            amount: claim.amount,
            status: formatStatus(claim.status),
            date: new Date(claim.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            description: claim.description,
          }));

          setDashboardClaims(formattedClaims);
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setIsDashboardLoading(false);
      }
    };

    if (activeMenuItem === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeMenuItem]);

  // ─── Category / Form Handlers ─────────────────────────────────────────────

  const handleCategorySelect = (category: string) => {
    setShowNewClaimModal(false);
    if (category === 'mess-rebate') {
      setShowMessRebateForm(true);
    } else if (category === 'fest-activity') {
      setShowFestReimbursementForm(true);
    } else if (category === 'medical-rebate') {
      setShowMedicalRebateForm(true);
    } else {
      alert(`${category} claim form coming soon!`);
    }
  };

  const handleBackToCategory = () => {
    setShowMessRebateForm(false);
    setShowFestReimbursementForm(false);
    setShowMedicalRebateForm(false);
    setShowNewClaimModal(true);
  };

  const handleTrackStatus = () => {
    setShowSuccessConfirmation(false);
    setShowFestClaimSuccess(false);
    setActiveMenuItem('claims');
  };

  // ─── Form Submit Handlers ─────────────────────────────────────────────────

  const handleMessRebateSubmit = (data: MessRebateFormData) => {
    const submit = async () => {
      try {
        const formData = new FormData();
        formData.append('studentId', loggedInUser.studentId);
        formData.append('fromDate', data.fromDate?.toISOString() || '');
        formData.append('toDate', data.toDate?.toISOString() || '');
        formData.append('reason', data.reason);
        data.receiptFiles.forEach((file) => formData.append('receiptFiles', file));

        const response = await fetch(`${BASE_URL}/api/claims/mess`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          alert('Submission failed: ' + result.message);
          return;
        }

        setShowMessRebateForm(false);
        setSuccessClaimData({
          claimId: result.claim.claimId,
          type: 'Mess Rebate',
          amount: result.claim.amount,
          fromDate: data.fromDate,
          toDate: data.toDate,
          submissionDate: new Date(result.claim.createdAt),
        });
        setShowSuccessConfirmation(true);
      } catch (error) {
        console.error('Error submitting mess rebate:', error);
        alert('Could not connect to the server.');
      }
    };
    submit();
  };

  const handleFestReimbursementSubmit = async (data: FestReimbursementFormData) => {
    try {
      const formData = new FormData();
      formData.append('studentId', loggedInUser.studentId);
      formData.append('festId', data.festId);
      if (data.festMemberId) formData.append('festMemberId', data.festMemberId);
      formData.append('festName', data.festName);
      formData.append('team', data.team);
      formData.append('transactionId', data.transactionId);
      formData.append('expenseAmount', data.expenseAmount.toString());
      formData.append('expenseDescription', data.expenseDescription);
      data.receiptFiles.forEach((file) => formData.append('receiptFiles', file));

      const response = await fetch(`${BASE_URL}/api/claims/fest`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setShowFestReimbursementForm(false);
        setFestClaimData({
          claimId: result.claim.claimId,
          teamName: `${result.claim.festName || data.festName} - ${result.claim.committeeName || data.team}`,
          amount: data.expenseAmount,
          receiptsCount: data.receiptFiles.length,
          submissionDate: new Date(result.claim.createdAt),
        });
        setShowFestClaimSuccess(true);
      } else {
        alert('Submission failed: ' + result.message);
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
      alert('Could not connect to the server.');
    }
  };

  const handleMedicalRebateSubmit = async (data: MedicalRebateFormData) => {
    try {
      const formData = new FormData();
      formData.append('studentId', loggedInUser.studentId);
      formData.append('hospitalName', data.hospitalName);
      formData.append('treatmentDate', data.treatmentDate?.toISOString() || '');
      formData.append('amount', data.amount.toString());
      formData.append('description', data.description);
      data.billFiles.forEach((file) => formData.append('receiptFiles', file));

      const response = await fetch(`${BASE_URL}/api/claims/hospital`, {
        method: 'POST',
        body: formData,
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        alert('Submission failed: ' + (result?.message || `HTTP ${response.status}`));
        return;
      }

      setShowMedicalRebateForm(false);
      setSuccessClaimData({
        claimId: result.claim.claimId,
        type: 'Medical Rebate',
        amount: result.claim.amount,
        submissionDate: new Date(result.claim.createdAt),
      });
      setShowSuccessConfirmation(true);
    } catch (error) {
      console.error('Error submitting medical rebate:', error);
      alert('Upload failed. Please retry with a stable connection.');
    }
  };

  // ─── Page Title ───────────────────────────────────────────────────────────

  const pageTitle =
    activeMenuItem === 'dashboard'             ? 'Dashboard' :
    activeMenuItem === 'claims'                ? 'My Claims' :
    activeMenuItem === 'refunds'               ? 'Refunds & Settlements' :
    activeMenuItem === 'history'               ? 'Claim History' :
    activeMenuItem === 'manage-team'           ? 'Manage Team' :
    activeMenuItem === 'approve-reimbursement' ? 'Approve Reimbursements' :
    activeMenuItem === 'settings'              ? 'Settings' :
    'Refund Hub';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar
          The Sidebar receives userRole (effectiveRole) and shows "Manage Team"
          and "Approve Reimbursements" menu items only when userRole is
          FEST_COORDINATOR or COORDINATOR. Sub-coordinators and regular students
          don't see those menu items at all. */}
      <Sidebar
        activeItem={activeMenuItem}
        onItemClick={setActiveMenuItem}
        userRole={effectiveRole}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(v => !v)}
      />

      {/* Main Content - Add padding bottom for mobile nav */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <MobileHeader
          title={pageTitle}
          onMenuToggle={() => setMobileMenuOpen(v => !v)}
        />

        <div className="p-6 lg:p-8 max-w-7xl mx-auto pt-20 lg:pt-6">

          {/* ── Dashboard ── */}
          {activeMenuItem === 'dashboard' && (
            <>
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="hidden lg:block">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      Welcome back, {loggedInUser.fullName || 'Student'}! 👋
                    </h1>
                    <p className="text-gray-600">
                      Track your refunds and submit new claims easily
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewClaimModal(true)}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-sm w-full sm:w-auto"
                  >
                    <Plus size={20} />
                    New Mess/Fest Rebate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatsCard title="Total Refunded" value={`₹${dashboardStats.totalRefunded.toLocaleString()}`} icon={DollarSign} colorScheme="green" />
                <StatsCard title="Pending Claims" value={dashboardStats.pendingCount.toString()} icon={Clock} colorScheme="yellow" />
                <StatsCard title="Approved This Month" value={dashboardStats.approvedThisMonth.toString()} icon={CheckCircle} colorScheme="blue" />
              </div>

              <div className="mb-8" id="live-claim-status">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Recent Claims</h2>
                    <p className="text-sm text-gray-600 mt-1">Quick overview of your latest claims</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {isDashboardLoading ? (
                    <div className="col-span-1 lg:col-span-2 text-center py-8 text-gray-500">
                      Loading your claims...
                    </div>
                  ) : dashboardClaims.length === 0 ? (
                    <div className="col-span-1 lg:col-span-2 text-center py-8 bg-white rounded-xl border border-gray-200 text-gray-500">
                      You haven't submitted any claims yet.
                    </div>
                  ) : (
                    dashboardClaims.map((claim) => (
                      <ClaimStatusCard key={claim.id} claim={claim} onClick={() => setActiveMenuItem('claims')} />
                    ))
                  )}
                </div>
              </div>

              <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">
                  Need help? Contact support at{' '}
                  <a href="mailto:support@refundhub.edu" className="text-green-600 hover:text-green-700 font-medium">
                    support@refundhub.edu
                  </a>{' '}
                  or visit the admin office
                </p>
              </div>
            </>
          )}

          {/* ── My Claims ── */}
          {activeMenuItem === 'claims' && (
            <MyClaimsView onViewRecords={(claimId) => alert(`Viewing digital records for claim ${claimId}`)} />
          )}

          {/* ── Claim History ── */}
          {activeMenuItem === 'history' && <HistoryView />}

          {/* ── Manage Team ──
              Only renders when:
              1. activeMenuItem is 'manage-team'
              2. effectiveRole is non-null (user is FC or Coordinator)
              3. managementFests is non-empty (user has at least one fest with mgmt rights)

              FC sees all 3 columns (FC / Coordinator / Sub-Coordinator).
              Coordinator sees only Coordinator and Sub-Coordinator columns.
              Both can add members (FC can add Coord + SubCoord, Coord can add only SubCoord).
              Both can remove members strictly below their own rank. */}
          {activeMenuItem === 'manage-team' && effectiveRole && managementFests.length > 0 && (
            <ManageTeamView
              currentUserPosition={effectiveRole}
              userFests={managementFests.map(f => ({
                _id: f.festId,
                festName: f.festName,
                academicYear: f.academicYear,
              }))}
              currentUserId={loggedInUser._id}
              currentUserRollNo={loggedInUser.studentId}
            />
          )}

          {/* ── Approve Reimbursements ──
              Only renders when:
              1. activeMenuItem is 'approve-reimbursement'
              2. effectiveRole is non-null
              3. managementFests is non-empty

              FC can approve Coordinator and Sub-Coordinator claims.
              FC's own claims are auto-approved (no action needed).
              Coordinator can only approve Sub-Coordinator claims.
              Both see a fest-switcher if they belong to multiple fests. */}
          {activeMenuItem === 'approve-reimbursement' && effectiveRole && managementFests.length > 0 && (
            <VerifyReimbursementView
              currentUserPosition={effectiveRole}
              userFests={managementFests.map(f => ({
                _id: f.festId,
                festName: f.festName,
                academicYear: f.academicYear,
              }))}
              currentUserId={loggedInUser._id}
              currentUserName={loggedInUser.fullName}
            />
          )}

          {/* ── Profile ── */}
          {activeMenuItem === 'profile' && (
            <ProfileView onEditClick={() => setActiveMenuItem('settings')} onLogout={onLogout} />
          )}

          {/* ── Settings ── */}
          {activeMenuItem === 'settings' && (
            <EditProfile onBack={() => setActiveMenuItem('profile')} onLogout={onLogout} />
          )}

          {/* ── Fallback ── */}
          {!['dashboard', 'claims', 'history', 'manage-team', 'approve-reimbursement', 'profile', 'settings'].includes(activeMenuItem) && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {activeMenuItem.charAt(0).toUpperCase() + activeMenuItem.slice(1)}
              </h2>
              <p className="text-gray-600">This section is coming soon!</p>
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      <SelectCategoryModal
        isOpen={showNewClaimModal}
        onClose={() => setShowNewClaimModal(false)}
        onNext={handleCategorySelect}
        isFestMember={isFestMember}
        settings={adminSettings}
      />
      <MessRebateForm
        isOpen={showMessRebateForm}
        onClose={() => setShowMessRebateForm(false)}
        onBack={handleBackToCategory}
        onSubmit={handleMessRebateSubmit}
        settings={adminSettings}
      />
      <FestReimbursementForm
        isOpen={showFestReimbursementForm}
        onClose={() => setShowFestReimbursementForm(false)}
        onBack={handleBackToCategory}
        onSubmit={handleFestReimbursementSubmit}
        settings={adminSettings}
        userFests={userFests}
      />
      <MedicalRebateForm
        isOpen={showMedicalRebateForm}
        onClose={() => setShowMedicalRebateForm(false)}
        onBack={handleBackToCategory}
        onSubmit={handleMedicalRebateSubmit}
        settings={adminSettings}
      />

      {successClaimData && (
        <SuccessConfirmation
          isOpen={showSuccessConfirmation}
          onClose={() => { setShowSuccessConfirmation(false); setSuccessClaimData(null); }}
          onTrackStatus={handleTrackStatus}
          claimData={successClaimData}
          settings={adminSettings}
        />
      )}

      {festClaimData && (
        <FestClaimSuccess
          isOpen={showFestClaimSuccess}
          onClose={() => { setShowFestClaimSuccess(false); setFestClaimData(null); }}
          onTrackStatus={handleTrackStatus}
          onViewRecords={() => alert('Digital Records viewer would open here!')}
          claimData={festClaimData}
          settings={adminSettings}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNav 
        activeView={activeMenuItem} 
        setActiveView={setActiveMenuItem}
        userRole={effectiveRole}
      />
    </div>
  );
}