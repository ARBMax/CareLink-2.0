/**
 * CareLink - Cinematic Startup Screen
 * Recreates the orbital sunrise animation over Earth with radiant solar flare
 * and luminous CareLink typography, automatically transitioning into the app.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { playStartupSwell, isMuted, toggleAudioMute } from '../../utils/audioAlerts';

interface StartupScreenProps {
  onEnterApp: () => void;
}

export function StartupScreen({ onEnterApp }: StartupScreenProps) {
  // Animation phases:
  // 1. DAWN (0s): Earth curve in deep space, city lights visible
  // 2. FLARE (0.9s): Solar burst crests the horizon with anamorphic lens streak
  // 3. REVEAL (1.8s): CareLink typography illuminates in vibrant radiant glow
  // 4. TRANSITION (3.0s): Fades out smoothly and enters the application directly
  const [phase, setPhase] = useState<'DAWN' | 'FLARE' | 'REVEAL'>('DAWN');
  const [isAudioMutedState, setIsAudioMutedState] = useState(isMuted());
  const [isExiting, setIsExiting] = useState(false);
  const hasEnteredRef = useRef(false);

  // Transition into main application
  const exitAndEnter = useCallback(() => {
    if (hasEnteredRef.current) return;
    hasEnteredRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onEnterApp();
    }, 600);
  }, [onEnterApp]);

  // Click anywhere or press key to skip ahead immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        exitAndEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exitAndEnter]);

  // Audio mute toggle
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = toggleAudioMute();
    setIsAudioMutedState(muted);
    if (!muted) {
      playStartupSwell();
    }
  };

  // Play audio swell on mount
  useEffect(() => {
    playStartupSwell();
  }, []);

  // Animation Choreography: Plays through sunrise & CareLink reveal,
  // then automatically dissolves directly into the app with zero waiting.
  useEffect(() => {
    // 0.9s: Sunburst flare expands across the horizon
    const t1 = setTimeout(() => {
      setPhase('FLARE');
    }, 900);

    // 1.8s: CareLink logo illuminates brightly over the flare
    const t2 = setTimeout(() => {
      setPhase('REVEAL');
    }, 1800);

    // 3.0s: Animation is complete -> smoothly dissolve directly into the app
    const t3 = setTimeout(() => {
      exitAndEnter();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [exitAndEnter]);

  return (
    <div 
      onClick={exitAndEnter}
      className={`fixed inset-0 z-50 overflow-hidden bg-black select-none cursor-pointer transition-opacity duration-600 ease-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. Earth Horizon & Sunrise Backdrop with Smooth Scale Motion */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[2500ms] ease-out pointer-events-none"
        style={{
          backgroundImage: `url('/assets/earth_sunrise_startup.jpg')`,
          transform: phase === 'DAWN' ? 'scale(1.06)' : 'scale(1.0)',
        }}
      />

      {/* Atmospheric Vignette & Deep Space Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />

      {/* 2. Solar Lens Flare Burst & Upward Rays */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center">
          
          {/* Intense Solar Core */}
          <div 
            className={`absolute top-[48%] -translate-y-1/2 w-56 h-56 rounded-full transition-all duration-700 ${
              phase === 'DAWN' 
                ? 'opacity-30 scale-75' 
                : 'opacity-100 scale-110'
            }`}
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(254,240,138,0.9) 25%, rgba(56,189,248,0.4) 55%, transparent 75%)',
              filter: 'blur(10px)',
            }}
          />

          {/* Anamorphic Horizontal Lens Flare Streak */}
          <div 
            className={`absolute top-[48%] -translate-y-1/2 w-[200vw] h-[3px] pointer-events-none transition-all duration-700 ${
              phase === 'DAWN' 
                ? 'opacity-20 scale-x-50' 
                : 'opacity-95 scale-x-100'
            }`}
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.2) 20%, rgba(255,255,255,0.95) 50%, rgba(56,189,248,0.2) 80%, transparent 100%)',
              boxShadow: '0 0 24px rgba(56, 189, 248, 0.9), 0 0 50px rgba(0, 240, 255, 0.6)',
            }}
          />

          {/* Upward Volumetric Sun Rays */}
          <div 
            className={`absolute top-[18%] w-[650px] h-[380px] pointer-events-none transition-opacity duration-700 ${
              phase === 'DAWN' ? 'opacity-30' : 'opacity-90'
            }`}
            style={{
              background: 'conic-gradient(from 180deg at 50% 100%, transparent 35%, rgba(255,255,255,0.25) 45%, rgba(254,240,138,0.45) 50%, rgba(255,255,255,0.25) 55%, transparent 65%)',
              filter: 'blur(18px)',
            }}
          />

          {/* 3. The CareLink Logo - Pure Illumination */}
          <div className="relative z-20 flex flex-col items-center justify-center -mt-16 sm:-mt-24">
            
            <div className="relative">
              <h1 
                className={`font-['Cinzel',serif] tracking-[0.08em] font-semibold text-6xl sm:text-8xl md:text-9xl transition-all duration-700 select-none ${
                  phase === 'DAWN'
                    ? 'opacity-0 scale-95 translate-y-3'
                    : phase === 'FLARE'
                    ? 'opacity-70 scale-98 translate-y-1 text-sky-200'
                    : 'opacity-100 scale-100 translate-y-0 text-white'
                }`}
                style={{
                  textShadow:
                    phase === 'REVEAL'
                      ? '0 0 12px rgba(0, 240, 255, 0.95), 0 0 30px rgba(56, 189, 248, 0.9), 0 0 70px rgba(2, 132, 199, 0.8), 0 0 120px rgba(6, 182, 212, 0.6)'
                      : '0 0 20px rgba(255, 255, 255, 0.5)',
                  WebkitTextStroke:
                    phase === 'REVEAL'
                      ? '1.5px rgba(0, 240, 255, 0.85)'
                      : '0.5px rgba(255, 255, 255, 0.3)',
                }}
              >
                CareLink
              </h1>
            </div>

            {/* Subtitle */}
            <div 
              className={`mt-4 sm:mt-6 transition-all duration-700 text-center ${
                phase === 'REVEAL'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2'
              }`}
            >
              <p className="text-xs sm:text-sm font-mono tracking-[0.3em] text-cyan-200/90 font-medium uppercase">
                Global Humanitarian Intelligence
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Floating Audio Control in top corner */}
      <div className="absolute top-5 right-5 z-30 flex items-center gap-2">
        <button
          onClick={handleToggleMute}
          className="p-2 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer backdrop-blur-md"
          title={isAudioMutedState ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isAudioMutedState ? (
            <VolumeX className="w-4 h-4 text-white/50" />
          ) : (
            <Volume2 className="w-4 h-4 text-cyan-400" />
          )}
        </button>
      </div>
    </div>
  );
}
