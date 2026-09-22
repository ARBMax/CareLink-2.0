import React, { useState, useEffect } from 'react';
import { Activity, Bell, Clock, Volume2, VolumeX, Radio, Zap } from 'lucide-react';
import { KPIStats } from '../../types';

interface HeaderProps {
  stats: KPIStats;
  unreadNotificationsCount: number;
  onToggleNotificationDrawer: () => void;
  activeView: string;
  onSelectView: (view: string) => void;
  isAudioMuted: boolean;
  onToggleAudioMute: () => void;
  signalsCount?: number;
  onTriggerSurge?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  unreadNotificationsCount,
  onToggleNotificationDrawer,
  onSelectView,
  isAudioMuted,
  onToggleAudioMute,
  signalsCount = 0,
  onTriggerSurge,
}) => {
  const [timeUtc, setTimeUtc] = useState('');
  const [latencyMs, setLatencyMs] = useState(22);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeUtc(now.toISOString().substring(11, 19) + ' UTC');
      // Subtle realistic jitter in network latency
      setLatencyMs(Math.floor(18 + Math.random() * 8));
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-4 sm:px-6 flex items-center justify-between gap-4 z-40 shrink-0">
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

      {/* Center: Clean Operational State Badge & Live Stream Bus */}
      <div className="hidden lg:flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/60 border border-slate-800/80 rounded-full text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse-subtle" />
          <span className="text-slate-300 font-semibold">DEFCON 2</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">{stats.criticalEmergencies} Red Zones</span>
        </div>

        {/* Real-Time WebSocket / SSE Bus Indicator */}
        <div 
          className="flex items-center gap-2 px-2.5 py-1 bg-slate-900/80 border border-emerald-500/30 rounded-full text-[11px] font-mono text-emerald-300"
          title="FastAPI WebSocket & SSE Real-time Broadcast Bus"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">SSE BUS</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400/90">{latencyMs}ms</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono text-[10px]">48 pkts/s</span>
        </div>

        {/* Signal Radar Quick Access */}
        <button
          onClick={() => onSelectView('signal-radar')}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-300 rounded-full text-[11px] font-mono transition-colors"
          title="View Live Signal Radar"
        >
          <Radio className="w-3 h-3 text-sky-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>SIGNALS ({signalsCount})</span>
        </button>
      </div>

      {/* Right: Sound, Clock, Spike Trigger & Notifications */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Rapid Spike Simulation Button */}
        {onTriggerSurge && (
          <button
            onClick={onTriggerSurge}
            id="btn-header-surge"
            title="Simulate sudden disaster report spike"
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/50 text-rose-300 text-[11px] font-mono transition-all active:scale-95 shadow-sm"
          >
            <Zap className="w-3 h-3 text-rose-400" />
            <span>Spike Sim</span>
          </button>
        )}

        {/* Audio Alert Mute Toggle */}
        <button
          id="btn-toggle-audio-alerts"
          onClick={onToggleAudioMute}
          title={isAudioMuted ? 'Unmute Emergency Radar Alerts' : 'Mute Emergency Audio Alerts'}
          className={`p-1.5 rounded-lg border transition-colors ${
            isAudioMuted
              ? 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
              : 'bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20'
          }`}
        >
          {isAudioMuted ? (
            <VolumeX className="w-4 h-4 text-slate-500" />
          ) : (
            <Volume2 className="w-4 h-4 text-teal-400" />
          )}
        </button>

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
