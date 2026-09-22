import React, { useState, useRef } from 'react';
import { TelemetryLog, Incident } from '../../types';
import { 
  Search, 
  Play, 
  Pause, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  RefreshCw
} from 'lucide-react';

interface TelemetryFeedProps {
  logs: TelemetryLog[];
  incidents: Incident[];
  onSelectIncidentById?: (id: string) => void;
  onSimulateBurst?: () => void;
}

export const TelemetryFeed: React.FC<TelemetryFeedProps> = ({
  logs,
  incidents,
  onSelectIncidentById,
  onSimulateBurst,
}) => {
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (selectedUrgency !== 'ALL') {
      const incident = incidents.find((i) => i.id === log.incidentId);
      if (selectedUrgency === 'CRITICAL' && log.level !== 'CRITICAL' && incident?.urgency !== 'CRITICAL') return false;
      if (selectedUrgency === 'WARN' && log.level !== 'WARN' && incident?.urgency !== 'HIGH') return false;
      if (selectedUrgency === 'SUCCESS' && log.level !== 'SUCCESS') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchSource = log.source.toLowerCase().includes(q);
      return matchMsg || matchSource;
    }

    return true;
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
            Live Telemetry Feed
          </h3>
          <span className="text-[10px] font-mono text-slate-500">
            ({filteredLogs.length} events)
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {onSimulateBurst && (
            <button
              id="btn-simulate-packet"
              onClick={onSimulateBurst}
              title="Simulate incoming signal"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-teal-400" />
              <span>Simulate</span>
            </button>
          )}
          <button
            id="btn-feed-pause"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume feed' : 'Pause feed'}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3 border-b border-slate-800/60 bg-slate-950/20 flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search signals or sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-6 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Urgency Filter Pills */}
        <div className="flex items-center gap-1 w-full sm:w-auto">
          {(['ALL', 'CRITICAL', 'WARN', 'SUCCESS'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedUrgency(lvl)}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                selectedUrgency === lvl
                  ? 'bg-teal-500/20 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Scrolling Stream List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            No events match criteria.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const linkedIncident = incidents.find((i) => i.id === log.incidentId);

            return (
              <div
                key={log.id}
                onClick={() => {
                  if (log.incidentId && onSelectIncidentById) {
                    onSelectIncidentById(log.incidentId);
                  }
                }}
                className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 hover:border-slate-700 transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <div className="flex items-center gap-1.5">
                    {log.level === 'CRITICAL' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded font-medium">
                        <AlertCircle className="w-3 h-3" />
                        CRITICAL
                      </span>
                    )}
                    {log.level === 'WARN' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        WARN
                      </span>
                    )}
                    {log.level === 'SUCCESS' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        MATCH
                      </span>
                    )}
                    {log.level === 'INFO' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded font-medium">
                        <Info className="w-3 h-3" />
                        INFO
                      </span>
                    )}

                    <span className="text-slate-400 font-mono text-[10px]">
                      {log.source}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500">
                    {log.timestamp}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans text-xs">
                  {log.message}
                </p>

                {linkedIncident && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-teal-400">
                    <span>Target: {linkedIncident.code} ({linkedIncident.country})</span>
                    <span className="hover:underline">View details →</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
