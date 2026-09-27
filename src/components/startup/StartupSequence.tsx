import React, { useEffect, useState } from 'react';

const BOOT_LINES = [
  { text: 'Initializing CareLink Decision OS v2.0.0...', delay: 200 },
  { text: 'Loading satellite telemetry pipeline...', delay: 600 },
  { text: 'Establishing Firebase RTDB connection...', delay: 1000 },
  { text: 'Syncing global incident registry...', delay: 1400 },
  { text: 'Activating AI triage engine (Gemini 2.0 Flash)...', delay: 1800 },
  { text: 'Calibrating Smart Match neural core...', delay: 2200 },
  { text: 'WebSocket gateway online — real-time feed active.', delay: 2600 },
  { text: 'All systems operational. Launching command interface.', delay: 3000 },
];

const TOTAL_DURATION = 3800; // ms before fade-out starts

interface StartupSequenceProps {
  onComplete: () => void;
}

export const StartupSequence: React.FC<StartupSequenceProps> = ({ onComplete }) => {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Schedule each boot line to appear
    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisibleLines((prev) => [...prev, i]);
      }, line.delay);
      timers.push(t);
    });

    // Smooth progress bar
    const start = performance.now();
    let animFrame: number;
    const animateProgress = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        animFrame = requestAnimationFrame(animateProgress);
      }
    };
    animFrame = requestAnimationFrame(animateProgress);

    // Start fade-out
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, TOTAL_DURATION);

    // Notify parent after fade animation completes
    const completeTimer = setTimeout(() => {
      onComplete();
    }, TOTAL_DURATION + 700);

    timers.push(fadeTimer, completeTimer);

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(animFrame);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060a14] transition-opacity duration-700 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient glow behind logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-teal-500/5 blur-3xl animate-pulse" />
        <div className="absolute w-64 h-64 rounded-full bg-sky-500/5 blur-2xl" />
      </div>

      {/* Logo */}
      <div
        className="relative flex flex-col items-center gap-4 mb-12"
        style={{ animation: 'fadeSlideUp 0.6s ease-out forwards' }}
      >
        <img
          src="/logo.png"
          alt="CareLink"
          className="h-24 object-contain drop-shadow-[0_0_32px_rgba(20,184,166,0.4)]"
        />
        <p className="text-slate-500 text-sm font-mono tracking-[0.3em] uppercase">
          Decision OS — Global Humanitarian Response
        </p>
      </div>

      {/* Boot terminal */}
      <div className="w-full max-w-xl px-6 mb-8 font-mono text-xs space-y-1.5 min-h-[160px]">
        {BOOT_LINES.map((line, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 transition-all duration-300 ${
              visibleLines.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            }`}
          >
            <span className="text-teal-500 shrink-0">›</span>
            <span
              className={
                i === BOOT_LINES.length - 1
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400'
              }
            >
              {line.text}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xl px-6">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 mb-1.5">
          <span>SYSTEM BOOT</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-0.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(20,184,166,0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
