import * as THREE from 'three';
import { latLngToVector3 } from './earthTexture';

export interface SolarTelemetry {
  lat: number;
  lng: number;
  declinationDeg: number;
  equationOfTimeMinutes: number;
  utcTimeString: string;
  localSolarRegion: string;
}

// Computes the astronomical subsolar point (zenith latitude & longitude) for any given Date
export function calculateSubsolarPoint(date: Date = new Date()): SolarTelemetry {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Fractional year in radians
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (hour - 12) / 24);

  // Equation of time in minutes
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination in radians (subsolar latitude)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const lat = decl * (180 / Math.PI);

  // Subsolar longitude in degrees
  let lng = -(hour - 12 + eqtime / 60) * 15;
  while (lng < -180) lng += 360;
  while (lng > 180) lng -= 360;

  // Approximate geographical region under solar noon
  let localSolarRegion = 'Open Ocean';
  if (lng >= -170 && lng < -120) localSolarRegion = 'Central/Eastern Pacific';
  else if (lng >= -120 && lng < -70) localSolarRegion = 'The Americas (Midday)';
  else if (lng >= -70 && lng < -20) localSolarRegion = 'Atlantic Ocean';
  else if (lng >= -20 && lng < 25) localSolarRegion = 'Europe & Western Africa';
  else if (lng >= 25 && lng < 60) localSolarRegion = 'Eastern Europe & Middle East';
  else if (lng >= 60 && lng < 100) localSolarRegion = 'South & Central Asia';
  else if (lng >= 100 && lng < 140) localSolarRegion = 'East Asia & Australasia';
  else localSolarRegion = 'Western Pacific';

  const utcTimeString = date.toISOString().substring(11, 19) + ' UTC';

  return {
    lat,
    lng,
    declinationDeg: lat,
    equationOfTimeMinutes: eqtime,
    utcTimeString,
    localSolarRegion,
  };
}

// Converts subsolar point to unit direction vector in local Earth model space
export function getLocalSunDirection(lat: number, lng: number): THREE.Vector3 {
  // latLngToVector3 uses radius, we set radius = 1 for unit direction vector
  const v = latLngToVector3(lat, lng, 1);
  return v.normalize();
}
