/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Incident, 
  Volunteer, 
  DispatchArc, 
  GlobeLayerState, 
  TelemetryLog, 
  KPIStats 
} from './types';
import { 
  INITIAL_INCIDENTS, 
  INITIAL_VOLUNTEERS, 
  INITIAL_DISPATCH_ARCS, 
  INITIAL_TELEMETRY_LOGS, 
  INITIAL_STATS 
} from './data/mockData';
import { 
  fetchIncidents, 
  fetchVolunteers, 
  fetchDispatchArcs, 
  fetchStats, 
  createDispatch as apiCreateDispatch,
  createIncident as apiCreateIncident,
} from './services/api';
import { useCareLinkWebSocket } from './hooks/useCareLinkWebSocket';
import { Header } from './components/header/Header';
import { Sidebar } from './components/sidebar/Sidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { GlobeOperationalView } from './components/globe/GlobeOperationalView';
import { SmartMatchEngine } from './components/smart-match/SmartMatchEngine';
import { FieldReportIngestion } from './components/ingestion/FieldReportIngestion';
import { TelemetryFeed } from './components/monitoring/TelemetryFeed';
import { NotificationDrawer, NotificationItem } from './components/notifications/NotificationDrawer';

export default function App() {
  // Application State
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);
  const [dispatchArcs, setDispatchArcs] = useState<DispatchArc[]>(INITIAL_DISPATCH_ARCS);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>(INITIAL_TELEMETRY_LOGS);
  const [stats, setStats] = useState<KPIStats>(INITIAL_STATS);
  const [selectedIncident, setSelectedIncident] = useState<Incident>(INITIAL_INCIDENTS[0]);


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

  // ── Live Backend Connection & Real-Time WebSocket ───────────────────────────
  const { isConnected: isBackendConnected } = useCareLinkWebSocket({
    onNewIncident: useCallback((incident: Incident) => {
      setIncidents((prev) => [incident, ...prev.filter((i) => i.id !== incident.id)]);
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: `NEW INCIDENT: ${incident.code}`,
          description: `${incident.title} (${incident.country})`,
          timestamp: 'Just now',
          type: 'CRITICAL',
          incidentId: incident.id,
          isRead: false,
        },
        ...prev,
      ]);
    }, []),
    onUpdateIncident: useCallback((incident: Incident) => {
      setIncidents((prev) => prev.map((i) => (i.id === incident.id ? incident : i)));
    }, []),
    onNewLog: useCallback((log: TelemetryLog) => {
      setTelemetryLogs((prev) => [log, ...prev.slice(0, 100)]);
    }, []),
    onNewDispatch: useCallback((arc: DispatchArc) => {
      setDispatchArcs((prev) => [arc, ...prev.filter((a) => a.id !== arc.id)]);
    }, []),
    onDispatchProgress: useCallback((data: { arc_id: string; progress_pct: number; status?: string }) => {
      setDispatchArcs((prev) =>
        prev.map((a) =>
          a.id === data.arc_id
            ? { ...a, progress: data.progress_pct, status: (data.status as any) || a.status }
            : a
        )
      );
    }, []),
    onVolunteerStatus: useCallback((data: { volunteer_id: string; readiness_status: string }) => {
      setVolunteers((prev) =>
        prev.map((v) =>
          v.id === data.volunteer_id
            ? { ...v, readinessStatus: data.readiness_status as any }
            : v
        )
      );
    }, []),
    onStatsUpdate: useCallback((newStats: KPIStats) => {
      setStats((prev) => ({ ...prev, ...newStats }));
    }, []),
  });

  // Fetch initial data from backend API on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [backendIncidents, backendVolunteers, backendArcs, backendStats] = await Promise.allSettled([
          fetchIncidents(),
          fetchVolunteers(),
          fetchDispatchArcs(),
          fetchStats(),
        ]);

        if (backendIncidents.status === 'fulfilled' && backendIncidents.value.length > 0) {
          setIncidents(backendIncidents.value);
          setSelectedIncident(backendIncidents.value[0]);
        }
        if (backendVolunteers.status === 'fulfilled' && backendVolunteers.value.length > 0) {
          setVolunteers(backendVolunteers.value);
        }
        if (backendArcs.status === 'fulfilled' && backendArcs.value.length > 0) {
          setDispatchArcs(backendArcs.value);
        }
        if (backendStats.status === 'fulfilled') {
          setStats(backendStats.value);
        }
      } catch (err) {
        console.warn('Backend API connection notice (using initial state):', err);
      }
    }

    loadBackendData();
  }, []);

  const handleToggleLayer = (layerKey: keyof GlobeLayerState) => {
    setLayerState((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  // Dispatch Volunteer action from Smart Match Engine
  const handleDispatchVolunteer = useCallback((incident: Incident, volunteer: Volunteer) => {

    // 1. Create a dynamic new 3D dispatch arc
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
      progress: 15,
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

    // Persist dispatch arc to FastAPI backend
    apiCreateDispatch(incident.id, volunteer.id, 'AIR_CHARTER').catch((err) =>
      console.warn('Dispatch API call error (optimistic update kept):', err)
    );
  }, []);


  // Ingest New Incident from Field Report form
  const handleIngestNewIncident = useCallback((newIncident: Incident) => {
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

    // Persist incident to FastAPI backend
    apiCreateIncident(newIncident).catch((err) =>
      console.warn('Create incident API call error (optimistic update kept):', err)
    );
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

  // Periodic simulation timer
  useEffect(() => {
    const interval = setInterval(() => {
      handleSimulateBurst();
    }, 28000);
    return () => clearInterval(interval);
  }, [handleSimulateBurst]);

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
        isBackendConnected={isBackendConnected}
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

          {/* View 3: Smart Match Engine View */}
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

          {/* View 4: Field Report Ingestion Form */}
          {activeView === 'ingestion' && (
            <FieldReportIngestion
              onIngestNewIncident={handleIngestNewIncident}
              onNavigateToSmartMatch={(inc) => {
                setSelectedIncident(inc);
                setActiveView('smart-match');
              }}
            />
          )}

          {/* View 5: 24/7 Telemetry Logs Deep-Dive Feed */}
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
    </div>
  );
}
