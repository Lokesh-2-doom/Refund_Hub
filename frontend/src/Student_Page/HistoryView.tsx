import { useState, useEffect } from 'react';
import { Download, Calendar, DollarSign, FileText, CheckCircle, Filter, Search, XCircle, Clock } from 'lucide-react';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

export function HistoryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'Mess Rebate' | 'Fest/Activity' | 'Medical Rebate'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'refunded' | 'verified'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  
  // ✅ NEW: State for real database claims
  const [claims, setClaims] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistoryData = async () => {
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
        console.error("Failed to fetch history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryData();
  }, []);

  const formatCategory = (type: string) => {
    if (type === 'FEST_REIMBURSEMENT') return 'Fest/Activity';
    if (type === 'MESS_REBATE') return 'Mess Rebate';
    if (type === 'MEDICAL_REBATE') return 'Medical Rebate';
    return type;
  };

  const formatDateRange = (from?: string, to?: string) => {
    if (!from || !to) return null;
    return `${new Date(from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const getStatusGroup = (status: string) => {
    if (status === 'REFUNDED') return 'refunded';
    if (status === 'UNDER_PROCESS') return 'approved';
    if (status === 'PUSHED_TO_ACCOUNTS') return 'approved';
    if (status === 'APPROVED') return 'approved';
    if (status.includes('VERIFIED')) return 'verified';
    if (status.includes('PENDING')) return 'pending';
    return 'all';
  };
// Filter and search
// Filter, search, and Time Limit
  const filteredData = claims.filter((claim) => {
    // ✅ NEW: 1.5 Year Time Limit (18 Months)
    const claimDate = new Date(claim.createdAt);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 18); // Subtract 18 months from today
    
    // If the claim is older than the cutoff date, hide it immediately!
    if (claimDate < cutoffDate) return false;

    const categoryName = formatCategory(claim.requestType);
    const description = claim.requestType === 'FEST_REIMBURSEMENT' 
      ? `${claim.festName} - ${claim.description}` 
      : claim.description;

    const matchesSearch = 
      claim.claimId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.transactionId?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter = filterCategory === 'all' || categoryName === filterCategory;
    const matchesStatus = filterStatus === 'all' || getStatusGroup(claim.status) === filterStatus;
    
    return matchesSearch && matchesFilter && matchesStatus;
  });

  // Sort
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'date') {
      // ✅ FIX: MongoDB uses 'createdAt' instead of 'date'
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return b.amount - a.amount;
    }
  });

  const totalAmount = filteredData.reduce((sum, claim) => sum + claim.amount, 0);
  
 // ✅ FIX 1: Changed the type to a simple string
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Mess Rebate':
        return 'text-orange-700 bg-orange-50 border-orange-200'; // (Optional: I gave them nice distinct colors!)
      case 'Fest/Activity':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Medical Rebate':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        // ✅ FIX 2: Added a default fallback so TypeScript doesn't complain about undefined returns
        return 'text-gray-700 bg-gray-100 border-gray-200'; 
    }
  };
const getStatusBadge = (status: string) => {
    // 1. Fully Completed & Paid (Green)
    if (status === 'REFUNDED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-full">
          <CheckCircle size={12} /> Refunded
        </span>
      );
    }

    // 2. Approved but waiting for Bank Transfer (Blue)
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-full">
          <CheckCircle size={12} /> Approved
        </span>
      );
    }

    if (status === 'PUSHED_TO_ACCOUNTS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
          <CheckCircle size={12} /> Sent to Accounts
        </span>
      );
    }

    if (status === 'UNDER_PROCESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
          <CheckCircle size={12} /> Sent to Accounts
        </span>
      );
    }

    // 3. Rejected (Red)
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-full">
          <XCircle size={12} /> Rejected
        </span>
      );
    }
    
    // 4. Detailed Pending States (Yellow)
    let pendingText = 'Pending';
    if (status === 'PENDING_TEAM_COORD') pendingText = 'Pending (Team Coord)';
    if (status === 'PENDING_FEST_COORD') pendingText = 'Pending (Fest Coord)';
    if (status === 'PENDING_COORD') pendingText = 'Pending (Coordinator)';
    if (status === 'PENDING_FC') pendingText = 'Pending (Fest Coord)';
    if (status === 'PENDING_MESS_MANAGER') pendingText = 'Pending (Mess Mgr)';
    if (status === 'PENDING_VP') pendingText = 'Pending (VP)';
    if (status === 'PENDING_ACADEMIC') pendingText = 'Pending (Academic)';

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">
        <Clock size={12} /> {pendingText}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Claim History</h1>
          <p className="text-gray-600">
            Complete record of all your claims with current status
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Claim ID, Transaction ID, or description..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white appearance-none cursor-pointer text-sm min-w-[180px]"
            >
              <option value="all">All Categories</option>
              <option value="Mess Rebate">Mess Rebate</option>
              <option value="Fest/Activity">Fest/Activity</option>
              <option value="Medical Rebate">Medical Rebate</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white appearance-none cursor-pointer text-sm min-w-[160px]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="approved">Approved</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white cursor-pointer text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Claim ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date / Period
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.map((claim) => {
                const isFest = claim.requestType === 'FEST_REIMBURSEMENT';
                const isMess = claim.requestType === 'MESS_REBATE';
                const messRange = formatDateRange(claim.messAbsenceFrom, claim.messAbsenceTo);
                return (
                <tr key={claim._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-mono font-semibold text-gray-900">{claim.claimId}</p>
                      <p className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">
                        {isFest ? `${claim.festName} - ${claim.description}` : claim.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium border text-gray-700 bg-gray-100 border-gray-200">
                      {formatCategory(claim.requestType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {isMess && messRange
                        ? messRange
                        : new Date(claim.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">₹{claim.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(claim.status)}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedData.length}</span> claims
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {sortedData.map((claim) => {
          const isFest = claim.requestType === 'FEST_REIMBURSEMENT';
          const isMess = claim.requestType === 'MESS_REBATE';
          const messRange = formatDateRange(claim.messAbsenceFrom, claim.messAbsenceTo);
          return (
          <div key={claim._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex-1">
                <p className="font-mono text-sm font-semibold text-gray-900 mb-1">{claim.claimId}</p>
                <p className="text-xs text-gray-500">
                  {isFest ? `${claim.festName} - ${claim.description}` : claim.description}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Category</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border text-gray-700 bg-gray-100 border-gray-200">
                  {formatCategory(claim.requestType)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{isMess ? 'Period' : 'Date'}</span>
                <span className="text-sm font-medium text-gray-900">
                  {isMess && messRange
                    ? messRange
                    : new Date(claim.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-600">Amount</span>
                <span className="text-lg font-semibold text-gray-900">₹{claim.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-600">Status</span>
                {getStatusBadge(claim.status)}
              </div>
            </div>
          </div>
        )})}

        {/* Mobile Footer Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Claims</p>
              <p className="text-xl font-bold text-gray-900">{sortedData.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 mb-1">Total Amount</p>
              <p className="text-xl font-bold text-gray-900">₹{totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {sortedData.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No claims found</h3>
          <p className="text-gray-600">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Bank Statement Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-xs text-gray-600">
          This is an official digital statement generated by the Refund & Rebate Hub. 
          All transactions are verified and processed through secure channels.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Statement generated on: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
