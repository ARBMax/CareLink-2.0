import React, { useState } from 'react';
import { Incident } from '../../types';
import {
  FileText,
  CheckCircle,
  Clock,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Star,
  Loader2,
  ChevronRight,
  MapPin,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Shield,
  BarChart3,
} from 'lucide-react';

interface AfterActionReport {
  incidentId: string;
  incidentCode: string;
  incidentTitle: string;
  country: string;
  generatedAt: string;
  responseTimeHours: number;
  volunteersDeployed: number;
  livesAffected: number;
  livesSaved: number;
  overallScore: number;
  summary: string;
  whatWorked: string[];
  whatFailed: string[];
  recommendations: string[];
  timeline: { time: string; event: string; type: 'success' | 'warning' | 'info' }[];
  resourcesUsed: { category: string; deployed: number; utilized: number }[];
}

const MOCK_REPORTS: AfterActionReport[] = [
  {
    incidentId: 'inc-02',
    incidentCode: 'EQ-2026-104',
    incidentTitle: 'Subduction Trench Mw 7.4 Structural Collapse',
    country: 'Haiti',
    generatedAt: '2 days ago',
    responseTimeHours: 6.2,
    volunteersDeployed: 14,
    livesAffected: 215000,
    livesSaved: 312,
    overallScore: 87,
    summary:
      'Response to the Mw 7.4 Haiti earthquake demonstrated strong USAR coordination and rapid acoustic detection capability. Smart Match correctly identified 4 of top 5 optimal specialists within 8 minutes. Primary challenge was logistics congestion at Port-au-Prince airstrip, delaying heavy equipment arrival by 11 hours.',
    whatWorked: [
      'AI Smart Match Engine identified critical USAR specialists in under 10 minutes',
      'Acoustic void detection confirmed 47 survivor signals in Sector 4 rubble',
      'Field medical triage processed 180+ patients within first 12 hours',
      'Satellite comms maintained 98% uptime despite infrastructure damage',
      'Blood plasma logistics chain: zero stockout events across 72 hours',
    ],
    whatFailed: [
      'Heavy hydraulic spreader team delayed 11h due to airstrip congestion',
      'Insufficient canine K9 handler coverage — only 2 of 6 requested arrived',
      'WhatsApp hotline overwhelmed — 1,400 calls in first 6h, only 220 answered',
      'Coordination overlap between 3 USAR teams in Sector 2 caused 2h delay',
    ],
    recommendations: [
      'Pre-arrange landing priority slots at PaP Toussaint Louverture for heavy cargo',
      'Expand K9 handler roster from 2 to 6 certified teams in Caribbean region',
      'Upgrade WhatsApp hotline to AI-triage system to handle volume surges',
      'Implement sector assignment protocol in Smart Match to prevent team overlap',
    ],
    timeline: [
      { time: '00:14', event: 'GDACS alert ingested — M7.4 registered by AI pipeline', type: 'info' },
      { time: '00:22', event: 'Incident created — Smart Match dispatched automatically', type: 'success' },
      { time: '01:45', event: 'First USAR team airborne from Miami depot', type: 'success' },
      { time: '04:30', event: 'Acoustic signals detected — 47 survivors confirmed in rubble', type: 'success' },
      { time: '11:00', event: 'Heavy equipment arrival delayed — airstrip congestion', type: 'warning' },
      { time: '18:00', event: 'Full rescue capacity reached — 200+ extracted', type: 'success' },
      { time: '72:00', event: 'Incident transitioned to CONTAINED — recovery phase', type: 'success' },
    ],
    resourcesUsed: [
      { category: 'USAR Personnel', deployed: 14, utilized: 12 },
      { category: 'Medical Teams', deployed: 8, utilized: 8 },
      { category: 'Equipment Kits', deployed: 24, utilized: 19 },
      { category: 'Logistics Vehicles', deployed: 6, utilized: 4 },
    ],
  },
  {
    incidentId: 'inc-01',
    incidentCode: 'CYC-2026-088',
    incidentTitle: 'Cyclone Sagar Super-Surge & Flash Inundation',
    country: 'Bangladesh',
    generatedAt: '5 days ago',
    responseTimeHours: 3.8,
    volunteersDeployed: 9,
    livesAffected: 142000,
    livesSaved: 890,
    overallScore: 92,
    summary:
      'Cyclone Sagar response was the fastest coordinated water rescue operation in CareLink history. Pre-positioning of RIBs and water purification units 24h before landfall was a decisive factor. WASH engineering team fully resolved borehole contamination within 48 hours — zero documented cholera cases in response corridor.',
    whatWorked: [
      'Early Warning Panel triggered pre-positioning 24h before landfall',
      'Pre-staged RIBs enabled immediate water rescue of 890 individuals',
      'Reverse osmosis units deployed within 6h — clean water maintained',
      'Pediatric trauma kits were correctly pre-configured for storm surge context',
      'Rotary pilot coordination: 4 medevac flights in first 12h',
    ],
    whatFailed: [
      'Satellite transceiver coverage had 6h gap in northern Chittagong sector',
      'One swiftwater team misdirected due to outdated map data',
      'Delayed approval for international airspace clearance slowed airlift by 4h',
    ],
    recommendations: [
      'Maintain updated GIS flood extent layers refreshed every 6 hours during response',
      'Pre-negotiate airspace clearance MOUs with Bangladesh Civil Aviation Authority',
      'Deploy mesh radio relay drone when satellite coverage gaps detected',
    ],
    timeline: [
      { time: '-24h', event: 'Early Warning triggered — RIBs pre-positioned at Chittagong port', type: 'success' },
      { time: '-6h', event: 'Cyclone makes landfall — storm surge breaches embankments', type: 'warning' },
      { time: '00:30', event: 'Water rescue operations activated — 4 RIB teams launched', type: 'success' },
      { time: '02:00', event: 'RO water purification units deployed at 3 field sites', type: 'success' },
      { time: '06:00', event: 'Satellite comms gap detected — mesh relay activated', type: 'warning' },
      { time: '48:00', event: 'Borehole decontamination complete — WASH sign-off', type: 'success' },
    ],
    resourcesUsed: [
      { category: 'Water Rescue Teams', deployed: 4, utilized: 4 },
      { category: 'Medical Units', deployed: 3, utilized: 3 },
      { category: 'WASH Engineers', deployed: 2, utilized: 2 },
      { category: 'Purification Units', deployed: 6, utilized: 5 },
    ],
  },
];

interface AfterActionReportsProps {
  incidents: Incident[];
}

export const AfterActionReports: React.FC<AfterActionReportsProps> = ({ incidents }) => {
  const [selectedReport, setSelectedReport] = useState<AfterActionReport>(MOCK_REPORTS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'TIMELINE' | 'RESOURCES'>('SUMMARY');

  const handleGenerate = (incidentCode: string) => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2200);
  };

  const resolvedIncidents = incidents.filter((i) => i.status === 'CONTAINED' || i.status === 'RESOLVED');

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            After-Action Reports
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            AI-generated post-incident analysis · Groq LLaMA · Continuous improvement loop
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[500px]">
        {/* Report List */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Resolved Incidents</div>

          <div className="space-y-2">
            {MOCK_REPORTS.map((report) => (
              <div
                key={report.incidentId}
                onClick={() => setSelectedReport(report)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedReport.incidentId === report.incidentId
                    ? 'bg-slate-800/90 border-teal-500/40'
                    : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-teal-400">{report.incidentCode}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-bold font-mono text-amber-300">{report.overallScore}</span>
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-200 line-clamp-1">{report.incidentTitle}</div>
                <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{report.country}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{report.generatedAt}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Generate for resolved incidents */}
          {resolvedIncidents.length > 0 && (
            <div className="mt-2">
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">Generate New</div>
              {resolvedIncidents.slice(0, 2).map((inc) => (
                <div key={inc.id} className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl mb-2">
                  <div className="text-xs text-slate-300 mb-2 line-clamp-1">{inc.title}</div>
                  <button
                    onClick={() => handleGenerate(inc.code)}
                    className="w-full py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating AAR…</>
                    ) : (
                      <><FileText className="w-3.5 h-3.5" /> Generate AAR with Groq</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Detail */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'RESPONSE TIME', value: `${selectedReport.responseTimeHours}h`, icon: Clock, color: 'text-sky-400' },
              { label: 'DEPLOYED', value: selectedReport.volunteersDeployed, icon: Users, color: 'text-teal-400' },
              { label: 'LIVES SAVED', value: selectedReport.livesSaved, icon: Shield, color: 'text-emerald-400' },
              { label: 'SCORE', value: `${selectedReport.overallScore}/100`, icon: Star, color: 'text-amber-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3">
                <div className="text-[10px] font-mono text-slate-500">{kpi.label}</div>
                <div className={`text-lg font-bold font-mono ${kpi.color} mt-0.5`}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/80 rounded-xl p-1">
            {(['SUMMARY', 'TIMELINE', 'RESOURCES'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-colors ${
                  activeTab === tab ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex-1 overflow-y-auto">
            {activeTab === 'SUMMARY' && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-sky-400" /> Executive Summary
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedReport.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5" /> What Worked
                    </div>
                    <div className="space-y-1.5">
                      {selectedReport.whatWorked.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ThumbsDown className="w-3.5 h-3.5" /> Gaps Identified
                    </div>
                    <div className="space-y-1.5">
                      {selectedReport.whatFailed.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" /> Recommendations
                  </div>
                  <div className="space-y-2">
                    {selectedReport.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                        <ChevronRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-xs text-slate-200">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'TIMELINE' && (
              <div className="space-y-1">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Response Timeline</div>
                {selectedReport.timeline.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-700/40 last:border-0">
                    <div className="font-mono text-xs text-slate-500 w-12 shrink-0 pt-0.5">{event.time}</div>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      event.type === 'success' ? 'bg-emerald-400' :
                      event.type === 'warning' ? 'bg-amber-400' : 'bg-sky-400'
                    }`} />
                    <div className={`text-xs flex-1 ${
                      event.type === 'success' ? 'text-slate-300' :
                      event.type === 'warning' ? 'text-amber-300' : 'text-slate-400'
                    }`}>{event.event}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'RESOURCES' && (
              <div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Resource Utilization</div>
                <div className="space-y-4">
                  {selectedReport.resourcesUsed.map((res) => {
                    const pct = Math.round((res.utilized / res.deployed) * 100);
                    return (
                      <div key={res.category}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-300">{res.category}</span>
                          <span className="font-mono text-slate-400">{res.utilized}/{res.deployed} utilized ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-teal-500' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
