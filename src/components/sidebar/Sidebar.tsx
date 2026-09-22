import React from 'react';
import { 
  LayoutDashboard, 
  Globe2, 
  Sparkles, 
  FileText, 
  Radio, 
  Activity,
  ChevronLeft, 
  ChevronRight,
  Wifi
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  criticalCount: number;
  pendingMatchesCount: number;
  signalsCount?: number;
  onReplayStartup?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  criticalCount,
  pendingMatchesCount,
  signalsCount = 0,
  onReplayStartup,
}) => {
  const navItems = [
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
      id: 'signal-radar',
      label: 'Signal Radar',
      icon: Radio,
      badge: signalsCount > 0 ? `${signalsCount}` : 'LIVE',
      badgeColor: 'bg-sky-500/10 text-sky-400',
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
      label: 'Telemetry Feed',
      icon: Activity,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-500/10 text-emerald-400',
    },
  ];

  return (
    <aside
      className={`bg-slate-950/70 border-r border-slate-800/60 transition-all duration-300 flex flex-col z-30 shrink-0 select-none ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Top Sidebar Collapse Toggle */}
      <div className="p-3 border-b border-slate-800/40 flex items-center justify-between">
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
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
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
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-xs truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Replay Intro Screen */}
      {onReplayStartup && (
        <div className="p-2 border-t border-slate-800/40">
          <button
            onClick={onReplayStartup}
            id="btn-sidebar-replay-intro"
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300 transition-colors text-xs font-mono"
            title={isCollapsed ? 'Replay Startup Intro' : undefined}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            {!isCollapsed && <span className="truncate">Startup Intro</span>}
          </button>
        </div>
      )}

      {/* Minimal Footer Status */}
      <div className="p-3 border-t border-slate-800/40 text-slate-500 text-[11px] font-mono flex items-center gap-2">
        <Wifi className="w-3.5 h-3.5 text-teal-400" />
        {!isCollapsed && <span>Sat-Link Online</span>}
      </div>
    </aside>
  );
};
