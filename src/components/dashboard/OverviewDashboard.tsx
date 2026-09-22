import React, { useState } from 'react';
import { 
  Incident, 
  Volunteer, 
  DispatchArc, 
  GlobeLayerState, 
  TelemetryLog, 
  KPIStats 
} from '../../types';
import { Globe3D } from '../globe/Globe3D';
import { GlobeControls } from '../globe/GlobeControls';
import { TelemetryFeed } from '../monitoring/TelemetryFeed';
import { 
  AlertOctagon, 
  Activity, 
  Sparkles, 
  Users, 
  ChevronRight, 
  MapPin, 
  Radio, 
  Maximize2,
  Minimize2
} from 'lucide-react';

interface OverviewDashboardProps {
  incidents: Incident[];
  volunteers: Volunteer[];
  dispatchArcs: DispatchArc[];
  layerState: GlobeLayerState;
  onToggleLayer: (layerKey: keyof GlobeLayerState) => void;
  telemetryLogs: TelemetryLog[];
  stats: KPIStats;
  selectedIncident: Incident;
  onSelectIncident: (inc: Incident) => void;
  onOpenSmartMatch: (inc: Incident) => void;
  onSimulateBurst: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  incidents,
  volunteers,
  dispatchArcs,
  layerState,
  onToggleLayer,
  telemetryLogs,
  stats,
  selectedIncident,
  onSelectIncident,
  onOpenSmartMatch,
  onSimulateBurst,
}) => {
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'FEED'>('QUEUE');
  const [isGlobeExpanded, setIsGlobeExpanded] = useState(false);

  // High urgency incidents
  const criticalQueue = incidents
    .slice()
    .sort((a, b) => b.severityScore - a.severityScore);

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto">
      {/* 1. Clean KPI Metric Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* Active Crises */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400">ACTIVE CRISES</div>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
              {incidents.length}
            </div>
            <div className="text-xs text-rose-400 mt-0.5">
              {stats.criticalEmergencies} Critical Zones
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        {/* Telemetry Ingestion */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400">TELEMETRY RATE</div>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
              {stats.telemetryIngestionRate.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-400 mt-0.5">pkts/min • Optimal</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Smart Matches */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400">MATCHES PENDING</div>
            <div className="text-2xl font-bold font-mono text-teal-300 mt-1">
              {stats.smartMatchesPending}
            </div>
            <div className="text-xs text-teal-400 mt-0.5">Ready for dispatch</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Responders */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400">RESPONDERS</div>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
              {stats.volunteersDeployed}
            </div>
            <div className="text-xs text-sky-400 mt-0.5">
              {stats.volunteersAvailable} On Standby
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Main Work Area: 3D Globe + Incident Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[500px]">
        {/* Left: 3D Globe (Expansive) */}
        <div className={`${isGlobeExpanded ? 'lg:col-span-12' : 'lg:col-span-7 xl:col-span-8'} flex flex-col gap-3 min-h-[460px] transition-all`}>
          <div className="relative flex-1 w-full rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950">
            <Globe3D
              incidents={incidents}
              volunteers={volunteers}
              dispatchArcs={dispatchArcs}
              layerState={layerState}
              selectedIncidentId={selectedIncident.id}
              onSelectIncident={onSelectIncident}
              onOpenSmartMatch={onOpenSmartMatch}
              isExpanded={isGlobeExpanded}
              onToggleExpand={() => setIsGlobeExpanded(!isGlobeExpanded)}
            />
          </div>

          {/* Simple Layer Controls */}
          <GlobeControls
            layerState={layerState}
            onToggleLayer={onToggleLayer}
            disasterCount={incidents.length}
            volunteerCount={volunteers.length}
            arcsCount={dispatchArcs.length}
          />
        </div>

        {/* Right: Priority Queue / Telemetry Feed */}
        {!isGlobeExpanded && (
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden min-h-[460px]">
            {/* Header Tabs */}
            <div className="p-2 border-b border-slate-800/80 flex items-center gap-1 bg-slate-950/40 text-xs font-mono">
              <button
                onClick={() => setActiveTab('QUEUE')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'QUEUE'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Crises ({criticalQueue.length})
              </button>
              <button
                onClick={() => setActiveTab('FEED')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'FEED'
                    ? 'bg-slate-800 text-teal-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>24/7 Live Feed</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {activeTab === 'QUEUE' ? (
                criticalQueue.map((inc) => {
                  const isSelected = inc.id === selectedIncident.id;

                  return (
                    <div
                      key={inc.id}
                      onClick={() => onSelectIncident(inc)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/90 border-teal-500/70 text-slate-100'
                          : 'bg-slate-950/50 border-slate-800/60 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-mono font-bold text-teal-400">
                          {inc.code}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                            inc.urgency === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {inc.urgency}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {inc.title}
                      </h4>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{inc.locationName}, {inc.country}</span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-mono text-slate-400">
                          Severity: <span className="text-slate-200 font-bold">{inc.severityScore}%</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSmartMatch(inc);
                          }}
                          className="px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded transition-colors flex items-center gap-1"
                        >
                          <span>Match</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <TelemetryFeed
                  logs={telemetryLogs}
                  incidents={incidents}
                  onSelectIncidentById={(id) => {
                    const inc = incidents.find((i) => i.id === id);
                    if (inc) onSelectIncident(inc);
                  }}
                  onSimulateBurst={onSimulateBurst}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
