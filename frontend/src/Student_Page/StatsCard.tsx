import { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

// ==========================================
// ─── CLAIM STATUS CARD ────────────────────
// ==========================================

// ✅ FIX 1: Changed status from a strict union to 'string'
export interface Claim {
  id: string;
  type: string;
  amount: number;
  status: string; 
  date: string;
  description: string;
}

interface ClaimStatusCardProps {
  claim: Claim;
  onClick?: () => void;
}

export function ClaimStatusCard({ claim, onClick }: ClaimStatusCardProps) {
  
  // ✅ FIX 2: Smarter color logic using .includes()
  const getStatusConfig = (status: string) => {
    const lowerStatus = status.toLowerCase();

    if (lowerStatus.includes('approved')) {
      return {
        color: 'text-yellow-700',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
      };
    }
    if (lowerStatus.includes('refunded')) {
      return {
        color: 'text-green-700', // Beautiful green for fully completed refunds!
        bg: 'bg-green-50',
        border: 'border-green-200',
      };
    }
    if (lowerStatus.includes('rejected')) {
      return {
        color: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-200',
      };
    }
    if (lowerStatus.includes('processing')) {
      return {
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      };
    }
    
    // Default fallback (catches all the "Pending (VP)", "Pending (Team Coord)", etc.)
    return {
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    };
  };

  const statusConfig = getStatusConfig(claim.status);

  return (
    <div 
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-lg p-5 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-all' : ''}`}
    >
      {/* Header Row: Category and Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">{claim.type}</h3>
        
        {/* ✅ FIX 3: Print claim.status directly so it shows the exact text from the database */}
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
          {claim.status} 
        </span>
      </div>
      
      {/* Bottom Row: Amount and Date */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">Amount</p>
          <p className="text-2xl font-bold text-gray-900">₹{claim.amount.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Date</p>
          <p className="text-sm font-medium text-gray-700">{claim.date}</p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ─── STATS CARD ───────────────────────────
// ==========================================

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorScheme?: 'green' | 'yellow' | 'blue';
}

export function StatsCard({ title, value, icon: Icon, colorScheme = 'green' }: StatsCardProps) {
  const getColorClasses = () => {
    switch (colorScheme) {
      case 'green':
        return {
          cardBg: 'bg-green-50',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-700',
        };
      case 'yellow':
        return {
          cardBg: 'bg-yellow-50',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-700',
        };
      case 'blue':
        return {
          cardBg: 'bg-blue-50',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-700',
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className={`${colors.cardBg} border border-gray-200 rounded-lg p-6 shadow-md`}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 ${colors.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={colors.iconColor} size={26} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-gray-600 font-medium mb-1.5">{title}</p>
          <p className="text-3xl font-bold text-gray-800 tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}