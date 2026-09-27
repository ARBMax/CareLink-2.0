import React, { useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Waves,
  Wind,
  Activity,
  Thermometer,
  Shield,
  Users,
  Package,
  Radio,
  Heart,
  Zap,
  MapPin,
  Download,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  category: 'PERSONNEL' | 'EQUIPMENT' | 'COMMUNICATION' | 'MEDICAL' | 'LOGISTICS';
  done: boolean;
}

interface PlaybookPhase {
  id: string;
  phase: 'BEFORE' | 'DURING' | 'AFTER';
  title: string;
  timeframe: string;
  items: ChecklistItem[];
}

interface DisasterPlaybook {
  type: string;
  icon: React.ElementType;
  color: string;
  description: string;
  phases: PlaybookPhase[];
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  PERSONNEL: Users,
  EQUIPMENT: Package,
  COMMUNICATION: Radio,
  MEDICAL: Heart,
  LOGISTICS: Zap,
};

const PLAYBOOKS: DisasterPlaybook[] = [
  {
    type: 'FLOOD',
    icon: Waves,
    color: 'text-sky-400',
    description: 'Flash floods, river flooding, storm surge, dam overflow incidents',
    phases: [
      {
        id: 'flood-before',
        phase: 'BEFORE',
        title: 'Pre-Flood Preparedness',
        timeframe: '72h before landfall / on warning',
        items: [
          { id: 'f1', text: 'Activate flood risk monitoring dashboard and set alert thresholds', priority: 'CRITICAL', category: 'COMMUNICATION', done: false },
          { id: 'f2', text: 'Pre-position rigid inflatable boats (RIBs) at flood-prone entry points', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'f3', text: 'Dispatch WASH engineers to assess borehole vulnerability in flood path', priority: 'HIGH', category: 'PERSONNEL', done: false },
          { id: 'f4', text: 'Stage water purification units and chlorination tablets at logistics hub', priority: 'CRITICAL', category: 'LOGISTICS', done: false },
          { id: 'f5', text: 'Brief swiftwater rescue teams on current river gauges and forecasts', priority: 'HIGH', category: 'PERSONNEL', done: false },
          { id: 'f6', text: 'Pre-stock Leptospirosis prophylaxis and dehydration kits', priority: 'HIGH', category: 'MEDICAL', done: false },
          { id: 'f7', text: 'Set up satellite uplinks at forward command post', priority: 'HIGH', category: 'COMMUNICATION', done: false },
          { id: 'f8', text: 'Coordinate evacuation corridors with local civil defense', priority: 'NORMAL', category: 'LOGISTICS', done: false },
        ],
      },
      {
        id: 'flood-during',
        phase: 'DURING',
        title: 'Active Flood Response',
        timeframe: 'Active emergency phase',
        items: [
          { id: 'f9', text: 'Launch water rescue operations — prioritize elderly and children', priority: 'CRITICAL', category: 'PERSONNEL', done: false },
          { id: 'f10', text: 'Deploy water purification units in isolated communities', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'f11', text: 'Maintain hourly check-ins with field teams via satellite radio', priority: 'HIGH', category: 'COMMUNICATION', done: false },
          { id: 'f12', text: 'Document flood extents using drone imagery for damage assessment', priority: 'HIGH', category: 'EQUIPMENT', done: false },
          { id: 'f13', text: 'Treat cholera / leptospirosis cases at field medical post', priority: 'HIGH', category: 'MEDICAL', done: false },
          { id: 'f14', text: 'Track supply routes and reroute around impassable roads', priority: 'NORMAL', category: 'LOGISTICS', done: false },
        ],
      },
      {
        id: 'flood-after',
        phase: 'AFTER',
        title: 'Flood Recovery',
        timeframe: '48h+ post-peak flooding',
        items: [
          { id: 'f15', text: 'Assess WASH infrastructure damage — borehole contamination testing', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'f16', text: 'Begin epidemic surveillance for waterborne disease clusters', priority: 'CRITICAL', category: 'MEDICAL', done: false },
          { id: 'f17', text: 'Coordinate shelter repair with NFI distribution teams', priority: 'HIGH', category: 'LOGISTICS', done: false },
          { id: 'f18', text: 'Generate After-Action Report — lessons learned for future events', priority: 'HIGH', category: 'COMMUNICATION', done: false },
          { id: 'f19', text: 'Replenish standby supply cache for next event cycle', priority: 'NORMAL', category: 'LOGISTICS', done: false },
        ],
      },
    ],
  },
  {
    type: 'EARTHQUAKE',
    icon: Activity,
    color: 'text-orange-400',
    description: 'Structural collapse, seismic events, liquefaction, secondary hazards',
    phases: [
      {
        id: 'eq-before',
        phase: 'BEFORE',
        title: 'Seismic Preparedness',
        timeframe: 'Standing readiness (seismic zones)',
        items: [
          { id: 'e1', text: 'Maintain USAR heavy rescue teams on 4-hour deployment readiness', priority: 'CRITICAL', category: 'PERSONNEL', done: false },
          { id: 'e2', text: 'Verify acoustic void detection and thermal imaging gear is calibrated', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'e3', text: 'Pre-stage blood plasma (Type O-Neg) at regional medical depots', priority: 'HIGH', category: 'MEDICAL', done: false },
          { id: 'e4', text: 'Update building vulnerability maps for target high-risk zones', priority: 'HIGH', category: 'LOGISTICS', done: false },
          { id: 'e5', text: 'Run structural collapse drill with K9 search handler teams', priority: 'NORMAL', category: 'PERSONNEL', done: false },
        ],
      },
      {
        id: 'eq-during',
        phase: 'DURING',
        title: 'Collapse Response',
        timeframe: '0–72h golden hour window',
        items: [
          { id: 'e6', text: 'Deploy acoustic listening arrays in collapsed building sectors', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'e7', text: 'Establish triage tents — SALT mass casualty triage protocol', priority: 'CRITICAL', category: 'MEDICAL', done: false },
          { id: 'e8', text: 'Coordinate INSARAG team grid assignments to avoid duplication', priority: 'HIGH', category: 'PERSONNEL', done: false },
          { id: 'e9', text: 'Establish temporary comms relay if cell towers down', priority: 'HIGH', category: 'COMMUNICATION', done: false },
        ],
      },
      {
        id: 'eq-after',
        phase: 'AFTER',
        title: 'Post-Earthquake Recovery',
        timeframe: '72h+ post-event',
        items: [
          { id: 'e10', text: 'Structural assessment of standing buildings before reoccupation', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'e11', text: 'Mental health and trauma counseling rollout for survivors', priority: 'HIGH', category: 'MEDICAL', done: false },
          { id: 'e12', text: 'Debris clearance for access road restoration', priority: 'HIGH', category: 'LOGISTICS', done: false },
          { id: 'e13', text: 'Document structural failure patterns for future building code advocacy', priority: 'NORMAL', category: 'COMMUNICATION', done: false },
        ],
      },
    ],
  },
  {
    type: 'CYCLONE',
    icon: Wind,
    color: 'text-purple-400',
    description: 'Tropical cyclones, hurricanes, typhoons, storm surge events',
    phases: [
      {
        id: 'cyc-before',
        phase: 'BEFORE',
        title: 'Cyclone Preparedness',
        timeframe: '72h before landfall',
        items: [
          { id: 'c1', text: 'Activate storm surge inundation model — identify high-risk coastal sectors', priority: 'CRITICAL', category: 'COMMUNICATION', done: false },
          { id: 'c2', text: 'Deploy satellite comms (BGAN terminals) to island communities', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'c3', text: 'Pre-position tarpaulins, shelter repair kits, and water containers', priority: 'HIGH', category: 'LOGISTICS', done: false },
          { id: 'c4', text: 'Brief evacuation route coordinators and community wardens', priority: 'HIGH', category: 'PERSONNEL', done: false },
          { id: 'c5', text: 'Stage Malaria/Dengue rapid diagnostic kits for post-storm outbreak risk', priority: 'NORMAL', category: 'MEDICAL', done: false },
        ],
      },
      {
        id: 'cyc-during',
        phase: 'DURING',
        title: 'Cyclone Response',
        timeframe: 'Landfall + 48h',
        items: [
          { id: 'c6', text: 'Monitor coastal surge — activate amphibious rescue on breach alert', priority: 'CRITICAL', category: 'PERSONNEL', done: false },
          { id: 'c7', text: 'Maintain radio check-ins every 30 min with all field units', priority: 'HIGH', category: 'COMMUNICATION', done: false },
          { id: 'c8', text: 'Deploy medical air-evac helicopter for life-threatening injuries', priority: 'HIGH', category: 'MEDICAL', done: false },
        ],
      },
      {
        id: 'cyc-after',
        phase: 'AFTER',
        title: 'Post-Cyclone Recovery',
        timeframe: '24h+ post-landfall',
        items: [
          { id: 'c9', text: 'Aerial damage survey with drones — infrastructure impact mapping', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'c10', text: 'Restore power to critical facilities: hospitals, water pumps', priority: 'HIGH', category: 'LOGISTICS', done: false },
          { id: 'c11', text: 'NFI distribution: food, shelter material, hygiene kits', priority: 'HIGH', category: 'LOGISTICS', done: false },
        ],
      },
    ],
  },
  {
    type: 'WILDFIRE',
    icon: Thermometer,
    color: 'text-rose-400',
    description: 'Interface wildfires, forest fires, grassland fires',
    phases: [
      {
        id: 'wf-before',
        phase: 'BEFORE',
        title: 'Fire Season Preparedness',
        timeframe: 'Red flag / Fire weather watch',
        items: [
          { id: 'w1', text: 'Pre-position aerial firefighting tankers at nearest airbase', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'w2', text: 'Brief GIS fire behavior analysts — run FARSITE spread model', priority: 'HIGH', category: 'PERSONNEL', done: false },
          { id: 'w3', text: 'Stage smoke inhalation treatment kits and oxygen supply', priority: 'HIGH', category: 'MEDICAL', done: false },
          { id: 'w4', text: 'Identify evacuation corridors and clear access roads', priority: 'HIGH', category: 'LOGISTICS', done: false },
        ],
      },
      {
        id: 'wf-during',
        phase: 'DURING',
        title: 'Active Fire Response',
        timeframe: 'Active burning phase',
        items: [
          { id: 'w5', text: 'Deploy thermal imaging drones for real-time fire perimeter tracking', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'w6', text: 'Coordinate aerial retardant drops with ground crew safety corridors', priority: 'CRITICAL', category: 'PERSONNEL', done: false },
          { id: 'w7', text: 'Treat smoke inhalation and burns at forward medical post', priority: 'HIGH', category: 'MEDICAL', done: false },
        ],
      },
      {
        id: 'wf-after',
        phase: 'AFTER',
        title: 'Fire Recovery',
        timeframe: 'Post-containment',
        items: [
          { id: 'w8', text: 'Air quality monitoring before allowing community return', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'w9', text: 'Slope stability assessment — secondary landslide risk mapping', priority: 'HIGH', category: 'LOGISTICS', done: false },
          { id: 'w10', text: 'Community mental health support for displaced families', priority: 'NORMAL', category: 'MEDICAL', done: false },
        ],
      },
    ],
  },
  {
    type: 'OUTBREAK',
    icon: Shield,
    color: 'text-emerald-400',
    description: 'Disease outbreaks, epidemics, waterborne illness, vaccine-preventable clusters',
    phases: [
      {
        id: 'ob-before',
        phase: 'BEFORE',
        title: 'Outbreak Preparedness',
        timeframe: 'Elevated risk period',
        items: [
          { id: 'o1', text: 'Verify cold-chain integrity for vaccine stockpiles', priority: 'CRITICAL', category: 'MEDICAL', done: false },
          { id: 'o2', text: 'Pre-position ORS, IV fluids, and chlorination equipment at at-risk IDP sites', priority: 'CRITICAL', category: 'LOGISTICS', done: false },
          { id: 'o3', text: 'Activate syndromic surveillance — WHO alert thresholds configured', priority: 'HIGH', category: 'COMMUNICATION', done: false },
          { id: 'o4', text: 'Brief community health workers on case definition and reporting protocol', priority: 'HIGH', category: 'PERSONNEL', done: false },
        ],
      },
      {
        id: 'ob-during',
        phase: 'DURING',
        title: 'Outbreak Containment',
        timeframe: 'Active transmission window',
        items: [
          { id: 'o5', text: 'Stand up oral rehydration corners and isolation wards at treatment centers', priority: 'CRITICAL', category: 'MEDICAL', done: false },
          { id: 'o6', text: 'Deploy WASH teams for emergency water chlorination and latrine construction', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'o7', text: 'Conduct contact tracing — geo-tag case clusters for hot-zone mapping', priority: 'HIGH', category: 'COMMUNICATION', done: false },
          { id: 'o8', text: 'Launch rapid vaccination campaign if preventable pathogen confirmed', priority: 'HIGH', category: 'MEDICAL', done: false },
        ],
      },
      {
        id: 'ob-after',
        phase: 'AFTER',
        title: 'Post-Outbreak Recovery',
        timeframe: '2 weeks after last case',
        items: [
          { id: 'o9', text: 'Final environmental health assessment — water source decontamination', priority: 'CRITICAL', category: 'EQUIPMENT', done: false },
          { id: 'o10', text: 'Submit WHO event report and epidemiological summary', priority: 'HIGH', category: 'COMMUNICATION', done: false },
          { id: 'o11', text: 'Replenish outbreak response stockpiles to operational levels', priority: 'NORMAL', category: 'LOGISTICS', done: false },
        ],
      },
    ],
  },
];

const PRIORITY_COLORS = {
  CRITICAL: 'text-rose-400 border-rose-500/30',
  HIGH: 'text-orange-400 border-orange-500/30',
  NORMAL: 'text-slate-400 border-slate-700',
};

const PHASE_COLORS = {
  BEFORE: { label: 'bg-sky-500/10 text-sky-300 border-sky-500/20', badge: 'BEFORE' },
  DURING: { label: 'bg-rose-500/10 text-rose-300 border-rose-500/20', badge: 'DURING' },
  AFTER: { label: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', badge: 'AFTER' },
};

export const PreparednessPlan: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('FLOOD');
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ 'flood-before': true });
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<'ALL' | 'BEFORE' | 'DURING' | 'AFTER'>('ALL');

  const playbook = PLAYBOOKS.find((p) => p.type === selectedType)!;

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const filteredPhases = selectedPhaseFilter === 'ALL'
    ? playbook.phases
    : playbook.phases.filter((p) => p.phase === selectedPhaseFilter);

  const totalItems = playbook.phases.flatMap((p) => p.items).length;
  const completedItems = playbook.phases.flatMap((p) => p.items).filter((i) => checkedItems[i.id]).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const resetChecklist = () => setCheckedItems({});

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            Disaster Preparedness Playbooks
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Evidence-based checklists · Before · During · After each disaster type
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetChecklist}
            className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Reset
          </button>
          <button className="text-xs font-mono px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition-colors flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Disaster Type Selector */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {PLAYBOOKS.map((pb) => {
          const Icon = pb.icon;
          const isActive = pb.type === selectedType;
          return (
            <button
              key={pb.type}
              onClick={() => { setSelectedType(pb.type); setExpandedPhases({}); setCheckedItems({}); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all border ${
                isActive
                  ? 'bg-slate-800 border-teal-500/40 text-teal-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : pb.color}`} />
              {pb.type}
            </button>
          );
        })}
      </div>

      {/* Progress + Description */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">{playbook.type} Response Playbook</div>
            <div className="text-xs text-slate-400 mt-0.5">{playbook.description}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold font-mono text-teal-300">{progress}%</div>
            <div className="text-[10px] font-mono text-slate-500">{completedItems}/{totalItems} completed</div>
          </div>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phase Filter */}
      <div className="flex items-center gap-2 shrink-0">
        {(['ALL', 'BEFORE', 'DURING', 'AFTER'] as const).map((phase) => (
          <button
            key={phase}
            onClick={() => setSelectedPhaseFilter(phase)}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg font-medium transition-colors border ${
              selectedPhaseFilter === phase
                ? 'bg-slate-800 border-teal-500/30 text-teal-300'
                : 'border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {phase}
          </button>
        ))}
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {filteredPhases.map((phase) => {
          const phaseColors = PHASE_COLORS[phase.phase];
          const isExpanded = expandedPhases[phase.id];
          const phaseCompleted = phase.items.filter((i) => checkedItems[i.id]).length;

          return (
            <div key={phase.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden">
              <button
                onClick={() => togglePhase(phase.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${phaseColors.label}`}>
                    {phaseColors.badge}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{phase.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{phase.timeframe}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">
                    {phaseCompleted}/{phase.items.length}
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-700/60 p-3 space-y-2">
                  {phase.items.map((item) => {
                    const CatIcon = CATEGORY_ICONS[item.category];
                    const isDone = checkedItems[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                          isDone ? 'bg-teal-500/5 border border-teal-500/15' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isDone
                            ? <CheckSquare className="w-4 h-4 text-teal-400" />
                            : <Square className="w-4 h-4 text-slate-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {item.text}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <CatIcon className="w-3 h-3 text-slate-600" />
                            <span className="text-[10px] font-mono text-slate-600">{item.category}</span>
                            <span className={`text-[10px] font-mono ${PRIORITY_COLORS[item.priority]}`}>
                              {item.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
