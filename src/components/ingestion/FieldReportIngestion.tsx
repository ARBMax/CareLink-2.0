import React, { useState, useEffect, useRef } from 'react';
import { Incident, UrgencyLevel, IncidentCategory } from '../../types';
import { 
  Radio, 
  Sparkles, 
  CheckCircle2, 
  UploadCloud, 
  Send, 
  ArrowRight,
  X
} from 'lucide-react';

interface FieldReportIngestionProps {
  onIngestNewIncident: (newIncident: Incident) => void;
  onNavigateToSmartMatch?: (incident: Incident) => void;
}



export const FieldReportIngestion: React.FC<FieldReportIngestionProps> = ({
  onIngestNewIncident,
  onNavigateToSmartMatch,
}) => {
  const [reportText, setReportText] = useState('');
  const [title, setTitle] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState<'Asia-Pacific' | 'Americas' | 'Africa' | 'Middle East' | 'Europe'>('Asia-Pacific');
  const [urgency, setUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [category, setCategory] = useState<IncidentCategory>('FLOOD');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [ingestedSuccessIncident, setIngestedSuccessIncident] = useState<Incident | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulated AI Structured Extraction state
  const [aiInsights, setAiInsights] = useState({
    extractedEntities: [] as string[],
    extractedNeeds: [] as string[],
    extractedSkills: [] as string[],
    threatScore: 0,
    sourceConfidence: 0,
  });

  // Re-run mock AI NLP extraction when text changes
  useEffect(() => {
    if (!reportText.trim()) {
      setIsParsing(false);
      setAiInsights({ extractedEntities: [], extractedNeeds: [], extractedSkills: [], threatScore: 0, sourceConfidence: 0 });
      return;
    }
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

      if (country) entities.push(country);
      if (title) entities.push(title.split(' ')[0] + ' Sector');

      setAiInsights({
        extractedEntities: entities,
        extractedNeeds: needs,
        extractedSkills: skills,
        threatScore: urgency === 'CRITICAL' ? 94 : urgency === 'HIGH' ? 82 : urgency === 'MEDIUM' ? 64 : 45,
        sourceConfidence: needs.length > 0 ? 99.2 : 0,
      });
      setIsParsing(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [reportText, title, country, urgency]);



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
      {/* Top Banner */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex items-center gap-3">
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
          className="lg:col-span-7 bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 flex flex-col gap-4"
        >
          <div className="border-b border-slate-700/60 pb-2.5">
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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono leading-relaxed resize-none"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".tiff,.tif,.jpg,.jpeg,.png,.pdf,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setAttachedFile(file);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-900/40 rounded-lg p-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-3 group"
            >
              <UploadCloud className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
              <div className="text-left text-xs flex-1 min-w-0">
                <span className="text-slate-300 block truncate">
                  {attachedFile ? attachedFile.name : 'Upload geotagged field photo or telemetry file'}
                </span>
                <span className="block text-[10px] text-slate-500">Supports GeoTIFF, JPG, PNG, PDF, CSV</span>
              </div>
              {attachedFile && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
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
        <div className="lg:col-span-5 bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
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
          <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-700/60">
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
