/**
 * CareLink 2.0 — Frontend API Service Client
 * Handles communication with the FastAPI backend at /api
 * Converts snake_case backend models to camelCase frontend TypeScript types.
 */

import { Incident, Volunteer, DispatchArc, TelemetryLog, KPIStats } from '../types';

const API_BASE = '/api';

// ── Adapters ─────────────────────────────────────────────────────────────────

export function adaptIncident(raw: any): Incident {
  return {
    id: raw.id,
    code: raw.code || 'INC-2026-000',
    title: raw.title,
    category: raw.category,
    urgency: raw.urgency,
    severityScore: raw.severity_score ?? raw.severityScore ?? 85,
    locationName: raw.location_name ?? raw.locationName ?? 'Unknown',
    country: raw.country || 'Global',
    region: raw.region || 'Asia-Pacific',
    coords: {
      lat: raw.coords?.lat ?? 0,
      lng: raw.coords?.lng ?? 0,
    },
    timestamp: raw.timestamp ? new Date(raw.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    populationAffected: raw.population_affected ?? raw.populationAffected ?? 0,
    description: raw.description || '',
    extractedNeeds: raw.extracted_needs ?? raw.extractedNeeds ?? [],
    requiredSkills: raw.required_skills ?? raw.requiredSkills ?? [],
    assignedVolunteersCount: raw.assigned_volunteers?.length ?? raw.assignedVolunteersCount ?? 0,
    activeMatchesPending: raw.active_matches_pending ?? raw.activeMatchesPending ?? 1,
    status: raw.status || 'PENDING_DISPATCH',
    source: raw.source || 'Satellite Telemetry',
    mediaUrl: raw.media_urls?.[0] ?? raw.mediaUrl,
  };
}

export function adaptVolunteer(raw: any): Volunteer {
  return {
    id: raw.id,
    name: raw.name,
    callsign: raw.callsign,
    avatar: raw.avatar_initials || raw.avatar || raw.name.slice(0, 2).toUpperCase(),
    role: raw.role,
    organization: raw.organization,
    homeBase: raw.home_base_name ?? raw.homeBase ?? 'Field Station',
    coords: {
      lat: raw.home_base_coords?.lat ?? raw.coords?.lat ?? 0,
      lng: raw.home_base_coords?.lng ?? raw.coords?.lng ?? 0,
    },
    matchScore: raw.match_score ?? raw.matchScore ?? 90,
    distanceKm: raw.distance_km ?? raw.distanceKm ?? 0,
    etaHours: raw.eta_hours ?? raw.etaHours ?? 2.5,
    skills: raw.skills || [],
    certifications: raw.certifications || [],
    readinessStatus: raw.readiness_status ?? raw.readinessStatus ?? 'STANDBY',
    languages: raw.languages || [],
    experienceYears: raw.experience_years ?? raw.experienceYears ?? 5,
    pastMissionsCount: raw.past_missions ?? raw.pastMissionsCount ?? 10,
  };
}

export function adaptDispatchArc(raw: any): DispatchArc {
  return {
    id: raw.id,
    incidentId: raw.incident_id ?? raw.incidentId,
    volunteerId: raw.volunteer_id ?? raw.volunteerId,
    fromCoords: {
      lat: raw.from_coords?.lat ?? raw.fromCoords?.lat ?? 0,
      lng: raw.from_coords?.lng ?? raw.fromCoords?.lng ?? 0,
    },
    toCoords: {
      lat: raw.to_coords?.lat ?? raw.toCoords?.lat ?? 0,
      lng: raw.to_coords?.lng ?? raw.toCoords?.lng ?? 0,
    },
    fromName: raw.from_name ?? raw.fromName ?? 'Origin',
    toName: raw.to_name ?? raw.toName ?? 'Disaster Zone',
    status: raw.status || 'EN_ROUTE',
    color: raw.color || '#14b8a6',
    transportMode: raw.transport_mode ?? raw.transportMode ?? 'AIR_CHARTER',
    progress: raw.progress_pct ?? raw.progress ?? 0,
  };
}

export function adaptTelemetryLog(raw: any): TelemetryLog {
  return {
    id: raw.id,
    timestamp: raw.timestamp ? new Date(raw.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Now',
    level: raw.level || 'INFO',
    source: raw.source || 'AI Pipeline',
    message: raw.message || '',
    incidentId: raw.incident_id ?? raw.incidentId,
    isNew: true,
  };
}

export function adaptKPIStats(raw: any): KPIStats {
  return {
    activeEmergencies: raw.active_emergencies ?? raw.activeEmergencies ?? 8,
    criticalEmergencies: raw.critical_emergencies ?? raw.criticalEmergencies ?? 3,
    telemetryIngestionRate: raw.streams_ingested ?? raw.telemetryIngestionRate ?? 14820,
    smartMatchesPending: raw.pending_matches ?? raw.smartMatchesPending ?? 12,
    volunteersDeployed: raw.volunteers_deployed ?? raw.volunteersDeployed ?? 48,
    volunteersAvailable: raw.volunteers_total ? (raw.volunteers_total - (raw.volunteers_deployed || 0)) : 142,
    avgResponseTimeMin: 18.5,
    successRatePercent: raw.success_rate_percent ?? raw.successRatePercent ?? 98.4,
  };
}


// ── API Methods ──────────────────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<{ online: boolean; details?: any }> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { online: false };
    const details = await res.json();
    return { online: true, details };
  } catch {
    return { online: false };
  }
}

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/incidents`);
  if (!res.ok) throw new Error(`Failed to fetch incidents: ${res.statusText}`);
  const data = await res.json();
  const rawList = Array.isArray(data) ? data : data.incidents || [];
  return rawList.map(adaptIncident);
}

export async function fetchVolunteers(): Promise<Volunteer[]> {
  const res = await fetch(`${API_BASE}/volunteers`);
  if (!res.ok) throw new Error(`Failed to fetch volunteers: ${res.statusText}`);
  const data = await res.json();
  const rawList = Array.isArray(data) ? data : data.volunteers || [];
  return rawList.map(adaptVolunteer);
}

export async function fetchDispatchArcs(): Promise<DispatchArc[]> {
  const res = await fetch(`${API_BASE}/dispatch`);
  if (!res.ok) throw new Error(`Failed to fetch dispatches: ${res.statusText}`);
  const data = await res.json();
  const rawList = Array.isArray(data) ? data : [];
  return rawList.map(adaptDispatchArc);
}

export async function fetchStats(): Promise<KPIStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  const data = await res.json();
  return adaptKPIStats(data);
}

export async function createIncident(incidentData: Partial<Incident>): Promise<Incident> {
  const payload = {
    title: incidentData.title,
    category: incidentData.category,
    urgency: incidentData.urgency,
    coords: incidentData.coords,
    location_name: incidentData.locationName,
    country: incidentData.country,
    region: incidentData.region,
    severity_score: incidentData.severityScore,
    population_affected: incidentData.populationAffected,
    description: incidentData.description,
    extracted_needs: incidentData.extractedNeeds,
    required_skills: incidentData.requiredSkills,
    source: incidentData.source || 'Manual Entry',
    media_urls: incidentData.mediaUrl ? [incidentData.mediaUrl] : [],
  };

  const res = await fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Failed to create incident: ${res.statusText}`);
  const data = await res.json();
  return adaptIncident(data);
}

export async function createDispatch(incidentId: string, volunteerId: string, transportMode: string = 'AIR_CHARTER'): Promise<DispatchArc> {
  const res = await fetch(`${API_BASE}/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incident_id: incidentId,
      volunteer_id: volunteerId,
      transport_mode: transportMode,
    }),
  });

  if (!res.ok) throw new Error(`Failed to dispatch: ${res.statusText}`);
  const data = await res.json();
  return adaptDispatchArc(data);
}

export async function runGroqMatch(incidentId: string): Promise<Volunteer[]> {
  const res = await fetch(`${API_BASE}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident_id: incidentId, max_results: 5 }),
  });

  if (!res.ok) throw new Error(`Match failed: ${res.statusText}`);
  const data = await res.json();
  const scoredList = data.matches || [];
  return scoredList.map((m: any) => {
    const v = adaptVolunteer(m.volunteer || m);
    v.matchScore = m.computed_score ?? v.matchScore;
    return v;
  });
}

export async function ingestFieldReportText(posts: string[], source: string = 'WhatsApp Hotline'): Promise<any> {
  const res = await fetch(`${API_BASE}/ingest/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts, source }),
  });

  if (!res.ok) throw new Error(`Ingest failed: ${res.statusText}`);
  return await res.json();
}
