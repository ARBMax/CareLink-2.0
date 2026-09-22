import React, { useState } from 'react';
import { Incident, Volunteer, DispatchArc, GlobeLayerState } from '../../types';
import { Globe3D } from './Globe3D';
import { GlobeControls } from './GlobeControls';
import { 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Plane,
  ArrowRight,
  Radio,
  Gauge,
  Clock,
  Package,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface GlobeOperationalViewProps {
  incidents: Incident[];
  volunteers: Volunteer[];
  dispatchArcs: DispatchArc[];
  layerState: GlobeLayerState;
  onToggleLayer: (layerKey: keyof GlobeLayerState) => void;
  selectedIncident: Incident;
  onSelectIncident: (inc: Incident) => void;
  onOpenSmartMatch: (inc: Incident) => void;
}

export const GlobeOperationalView: React.FC<GlobeOperationalViewProps> = ({
  incidents,
  volunteers,
  dispatchArcs,
  layerState,
  onToggleLayer,
  selectedIncident,
  onSelectIncident,
  onOpenSmartMatch,
}) => {
  const [activeSidePanel, setActiveSidePanel] = useState<'INCIDENTS' | 'DISPATCHES'>('INCIDENTS');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const activeTransits = dispatchArcs.filter((a) => a.status === 'EN_ROUTE');
  const criticalIncidents = incidents.filter((i) => i.urgency === 'CRITICAL');

  return (
    <div className="relative w-full h-full flex flex-col gap-3 min-h-[600px]">
      {/* Real-Time Operational Ribbon across top of globe */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-rose-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>GLOBAL THEATER REAL-TIME:</span>
          </div>
          <span className="text-slate-300">
            {criticalIncidents.length} Critical Emergencies • {activeTransits.length} In-Flight Airbridge Transits
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedIncident && (
            <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 text-[11px]">
              <span className="text-slate-500">TARGET:</span>
              <span className="text-teal-400 font-semibold">{selectedIncident.code}</span>
              <span className="text-slate-400">({selectedIncident.locationName})</span>
            </div>
          )}
        </div>
      </div>

      {/* Main 3D Globe Area */}
      <div className="relative flex-1 w-full h-full rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950">
        <Globe3D
          incidents={incidents}
          volunteers={volunteers}
          dispatchArcs={dispatchArcs}
          layerState={layerState}
          selectedIncidentId={selectedIncident.id}
          onSelectIncident={onSelectIncident}
          onOpenSmartMatch={onOpenSmartMatch}
        />

        {/* Minimal Floating Drawer Toggle on Left */}
        <div className="absolute top-3 left-3 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-lg w-80 max-w-[calc(100vw-2rem)]">
            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-mono text-slate-300 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Hotspots & Routes ({incidents.length} / {dispatchArcs.length})</span>
              </div>
              {isPanelOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {isPanelOpen && (
              <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/90">
                <div className="flex items-center gap-1 mb-2 text-xs font-mono">
                  <button
                    onClick={() => setActiveSidePanel('INCIDENTS')}
                    className={`flex-1 py-1 rounded text-center transition-colors ${
                      activeSidePanel === 'INCIDENTS'
                        ? 'bg-slate-800 text-teal-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Crises ({incidents.length})
                  </button>
                  <button
                    onClick={() => setActiveSidePanel('DISPATCHES')}
                    className={`flex-1 py-1 rounded text-center transition-colors ${
                      activeSidePanel === 'DISPATCHES'
                        ? 'bg-slate-800 text-sky-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Transits ({dispatchArcs.length})
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {activeSidePanel === 'INCIDENTS' ? (
                    incidents.map((inc) => (
                      <div
                        key={inc.id}
                        onClick={() => {
                          onSelectIncident(inc);
                        }}
                        className={`p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                          inc.id === selectedIncident.id
                            ? 'bg-slate-800/90 border-teal-500/50 text-slate-100'
                            : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono mb-0.5">
                          <span className="font-bold text-teal-400">{inc.code}</span>
                          <span className="text-rose-400 font-semibold">{inc.severityScore}%</span>
                        </div>
                        <div className="font-medium truncate">{inc.title}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {inc.locationName}, {inc.country}
                        </div>
                      </div>
                    ))
                  ) : (
                    dispatchArcs.map((arc) => {
                      const isArrived = arc.status === 'ARRIVED';
                      const targetIncident = incidents.find((i) => i.id === arc.incidentId);

                      return (
                        <div
                          key={arc.id}
                          onClick={() => {
                            if (targetIncident) onSelectIncident(targetIncident);
                          }}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isArrived
                              ? 'bg-emerald-950/20 border-emerald-900/50 hover:border-emerald-700/60'
                              : 'bg-slate-900/60 border-slate-800 hover:border-sky-700/60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                            <span className={`flex items-center gap-1 font-semibold ${isArrived ? 'text-emerald-400' : 'text-sky-400'}`}>
                              <Plane className="w-3 h-3" />
                              {arc.transportMode.replace('_', ' ')}
                            </span>
                            <span className={isArrived ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                              {isArrived ? 'ARRIVED ON SITE' : `${Math.round(arc.progress)}% IN FLIGHT`}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-950 rounded-full h-1.5 mb-2 overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isArrived ? 'bg-emerald-400' : 'bg-sky-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, arc.progress))}%` }}
                            />
                          </div>

                          <div className="text-slate-200 text-[11px] font-mono truncate mb-1">
                            {arc.fromName} → <span className="text-teal-300 font-semibold">{arc.toName}</span>
                          </div>

                          {/* Live telemetry row */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                            {arc.speedKnots !== undefined && (
                              <div className="flex items-center gap-1">
                                <Gauge className="w-3 h-3 text-slate-500" />
                                <span>{arc.speedKnots > 0 ? `${arc.speedKnots} kts` : 'Stationary'}</span>
                              </div>
                            )}
                            {arc.etaMinutes !== undefined && (
                              <div className="flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{arc.etaMinutes > 0 ? `ETA: ${arc.etaMinutes}m` : 'Touchdown'}</span>
                              </div>
                            )}
                          </div>

                          {arc.cargoDescription && (
                            <div className="mt-1.5 text-[10px] text-slate-400 bg-slate-950/60 p-1 rounded border border-slate-800/60 truncate flex items-center gap-1">
                              <Package className="w-3 h-3 text-teal-500 shrink-0" />
                              <span className="truncate">{arc.cargoDescription}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layer Controls Bar */}
      <GlobeControls
        layerState={layerState}
        onToggleLayer={onToggleLayer}
        disasterCount={incidents.length}
        volunteerCount={volunteers.length}
        arcsCount={dispatchArcs.length}
      />
    </div>
  );
};
