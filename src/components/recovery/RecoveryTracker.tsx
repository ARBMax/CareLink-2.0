import React, { useState } from 'react';
import { Incident } from '../../types';
import {
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Users,
  Wrench,
  HeartHandshake,
  Home,
  Leaf,
  ChevronRight,
  BarChart3,
  Flag,
  AlertTriangle,
  Target,
} from 'lucide-react';

interface RecoveryMilestone {
  id: string;
  phase: string;
  title: string;
  description: string;
  targetDays: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'BLOCKED';
  completedAt?: string;
  assignedTeam?: string;
  blockerNote?: string;
}

interface RecoveryTracker {
  incidentId: string;
  incidentCode: string;
  incidentTitle: string;
  country: string;
  disasterType: string;
  startDate: string;
  estimatedEndDate: string;
  overallProgress: number;
  milestones: RecoveryMilestone[];
  casualtiesConfirmed: number;
  displaced: number;
  infrastructureDamageUSD: number;
}

const STATUS_CONFIG = {
  COMPLETED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
  IN_PROGRESS: { color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', icon: Clock },
  PENDING: { color: 'text-slate-500', bg: 'bg-slate-800/40', border: 'border-slate-700/40', icon: Circle },
  BLOCKED: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertTriangle },
};

const MOCK_TRACKERS: RecoveryTracker[] = [
  {
    incidentId: 'inc-08',
    incidentCode: 'CYC-2026-095',
    incidentTitle: 'Tropical Cyclone Gombe Coastal Landfall',
    country: 'Mozambique',
    disasterType: 'CYCLONE',
    startDate: 'Sep 19, 2026',
    estimatedEndDate: 'Oct 31, 2026',
    overallProgress: 58,
    casualtiesConfirmed: 12,
    displaced: 53000,
    infrastructureDamageUSD: 28000000,
    milestones: [
      {
        id: 'm1',
        phase: '🚨 Rescue',
        title: 'Search & Rescue Complete',
        description: 'All accessible areas searched, all trapped survivors extracted',
        targetDays: 3,
        status: 'COMPLETED',
        completedAt: 'Day 2',
        assignedTeam: 'Shelter Coordination Team',
      },
      {
        id: 'm2',
        phase: '🏥 Relief',
        title: 'Emergency Medical Care',
        description: 'Field hospitals operational, injured receiving treatment',
        targetDays: 7,
        status: 'COMPLETED',
        completedAt: 'Day 5',
        assignedTeam: 'Pan-African Health Alliance',
      },
      {
        id: 'm3',
        phase: '🏠 Shelter',
        title: 'Temporary Shelter Distribution',
        description: 'All displaced families have emergency shelter (tarpaulins/tents)',
        targetDays: 10,
        status: 'COMPLETED',
        completedAt: 'Day 8',
        assignedTeam: 'Logistics Cluster International',
      },
      {
        id: 'm4',
        phase: '💧 WASH',
        title: 'Water & Sanitation Restoration',
        description: 'Solar water pumps repaired, basic WASH services restored in all sites',
        targetDays: 21,
        status: 'IN_PROGRESS',
        assignedTeam: 'Global CleanWater Vanguard',
      },
      {
        id: 'm5',
        phase: '⚡ Infrastructure',
        title: 'Critical Power Restoration',
        description: 'Hospitals, schools, and water pumps reconnected to grid or solar backup',
        targetDays: 30,
        status: 'IN_PROGRESS',
        assignedTeam: 'Field Logistics Lead',
      },
      {
        id: 'm6',
        phase: '🏗️ Reconstruction',
        title: 'Shelter Permanent Repair',
        description: 'Damaged homes repaired with cyclone-resilient materials',
        targetDays: 60,
        status: 'PENDING',
      },
      {
        id: 'm7',
        phase: '🌱 Resilience',
        title: 'Community Livelihood Recovery',
        description: 'Fishing fleet repaired, agricultural support provided, livelihoods restored',
        targetDays: 90,
        status: 'PENDING',
      },
      {
        id: 'm8',
        phase: '📋 Closure',
        title: 'Recovery Plan Signed Off',
        description: 'All milestones verified, resources returned, final report submitted',
        targetDays: 120,
        status: 'PENDING',
      },
    ],
  },
  {
    incidentId: 'inc-07',
    incidentCode: 'COL-2026-019',
    incidentTitle: 'Tailings Retention Dam Breach & Mudflow',
    country: 'Brazil',
    disasterType: 'INFRASTRUCTURE_COLLAPSE',
    startDate: 'Sep 21, 2026',
    estimatedEndDate: 'Dec 15, 2026',
    overallProgress: 32,
    casualtiesConfirmed: 8,
    displaced: 41000,
    infrastructureDamageUSD: 75000000,
    milestones: [
      {
        id: 'b1',
        phase: '🚨 Rescue',
        title: 'Mudflow Search & Rescue',
        description: 'Dive teams and excavators cleared — no additional survivors expected',
        targetDays: 5,
        status: 'COMPLETED',
        completedAt: 'Day 4',
        assignedTeam: 'Search and Rescue Dive Team',
      },
      {
        id: 'b2',
        phase: '🔬 Environment',
        title: 'Water Quality Baseline Assessment',
        description: 'Field labs test contaminated waterways — heavy metals and tailings mapping',
        targetDays: 14,
        status: 'IN_PROGRESS',
        assignedTeam: 'Environmental Chemist Team',
      },
      {
        id: 'b3',
        phase: '🌉 Infrastructure',
        title: 'Emergency Bridge Replacement',
        description: 'Temporary footbridges installed across severed highway access',
        targetDays: 21,
        status: 'BLOCKED',
        blockerNote: 'Awaiting structural engineering sign-off — secondary slope instability detected',
      },
      {
        id: 'b4',
        phase: '🏠 Shelter',
        title: 'Permanent Resettlement Planning',
        description: 'Safe relocation sites identified for flood-plain communities',
        targetDays: 45,
        status: 'PENDING',
      },
      {
        id: 'b5',
        phase: '🏗️ Remediation',
        title: 'Tailings Environmental Remediation',
        description: 'Contaminated soil and water remediation using bioremediation techniques',
        targetDays: 180,
        status: 'PENDING',
      },
    ],
  },
];

interface RecoveryTrackerProps {
  incidents: Incident[];
}

export const RecoveryTrackerView: React.FC<RecoveryTrackerProps> = ({ incidents }) => {
  const [selectedTracker, setSelectedTracker] = useState<RecoveryTracker>(MOCK_TRACKERS[0]);

  const completedCount = selectedTracker.milestones.filter((m) => m.status === 'COMPLETED').length;
  const blockedCount = selectedTracker.milestones.filter((m) => m.status === 'BLOCKED').length;

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-400" />
            Recovery Milestone Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Phase-by-phase recovery monitoring · Rescue → Relief → Reconstruction → Resilience
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Tracker List */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Active Recovery Operations</div>
          {MOCK_TRACKERS.map((tracker) => (
            <div
              key={tracker.incidentId}
              onClick={() => setSelectedTracker(tracker)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedTracker.incidentId === tracker.incidentId
                  ? 'bg-slate-800/90 border-teal-500/40'
                  : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-teal-400">{tracker.incidentCode}</span>
                <span className="text-xs font-bold font-mono text-slate-300">{tracker.overallProgress}%</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-2">{tracker.incidentTitle}</div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-teal-600 to-teal-400"
                  style={{ width: `${tracker.overallProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{tracker.country}</span>
                <span>{tracker.milestones.filter((m) => m.status === 'COMPLETED').length}/{tracker.milestones.length} phases</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tracker Detail */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
              <div className="text-[10px] font-mono text-emerald-400">PHASES DONE</div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">{completedCount}/{selectedTracker.milestones.length}</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3">
              <div className="text-[10px] font-mono text-slate-400">DISPLACED</div>
              <div className="text-xl font-bold font-mono text-slate-200 mt-0.5">{(selectedTracker.displaced / 1000).toFixed(0)}K</div>
            </div>
            <div className={`${blockedCount > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-800/60 border-slate-700/80'} border rounded-xl p-3`}>
              <div className={`text-[10px] font-mono ${blockedCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>BLOCKED</div>
              <div className={`text-xl font-bold font-mono mt-0.5 ${blockedCount > 0 ? 'text-rose-300' : 'text-slate-400'}`}>{blockedCount}</div>
            </div>
          </div>

          {/* Header */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-slate-100">{selectedTracker.incidentTitle}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {selectedTracker.country} · Started {selectedTracker.startDate}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-teal-300">{selectedTracker.overallProgress}%</div>
                <div className="text-[10px] font-mono text-slate-500">RECOVERY COMPLETE</div>
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-teal-700 to-teal-400 transition-all duration-700"
                style={{ width: `${selectedTracker.overallProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-500">
              <span>Est. close: {selectedTracker.estimatedEndDate}</span>
              <span>Infra damage: ~${(selectedTracker.infrastructureDamageUSD / 1000000).toFixed(0)}M</span>
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex-1 overflow-y-auto">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-teal-400" /> Recovery Phases
            </div>
            <div className="space-y-3">
              {selectedTracker.milestones.map((milestone, idx) => {
                const cfg = STATUS_CONFIG[milestone.status];
                const StatusIcon = cfg.icon;

                return (
                  <div
                    key={milestone.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border} transition-all`}
                  >
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center shrink-0">
                      <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                      {idx < selectedTracker.milestones.length - 1 && (
                        <div className={`w-px flex-1 mt-1 ${milestone.status === 'COMPLETED' ? 'bg-emerald-500/30' : 'bg-slate-800'}`} style={{ minHeight: '16px' }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 mr-2">{milestone.phase}</span>
                          <span className="text-xs font-semibold text-slate-200">{milestone.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {milestone.completedAt && (
                            <span className="text-[10px] font-mono text-emerald-400">{milestone.completedAt}</span>
                          )}
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                            {milestone.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{milestone.description}</p>
                      {milestone.assignedTeam && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] font-mono text-slate-500">
                          <Users className="w-3 h-3" /> {milestone.assignedTeam}
                        </div>
                      )}
                      {milestone.blockerNote && (
                        <div className="flex items-start gap-1.5 mt-2 p-2 bg-rose-500/5 border border-rose-500/15 rounded-lg">
                          <AlertTriangle className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
                          <span className="text-[11px] text-rose-300">{milestone.blockerNote}</span>
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-slate-600 mt-1.5">Target: Day {milestone.targetDays}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
