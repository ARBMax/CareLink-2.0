export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'RESOLVED';

export type IncidentCategory = 
  | 'EARTHQUAKE'
  | 'FLOOD'
  | 'CYCLONE'
  | 'WILDFIRE'
  | 'FAMINE_DROUGHT'
  | 'MEDICAL_OUTBREAK'
  | 'INFRASTRUCTURE_COLLAPSE';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Incident {
  id: string;
  code: string; // e.g. "INC-2026-042"
  title: string;
  category: IncidentCategory;
  urgency: UrgencyLevel;
  severityScore: number; // 0 - 100
  locationName: string;
  country: string;
  region: 'Asia-Pacific' | 'Americas' | 'Africa' | 'Middle East' | 'Europe';
  coords: Coordinates;
  timestamp: string;
  populationAffected: number;
  description: string;
  extractedNeeds: string[];
  requiredSkills: string[];
  assignedVolunteersCount: number;
  activeMatchesPending: number;
  status: 'PENDING_DISPATCH' | 'IN_RESPONSE' | 'CONTAINED' | 'RESOLVED';
  source: 'Satellite Telemetry' | 'Field Radio' | 'WhatsApp Hotline' | 'UN OCHA' | 'Crowdsourced Drone';
  mediaUrl?: string;
}

export interface Volunteer {
  id: string;
  name: string;
  callsign: string;
  avatar: string;
  role: string;
  organization: string;
  homeBase: string;
  coords: Coordinates;
  matchScore: number; // 0 - 100
  distanceKm: number;
  etaHours: number;
  skills: string[];
  certifications: string[];
  readinessStatus: 'STANDBY' | 'MOBILIZING' | 'DISPATCHED' | 'ON_SITE';
  languages: string[];
  experienceYears: number;
  pastMissionsCount: number;
}

export interface DispatchArc {
  id: string;
  incidentId: string;
  volunteerId: string;
  fromCoords: Coordinates;
  toCoords: Coordinates;
  fromName: string;
  toName: string;
  status: 'ESTABLISHING' | 'EN_ROUTE' | 'ARRIVED';
  color: string;
  transportMode: 'AIR_CHARTER' | 'MEDICAL_HELO' | 'AMPHIBIOUS' | 'GROUND_CONVOY';
  progress: number; // 0 - 100%
  speedKnots?: number;
  altitudeFt?: number;
  etaMinutes?: number;
  cargoDescription?: string;
}

export type SignalSource = 'TWITTER' | 'WHATSAPP' | 'NEWS_API' | 'RSS_GDACS';

export interface ExternalSignal {
  id: string;
  source: SignalSource;
  authorOrChannel: string;
  rawText: string;
  timestamp: string;
  receivedAt: number;
  mediaType?: 'IMAGE' | 'AUDIO_VOICE_NOTE' | 'VIDEO' | 'SEISMIC_TELEMETRY';
  mediaUrl?: string;
  
  // Pipeline Stage 1: Gemini Flash Multimodal Analysis
  stage1: {
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    isDisasterRelevant: boolean;
    extractedLocationName: string;
    coords?: Coordinates;
    translatedText?: string;
    imageTriageSummary?: string;
    processingTimeMs: number;
  };

  // Pipeline Stage 2: Groq LLaMA 3 NER & Scoring
  stage2: {
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SKIPPED';
    extractedNeeds: string[];
    urgency: UrgencyLevel;
    severityScore: number; // 0 - 100
    category: IncidentCategory;
    volunteerMatchScore: number;
    reportSummary: string;
    processingTimeMs: number;
  };

  status: 'INGESTING' | 'TRIAGING' | 'VERIFIED' | 'DISMISSED' | 'DEPLOYED';
  deployedIncidentId?: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  level: 'CRITICAL' | 'WARN' | 'INFO' | 'SUCCESS';
  source: string;
  message: string;
  incidentId?: string;
  metadata?: Record<string, string | number>;
  isNew?: boolean;
}

export interface GlobeLayerState {
  disasterZones: boolean;
  volunteerDensity: boolean;
  supplyRouteArcs: boolean;
  atmosphericGlow: boolean;
  heatMapIntensity: boolean;
}

export interface KPIStats {
  activeEmergencies: number;
  criticalEmergencies: number;
  telemetryIngestionRate: number; // e.g. 14,820 packets/min
  smartMatchesPending: number;
  volunteersDeployed: number;
  volunteersAvailable: number;
  avgResponseTimeMin: number;
  successRatePercent: number;
}
