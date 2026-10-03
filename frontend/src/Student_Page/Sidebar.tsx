import { useState } from 'react';
import {
  LayoutDashboard, FileText, History, User, Users, CheckSquare,
  LogOut, Menu, X, ChevronRight
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'FEST_COORDINATOR' | 'COORDINATOR' | 'SUB_COORDINATOR';

export interface NavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  requiredRoles?: Role[]; // undefined = visible to everyone
}

export interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  userRole?: Role | null; // null/undefined = regular student
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export interface MobileHeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

// ─── Nav items config ─────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',              icon: LayoutDashboard },
  { id: 'claims',    label: 'My Claims',               icon: FileText },
  { id: 'history',   label: 'History',                 icon: History },
  {
    id: 'manage-team',
    label: 'Manage Team',
    icon: Users,
    requiredRoles: ['FEST_COORDINATOR', 'COORDINATOR'],
  },
  {
    id: 'approve-reimbursement',
    label: 'Approve Reimbursement',
    icon: CheckSquare,
    requiredRoles: ['FEST_COORDINATOR', 'COORDINATOR'],
  },
  { id: 'profile',   label: 'Profile',                 icon: User },
];

// ─── Sidebar Item ─────────────────────────────────────────────────────────────

function SidebarItem({
  item,
  isActive,
  onClick,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  collapsed?: boolean;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`
        w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-left
        ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'}
        ${isActive
          ? 'bg-green-600 text-white shadow-sm shadow-green-200'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
      `}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && (
        <span className="text-sm font-semibold truncate flex-1">{item.label}</span>
      )}
      {!collapsed && isActive && (
        <ChevronRight size={14} className="text-white/70 shrink-0" />
      )}
    </button>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({ activeItem, onItemClick, userRole, mobileOpen, onMobileToggle }: SidebarProps) {
  // Manage mobile state securely
  const [isLocalOpen, setIsLocalOpen] = useState(false);
  const isOpen = mobileOpen !== undefined ? mobileOpen : isLocalOpen;
  const toggleMenu = () => onMobileToggle ? onMobileToggle() : setIsLocalOpen(!isLocalOpen);

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.requiredRoles || (userRole && item.requiredRoles.includes(userRole))
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
          RH
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">Refund Hub</p>
          <p className="text-xs text-gray-500 truncate">Campus Portal</p>
        </div>
        {/* Mobile close */}
        {onMobileToggle && (
         <button
          onClick={toggleMenu}
          className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden"
        >
          <X size={16} />
        </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Regular items */}
        {visibleItems
          .filter(i => i.id !== 'profile')
          .map(item => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={activeItem === item.id}
             onClick={() => { onItemClick(item.id); toggleMenu(); }}
            />
          ))}

        {/* Divider before role-specific items (if any) */}
        {userRole && (userRole === 'FEST_COORDINATOR' || userRole === 'COORDINATOR') && (
          <div className="pt-2 pb-1">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Fest Management
            </p>
          </div>
        )}
      </nav>

      {/* Bottom: Profile */}
      <div className="px-3 py-3 border-t border-gray-100">
        <SidebarItem
          item={NAV_ITEMS.find(i => i.id === 'profile')!}
          isActive={activeItem === 'profile'}
         onClick={() => { onItemClick('profile'); toggleMenu(); }}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Floating Mobile Hamburger Button */}
      {!isOpen && (
        <button
          onClick={toggleMenu}
          className="lg:hidden fixed top-4 left-4 z-[100] p-2.5 bg-white border border-gray-200 shadow-md rounded-xl text-gray-800 hover:bg-gray-50 flex items-center justify-center transition-all active:scale-95"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-100 shrink-0 h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
            RH
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Refund Hub</p>
            <p className="text-xs text-gray-500">Campus Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {visibleItems
            .filter(i => !['profile'].includes(i.id))
            .map((item, idx) => {
              // Insert section label before fest-management items
              const isFestItem = item.requiredRoles && item.requiredRoles.length > 0;
              const prevItem = visibleItems.filter(i => !['profile'].includes(i.id))[idx - 1];
              const prevIsFest = prevItem?.requiredRoles && prevItem.requiredRoles.length > 0;
              const showLabel = isFestItem && !prevIsFest;

              return (
                <div key={item.id}>
                  {showLabel && (
                    <div className="pt-3 pb-1">
                      <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Fest Management
                      </p>
                    </div>
                  )}
                  <SidebarItem
                    item={item}
                    isActive={activeItem === item.id}
                    onClick={() => onItemClick(item.id)}
                  />
                </div>
              );
            })}
        </nav>

        <div className="px-3 py-3 border-t border-gray-100">
          <SidebarItem
            item={NAV_ITEMS.find(i => i.id === 'profile')!}
            isActive={activeItem === 'profile'}
            onClick={() => onItemClick('profile')}
          />
        </div>
      </aside>

      {/* Mobile: slide-over overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={toggleMenu} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl overflow-hidden">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

// ─── Mobile Header ─────────────────────────────────────────────────────────────

export function MobileHeader({ title }: MobileHeaderProps) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-16 px-5 flex items-center gap-3">
        {/* Space for hamburger menu button (button is positioned fixed in Sidebar) */}
        <div className="w-11 h-11 flex-shrink-0" />
        
        {/* Page Title - Fills remaining width and wraps if needed */}
        <h1 className="flex-1 text-lg font-bold text-gray-900 leading-tight">
          {title}
        </h1>
      </div>
    </div>
  );
}