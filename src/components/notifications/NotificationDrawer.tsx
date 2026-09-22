import React, { useState } from 'react';
import { X, Bell, CheckCircle2, AlertTriangle, ShieldAlert, Send, ArrowRight, CheckCheck } from 'lucide-react';
import { Incident } from '../../types';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'CRITICAL' | 'DISPATCH' | 'SYSTEM';
  incidentId?: string;
  isRead: boolean;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onSelectIncidentById?: (incidentId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onSelectIncidentById,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'DISPATCH'>('ALL');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((notif) => {
    if (filterType === 'ALL') return true;
    return notif.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800/90 h-full shadow-2xl flex flex-col z-10 animate-slide-in-right">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
                DISASTER DISPATCHES
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {notifications.filter((n) => !n.isRead).length} Unread System Notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-xs text-teal-400 hover:text-teal-300 font-mono flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-900 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Read all</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/30 flex items-center gap-2 text-xs font-mono">
          {(['ALL', 'CRITICAL', 'DISPATCH'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterType === tab
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs font-mono">
              No recent notifications in telemetry buffer.
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                  !notif.isRead
                    ? 'bg-slate-900/90 border border-teal-500/40 shadow-lg'
                    : 'bg-slate-900/40 border border-slate-800/80 hover:border-slate-700'
                }`}
                onClick={() => {
                  if (notif.incidentId && onSelectIncidentById) {
                    onSelectIncidentById(notif.incidentId);
                    onClose();
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {notif.type === 'CRITICAL' && (
                      <span className="p-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {notif.type === 'DISPATCH' && (
                      <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Send className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {notif.type === 'SYSTEM' && (
                      <span className="p-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <h4 className="text-xs font-bold text-slate-100 font-sans">
                      {notif.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {notif.timestamp}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed pl-7">
                  {notif.description}
                </p>

                {notif.incidentId && (
                  <div className="mt-2.5 pl-7 flex items-center gap-1.5 text-[11px] text-teal-400 font-mono hover:text-teal-300 font-semibold">
                    <span>Inspect Target Location</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
