import React, { useState, useEffect } from 'react';
import { Incident, UrgencyLevel, IncidentCategory } from '../../types';
import { 
  Radio, 
  Sparkles, 
  CheckCircle2, 
  UploadCloud, 
  Send, 
  Flame, 
  Waves, 
  Mountain,
  ArrowRight
} from 'lucide-react';

interface FieldReportIngestionProps {
  onIngestNewIncident: (newIncident: Incident) => void;
  onNavigateToSmartMatch?: (incident: Incident) => void;
}

const PRESET_REPORTS = [
  {
    title: 'Flash Inundation in Surigao Coastal Village',
    text: 'Surigao del Sur river breached sea wall following 24hr torrential downpours. Approximately 1,800 families trapped on roofs in Barangay San Roque. Electric grid severed. Immediate need for Rigid Inflatable Boats, emergency pediatric rehydration salts, and portable solar SATCOM relay before nightfall.',
    coords: { lat: 8.5167, lng: 126.1500 },
    country: 'Philippines',
    region: 'Asia-Pacific' as const,
    urgency: 'CRITICAL' as UrgencyLevel,
    category: 'FLOOD' as IncidentCategory,
    icon: Waves,
  },
  {
    title: 'Seismic Landslide blocking Andean Mountain Artery',
    text: 'Seismic tremor Mw 6.2 triggered massive debris flow across Route 30 between Cuenca and Loja. Multiple transport minibuses swept into ravine. Search and rescue urgently requires acoustic void listening detectors, canine handlers, and heavy hydraulic cutting gear.',
    coords: { lat: -3.5000, lng: -79.2000 },
    country: 'Ecuador',
    region: 'Americas' as const,
    urgency: 'CRITICAL' as UrgencyLevel,
    category: 'EARTHQUAKE' as IncidentCategory,
    icon: Mountain,
  },
  {
    title: 'Wildfire Ember Storm approaching Evacuation Camp',
    text: 'High-speed dry katabatic winds shifting Peloponnese wildfire front toward Sector B transitional center. 900 individuals require smoke inhalation triage. Urgent need for N95 respirators, Class A flame retardant blankets, and off-road 4x4 evacuation ambulances.',
    coords: { lat: 38.2466, lng: 21.7346 },
    country: 'Greece',
    region: 'Europe' as const,
    urgency: 'HIGH' as UrgencyLevel,
    category: 'WILDFIRE' as IncidentCategory,
    icon: Flame,
  }
];

export const FieldReportIngestion: React.FC<FieldReportIngestionProps> = ({
  onIngestNewIncident,
  onNavigateToSmartMatch,
}) => {
  const [reportText, setReportText] = useState(PRESET_REPORTS[0].text);
  const [title, setTitle] = useState(PRESET_REPORTS[0].title);
  const [lat, setLat] = useState(PRESET_REPORTS[0].coords.lat.toString());
  const [lng, setLng] = useState(PRESET_REPORTS[0].coords.lng.toString());
  const [country, setCountry] = useState(PRESET_REPORTS[0].country);
  const [region, setRegion] = useState<'Asia-Pacific' | 'Americas' | 'Africa' | 'Middle East' | 'Europe'>(PRESET_REPORTS[0].region);
  const [urgency, setUrgency] = useState<UrgencyLevel>(PRESET_REPORTS[0].urgency);
  const [category, setCategory] = useState<IncidentCategory>(PRESET_REPORTS[0].category);
  const [mediaUploaded, setMediaUploaded] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [ingestedSuccessIncident, setIngestedSuccessIncident] = useState<Incident | null>(null);

  // Simulated AI Structured Extraction state
  const [aiInsights, setAiInsights] = useState({
    extractedEntities: ['Surigao del Sur', '1,800 Families (approx 9,000 civilians)', 'Barangay San Roque'],
    extractedNeeds: ['Rigid Inflatable Boats (RIB)', 'Pediatric Rehydration Salts', 'Portable Solar SATCOM Relay'],
    extractedSkills: ['Swiftwater Rescue', 'Emergency Paramedic', 'SATCOM Field Tech'],
    threatScore: 92,
    sourceConfidence: 99.4,
  });

  // Re-run mock AI NLP extraction when text changes
  useEffect(() => {
    setIsParsing(true);
    const timer = setTimeout(() => {
      const textLower = reportText.toLowerCase();
      const needs: string[] = [];
      const skills: string[] = [];
      const entities: string[] = [];

      if (textLower.includes('boat') || textLower.includes('inflatable') || textLower.includes('flood') || textLower.includes('water')) {
        needs.push('Rigid Inflatable Boats (RIB)', 'Water Purification Packets');
        skills.push('Swiftwater Rescue', 'Water Sanitation Engineering');
      }
      if (textLower.includes('landslide') || textLower.includes('seismic') || textLower.includes('earthquake') || textLower.includes('debris')) {
        needs.push('Hydraulic Cutting Equipment', 'Canine Search Units');
        skills.push('Urban Search & Rescue (USAR)', 'Heavy Extrication');
      }
      if (textLower.includes('fire') || textLower.includes('wildfire') || textLower.includes('smoke') || textLower.includes('flame')) {
        needs.push('N95 Industrial Respirators', 'Fire Shelters', 'Burn Care Kits');
        skills.push('Wildland Firefighting', 'Respiratory Critical Care');
      }
      if (textLower.includes('pediatric') || textLower.includes('salts') || textLower.includes('medical') || textLower.includes('triage')) {
        needs.push('Pediatric IV Solutions', 'Emergency First Aid Packs');
        skills.push('Trauma Surgeon', 'Disaster Paramedic');
      }
      if (textLower.includes('satcom') || textLower.includes('solar') || textLower.includes('grid')) {
        needs.push('Portable Solar Generators', 'Satellite Handsets');
        skills.push('Emergency Telecom Engineer');
      }

      if (needs.length === 0) {
        needs.push('Emergency Shelter Tarps', 'Ready-to-Eat Food Rations');
        skills.push('Disaster Logistics Coordinator');
      }

      if (country) entities.push(country);
      if (title) entities.push(title.split(' ')[0] + ' Sector');

      setAiInsights({
        extractedEntities: entities.length > 0 ? entities : ['Unidentified Sector Zone'],
        extractedNeeds: needs,
        extractedSkills: skills,
        threatScore: urgency === 'CRITICAL' ? 94 : urgency === 'HIGH' ? 82 : urgency === 'MEDIUM' ? 64 : 45,
        sourceConfidence: 99.2,
      });
      setIsParsing(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [reportText, title, country, urgency]);

  const loadPreset = (preset: typeof PRESET_REPORTS[0]) => {
    setTitle(preset.title);
    setReportText(preset.text);
    setLat(preset.coords.lat.toString());
    setLng(preset.coords.lng.toString());
    setCountry(preset.country);
    setRegion(preset.region);
    setUrgency(preset.urgency);
    setCategory(preset.category);
  };

  const handleIngest = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedLat = parseFloat(lat) || 0;
    const parsedLng = parseFloat(lng) || 0;
    const randomCode = 'INC-' + Math.floor(1000 + Math.random() * 9000);

    const newIncident: Incident = {
      id: 'inc-' + Date.now(),
      code: randomCode,
      title: title || 'Field Telemetry Anomaly',
      category: category,
      urgency: urgency,
      status: 'PENDING_DISPATCH',
      country: country,
      region: region,
      locationName: country + ' Sector ' + Math.floor(Math.random() * 99 + 1),
      coords: { lat: parsedLat, lng: parsedLng },
      populationAffected: Math.floor(Math.random() * 15000 + 1200),
      timestamp: 'JUST NOW',
      description: reportText,
      extractedNeeds: aiInsights.extractedNeeds,
      requiredSkills: aiInsights.extractedSkills,
      severityScore: aiInsights.threatScore,
      assignedVolunteersCount: 0,
      activeMatchesPending: 3,
      source: 'Satellite Telemetry',
    };

    onIngestNewIncident(newIncident);
    setIngestedSuccessIncident(newIncident);
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Top Banner & Fast Preset Scenarios */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
              FIELD REPORT INGESTION
            </h2>
            <p className="text-xs text-slate-400">
              Input field transcripts, emergency SMS, or sensor data for automated analysis
            </p>
          </div>
        </div>

        {/* Rapid Preset Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Presets:</span>
          {PRESET_REPORTS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => loadPreset(p)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors flex items-center gap-1.5 font-mono"
              >
                <Icon className="w-3.5 h-3.5 text-teal-400" />
                <span>Scenario #{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ingestion Success Banner */}
      {ingestedSuccessIncident && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-sm text-emerald-200 font-mono">
                REPORT INGESTED SUCCESSFULLY
              </div>
              <div className="text-xs text-emerald-300/80 mt-0.5">
                Incident <span className="font-mono font-bold">{ingestedSuccessIncident.code}</span> added to mission board and mapped.
              </div>
            </div>
          </div>
          {onNavigateToSmartMatch && (
            <button
              onClick={() => onNavigateToSmartMatch(ingestedSuccessIncident)}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span>Match Responders</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Two Column Ingestion & Live AI Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left Column (7 cols): Ingestion Form */}
        <form
          onSubmit={handleIngest}
          className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-4"
        >
          <div className="border-b border-slate-800/60 pb-2.5">
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              DISPATCH FORM
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter situation details from radio dispatch, SMS, or field observers
            </p>
          </div>

          {/* Incident Title */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              INCIDENT TITLE
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Surigao River Flooding"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Raw Text Box */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              FIELD TRANSMISSION / DISPATCH NOTES
            </label>
            <textarea
              rows={4}
              required
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Paste raw transcript or details..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono leading-relaxed resize-none"
            />
          </div>

          {/* Coordinates and Country */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                LATITUDE
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                LONGITUDE
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                COUNTRY
              </label>
              <input
                type="text"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Urgency, Category, Region */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                URGENCY
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                CATEGORY
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
              >
                <option value="FLOOD">FLOOD</option>
                <option value="EARTHQUAKE">EARTHQUAKE</option>
                <option value="CYCLONE">CYCLONE</option>
                <option value="WILDFIRE">WILDFIRE</option>
                <option value="FAMINE_DROUGHT">FAMINE / DROUGHT</option>
                <option value="MEDICAL_OUTBREAK">MEDICAL OUTBREAK</option>
                <option value="INFRASTRUCTURE_COLLAPSE">INFRASTRUCTURE</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                REGION
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as typeof region)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
              >
                <option value="Asia-Pacific">Asia-Pacific</option>
                <option value="Americas">Americas</option>
                <option value="Africa">Africa</option>
                <option value="Middle East">Middle East</option>
                <option value="Europe">Europe</option>
              </select>
            </div>
          </div>

          {/* Optional File Attachment */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              ATTACHMENT (OPTIONAL)
            </label>
            <div
              onClick={() => setMediaUploaded(!mediaUploaded)}
              className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-lg p-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-3"
            >
              <UploadCloud className="w-5 h-5 text-teal-400" />
              <div className="text-left text-xs">
                <span className="text-slate-300">
                  {mediaUploaded ? 'Drone_Recon_0041.tiff attached' : 'Upload geotagged field photo or telemetry file'}
                </span>
                <span className="block text-[10px] text-slate-500">Supports GeoTIFF, JPG, PNG</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            id="btn-submit-ingestion"
            type="submit"
            className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>Ingest & Broadcast Incident</span>
          </button>
        </form>

        {/* Right Column (5 cols): Automated Analysis Preview */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                AUTOMATED EXTRACTION
              </h3>
            </div>
            {isParsing ? (
              <span className="text-[10px] font-mono text-teal-400 animate-pulse">
                Analyzing...
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Verified
              </span>
            )}
          </div>

          {/* Threat & Confidence Stats */}
          <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-800/60">
            <div>
              <div className="text-[11px] font-mono text-slate-400">THREAT SCORE</div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">
                {aiInsights.threatScore}%
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-400">CONFIDENCE</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                {aiInsights.sourceConfidence}%
              </div>
            </div>
          </div>

          {/* Extracted Locations & Entities */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
              Identified Entities
            </div>
            <div className="space-y-1">
              {aiInsights.extractedEntities.map((ent, i) => (
                <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>{ent}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Extracted Needs */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
              Assessed Relief Needs
            </div>
            <div className="flex flex-wrap gap-1.5">
              {aiInsights.extractedNeeds.map((need, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                >
                  {need}
                </span>
              ))}
            </div>
          </div>

          {/* Extracted Skills */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
              Required Specialist Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {aiInsights.extractedSkills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
