import React, { useState } from 'react';
import { 
  ExternalSignal, 
  SignalSource, 
  Incident, 
  UrgencyLevel 
} from '../../types';
import { 
  Radio, 
  Play, 
  Pause, 
  Zap, 
  Filter, 
  Globe2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  Cpu, 
  MessageSquare, 
  Share2, 
  Newspaper, 
  Rss, 
  Mic, 
  Image as ImageIcon, 
  Activity, 
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Volume2
} from 'lucide-react';

interface SignalRadarViewProps {
  signals: ExternalSignal[];
  isStreaming: boolean;
  onToggleStreaming: () => void;
  streamSpeed: 'REALTIME' | 'FAST' | 'SURGE';
  onChangeStreamSpeed: (speed: 'REALTIME' | 'FAST' | 'SURGE') => void;
  onDeploySignalToGlobe: (signal: ExternalSignal) => void;
  onDismissSignal: (signalId: string) => void;
  onTriggerSurge: () => void;
  onNavigateToGlobe: () => void;
}

export const SignalRadarView: React.FC<SignalRadarViewProps> = ({
  signals,
  isStreaming,
  onToggleStreaming,
  streamSpeed,
  onChangeStreamSpeed,
  onDeploySignalToGlobe,
  onDismissSignal,
  onTriggerSurge,
  onNavigateToGlobe,
}) => {
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(signals[0]?.id || null);

  const filteredSignals = signals.filter((sig) => {
    if (selectedSource !== 'ALL' && sig.source !== selectedSource) return false;
    if (selectedUrgency !== 'ALL' && sig.stage2.urgency !== selectedUrgency) return false;
    return true;
  });

  const getSourceIcon = (source: SignalSource) => {
    switch (source) {
      case 'TWITTER':
        return <Share2 className="w-3.5 h-3.5 text-sky-400" />;
      case 'WHATSAPP':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
      case 'NEWS_API':
        return <Newspaper className="w-3.5 h-3.5 text-amber-400" />;
      case 'RSS_GDACS':
        return <Rss className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const getSourceBadgeColor = (source: SignalSource) => {
    switch (source) {
      case 'TWITTER':
        return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
      case 'WHATSAPP':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'NEWS_API':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'RSS_GDACS':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
    }
  };

  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'MEDIUM':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/50';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top Architecture Banner & Live Controls */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide flex items-center gap-2">
                MULTI-SOURCE SIGNAL RADAR
                <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Dual-Stage AI Pipeline
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl font-sans">
              Live ingest of unstructured emergency chatter across Twitter/X, WhatsApp Cloud, NewsAPI, and GDACS RSS feeds. Automatic image triage via Gemini Flash and NER entity/need extraction via LLaMA 3.
            </p>
          </div>

          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto">
            {/* Stream Play/Pause */}
            <button
              id="btn-toggle-stream"
              onClick={onToggleStreaming}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all ${
                isStreaming
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
              }`}
            >
              {isStreaming ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-emerald-400" />
                  <span>STREAM: LIVE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  <span>STREAM: PAUSED</span>
                </>
              )}
            </button>

            {/* Speed selector */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
              <button
                onClick={() => onChangeStreamSpeed('REALTIME')}
                className={`px-2 py-1 rounded transition-colors ${
                  streamSpeed === 'REALTIME'
                    ? 'bg-teal-500/20 text-teal-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="1 signal every 12 seconds"
              >
                1x Normal
              </button>
              <button
                onClick={() => onChangeStreamSpeed('FAST')}
                className={`px-2 py-1 rounded transition-colors ${
                  streamSpeed === 'FAST'
                    ? 'bg-teal-500/20 text-teal-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="1 signal every 4 seconds"
              >
                3x Fast
              </button>
            </div>

            {/* Instant Surge Trigger */}
            <button
              id="btn-trigger-crisis-surge"
              onClick={onTriggerSurge}
              className="px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-600/60 text-rose-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              title="Simulate sudden incoming disaster cluster"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Spike</span>
            </button>
          </div>
        </div>

        {/* Pipeline Diagram Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Radio className="w-3 h-3 text-sky-400" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400">INGESTION SOURCES</div>
              <div className="text-slate-200 font-semibold truncate text-[11px]">X, WhatsApp, News, RSS</div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-teal-400" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400">STAGE 1: GEMINI FLASH</div>
              <div className="text-teal-300 font-semibold truncate text-[11px]">Multimodal Image & Geo ASR</div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Cpu className="w-3 h-3 text-amber-400" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400">STAGE 2: GROQ LLAMA 3</div>
              <div className="text-amber-300 font-semibold truncate text-[11px]">NER & 0–100 Severity</div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Activity className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400">OUTPUT DISPATCH BUS</div>
              <div className="text-emerald-300 font-semibold truncate text-[11px]">WebSocket & 3D Globe Sync</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 border border-slate-800/70 p-3 rounded-xl text-xs font-mono">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Source:
          </span>
          {['ALL', 'TWITTER', 'WHATSAPP', 'NEWS_API', 'RSS_GDACS'].map((src) => (
            <button
              key={src}
              onClick={() => setSelectedSource(src)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedSource === src
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {src.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Urgency:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((urg) => (
            <button
              key={urg}
              onClick={() => setSelectedUrgency(urg)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                selectedUrgency === urg
                  ? 'bg-slate-800 text-slate-200 font-bold border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {urg}
            </button>
          ))}
        </div>
      </div>

      {/* Signals Stream Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredSignals.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/30 border border-slate-800/60 rounded-xl text-slate-500 font-mono text-xs">
            No incoming signals match current filters. Click "Simulate Spike" to inject active reports.
          </div>
        ) : (
          filteredSignals.map((signal) => {
            const isExpanded = expandedSignalId === signal.id;
            const isCritical = signal.stage2.urgency === 'CRITICAL';
            const isDeployed = signal.status === 'DEPLOYED';

            return (
              <div
                key={signal.id}
                className={`bg-slate-900/70 border rounded-xl overflow-hidden transition-all shadow-md ${
                  isCritical
                    ? 'border-rose-900/70 hover:border-rose-700/80'
                    : 'border-slate-800/80 hover:border-slate-700/90'
                }`}
              >
                {/* Signal Card Header */}
                <div 
                  onClick={() => setExpandedSignalId(isExpanded ? null : signal.id)}
                  className="p-3.5 bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border flex items-center gap-1.5 ${getSourceBadgeColor(signal.source)}`}>
                      {getSourceIcon(signal.source)}
                      <span>{signal.source.replace('_', ' ')}</span>
                    </span>

                    <span className="text-xs font-mono font-semibold text-slate-300">
                      {signal.authorOrChannel}
                    </span>

                    {signal.mediaType && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] font-mono text-slate-400 border border-slate-700 flex items-center gap-1">
                        {signal.mediaType === 'AUDIO_VOICE_NOTE' && <Mic className="w-3 h-3 text-emerald-400" />}
                        {signal.mediaType === 'IMAGE' && <ImageIcon className="w-3 h-3 text-sky-400" />}
                        {signal.mediaType === 'SEISMIC_TELEMETRY' && <Activity className="w-3 h-3 text-amber-400" />}
                        <span>{signal.mediaType.replace('_', ' ')}</span>
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-slate-500">
                      {signal.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getUrgencyBadge(signal.stage2.urgency)}`}>
                      {signal.stage2.urgency} ({signal.stage2.severityScore}/100)
                    </span>

                    {isDeployed ? (
                      <span className="px-2 py-0.5 rounded bg-teal-500/20 border border-teal-500/50 text-teal-300 text-[11px] font-mono font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> DEPLOYED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
                        TRIAGED
                      </span>
                    )}
                  </div>
                </div>

                {/* Raw Content Summary */}
                <div className="p-3.5 space-y-3">
                  <p className="text-xs text-slate-200 font-sans leading-relaxed">
                    "{signal.rawText}"
                  </p>

                  {/* Dual-Stage Processing Overview Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {/* Stage 1 Breakdown */}
                    <div className="bg-slate-950/70 border border-slate-800/70 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-teal-400 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Stage 1: Gemini Flash
                        </span>
                        <span className="text-slate-500">{signal.stage1.processingTimeMs}ms</span>
                      </div>
                      <div className="text-xs text-slate-300 font-sans">
                        <span className="text-slate-500 font-mono text-[11px]">Location: </span>
                        <span className="font-semibold text-slate-100">{signal.stage1.extractedLocationName}</span>
                        {signal.stage1.coords && (
                          <span className="text-slate-500 font-mono text-[10px] ml-1">
                            ({signal.stage1.coords.lat.toFixed(2)}°, {signal.stage1.coords.lng.toFixed(2)}°)
                          </span>
                        )}
                      </div>
                      {signal.stage1.imageTriageSummary && (
                        <div className="text-[11px] text-slate-400 bg-slate-900/60 p-1.5 rounded border border-slate-800">
                          {signal.stage1.imageTriageSummary}
                        </div>
                      )}
                    </div>

                    {/* Stage 2 Breakdown */}
                    <div className="bg-slate-950/70 border border-slate-800/70 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Cpu className="w-3 h-3" /> Stage 2: Groq LLaMA 3
                        </span>
                        <span className="text-slate-500">{signal.stage2.processingTimeMs}ms</span>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase">Extracted Needs:</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {signal.stage2.extractedNeeds.map((need, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                            >
                              {need}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400">
                        <span>Responder Suitability:</span>
                        <span className="text-teal-300 font-bold">{signal.stage2.volunteerMatchScore}% match</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <div className="text-[11px] font-mono text-slate-500">
                      ID: <span className="text-slate-400">{signal.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDismissSignal(signal.id)}
                        className="px-2.5 py-1 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors"
                      >
                        Dismiss
                      </button>

                      {isDeployed ? (
                        <button
                          onClick={onNavigateToGlobe}
                          className="px-3 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <Globe2 className="w-3.5 h-3.5" />
                          <span>View on 3D Globe</span>
                        </button>
                      ) : (
                        <button
                          id={`btn-deploy-signal-${signal.id}`}
                          onClick={() => onDeploySignalToGlobe(signal)}
                          className="px-3 py-1 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all active:scale-95"
                        >
                          <Globe2 className="w-3.5 h-3.5" />
                          <span>Pinpoint on Globe & Dispatch</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
