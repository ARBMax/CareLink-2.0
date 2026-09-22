/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Incident, 
  Volunteer, 
  DispatchArc, 
  GlobeLayerState, 
  TelemetryLog, 
  KPIStats,
  ExternalSignal
} from './types';
import { 
  INITIAL_INCIDENTS, 
  INITIAL_VOLUNTEERS, 
  INITIAL_DISPATCH_ARCS, 
  INITIAL_TELEMETRY_LOGS, 
  INITIAL_STATS 
} from './data/mockData';
import { 
  INITIAL_EXTERNAL_SIGNALS, 
  CANDIDATE_INCOMING_SIGNALS 
} from './data/mockSignals';
import { 
  playCriticalAlert, 
  playArrivalChime, 
  playDispatchPing, 
  isMuted, 
  toggleAudioMute 
} from './utils/audioAlerts';
import { Header } from './components/header/Header';
import { Sidebar } from './components/sidebar/Sidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { GlobeOperationalView } from './components/globe/GlobeOperationalView';
import { SmartMatchEngine } from './components/smart-match/SmartMatchEngine';
import { FieldReportIngestion } from './components/ingestion/FieldReportIngestion';
import { TelemetryFeed } from './components/monitoring/TelemetryFeed';
import { SignalRadarView } from './components/signals/SignalRadarView';
import { NotificationDrawer, NotificationItem } from './components/notifications/NotificationDrawer';
import { StartupScreen } from './components/startup/StartupScreen';

export default function App() {
  // Application Startup Screen
  const [showStartupScreen, setShowStartupScreen] = useState(true);

  // Application State
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);
  const [dispatchArcs, setDispatchArcs] = useState<DispatchArc[]>(INITIAL_DISPATCH_ARCS);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>(INITIAL_TELEMETRY_LOGS);
  const [stats, setStats] = useState<KPIStats>(INITIAL_STATS);
  const [selectedIncident, setSelectedIncident] = useState<Incident>(INITIAL_INCIDENTS[0]);

  // Real-Time Signal Stream State
  const [signals, setSignals] = useState<ExternalSignal[]>(INITIAL_EXTERNAL_SIGNALS);
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamSpeed, setStreamSpeed] = useState<'REALTIME' | 'FAST' | 'SURGE'>('REALTIME');
  const [isAudioMuted, setIsAudioMuted] = useState(isMuted());
  const nextCandidateIdxRef = useRef(0);

  // Navigation & Layout State
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // 3D Globe Layer Toggles
  const [layerState, setLayerState] = useState<GlobeLayerState>({
    disasterZones: true,
    volunteerDensity: true,
    supplyRouteArcs: true,
    atmosphericGlow: true,
    heatMapIntensity: true,
  });

  // Notification items
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'CRITICAL: Cyclone Sagar Embankment Breached',
      description: 'Chittagong disaster zone requires immediate water purification and swiftwater rescue teams.',
      timestamp: '14 min ago',
      type: 'CRITICAL',
      incidentId: 'inc-01',
      isRead: false,
    },
    {
      id: 'notif-2',
      title: 'DISPATCH AIRBRIDGE CONFIRMED',
      description: 'SkyLift Air Charter C-130 departed Miami Depot -> Port-au-Prince Seismic Corridor.',
      timestamp: '32 min ago',
      type: 'DISPATCH',
      incidentId: 'inc-02',
      isRead: false,
    },
    {
      id: 'notif-3',
      title: 'AI Decision Engine Telemetry Recalibrated',
      description: 'Bayesian smart match threshold tuned to 94.2% across global responder registries.',
      timestamp: '1 hour ago',
      type: 'SYSTEM',
      isRead: true,
    }
  ]);

  const handleToggleLayer = (layerKey: keyof GlobeLayerState) => {
    setLayerState((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  const handleToggleAudioMute = () => {
    const muted = toggleAudioMute();
    setIsAudioMuted(muted);
  };

  // Dispatch Volunteer action from Smart Match Engine
  const handleDispatchVolunteer = useCallback((incident: Incident, volunteer: Volunteer) => {
    playDispatchPing();

    // 1. Create a dynamic new 3D dispatch arc with full telemetry
    const newArc: DispatchArc = {
      id: `arc-${Date.now()}`,
      incidentId: incident.id,
      volunteerId: volunteer.id,
      fromCoords: volunteer.coords,
      toCoords: incident.coords,
      fromName: volunteer.homeBase,
      toName: incident.locationName,
      status: 'EN_ROUTE',
      color: '#14b8a6', // Teal
      transportMode: 'AIR_CHARTER',
      progress: 5,
      speedKnots: 450,
      altitudeFt: 28000,
      etaMinutes: Math.max(12, Math.round(volunteer.etaHours * 60)),
      cargoDescription: `Direct mobilization of ${volunteer.role} with specialized mission kit`,
    };

    setDispatchArcs((prev) => [newArc, ...prev]);

    // 2. Update volunteer status
    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === volunteer.id
          ? { ...v, readinessStatus: 'DISPATCHED' as const }
          : v
      )
    );

    // 3. Update incident assigned count
    setIncidents((prev) =>
      prev.map((i) =>
        i.id === incident.id
          ? {
              ...i,
              assignedVolunteersCount: i.assignedVolunteersCount + 1,
              activeMatchesPending: Math.max(0, i.activeMatchesPending - 1),
            }
          : i
      )
    );

    // 4. Update stats
    setStats((prev) => ({
      ...prev,
      volunteersDeployed: prev.volunteersDeployed + 1,
      volunteersAvailable: Math.max(0, prev.volunteersAvailable - 1),
      smartMatchesPending: Math.max(0, prev.smartMatchesPending - 1),
    }));

    // 5. Emit new telemetry log
    const now = new Date();
    const timeStr = now.toISOString().substring(11, 19) + ' UTC';
    const newLog: TelemetryLog = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      level: 'SUCCESS',
      source: 'Smart Match Engine',
      message: `Emergency dispatch confirmed: ${volunteer.name} (${volunteer.role}) -> ${incident.locationName}. Airbridge arc established.`,
      incidentId: incident.id,
      isNew: true,
    };
    setTelemetryLogs((prev) => [newLog, ...prev]);

    // 6. Add notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `DISPATCH: ${volunteer.callsign} En Route`,
      description: `Mobilized to ${incident.title} (${incident.country}). Visual flight trajectory plotted on 3D Globe.`,
      timestamp: 'Just now',
      type: 'DISPATCH',
      incidentId: incident.id,
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  // Ingest New Incident from Field Report form
  const handleIngestNewIncident = useCallback((newIncident: Incident) => {
    if (newIncident.urgency === 'CRITICAL') {
      playCriticalAlert();
    } else {
      playDispatchPing();
    }

    setIncidents((prev) => [newIncident, ...prev]);
    setSelectedIncident(newIncident);

    // Update stats
    setStats((prev) => ({
      ...prev,
      activeEmergencies: prev.activeEmergencies + 1,
      criticalEmergencies:
        newIncident.urgency === 'CRITICAL'
          ? prev.criticalEmergencies + 1
          : prev.criticalEmergencies,
      smartMatchesPending: prev.smartMatchesPending + 3,
    }));

    // Emit telemetry log
    const now = new Date();
    const timeStr = now.toISOString().substring(11, 19) + ' UTC';
    const newLog: TelemetryLog = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      level: newIncident.urgency === 'CRITICAL' ? 'CRITICAL' : 'WARN',
      source: 'AI Multimodal Ingestion',
      message: `New field report parsed & verified: [${newIncident.code}] ${newIncident.title} in ${newIncident.country}. Severity: ${newIncident.severityScore}/100.`,
      incidentId: newIncident.id,
      isNew: true,
    };
    setTelemetryLogs((prev) => [newLog, ...prev]);

    // Add notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `NEW REPORT: ${newIncident.code}`,
      description: `${newIncident.title} registered at (${newIncident.coords.lat.toFixed(2)}°, ${newIncident.coords.lng.toFixed(2)}°).`,
      timestamp: 'Just now',
      type: 'CRITICAL',
      incidentId: newIncident.id,
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  // Deploy an incoming signal directly to 3D Globe as an active Incident
  const handleDeploySignalToGlobe = useCallback((signal: ExternalSignal) => {
    playDispatchPing();

    const coords = signal.stage1.coords || { lat: 20.0, lng: 90.0 };
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const codePrefix = signal.stage2.category.substring(0, 3).toUpperCase();
    const newCode = `${codePrefix}-2026-${randomSuffix}`;

    const region: Incident['region'] = 
      coords.lng < -30 ? 'Americas' :
      coords.lat < 35 && coords.lng > 60 && coords.lng < 150 ? 'Asia-Pacific' :
      coords.lat > 35 && coords.lng < 50 ? 'Europe' :
      coords.lng > 30 && coords.lng < 60 && coords.lat > 12 ? 'Middle East' : 'Africa';

    const source: Incident['source'] = 
      signal.source === 'WHATSAPP' ? 'WhatsApp Hotline' :
      signal.source === 'TWITTER' ? 'Crowdsourced Drone' :
      signal.source === 'RSS_GDACS' ? 'Satellite Telemetry' : 'UN OCHA';

    const newIncident: Incident = {
      id: `inc-sig-${Date.now()}`,
      code: newCode,
      title: `${signal.stage1.extractedLocationName}: Emergency Response Required`,
      category: signal.stage2.category,
      urgency: signal.stage2.urgency,
      severityScore: signal.stage2.severityScore,
      locationName: signal.stage1.extractedLocationName,
      country: signal.stage1.extractedLocationName.split(',').pop()?.trim() || 'Global Zone',
      region,
      coords: coords,
      timestamp: 'Just now',
      populationAffected: Math.floor(15000 + Math.random() * 45000),
      description: signal.stage2.reportSummary || signal.rawText,
      extractedNeeds: signal.stage2.extractedNeeds,
      requiredSkills: ['Emergency Paramedic', 'Logistics Fleet Coordinator', 'Swiftwater Rescue'],
      assignedVolunteersCount: 0,
      activeMatchesPending: 3,
      status: 'PENDING_DISPATCH',
      source,
    };

    setIncidents((prev) => [newIncident, ...prev]);
    setSelectedIncident(newIncident);

    // Mark signal as deployed
    setSignals((prev) =>
      prev.map((s) =>
        s.id === signal.id ? { ...s, status: 'DEPLOYED' as const, deployedIncidentId: newIncident.id } : s
      )
    );

    // Update stats
    setStats((prev) => ({
      ...prev,
      activeEmergencies: prev.activeEmergencies + 1,
      criticalEmergencies: signal.stage2.urgency === 'CRITICAL' ? prev.criticalEmergencies + 1 : prev.criticalEmergencies,
      smartMatchesPending: prev.smartMatchesPending + 3,
    }));

    // Emit telemetry log
    const now = new Date();
    const timeStr = now.toISOString().substring(11, 19) + ' UTC';
    const newLog: TelemetryLog = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      level: signal.stage2.urgency === 'CRITICAL' ? 'CRITICAL' : 'WARN',
      source: `Signal Bus [${signal.source}]`,
      message: `Promoted signal to 3D Globe hotspot: [${newCode}] ${newIncident.title}. Immediate matching initiated.`,
      incidentId: newIncident.id,
      isNew: true,
    };
    setTelemetryLogs((prev) => [newLog, ...prev]);

    // Fly to Globe
    setActiveView('globe');
  }, []);

  const handleDismissSignal = useCallback((signalId: string) => {
    setSignals((prev) => prev.filter((s) => s.id !== signalId));
  }, []);

  // Trigger Crisis Surge (Simulate sudden cluster of coordinated SOS signals)
  const handleTriggerSurge = useCallback(() => {
    playCriticalAlert();

    const timestamp = 'Just now';
    const surgeSignals: ExternalSignal[] = CANDIDATE_INCOMING_SIGNALS.slice(0, 2).map((cand, idx) => ({
      ...cand,
      id: `sig-surge-${Date.now()}-${idx}`,
      receivedAt: Date.now() - idx * 1000,
      timestamp,
      status: 'VERIFIED',
    }));

    setSignals((prev) => [...surgeSignals, ...prev]);

    const now = new Date();
    const timeStr = now.toISOString().substring(11, 19) + ' UTC';
    const newLog: TelemetryLog = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      level: 'CRITICAL',
      source: 'Disaster Ingestion Bus',
      message: `ALERT: Sudden multi-source signal spike detected! Ingested ${surgeSignals.length} high-urgency SOS packets.`,
      isNew: true,
    };
    setTelemetryLogs((prev) => [newLog, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-surge-${Date.now()}`,
      title: 'DISASTER SIGNAL SPIKE DETECTED',
      description: 'Rapid cluster of high-severity emergency reports received across WhatsApp and Twitter/X streams.',
      timestamp: 'Just now',
      type: 'CRITICAL',
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  // Real-Time Background Signal Stream Loop (simulating incoming WebSocket / SSE packets)
  useEffect(() => {
    if (!isStreaming) return;

    const intervalMs = streamSpeed === 'FAST' ? 4000 : 12000;
    const timer = setInterval(() => {
      const candidates = CANDIDATE_INCOMING_SIGNALS;
      const cand = candidates[nextCandidateIdxRef.current % candidates.length];
      nextCandidateIdxRef.current += 1;

      const newSig: ExternalSignal = {
        ...cand,
        id: `sig-${Date.now()}`,
        receivedAt: Date.now(),
        timestamp: 'Just now',
        status: 'VERIFIED',
      };

      setSignals((prev) => [newSig, ...prev.slice(0, 25)]);

      if (newSig.stage2.urgency === 'CRITICAL') {
        playCriticalAlert();
      }

      setStats((prev) => ({
        ...prev,
        telemetryIngestionRate: prev.telemetryIngestionRate + 18,
      }));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStreaming, streamSpeed]);

  // Real-Time Moving Transit Arcs Engine (progresses in-flight airbridges & vehicles)
  useEffect(() => {
    const transitInterval = setInterval(() => {
      setDispatchArcs((prevArcs) => {
        let hasChanges = false;
        const nextArcs = prevArcs.map((arc) => {
          if (arc.status !== 'EN_ROUTE') return arc;

          hasChanges = true;
          const delta = 1.2 + Math.random() * 1.5; // realistic progress step
          const newProgress = Math.min(100, arc.progress + delta);
          const isTouchdown = newProgress >= 100;

          if (isTouchdown) {
            playArrivalChime();

            // Volunteer is now on site
            setVolunteers((prevVols) =>
              prevVols.map((v) =>
                v.id === arc.volunteerId ? { ...v, readinessStatus: 'ON_SITE' as const } : v
              )
            );

            // Log arrival event
            const now = new Date();
            const timeStr = now.toISOString().substring(11, 19) + ' UTC';
            const newLog: TelemetryLog = {
              id: `log-arrival-${Date.now()}`,
              timestamp: timeStr,
              level: 'SUCCESS',
              source: 'Airbridge Telemetry',
              message: `TOUCHDOWN VERIFIED: ${arc.transportMode} has arrived at ${arc.toName}. Personnel & cargo deployed on site.`,
              incidentId: arc.incidentId,
              isNew: true,
            };
            setTelemetryLogs((prevLogs) => [newLog, ...prevLogs]);

            // Add notification
            const newNotif: NotificationItem = {
              id: `notif-arr-${Date.now()}`,
              title: `MISSION ARRIVAL: ${arc.toName}`,
              description: `Emergency transit completed. Responders active in relief theater.`,
              timestamp: 'Just now',
              type: 'DISPATCH',
              incidentId: arc.incidentId,
              isRead: false,
            };
            setNotifications((prevNotifs) => [newNotif, ...prevNotifs]);

            return {
              ...arc,
              progress: 100,
              status: 'ARRIVED' as const,
              speedKnots: 0,
              etaMinutes: 0,
            };
          }

          const currentEta = arc.etaMinutes || 30;
          return {
            ...arc,
            progress: newProgress,
            etaMinutes: Math.max(1, currentEta - 1),
          };
        });

        return hasChanges ? nextArcs : prevArcs;
      });
    }, 2500);

    return () => clearInterval(transitInterval);
  }, []);

  // Simulate periodic background satellite ingestion
  const handleSimulateBurst = useCallback(() => {
    const randomIncident = incidents[Math.floor(Math.random() * incidents.length)];
    const messages = [
      `Satellite SAR radar pass detects receding water levels in Sector 2 for ${randomIncident.code}.`,
      `Crowdsourced mesh network relay received 24 civilian status pings near ${randomIncident.locationName}.`,
      `Autonomous logistics OS recalculating fuel contingency for active flight arcs.`,
      `Smart Match score update: 3 additional certified trauma surgeons identified on regional standby.`,
      `Weather telemetry forecast: Wind shear decreasing by 15 knots in target response area.`
    ];

    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    const now = new Date();
    const timeStr = now.toISOString().substring(11, 19) + ' UTC';

    const newLog: TelemetryLog = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      level: Math.random() > 0.4 ? 'INFO' : 'SUCCESS',
      source: 'Automated Satellite Link',
      message: randomMsg,
      incidentId: randomIncident.id,
      isNew: true,
    };

    setTelemetryLogs((prev) => [newLog, ...prev.slice(0, 45)]);
  }, [incidents]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleSelectIncidentById = (id: string) => {
    const found = incidents.find((i) => i.id === id);
    if (found) {
      setSelectedIncident(found);
      setActiveView('dashboard');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Application Header */}
      <Header
        stats={stats}
        unreadNotificationsCount={unreadCount}
        onToggleNotificationDrawer={() => setIsNotificationDrawerOpen(!isNotificationDrawerOpen)}
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        isAudioMuted={isAudioMuted}
        onToggleAudioMute={handleToggleAudioMute}
        signalsCount={signals.length}
        onTriggerSurge={handleTriggerSurge}
        onReplayStartup={() => setShowStartupScreen(true)}
      />

      {/* Main Workspace Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Mission Navigation Sidebar */}
        <Sidebar
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          criticalCount={stats.criticalEmergencies}
          pendingMatchesCount={stats.smartMatchesPending}
          signalsCount={signals.length}
          onReplayStartup={() => setShowStartupScreen(true)}
        />

        {/* Content View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-slate-950/40 flex flex-col">
          {/* View 1: Overview Dashboard (Split layout) */}
          {activeView === 'dashboard' && (
            <OverviewDashboard
              incidents={incidents}
              volunteers={volunteers}
              dispatchArcs={dispatchArcs}
              layerState={layerState}
              onToggleLayer={handleToggleLayer}
              telemetryLogs={telemetryLogs}
              stats={stats}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onOpenSmartMatch={(inc) => {
                setSelectedIncident(inc);
                setActiveView('smart-match');
              }}
              onSimulateBurst={handleSimulateBurst}
            />
          )}

          {/* View 2: Dedicated 3D Globe Operational View */}
          {activeView === 'globe' && (
            <GlobeOperationalView
              incidents={incidents}
              volunteers={volunteers}
              dispatchArcs={dispatchArcs}
              layerState={layerState}
              onToggleLayer={handleToggleLayer}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onOpenSmartMatch={(inc) => {
                setSelectedIncident(inc);
                setActiveView('smart-match');
              }}
            />
          )}

          {/* View 3: Multi-Source Signal Radar & Ingestion Bus */}
          {activeView === 'signal-radar' && (
            <SignalRadarView
              signals={signals}
              isStreaming={isStreaming}
              onToggleStreaming={() => setIsStreaming(!isStreaming)}
              streamSpeed={streamSpeed}
              onChangeStreamSpeed={(speed) => setStreamSpeed(speed)}
              onDeploySignalToGlobe={handleDeploySignalToGlobe}
              onDismissSignal={handleDismissSignal}
              onTriggerSurge={handleTriggerSurge}
              onNavigateToGlobe={() => setActiveView('globe')}
            />
          )}

          {/* View 4: Smart Match Engine View */}
          {activeView === 'smart-match' && (
            <SmartMatchEngine
              incidents={incidents}
              volunteers={volunteers}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onDispatchVolunteer={handleDispatchVolunteer}
              onNavigateToGlobe={() => setActiveView('globe')}
            />
          )}

          {/* View 5: Field Report Ingestion Form */}
          {activeView === 'ingestion' && (
            <FieldReportIngestion
              onIngestNewIncident={handleIngestNewIncident}
              onNavigateToSmartMatch={(inc) => {
                setSelectedIncident(inc);
                setActiveView('smart-match');
              }}
            />
          )}

          {/* View 6: 24/7 Telemetry Logs Deep-Dive Feed */}
          {activeView === 'telemetry' && (
            <div className="h-full max-w-4xl mx-auto w-full">
              <TelemetryFeed
                logs={telemetryLogs}
                incidents={incidents}
                onSelectIncidentById={handleSelectIncidentById}
                onSimulateBurst={handleSimulateBurst}
              />
            </div>
          )}
        </main>
      </div>

      {/* Slide-out Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onSelectIncidentById={handleSelectIncidentById}
      />

      {/* Cinematic Orbital Startup Screen */}
      {showStartupScreen && (
        <StartupScreen onEnterApp={() => setShowStartupScreen(false)} />
      )}
    </div>
  );
}
