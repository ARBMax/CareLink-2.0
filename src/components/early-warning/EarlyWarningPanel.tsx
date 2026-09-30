import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Loader2,
  Wifi,
  WifiOff,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { fetchEarlyWarningAlerts, triggerEarlyWarningRefresh } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  sourceUrl?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

// Friendly "X minutes/hours ago" label from ISO timestamp
function timeAgo(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Just now';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const EarlyWarningPanel: React.FC = () => {
  const [alerts, setAlerts]               = useState<RiskAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [filterLevel, setFilterLevel]     = useState<string>('ALL');

  // Loading / status states
  const [isLoading, setIsLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [lastFetchTs, setLastFetchTs]     = useState<string | null>(null);
  const [newAlertIds, setNewAlertIds]     = useState<Set<string>>(new Set());

  const wsRef = useRef<WebSocket | null>(null);

  // ── Load alerts from backend ─────────────────────────────────────────────

  const loadAlerts = useCallback(async (forceRefresh = false) => {
    try {
      setLoadError(null);
      const raw = await fetchEarlyWarningAlerts(forceRefresh);
      if (raw.length > 0) {
        const incoming = raw as RiskAlert[];
        setAlerts(incoming);
        setSelectedAlert((prev) => prev ? (incoming.find(a => a.id === prev.id) ?? incoming[0]) : incoming[0]);
        setLastFetchTs(new Date().toISOString());
      }
    } catch (err: any) {
      console.warn('[EarlyWarning] fetch failed:', err);
      setLoadError(err.message ?? 'Failed to load live data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial mount fetch
  useEffect(() => {
    loadAlerts(false);
  }, [loadAlerts]);

  // ── WebSocket subscription for live push updates ─────────────────────────

  useEffect(() => {
    let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase = import.meta.env.VITE_WS_URL
      ? `${import.meta.env.VITE_WS_URL}/ws`
      : `${protocol}//${window.location.hostname === 'localhost' ? 'localhost:8001' : window.location.host}/ws`;

    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connectWS = () => {
      const ws = new WebSocket(wsBase);
      wsRef.current = ws;

      ws.onopen = () => setLiveConnected(true);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.event === 'EARLY_WARNING_UPDATE' && Array.isArray(msg.payload?.alerts)) {
            const incoming = msg.payload.alerts as RiskAlert[];
            if (incoming.length > 0) {
              // Highlight newly arrived alert IDs
              setAlerts((prev) => {
                const prevIds = new Set(prev.map(a => a.id));
                const freshIds = incoming.filter(a => !prevIds.has(a.id)).map(a => a.id);
                if (freshIds.length > 0) {
                  setNewAlertIds(new Set(freshIds));
                  setTimeout(() => setNewAlertIds(new Set()), 4000);
                }
                return incoming;
              });
              setSelectedAlert((prev) => {
                if (!prev) return incoming[0];
                return incoming.find(a => a.id === prev.id) ?? incoming[0];
              });
              setLastFetchTs(new Date().toISOString());
            }
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        setLiveConnected(false);
        reconnectTimer = setTimeout(connectWS, 5000);
      };

      ws.onerror = () => ws.close();
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  // ── Manual refresh handler ───────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // POST /refresh triggers full Groq re-score server-side;
      // the WS broadcast will update alerts automatically.
      // We also update locally from the response for speed.
      const raw = await triggerEarlyWarningRefresh();
      if (raw.length > 0) {
        const incoming = raw as RiskAlert[];
        setAlerts(incoming);
        setSelectedAlert((prev) => prev ? (incoming.find(a => a.id === prev.id) ?? incoming[0]) : incoming[0]);
        setLastFetchTs(new Date().toISOString());
      }
    } catch (err: any) {
      console.warn('[EarlyWarning] refresh failed:', err);
      // Fallback: silent fetch
      await loadAlerts(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadAlerts]);

  // ── Derived stats ────────────────────────────────────────────────────────

  const filteredAlerts = filterLevel === 'ALL' ? alerts : alerts.filter((a) => a.riskLevel === filterLevel);
  const extremeCount   = alerts.filter((a) => a.riskLevel === 'EXTREME').length;
  const highCount      = alerts.filter((a) => a.riskLevel === 'HIGH').length;
  const totalAffected  = alerts.reduce((s, a) => s + (a.affectedPopulation || 0), 0);

  const getTypeIcon = (type: string): React.ElementType => DISASTER_ICONS[type] ?? AlertTriangle;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <CloudLightning className="w-5 h-5 text-amber-400" />
            Predictive Early Warning System
            {/* Live indicator */}
            <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ml-1 ${
              liveConnected
                ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                : 'bg-slate-700/50 text-slate-500 border-slate-600/30'
            }`}>
              {liveConnected
                ? <><Wifi className="w-2.5 h-2.5" /> LIVE</>
                : <><WifiOff className="w-2.5 h-2.5" /> OFFLINE</>}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            AI-powered risk forecasting · 24–72h horizon · GDACS + NewsAPI + Groq LLaMA
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetchTs && (
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Updated {timeAgo(lastFetchTs)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-teal-300 transition-colors disabled:opacity-50"
            title="Refresh feeds"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {loadError && !isLoading && alerts.length === 0 && (
        <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <span className="font-semibold">Backend unreachable</span> — could not load live data.{' '}
            <button onClick={() => loadAlerts(true)} className="underline hover:text-rose-200">Retry</button>
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
          <p className="text-sm font-mono">Fetching live risk signals from GDACS &amp; NewsAPI…</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Shield className="w-10 h-10 text-slate-600" />
          <p className="text-sm">No active risk alerts at this time.</p>
          <button
            onClick={handleRefresh}
            className="text-xs text-teal-400 hover:text-teal-300 underline"
          >
            Refresh now
          </button>
        </div>
      ) : (
        <>
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
                <div className="text-xl font-bold font-mono text-sky-300">
                  {totalAffected >= 1000000
                    ? `${(totalAffected / 1000000).toFixed(1)}M`
                    : totalAffected >= 1000
                    ? `${(totalAffected / 1000).toFixed(0)}K`
                    : totalAffected > 0 ? totalAffected.toString() : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Data source badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2.5 py-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              Live data: GDACS Global Disaster Alert System
            </div>
            {isRefreshing && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg px-2.5 py-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Groq AI re-scoring…
              </div>
            )}
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
                <span className="ml-auto text-[10px] font-mono text-slate-600">
                  {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredAlerts.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-xs text-slate-500">
                    No alerts for this filter level
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const colors    = RISK_COLORS[alert.riskLevel] ?? RISK_COLORS.WATCH;
                    const Icon      = getTypeIcon(alert.type);
                    const isSelected = selectedAlert?.id === alert.id;
                    const isNew     = newAlertIds.has(alert.id);

                    return (
                      <div
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all relative ${
                          isNew ? 'ring-1 ring-teal-400/50 ' : ''
                        }${
                          isSelected
                            ? 'bg-slate-800/90 border-teal-500/50'
                            : 'bg-slate-900/40 border-slate-700/60 hover:border-slate-700'
                        }`}
                      >
                        {isNew && (
                          <span className="absolute top-2 right-2 text-[9px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded-full">
                            NEW
                          </span>
                        )}
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

                        <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                          {alert.type} Risk — {alert.region}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{alert.country}</span>
                          <span className="ml-auto font-mono text-slate-500 shrink-0">
                            Score: <span className={`font-bold ${colors.text}`}>{alert.riskScore}</span>
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ETA: {alert.timeframe}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Alert Detail */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {selectedAlert ? (() => {
                const colors = RISK_COLORS[selectedAlert.riskLevel] ?? RISK_COLORS.WATCH;
                const Icon   = getTypeIcon(selectedAlert.type);
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
                            <div className="text-sm font-bold text-slate-100">
                              {selectedAlert.type} — {selectedAlert.region}
                            </div>
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
                          className={`h-2 rounded-full transition-all duration-700 ${
                            selectedAlert.riskLevel === 'EXTREME' ? 'bg-rose-500' :
                            selectedAlert.riskLevel === 'HIGH'    ? 'bg-orange-500' :
                            selectedAlert.riskLevel === 'MODERATE'? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${selectedAlert.riskScore}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Horizon:{' '}
                          <span className={`${colors.text} font-semibold`}>{selectedAlert.timeframe}</span>
                        </span>
                        {selectedAlert.affectedPopulation > 0 && (
                          <span>
                            ~{selectedAlert.affectedPopulation >= 1000000
                              ? `${(selectedAlert.affectedPopulation / 1000000).toFixed(1)}M`
                              : `${(selectedAlert.affectedPopulation / 1000).toFixed(0)}K`} at risk
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-3 border-t border-slate-700/60 pt-3 leading-relaxed">
                        {selectedAlert.trigger}
                      </p>

                      {selectedAlert.sourceUrl && (
                        <a
                          href={selectedAlert.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-teal-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> View source
                        </a>
                      )}
                    </div>

                    {/* Signal Intel */}
                    {selectedAlert.signals.length > 0 && (
                      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
                        <div className="text-xs font-mono text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-teal-400" />
                          Signal Intelligence ({selectedAlert.signals.length} source{selectedAlert.signals.length !== 1 ? 's' : ''})
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
                    )}

                    {/* Recommended Actions */}
                    {selectedAlert.recommendedActions.length > 0 && (
                      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
                        <div className="text-xs font-mono text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          Pre-Positioning Recommendations
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
                    )}
                  </>
                );
              })() : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  Select an alert to view details
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
