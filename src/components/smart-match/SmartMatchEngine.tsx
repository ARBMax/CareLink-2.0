import React, { useState } from 'react';
import { Incident, Volunteer } from '../../types';
import { 
  Sparkles, 
  Send, 
  CheckCircle, 
  MapPin, 
  Plane, 
  Check, 
  Award, 
  ArrowRight
} from 'lucide-react';

interface SmartMatchEngineProps {
  incidents: Incident[];
  volunteers: Volunteer[];
  selectedIncident: Incident;
  onSelectIncident: (inc: Incident) => void;
  onDispatchVolunteer: (incident: Incident, volunteer: Volunteer) => void;
  onNavigateToGlobe?: () => void;
}

export const SmartMatchEngine: React.FC<SmartMatchEngineProps> = ({
  incidents,
  volunteers,
  selectedIncident,
  onSelectIncident,
  onDispatchVolunteer,
  onNavigateToGlobe,
}) => {
  const [dispatchedVolunteers, setDispatchedVolunteers] = useState<string[]>([]);
  const [lastDispatchedInfo, setLastDispatchedInfo] = useState<{ volName: string; incTitle: string } | null>(null);

  // Compute matched score for volunteers against selected incident requirements
  const scoredVolunteers = volunteers.map((vol) => {
    const matchCount = vol.skills.filter((skill) =>
      selectedIncident.requiredSkills.some(
        (req) => req.toLowerCase() === skill.toLowerCase() || skill.toLowerCase().includes(req.toLowerCase())
      )
    ).length;

    let calculatedScore = vol.matchScore;
    if (matchCount > 0) {
      calculatedScore = Math.min(99, Math.max(75, 70 + matchCount * 9 + (vol.pastMissionsCount > 15 ? 5 : 0)));
    }

    const isDispatched = dispatchedVolunteers.includes(vol.id) || vol.readinessStatus === 'DISPATCHED';

    return {
      ...vol,
      computedScore: calculatedScore,
      isDispatched,
    };
  }).sort((a, b) => {
    if (a.isDispatched && !b.isDispatched) return 1;
    if (!a.isDispatched && b.isDispatched) return -1;
    return b.computedScore - a.computedScore;
  });

  const handleDispatch = (vol: Volunteer) => {
    setDispatchedVolunteers((prev) => [...prev, vol.id]);
    setLastDispatchedInfo({ volName: vol.name, incTitle: selectedIncident.title });
    onDispatchVolunteer(selectedIncident, vol);

    setTimeout(() => {
      setLastDispatchedInfo(null);
    }, 6000);
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Top Header & Incident Selector Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
              SMART MATCH ENGINE
            </h2>
            <p className="text-xs text-slate-400">
              Matching distress requirements with responder capabilities & flight ETAs
            </p>
          </div>
        </div>

        {/* Quick Target Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Target Crisis:</span>
          <select
            id="select-smart-match-incident"
            value={selectedIncident.id}
            onChange={(e) => {
              const inc = incidents.find((i) => i.id === e.target.value);
              if (inc) onSelectIncident(inc);
            }}
            aria-label="Select target disaster incident"
            className="bg-slate-950 text-slate-200 border border-slate-700/70 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-teal-500"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                [{inc.code}] {inc.title.substring(0, 30)}... ({inc.country})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dispatch Confirmation Toast Banner */}
      {lastDispatchedInfo && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300 font-mono">
                DISPATCH AIRBRIDGE INITIATED
              </div>
              <div className="text-xs text-emerald-400/90">
                {lastDispatchedInfo.volName} deployed to {lastDispatchedInfo.incTitle}
              </div>
            </div>
          </div>
          {onNavigateToGlobe && (
            <button
              onClick={onNavigateToGlobe}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
            >
              <span>Track on Globe</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Split Layout: Incident Details (Left) & Ranked Responders (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left: Incident Details Dossier */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-4">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono font-bold text-teal-400">
                {selectedIncident.code}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                  selectedIncident.urgency === 'CRITICAL'
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {selectedIncident.urgency}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-100">
              {selectedIncident.title}
            </h3>

            <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedIncident.locationName}, {selectedIncident.country}</span>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-800/60 text-center">
            <div>
              <div className="text-[11px] text-slate-400 font-mono">SEVERITY</div>
              <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                {selectedIncident.severityScore}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-mono">POPULATION</div>
              <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">
                {selectedIncident.populationAffected.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-mono">DEPLOYED</div>
              <div className="text-lg font-bold text-teal-300 font-mono mt-0.5">
                {selectedIncident.assignedVolunteersCount}
              </div>
            </div>
          </div>

          {/* Incident Description */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
              Situation Summary
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedIncident.description}
            </p>
          </div>

          {/* Extracted Needs */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
              Urgent Relief Needs
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedIncident.extractedNeeds.map((need, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-800/80 text-slate-300 rounded text-xs"
                >
                  {need}
                </span>
              ))}
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
              Required Specialist Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedIncident.requiredSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded text-xs flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI-Ranked Responders Pool */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-100">
                RECOMMENDED RESPONDERS
              </h3>
              <p className="text-xs text-slate-400">
                Ranked by qualification alignment, proximity, and mission history
              </p>
            </div>
            <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded">
              {scoredVolunteers.length} Available
            </span>
          </div>

          {/* Responders List */}
          <div className="space-y-3 overflow-y-auto">
            {scoredVolunteers.map((vol, index) => {
              const isDispatched = vol.isDispatched;

              return (
                <div
                  key={vol.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDispatched
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : index === 0
                      ? 'bg-slate-800/70 border-teal-500/50 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Volunteer Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-teal-400 text-xs shrink-0">
                        {vol.avatar}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100">{vol.name}</h4>
                          <span className="text-xs text-slate-400">• {vol.organization}</span>
                        </div>

                        <div className="text-xs text-teal-300 mt-0.5">
                          {vol.role}
                        </div>

                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {vol.homeBase}
                          </span>
                          <span className="flex items-center gap-1">
                            <Plane className="w-3 h-3 text-sky-400" />
                            {vol.etaHours}h ETA ({vol.distanceKm.toLocaleString()} km)
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-3 h-3 text-amber-400" />
                            {vol.pastMissionsCount} Missions
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Match Score */}
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">MATCH</div>
                      <div className="text-xl font-bold font-mono text-teal-300">
                        {vol.computedScore}%
                      </div>
                    </div>
                  </div>

                  {/* Skills and Dispatch Action */}
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {vol.skills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-800/60 text-slate-300 font-mono"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div>
                      {isDispatched ? (
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Dispatched</span>
                        </span>
                      ) : (
                        <button
                          id={`btn-dispatch-${vol.id}`}
                          onClick={() => handleDispatch(vol)}
                          className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
