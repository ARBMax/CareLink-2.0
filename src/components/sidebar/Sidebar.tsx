import React from 'react';
import { 
  LayoutDashboard, 
  Globe2, 
  Sparkles, 
  FileText, 
  Radio, 
  ChevronLeft, 
  ChevronRight,
  Wifi,
  CloudLightning,
  BookOpen,
  ClipboardCheck,
  Target,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  criticalCount: number;
  pendingMatchesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  criticalCount,
  pendingMatchesCount,
}) => {
  const coreNavItems = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'globe',
      label: '3D Operations',
      icon: Globe2,
      badge: criticalCount > 0 ? `${criticalCount}` : null,
      badgeColor: 'bg-rose-500/10 text-rose-400',
    },
    {
      id: 'smart-match',
      label: 'Smart Match',
      icon: Sparkles,
      badge: pendingMatchesCount > 0 ? `${pendingMatchesCount}` : null,
      badgeColor: 'bg-teal-500/10 text-teal-400',
    },
    {
      id: 'ingestion',
      label: 'Field Reports',
      icon: FileText,
      badge: null,
    },
    {
      id: 'telemetry',
      label: '24/7 Live Feed',
      icon: Radio,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-500/10 text-emerald-400',
    },
  ];

  const lifecycleNavItems = [
    {
      id: 'early-warning',
      label: 'Early Warning',
      icon: CloudLightning,
      badge: '5',
      badgeColor: 'bg-amber-500/10 text-amber-400',
    },
    {
      id: 'preparedness',
      label: 'Preparedness',
      icon: BookOpen,
      badge: null,
    },
    {
      id: 'after-action',
      label: 'After-Action',
      icon: ClipboardCheck,
      badge: null,
    },
    {
      id: 'recovery',
      label: 'Recovery',
      icon: Target,
      badge: '2',
      badgeColor: 'bg-teal-500/10 text-teal-400',
    },
  ];

  const renderNavItem = (item: typeof coreNavItems[number]) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    return (
      <button
        key={item.id}
        id={`nav-item-${item.id}`}
        onClick={() => onSelectView(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
          isActive
            ? 'bg-slate-800 text-teal-300 font-medium shadow-sm'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
        }`}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
        {!isCollapsed && (
          <div className="flex-1 flex items-center justify-between min-w-0">
            <span className="text-xs truncate">{item.label}</span>
            {item.badge && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium ${item.badgeColor}`}>
                {item.badge}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`bg-slate-900/70 border-r border-slate-700/60 transition-all duration-300 flex flex-col z-30 shrink-0 select-none ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Top Sidebar Collapse Toggle */}
      <div className="p-3 border-b border-slate-700/40 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider pl-2 font-medium">
            Navigation
          </span>
        )}
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-md hover:bg-slate-800/60 text-slate-500 hover:text-slate-300 mx-auto transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {/* Core Operations */}
        <div className="space-y-1 mb-3">
          {!isCollapsed && (
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider px-3 py-1">
              Operations
            </div>
          )}
          {coreNavItems.map(renderNavItem)}
        </div>

        {/* Lifecycle Management Divider */}
        {!isCollapsed && (
          <div className="border-t border-slate-700/50 my-2" />
        )}

        {/* Lifecycle Management */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider px-3 py-1">
              Disaster Lifecycle
            </div>
          )}
          {lifecycleNavItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Minimal Footer Status */}
      <div className="p-3 border-t border-slate-700/40 text-slate-500 text-[11px] font-mono flex items-center gap-2">
        <Wifi className="w-3.5 h-3.5 text-teal-400" />
        {!isCollapsed && <span>Sat-Link Online</span>}
      </div>
    </aside>
  );
};
