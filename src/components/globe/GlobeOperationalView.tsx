import React, { useState } from 'react';
import { Incident, Volunteer, DispatchArc, GlobeLayerState } from '../../types';
import { Globe3D } from './Globe3D';
import { GlobeControls } from './GlobeControls';
import { 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Plane,
  ArrowRight
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

  return (
    <div className="relative w-full h-full flex flex-col gap-3 min-h-[600px]">
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
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-lg w-72 max-w-[calc(100vw-2rem)]">
            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-mono text-slate-300 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Hotspots & Routes ({incidents.length})</span>
              </div>
              {isPanelOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {isPanelOpen && (
              <div className="p-2 border-t border-slate-800/80 bg-slate-950/80">
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
                    Routes ({dispatchArcs.length})
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
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
                    dispatchArcs.map((arc) => (
                      <div
                        key={arc.id}
                        className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-sky-400 mb-1">
                          <span className="flex items-center gap-1 font-semibold">
                            <Plane className="w-3 h-3" />
                            {arc.transportMode}
                          </span>
                          <span className="text-slate-400">{arc.progress}% Complete</span>
                        </div>
                        <div className="text-slate-200 text-[11px] truncate">
                          {arc.fromName} → {arc.toName}
                        </div>
                      </div>
                    ))
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
