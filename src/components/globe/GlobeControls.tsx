import React from 'react';
import { GlobeLayerState } from '../../types';
import { Layers, ShieldAlert, Users, Navigation } from 'lucide-react';

interface GlobeControlsProps {
  layerState: GlobeLayerState;
  onToggleLayer: (layerKey: keyof GlobeLayerState) => void;
  disasterCount: number;
  volunteerCount: number;
  arcsCount: number;
}

export const GlobeControls: React.FC<GlobeControlsProps> = ({
  layerState,
  onToggleLayer,
  disasterCount,
  volunteerCount,
  arcsCount,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Layer Toggles */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-mono text-[11px] uppercase mr-1">
          Layers:
        </span>

        {/* Disaster Zones */}
        <button
          id="toggle-disaster-zones"
          onClick={() => onToggleLayer('disasterZones')}
          className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
            layerState.disasterZones
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-medium'
              : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Crises</span>
          <span className="text-[10px] font-mono opacity-80">({disasterCount})</span>
        </button>

        {/* Volunteers */}
        <button
          id="toggle-volunteer-density"
          onClick={() => onToggleLayer('volunteerDensity')}
          className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
            layerState.volunteerDensity
              ? 'bg-teal-500/10 border-teal-500/30 text-teal-300 font-medium'
              : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Responders</span>
          <span className="text-[10px] font-mono opacity-80">({volunteerCount})</span>
        </button>

        {/* Supply Arcs */}
        <button
          id="toggle-supply-arcs"
          onClick={() => onToggleLayer('supplyRouteArcs')}
          className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
            layerState.supplyRouteArcs
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 font-medium'
              : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Supply Arcs</span>
          <span className="text-[10px] font-mono opacity-80">({arcsCount})</span>
        </button>
      </div>

      {/* Clean Legend */}
      <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          <span>Responders</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-sky-400 rounded-full" />
          <span>Airbridge</span>
        </div>
      </div>
    </div>
  );
};
