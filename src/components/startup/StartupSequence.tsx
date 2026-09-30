import React, { useEffect, useState, useRef } from 'react';

const BOOT_STEPS = [
  { label: 'SAT-LINK UPLINK', status: 'Acquiring orbital relay...', done: 'LOCK ACQUIRED', delay: 400 },
  { label: 'FIREBASE RTDB', status: 'Handshaking secure channel...', done: 'CONNECTED', delay: 900 },
  { label: 'AI TRIAGE CORE', status: 'Loading Gemini 2.0 Flash...', done: 'ONLINE', delay: 1400 },
  { label: 'GROQ LLAMA 3.3', status: 'Initializing match engine...', done: 'READY', delay: 1900 },
  { label: 'WEBSOCKET GW', status: 'Opening real-time gateway...', done: 'LIVE', delay: 2400 },
  { label: 'INCIDENT REGISTRY', status: 'Syncing global data...', done: 'LOADED', delay: 2800 },
];

const TOTAL_MS = 3600;

interface StartupSequenceProps {
  onComplete: () => void;
}

export const StartupSequence: React.FC<StartupSequenceProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'boot' | 'done'>('intro');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  // Scan line animation
  useEffect(() => {
    let frame: number;
    let pos = 0;
    const animate = () => {
      pos = (pos + 0.4) % 100;
      setScanLine(pos);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Main boot sequence
  useEffect(() => {
    const introTimer = setTimeout(() => setPhase('boot'), 500);

    // Schedule each step completion
    const stepTimers = BOOT_STEPS.map((step, i) =>
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, i]);
      }, step.delay)
    );

    // Progress bar
    const progressStart = performance.now();
    startRef.current = progressStart;
    const animProgress = (now: number) => {
      const pct = Math.min(((now - progressStart) / TOTAL_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) rafRef.current = requestAnimationFrame(animProgress);
    };
    rafRef.current = requestAnimationFrame(animProgress);

    // Fade out
    const fadeTimer = setTimeout(() => {
      setPhase('done');
      setFadeOut(true);
    }, TOTAL_MS);

    const completeTimer = setTimeout(() => onComplete(), TOTAL_MS + 700);

    return () => {
      clearTimeout(introTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      stepTimers.forEach(clearTimeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden transition-opacity duration-700 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #050d1a 0%, #020609 100%)' }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(20,184,166,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20,184,166,1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Scan line */}
      <div
        className="absolute left-0 right-0 h-px opacity-20 pointer-events-none"
        style={{
          top: `${scanLine}%`,
          background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.8), transparent)',
          boxShadow: '0 0 12px rgba(20,184,166,0.4)',
        }}
      />

      {/* Corner brackets */}
      {[
        'top-6 left-6 border-t border-l',
        'top-6 right-6 border-t border-r',
        'bottom-6 left-6 border-b border-l',
        'bottom-6 right-6 border-b border-r',
      ].map((cls, i) => (
        <div
          key={i}
          className={`absolute w-8 h-8 border-teal-500/40 ${cls}`}
          style={{ animation: `fadeIn 0.4s ease ${i * 0.1}s both` }}
        />
      ))}

      {/* Center content */}
      <div className="relative flex flex-col items-center justify-center h-full gap-10 px-8">

        {/* Logo block */}
        <div
          className="flex flex-col items-center gap-3"
          style={{ animation: 'slideDown 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}
        >
          {/* Glow ring behind logo */}
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-40 h-40 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, rgba(20,184,166,0.6) 0%, transparent 70%)',
                animation: 'pulse 3s ease-in-out infinite',
              }}
            />
            <div
              className="absolute w-28 h-28 rounded-full opacity-10 border border-teal-400"
              style={{ animation: 'spin 8s linear infinite' }}
            />
            <img
              src="/logo.png"
              alt="CareLink"
              className="relative h-20 object-contain"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(20,184,166,0.5)) drop-shadow(0 0 40px rgba(20,184,166,0.2))',
              }}
            />
          </div>

          <div className="text-center">
            <p className="text-[10px] font-mono tracking-[0.5em] text-teal-500/70 uppercase">
              Decision OS — v2.0.0
            </p>
            <p className="text-[9px] font-mono tracking-[0.25em] text-slate-600 uppercase mt-0.5">
              Global Humanitarian Response Platform
            </p>
          </div>
        </div>

        {/* Boot checklist */}
        <div
          className="w-full max-w-md space-y-2"
          style={{ animation: 'slideUp 0.6s ease 0.5s both' }}
        >
          {BOOT_STEPS.map((step, i) => {
            const isDone = completedSteps.includes(i);
            const isActive = !isDone && completedSteps.length === i;

            return (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2 rounded border text-[11px] font-mono transition-all duration-300 ${
                  isDone
                    ? 'border-teal-500/20 bg-teal-500/5'
                    : isActive
                    ? 'border-slate-600/40 bg-slate-800/30'
                    : 'border-slate-800/40 bg-transparent opacity-40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {/* Status dot */}
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isDone
                        ? 'bg-teal-400'
                        : isActive
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span className={isDone ? 'text-slate-300' : 'text-slate-600'}>
                    {step.label}
                  </span>
                </div>
                <span
                  className={`text-[10px] ${
                    isDone ? 'text-teal-400' : isActive ? 'text-amber-500/70' : 'text-slate-700'
                  }`}
                >
                  {isDone ? `[ ${step.done} ]` : isActive ? step.status : '[ PENDING ]'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          className="w-full max-w-md"
          style={{ animation: 'slideUp 0.6s ease 0.6s both' }}
        >
          <div className="flex justify-between text-[9px] font-mono text-slate-600 mb-1.5">
            <span className="tracking-widest">SYSTEM INITIALIZATION</span>
            <span className="text-teal-600">{Math.round(progress)}%</span>
          </div>
          <div className="relative h-[2px] bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #0d9488, #2dd4bf)',
                boxShadow: '0 0 10px rgba(20,184,166,0.7)',
              }}
            />
          </div>

          {/* Bottom label */}
          <p className="text-center text-[9px] font-mono text-slate-700 mt-3 tracking-widest">
            CARELINK AUTONOMOUS INTELLIGENCE — SECURE BOOT
          </p>

          {/* Backend cold-start notice */}
          <div
            className="mt-4 flex items-start gap-2 px-3 py-2 rounded border border-amber-500/20 bg-amber-500/5"
            style={{ animation: 'slideUp 0.6s ease 1.2s both' }}
          >
            <span className="text-amber-500/70 text-[11px] mt-px shrink-0">⚠</span>
            <p className="text-[9px] font-mono text-amber-600/60 leading-relaxed">
              Backend may take a few seconds to boot up on first load.{' '}
              Live data will stream in automatically once connected.
            </p>
          </div>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50%       { transform: scale(1.15); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
};
