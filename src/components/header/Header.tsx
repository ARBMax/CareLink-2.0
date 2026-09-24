import React, { useState, useEffect } from 'react';
import { Activity, Bell, Clock } from 'lucide-react';
import { KPIStats } from '../../types';

interface HeaderProps {
  stats: KPIStats;
  unreadNotificationsCount: number;
  onToggleNotificationDrawer: () => void;
  activeView: string;
  onSelectView: (view: string) => void;
  isBackendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  unreadNotificationsCount,
  onToggleNotificationDrawer,
  onSelectView,
  isBackendConnected = false,
}) => {

  const [timeUtc, setTimeUtc] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeUtc(now.toISOString().substring(11, 19) + ' UTC');
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-5 sm:px-8 flex items-center justify-between gap-6 z-40 shrink-0">
      {/* Left: Brand */}
      <div 
        onClick={() => onSelectView('dashboard')}
        className="flex items-center gap-3 cursor-pointer group select-none"
      >
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:border-teal-400 transition-colors">
          <Activity className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold tracking-wider text-slate-100 font-mono">
            CARELINK
          </span>
          <span className="text-[11px] text-slate-500 font-sans hidden sm:inline">
            Humanitarian Intelligence
          </span>
        </div>
      </div>

      {/* Center: Clean Operational State Badge */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/60 border border-slate-800/80 rounded-full text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse-subtle" />
          <span className="text-slate-300 font-semibold">DEFCON 2</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">{stats.criticalEmergencies} Red Zones</span>
        </div>
        <button
          onClick={() => onSelectView('telemetry')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors ${
            isBackendConnected 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-semibold">{isBackendConnected ? 'BACKEND: CONNECTED' : 'BACKEND: STANDALONE'}</span>
        </button>
      </div>


      {/* Right: Clock & Notifications */}
      <div className="flex items-center gap-4">
        {/* UTC Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{timeUtc}</span>
        </div>

        {/* Notification Bell */}
        <button
          id="btn-header-notifications"
          onClick={onToggleNotificationDrawer}
          className="relative p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-800/80 transition-all active:scale-95"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-teal-500 text-slate-950 font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* User Avatar */}
        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-slate-300 select-none">
          SC
        </div>
      </div>
    </header>
  );
};
