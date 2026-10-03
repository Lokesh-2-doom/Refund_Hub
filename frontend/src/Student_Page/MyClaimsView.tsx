import { useState, useEffect } from 'react';
// ✅ ADDED: 'X' and 'ExternalLink' icons for our new document viewer
import { FileText, Calendar, DollarSign, Eye, X, ExternalLink, Trash2, AlertCircle } from 'lucide-react';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

interface MyClaimsViewProps {
  onViewRecords: (claimId: string) => void;
}

export function MyClaimsView({ onViewRecords }: MyClaimsViewProps) {
  const [claims, setClaims] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingReceipts, setViewingReceipts] = useState<string[] | null>(null);
  const [viewingClaimDetails, setViewingClaimDetails] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'FEST_REIMBURSEMENT' | 'MESS_REBATE' | 'MEDICAL_REBATE'>('ALL');

  useEffect(() => {
    const fetchClaims = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      try {
        const user = JSON.parse(userStr);
        const response = await fetch(`${BASE_URL}/api/dashboard/${user.studentId}`);
        
        if (response.ok) {
          const data = await response.json();
          setClaims(data.recentClaims);
        }
      } catch (error) {
        console.error("Failed to fetch claims:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaims();
  }, []);

  const getTrackingDetails = (status: string) => {
    if (status === 'REJECTED') return { step: 1, text: 'Rejected', subtext: 'Please contact admin', isError: true };
    if (status === 'REFUNDED') return { step: 4, text: 'Refunded', subtext: 'Funds released to bank', isError: false };
    if (status === 'UNDER_PROCESS') return { step: 3, text: 'Approved', subtext: 'Queued with Accounts', isError: false };
    if (status === 'PUSHED_TO_ACCOUNTS') return { step: 3, text: 'Approved', subtext: 'Queued with Accounts', isError: false };
    if (status === 'APPROVED') return { step: 3, text: 'Approved', subtext: 'Awaiting final transfer', isError: false };
    if (status === 'VERIFIED_FEST' || status === 'VERIFIED_MESS' || status === 'VERIFIED_MEDICAL') {
      return { step: 2, text: 'Verified', subtext: 'Awaiting central approval', isError: false };
    }
    
    let verifier = 'Admin';
    if (status === 'PENDING_TEAM_COORD') verifier = 'Team Coord';
    if (status === 'PENDING_FEST_COORD') verifier = 'Fest Coord';
    if (status === 'PENDING_COORD') verifier = 'Coordinator';
    if (status === 'PENDING_FC') verifier = 'Fest Coord';
    if (status === 'PENDING_MESS_MANAGER') verifier = 'Mess Manager';
    if (status === 'PENDING_VP') verifier = 'VP (Gymkhana)';
    if (status === 'PENDING_ACADEMIC') verifier = 'Academic Office';

    return { step: 1, text: 'Applied', subtext: `Queued for: ${verifier}`, isError: false };
  };

  const formatDateRange = (from?: string, to?: string) => {
    if (!from || !to) return null;
    return `${new Date(from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const handleDeleteClaim = async (claimId: string) => {
    setIsDeleting(true);
    try {
      console.log('Attempting to delete claim:', claimId);
      console.log('API URL:', `${BASE_URL}/api/refund-claims/${claimId}`);
      
      const response = await fetch(`${BASE_URL}/api/refund-claims/${claimId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        setClaims(claims.filter(c => c._id !== claimId));
        setDeleteTarget(null);
        alert('Claim deleted successfully!');
      } else {
        console.error('Delete error response:', data);
        alert(`Failed to delete claim: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting claim:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : '',
      });
      alert(`Error deleting claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const canDeleteClaim = (status: string) => {
    const pendingStatuses = [
      'PENDING_TEAM_COORD',
      'PENDING_FEST_COORD',
      'PENDING_COORD',
      'PENDING_FC',
      'PENDING_MESS_MANAGER',
      'PENDING_VP',
      'PENDING_ACADEMIC'
    ];
    return pendingStatuses.includes(status);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500 font-medium">Loading your claims history...</div>;
  }

  if (claims.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Claims Found</h3>
        <p className="text-gray-500">You haven't submitted any refund requests yet.</p>
      </div>
    );
  }

  // Count claims by type
  const festCount = claims.filter(c => c.requestType === 'FEST_REIMBURSEMENT').length;
  const messCount = claims.filter(c => c.requestType === 'MESS_REBATE').length;
  const medicalCount = claims.filter(c => c.requestType === 'MEDICAL_REBATE').length;

  // Filter claims based on selected type
  const filteredClaims = filterType === 'ALL' 
    ? claims 
    : claims.filter(c => c.requestType === filterType);

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Track Your Claims ({filteredClaims.length})</h2>
      </div>

      {/* Filter Dropdown */}
      <div className="flex items-center gap-3">
        <label htmlFor="claim-filter" className="text-sm font-semibold text-gray-700">View Claims:</label>
        <select
          id="claim-filter"
          name="claim-filter"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'ALL' | 'FEST_REIMBURSEMENT' | 'MESS_REBATE' | 'MEDICAL_REBATE')}
          className="px-4 py-2.5 rounded-lg font-semibold text-sm border border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all cursor-pointer"
        >
          <option value="ALL">All Claims ({claims.length})</option>
          <option value="FEST_REIMBURSEMENT">Fest/Activity ({festCount})</option>
          <option value="MESS_REBATE">Mess Rebate ({messCount})</option>
          <option value="MEDICAL_REBATE">Medical Rebate ({medicalCount})</option>
        </select>
      </div>

      {/* No claims of this type */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 font-medium">No claims of this type</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredClaims.map((claim) => {
          const tracking = getTrackingDetails(claim.status);
          const isFest = claim.requestType === 'FEST_REIMBURSEMENT';
          const isMess = claim.requestType === 'MESS_REBATE';
          const messRange = formatDateRange(claim.messAbsenceFrom, claim.messAbsenceTo);
          
          return (
            <div key={claim._id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
              
              {/* Delete Button - Top Right Corner */}
              {canDeleteClaim(claim.status) && (
                <button
                  onClick={() => setDeleteTarget(claim._id)}
                  className="absolute top-4 right-4 p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete this claim"
                >
                  <Trash2 size={18} />
                </button>
              )}
              
              {/* Header */}
              <div className="mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${
                  isFest
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : claim.requestType === 'MESS_REBATE'
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {isFest ? 'Fest/Activity' : claim.requestType === 'MESS_REBATE' ? 'Mess Rebate' : 'Medical Rebate'}
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  {isFest ? `${claim.festName} Reimbursement` : claim.requestType.replace('_', ' ')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isFest ? `${claim.committeeName || claim.teamName || 'General'} - ${claim.description}` : claim.description}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-t border-b border-gray-100 mb-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText size={14}/> Claim ID</p>
                  <p className="text-sm font-semibold text-gray-900">{claim.claimId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar size={14}/>{isMess ? 'Rebate Period' : 'Submitted'}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {isMess && messRange
                      ? messRange
                      : new Date(claim.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><DollarSign size={14}/> Amount</p>
                  <p className="text-sm font-bold text-green-600">₹{claim.amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="relative mb-6">
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -z-10"></div>
                <div 
                  className="absolute top-4 left-6 h-0.5 bg-green-500 -z-10 transition-all duration-500"
                  style={{ width: `${((tracking.step - 1) / 3) * 100}%` }}
                ></div>

                <div className="flex justify-between gap-2">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 border-2 shrink-0 ${tracking.step >= 1 ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>1</div>
                    <p className="text-xs font-bold text-gray-900 text-center line-clamp-2">Applied</p>
                    <p className="text-[10px] text-gray-500 text-center line-clamp-3">{tracking.step === 1 && !tracking.isError ? tracking.subtext : 'Submitted'}</p>
                  </div>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 border-2 shrink-0 ${tracking.isError ? 'bg-red-500 border-red-500 text-white' : tracking.step >= 2 ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                      {tracking.isError ? '!' : '2'}
                    </div>
                    <p className={`text-xs font-bold text-center line-clamp-2 ${tracking.isError ? 'text-red-600' : 'text-gray-900'}`}>{tracking.isError ? tracking.text : 'Verified'}</p>
                    <p className={`text-[10px] text-center line-clamp-3 ${tracking.isError ? 'text-red-500' : 'text-gray-500'}`}>{tracking.step === 2 || tracking.isError ? tracking.subtext : 'Review'}</p>
                  </div>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 border-2 shrink-0 ${tracking.step >= 3 ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>3</div>
                    <p className="text-xs font-bold text-gray-900 text-center line-clamp-2">Approved</p>
                  </div>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 border-2 shrink-0 ${tracking.step >= 4 ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>4</div>
                    <p className="text-xs font-bold text-gray-900 text-center line-clamp-2">Refunded</p>
                  </div>
                </div>
              </div>

              {/* View Details Button */}
              <button 
                onClick={() => setViewingClaimDetails(claim)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-semibold text-sm"
              >
                <Eye size={18} />
                View Details
              </button>
            </div>
          );
        })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          ✅ THE NEW DOCUMENT VIEWER MODAL
          ──────────────────────────────────────────────────────────────────────── */}
      {viewingReceipts && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Digital Records & Receipts</h3>
                <p className="text-sm text-gray-500">{viewingReceipts.length} document(s) attached</p>
              </div>
              <button 
                onClick={() => setViewingReceipts(null)} 
                className="p-2 bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-600 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body (Scrollable Gallery) */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-100 space-y-6">
              {viewingReceipts.map((url, index) => {
                const isPdf = url.toLowerCase().endsWith('.pdf');
                return (
                  <div key={index} className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm relative group">
                    
                    {/* View in Full Screen Button */}
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="absolute top-4 right-4 bg-gray-900 bg-opacity-60 hover:bg-opacity-100 text-white p-2 rounded-lg transition-all z-10 flex items-center gap-2 text-sm backdrop-blur-sm"
                    >
                      <ExternalLink size={16} /> <span className="hidden sm:inline">Open in new tab</span>
                    </a>

                    {isPdf ? (
                      // If it's a PDF, show a nice icon block
                      <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <FileText size={64} className="text-red-500 mb-4" />
                        <h4 className="font-bold text-gray-900 mb-2">PDF Document {index + 1}</h4>
                        <p className="text-gray-500 text-sm max-w-xs mb-4">Browsers cannot preview some PDFs directly. Click the button above to view or download it.</p>
                      </div>
                    ) : (
                      // If it's an image, render it!
                      <div className="flex justify-center bg-gray-50 rounded-lg overflow-hidden">
                        <img 
                          src={url} 
                          alt={`Receipt ${index + 1}`} 
                          className="max-w-full h-auto object-contain max-h-[60vh] rounded"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
          </div>
        </div>
      )}

      {/* Claim Details Modal */}
      {viewingClaimDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Claim Details</h3>
                <p className="text-sm text-gray-600 mt-1">Claim ID: {viewingClaimDetails.claimId}</p>
              </div>
              <button 
                onClick={() => setViewingClaimDetails(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary Box */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-700 mb-2">✓ Successfully Submitted</p>
                <p className="text-sm text-gray-700">
                  Your {viewingClaimDetails.requestType === 'FEST_REIMBURSEMENT' ? 'fest reimbursement' : viewingClaimDetails.requestType === 'MESS_REBATE' ? 'mess rebate' : 'medical rebate'} claim has been submitted for verification.
                </p>
              </div>

              {/* Claim Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Claim Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium mb-1">Type</p>
                    <p className="text-sm font-semibold text-gray-900">{viewingClaimDetails.requestType === 'FEST_REIMBURSEMENT' ? 'Fest/Activity' : viewingClaimDetails.requestType === 'MESS_REBATE' ? 'Mess Rebate' : 'Medical Rebate'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium mb-1">Amount</p>
                    <p className="text-sm font-bold text-green-600">₹{viewingClaimDetails.amount.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      viewingClaimDetails.status === 'REFUNDED'
                        ? 'bg-green-100 text-green-700'
                        : viewingClaimDetails.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {viewingClaimDetails.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium mb-1">Submitted</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(viewingClaimDetails.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {viewingClaimDetails.requestType === 'FEST_REIMBURSEMENT' && viewingClaimDetails.festName && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 font-medium mb-1">Fest</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{viewingClaimDetails.festName}</p>
                    </div>
                  )}
                  {viewingClaimDetails.transactionId && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 font-medium mb-1">Transaction ID</p>
                      <p className="text-sm font-mono text-gray-900 truncate text-xs">{viewingClaimDetails.transactionId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">{viewingClaimDetails.description}</p>
              </div>

              {/* Attachments Section */}
              {((viewingClaimDetails.receiptUrls && viewingClaimDetails.receiptUrls.length > 0) || (viewingClaimDetails.attachments && viewingClaimDetails.attachments.length > 0)) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Attachments</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {(viewingClaimDetails.receiptUrls || viewingClaimDetails.attachments || []).length} file(s) attached
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 shrink-0">
              {((viewingClaimDetails.receiptUrls && viewingClaimDetails.receiptUrls.length > 0) || (viewingClaimDetails.attachments && viewingClaimDetails.attachments.length > 0)) && (
                <button
                  onClick={() => {
                    setViewingReceipts((viewingClaimDetails.receiptUrls || viewingClaimDetails.attachments?.map((attachment: any) => attachment.url) || []).filter(Boolean));
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
                >
                  <Eye size={16} />
                  View Photos
                </button>
              )}
              <button
                onClick={() => setViewingClaimDetails(null)}
                className="flex-1 py-2.5 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Delete Claim?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete this claim? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTarget && handleDeleteClaim(deleteTarget)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
