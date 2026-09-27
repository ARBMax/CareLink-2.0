import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CloudLightning,
  Waves,
  Wind,
  Thermometer,
  Activity,
  MapPin,
  Clock,
  RefreshCw,
  TrendingUp,
  Shield,
  Radio,
  ChevronRight,
} from 'lucide-react';

interface RiskAlert {
  id: string;
  type: 'FLOOD' | 'CYCLONE' | 'EARTHQUAKE' | 'WILDFIRE' | 'DROUGHT' | 'OUTBREAK';
  region: string;
  country: string;
  riskLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'WATCH';
  riskScore: number;
  timeframe: string;
  trigger: string;
  affectedPopulation: number;
  coordinates: { lat: number; lng: number };
  lastUpdated: string;
  signals: string[];
  recommendedActions: string[];
}

const DISASTER_ICONS: Record<string, React.ElementType> = {
  FLOOD: Waves,
  CYCLONE: Wind,
  EARTHQUAKE: Activity,
  WILDFIRE: Thermometer,
  DROUGHT: Thermometer,
  OUTBREAK: Shield,
};

const RISK_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  EXTREME: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  MODERATE: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  WATCH: { bg: 'bg-sky-500/10', text: 'text-sky-300', border: 'border-sky-500/30', dot: 'bg-sky-400' },
};

const MOCK_ALERTS: RiskAlert[] = [
  {
    id: 'ew-001',
    type: 'CYCLONE',
    region: 'Bay of Bengal',
    country: 'Bangladesh / Myanmar',
    riskLevel: 'EXTREME',
    riskScore: 93,
    timeframe: '24–48 hours',
    trigger: 'Category 4 depression forming at 13°N, 89°E — rapid intensification underway',
    affectedPopulation: 3200000,
    coordinates: { lat: 13, lng: 89 },
    lastUpdated: '18 min ago',
    signals: [
      'Sea surface temperature 30.4°C (anomaly +2.1°C)',
      'Wind shear dropping to 8 knots — ideal intensification conditions',
      'JTWC advisory issued: 72-hr landfall probability 84%',
      'Twitter surge: 1,240 #Cyclone mentions in last hour',
    ],
    recommendedActions: [
      'Pre-position evacuation boats in Chittagong and Cox\'s Bazar',
      'Alert coastal rescue teams — standby activation recommended',
      'Pre-stage water purification units at Dhaka logistics hub',
    ],
  },
  {
    id: 'ew-002',
    type: 'EARTHQUAKE',
    region: 'Hindu Kush Seismic Zone',
    country: 'Afghanistan / Pakistan',
    riskLevel: 'HIGH',
    riskScore: 78,
    timeframe: '72 hours',
    trigger: 'M4.2 foreshock cluster detected — 7 events in 48h along Chaman Fault',
    affectedPopulation: 1800000,
    coordinates: { lat: 33.5, lng: 70.2 },
    lastUpdated: '2 hours ago',
    signals: [
      'Seismic swarm: 7 events M2.5–M4.2 in 48 hours',
      'USGS stress analysis: fault section last ruptured 1935',
      'GPS ground deformation anomaly: 4.2cm horizontal shift',
      'GDACS elevated watch status confirmed',
    ],
    recommendedActions: [
      'Alert USAR teams in Islamabad and Kabul — readiness check',
      'Verify stockpile of acoustic listening gear in region',
      'Coordinate with local civil defense on comms protocols',
    ],
  },
  {
    id: 'ew-003',
    type: 'FLOOD',
    region: 'Sahel Corridor',
    country: 'Niger / Mali / Chad',
    riskLevel: 'HIGH',
    riskScore: 81,
    timeframe: '5–7 days',
    trigger: 'Monsoon onset 2 weeks early — Niger River gauge 340% above seasonal average',
    affectedPopulation: 4100000,
    coordinates: { lat: 14, lng: 4 },
    lastUpdated: '45 min ago',
    signals: [
      'Niger River Niamey station: 8.3m (flood stage: 5.8m)',
      'Copernicus EMS: 3,400 km² inundated as of 0600 UTC',
      'WFP reports 145 villages without road access',
      'Local radio transmissions report family displacements in 12 communes',
    ],
    recommendedActions: [
      'Deploy WASH teams to Niamey — cholera prevention priority',
      'Request OCHA logistics cluster activation',
      'Pre-position RUTF food supplies at N\'Djamena airport',
    ],
  },
  {
    id: 'ew-004',
    type: 'WILDFIRE',
    region: 'Mediterranean Basin',
    country: 'Greece / Turkey',
    riskLevel: 'MODERATE',
    riskScore: 67,
    timeframe: '3–5 days',
    trigger: 'Red fire weather warning: Meltemi winds 60+ knots, relative humidity < 15%',
    affectedPopulation: 280000,
    coordinates: { lat: 38, lng: 27 },
    lastUpdated: '1 hour ago',
    signals: [
      'Copernicus Forest Fire Danger index: Extreme (class 5)',
      'Heatwave advisory: 42°C forecast for Peloponnese next 4 days',
      'Satellite MODIS: 14 hotspots detected across Aegean coast',
      'Greek Civil Defense raised wildfire readiness to orange',
    ],
    recommendedActions: [
      'Pre-position aerial firefighting assets — Tanagra AFB',
      'Alert GIS fire behavior analysts for rapid modeling',
      'Verify smoke inhalation treatment kits at Patras hospital',
    ],
  },
  {
    id: 'ew-005',
    type: 'OUTBREAK',
    region: 'Horn of Africa',
    country: 'Somalia / Ethiopia',
    riskLevel: 'WATCH',
    riskScore: 54,
    timeframe: '2–3 weeks',
    trigger: 'WHO cholera risk assessment elevated following drought-induced water scarcity',
    affectedPopulation: 680000,
    coordinates: { lat: 6, lng: 43 },
    lastUpdated: '3 hours ago',
    signals: [
      'WHO alert: 6 suspected cholera cases in Baidoa IDP camp',
      'WASH infrastructure: 70% of boreholes non-functional',
      'OCHA drought severity: IPC Phase 4 (Emergency) across 3 regions',
      'Historical pattern: cholera spike follows each failed rainy season',
    ],
    recommendedActions: [
      'Alert Bio-Sentinel epidemiology teams for rapid deployment',
      'Pre-stage ORS, IV fluids, and chlorine tablets at Mogadishu hub',
      'Coordinate WHO rapid response team activation',
    ],
  },
];

export const EarlyWarningPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<RiskAlert[]>(MOCK_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert>(MOCK_ALERTS[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [lastRefresh, setLastRefresh] = useState('Just now');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefresh('Just now');
    }, 1800);
  };

  useEffect(() => {
    // Simulate live refresh every 5 minutes
    const interval = setInterval(() => {
      setLastRefresh('5 min ago');
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const filteredAlerts = filterLevel === 'ALL' ? alerts : alerts.filter((a) => a.riskLevel === filterLevel);

  const getTypeIcon = (type: string) => {
    const Icon = DISASTER_ICONS[type] || AlertTriangle;
    return Icon;
  };

  const extremeCount = alerts.filter((a) => a.riskLevel === 'EXTREME').length;
  const highCount = alerts.filter((a) => a.riskLevel === 'HIGH').length;
  const totalAffected = alerts.reduce((sum, a) => sum + a.affectedPopulation, 0);

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <CloudLightning className="w-5 h-5 text-amber-400" />
            Predictive Early Warning System
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            AI-powered risk forecasting · 24–72h horizon · Satellite + Social Signal Fusion
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Updated {lastRefresh}
          </span>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-teal-300 transition-colors"
            title="Refresh feeds"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-rose-400">EXTREME RISK</div>
            <div className="text-xl font-bold font-mono text-rose-300">{extremeCount}</div>
          </div>
        </div>
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-orange-400">HIGH RISK</div>
            <div className="text-xl font-bold font-mono text-orange-300">{highCount}</div>
          </div>
        </div>
        <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
            <Radio className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-sky-400">POPULATION AT RISK</div>
            <div className="text-xl font-bold font-mono text-sky-300">{(totalAffected / 1000000).toFixed(1)}M</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[500px]">
        {/* Alert List */}
        <div className="lg:col-span-5 flex flex-col bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden">
          {/* Filter Bar */}
          <div className="p-2 border-b border-slate-700/60 flex items-center gap-1 flex-wrap">
            {['ALL', 'EXTREME', 'HIGH', 'MODERATE', 'WATCH'].map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterLevel === level
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredAlerts.map((alert) => {
              const colors = RISK_COLORS[alert.riskLevel];
              const Icon = getTypeIcon(alert.type);
              const isSelected = selectedAlert.id === alert.id;

              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-teal-500/50'
                      : `bg-slate-900/40 border-slate-700/60 hover:border-slate-700`
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {alert.riskLevel}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{alert.lastUpdated}</span>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">{alert.type} Risk — {alert.region}</div>
                  <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                    <MapPin className="w-3 h-3" />
                    <span>{alert.country}</span>
                    <span className="ml-auto font-mono text-slate-500">Score: <span className={`font-bold ${colors.text}`}>{alert.riskScore}</span></span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> ETA: {alert.timeframe}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alert Detail */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {selectedAlert && (() => {
            const colors = RISK_COLORS[selectedAlert.riskLevel];
            const Icon = getTypeIcon(selectedAlert.type);
            return (
              <>
                {/* Detail Header */}
                <div className={`bg-slate-800/60 border ${colors.border} rounded-xl p-4`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100">{selectedAlert.type} — {selectedAlert.region}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {selectedAlert.country}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold font-mono ${colors.text}`}>{selectedAlert.riskScore}</div>
                      <div className="text-[10px] font-mono text-slate-500">RISK SCORE</div>
                    </div>
                  </div>

                  {/* Risk bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        selectedAlert.riskLevel === 'EXTREME' ? 'bg-rose-500' :
                        selectedAlert.riskLevel === 'HIGH' ? 'bg-orange-500' :
                        selectedAlert.riskLevel === 'MODERATE' ? 'bg-amber-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${selectedAlert.riskScore}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Horizon: <span className={`${colors.text} font-semibold`}>{selectedAlert.timeframe}</span></span>
                    <span>~{(selectedAlert.affectedPopulation / 1000000).toFixed(1)}M at risk</span>
                  </div>

                  <p className="text-xs text-slate-300 mt-3 border-t border-slate-700/60 pt-3 leading-relaxed">
                    {selectedAlert.trigger}
                  </p>
                </div>

                {/* Signal Intel */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
                  <div className="text-xs font-mono text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-teal-400" /> Signal Intelligence ({selectedAlert.signals.length} sources)
                  </div>
                  <div className="space-y-2">
                    {selectedAlert.signals.map((signal, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                        {signal}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Actions */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
                  <div className="text-xs font-mono text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" /> Pre-Positioning Recommendations
                  </div>
                  <div className="space-y-2">
                    {selectedAlert.recommendedActions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                        <ChevronRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-xs text-slate-200">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
