import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Incident, Volunteer, DispatchArc, GlobeLayerState } from '../../types';
import { loadRealisticEarthTextures, latLngToVector3 } from './earthTexture';
import { calculateSubsolarPoint, getLocalSunDirection, SolarTelemetry } from './solarCalculator';
import { 
  ArrowRight, 
  Maximize2, 
  RotateCcw, 
  Play, 
  Pause, 
  ZoomIn, 
  ZoomOut, 
  MapPin, 
  Search, 
  Crosshair, 
  Navigation, 
  X,
  Sun,
  Moon,
  Cloud,
  Sparkles,
  Clock,
  Sliders,
  Radio
} from 'lucide-react';

interface Globe3DProps {
  incidents: Incident[];
  volunteers: Volunteer[];
  dispatchArcs: DispatchArc[];
  layerState: GlobeLayerState;
  selectedIncidentId: string | null;
  onSelectIncident: (incident: Incident) => void;
  onOpenSmartMatch?: (incident: Incident) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export type SolarLightingMode = 'REALTIME' | 'CUSTOM' | 'DAY' | 'NIGHT';

export const Globe3D: React.FC<Globe3DProps> = ({
  incidents,
  volunteers,
  dispatchArcs,
  layerState,
  selectedIncidentId,
  onSelectIncident,
  onOpenSmartMatch,
  isExpanded,
  onToggleExpand,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinOverlayRef = useRef<HTMLDivElement>(null);

  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [focusedCoordinates, setFocusedCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Real-Time Day and Night State
  const [solarMode, setSolarMode] = useState<SolarLightingMode>('REALTIME');
  const [customUtcHour, setCustomUtcHour] = useState<number>(() => {
    const d = new Date();
    return d.getUTCHours() + d.getUTCMinutes() / 60;
  });
  const [showTimeScrubber, setShowTimeScrubber] = useState(false);
  const [currentSolarInfo, setCurrentSolarInfo] = useState<SolarTelemetry>(() => calculateSubsolarPoint(new Date()));

  // Visual Overlays
  const [showClouds, setShowClouds] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);

  // References for Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const earthShaderMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsShaderMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const innerRimMeshRef = useRef<THREE.Mesh | null>(null);
  const starsGroupRef = useRef<THREE.Points | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const disasterGroupRef = useRef<THREE.Group | null>(null);
  const volunteerGroupRef = useRef<THREE.Group | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);
  const pulseRingsRef = useRef<THREE.Mesh[]>([]);
  const arcPacketsRef = useRef<{ mesh: THREE.Mesh; curve: THREE.CubicBezierCurve3; progress: number; speed: number }[]>([]);
  const texturesRef = useRef<ReturnType<typeof loadRealisticEarthTextures> | null>(null);

  // Drag interaction state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0.2, y: 0 });
  const currentRotationRef = useRef({ x: 0.2, y: 0 });
  const cameraDistanceRef = useRef(250);
  const targetCameraDistanceRef = useRef(250);

  const GLOBE_RADIUS = 100;

  // Center camera smoothly onto specific coordinates & lock onto pinpoint
  const flyToCoords = useCallback((lat: number, lng: number, zoomIn = true) => {
    const targetY = -(lng * Math.PI) / 180 - Math.PI / 2;
    const targetX = (lat * Math.PI) / 180;

    targetRotationRef.current = { x: targetX, y: targetY };
    if (zoomIn) {
      targetCameraDistanceRef.current = 195;
    }
    setFocusedCoordinates({ lat, lng });
    setIsAutoRotating(false);
  }, []);

  // When selected incident changes externally, smoothly orient globe
  useEffect(() => {
    if (selectedIncidentId) {
      const inc = incidents.find((i) => i.id === selectedIncidentId);
      if (inc) {
        flyToCoords(inc.coords.lat, inc.coords.lng, false);
      }
    }
  }, [selectedIncidentId, incidents, flyToCoords]);

  // Real-time solar clock tick: updates subsolar point every second when in REALTIME mode
  useEffect(() => {
    if (solarMode !== 'REALTIME') return;

    const interval = setInterval(() => {
      const info = calculateSubsolarPoint(new Date());
      setCurrentSolarInfo(info);
    }, 1000);

    return () => clearInterval(interval);
  }, [solarMode]);

  // Update solar info when custom hour slider changes
  useEffect(() => {
    if (solarMode === 'CUSTOM') {
      const now = new Date();
      const customDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        Math.floor(customUtcHour),
        Math.floor((customUtcHour % 1) * 60),
        Math.floor(((customUtcHour * 60) % 1) * 60)
      ));
      const info = calculateSubsolarPoint(customDate);
      setCurrentSolarInfo(info);
    }
  }, [solarMode, customUtcHour]);

  // Update Three.js Shader uniforms and Sun position whenever solar info or mode changes
  useEffect(() => {
    const sunVectorLocal = getLocalSunDirection(currentSolarInfo.lat, currentSolarInfo.lng);

    // Numeric mode for shader: 0.0 = Real-Time / Custom Solar, 1.0 = Forced Day, 2.0 = Forced Night
    let modeValue = 0.0;
    if (solarMode === 'DAY') modeValue = 1.0;
    if (solarMode === 'NIGHT') modeValue = 2.0;

    if (earthShaderMatRef.current) {
      earthShaderMatRef.current.uniforms.sunDirection.value.copy(sunVectorLocal);
      earthShaderMatRef.current.uniforms.mode.value = modeValue;
    }

    if (cloudsShaderMatRef.current) {
      cloudsShaderMatRef.current.uniforms.sunDirection.value.copy(sunVectorLocal);
      cloudsShaderMatRef.current.uniforms.mode.value = modeValue;
    }

    if (atmosphereMatRef.current) {
      atmosphereMatRef.current.uniforms.sunDirection.value.copy(sunVectorLocal);
      atmosphereMatRef.current.uniforms.mode.value = modeValue;
    }
  }, [currentSolarInfo, solarMode]);

  // Main Three.js setup & render loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2500);
    camera.position.z = cameraDistanceRef.current;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 1. Physical Solar Directional Light (positioned dynamically in render loop based on Sun zenith)
    const sunLight = new THREE.DirectionalLight(0xfffaec, 2.6);
    sunLight.position.set(300, 160, 240);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Deep space fill light (simulating cosmic starlight & earthshine)
    const spaceFillLight = new THREE.DirectionalLight(0x284a75, 0.45);
    spaceFillLight.position.set(-300, -120, -180);
    scene.add(spaceFillLight);

    // Ambient space light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    // Master Globe Group with YXZ rotation order for precise lat/lng targeting
    const globeGroup = new THREE.Group();
    globeGroup.rotation.order = 'YXZ';
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // 2. Realistic Multi-Spectral Deep Space Starfield
    const starCount = 1600;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 450 + Math.random() * 350;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const type = Math.random();
      if (type > 0.75) {
        starColors[i * 3] = 0.65;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 1.0;
      } else if (type > 0.45) {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 1] = 0.95;
        starColors[i * 3 + 2] = 0.95;
      } else if (type > 0.2) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.9;
        starColors[i * 3 + 2] = 0.7;
      } else {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.65;
        starColors[i * 3 + 2] = 0.55;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
    const starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);
    starsGroupRef.current = starMesh;

    // 3. Load Realistic Earth Satellite Textures
    const textures = loadRealisticEarthTextures();
    texturesRef.current = textures;

    // 4. Real-Time Day/Night Solar Terminator Earth Shader
    const initialSunLocal = getLocalSunDirection(currentSolarInfo.lat, currentSolarInfo.lng);

    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: textures.dayMap },
        nightTexture: { value: textures.nightMap },
        bumpTexture: { value: textures.bumpMap },
        specularTexture: { value: textures.specularMap },
        sunDirection: { value: initialSunLocal },
        mode: { value: 0.0 }, // 0.0 = Real-time blend, 1.0 = Day, 2.0 = Night
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normal);
          vPosition = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D bumpTexture;
        uniform sampler2D specularTexture;
        uniform vec3 sunDirection;
        uniform float mode;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;

        void main() {
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          vec4 specData = texture2D(specularTexture, vUv);

          // Topographical Bump Relief Perturbation
          float h0 = texture2D(bumpTexture, vUv).r;
          float hU = texture2D(bumpTexture, vUv + vec2(0.0008, 0.0)).r;
          float hV = texture2D(bumpTexture, vUv + vec2(0.0, 0.0008)).r;
          float bumpSlope = (hU - h0) * 10.0 + (hV - h0) * 10.0;

          vec3 normal = normalize(vNormal);
          vec3 sunDir = normalize(sunDirection);

          // Calculate real-time sun angle
          float sunDot = dot(normal, sunDir);

          if (mode > 0.5 && mode < 1.5) {
            // Forced Day Mode
            sunDot = max(0.4, sunDot);
          } else if (mode > 1.5) {
            // Forced Night Mode
            sunDot = -1.0;
          }

          // Smooth real-time twilight transition zone between night and day (-0.12 to +0.12)
          float dayFactor = smoothstep(-0.12, 0.12, sunDot);
          float nightFactor = 1.0 - dayFactor;

          // Atmospheric Twilight Glow (Sunset & Sunrise amber rim along the terminator)
          float twilightFactor = (1.0 - abs(sunDot) / 0.14) * step(abs(sunDot), 0.14);
          vec3 twilightColor = vec3(0.92, 0.42, 0.12) * twilightFactor * 0.55;

          // Day diffuse illumination with mountain relief
          float diffuse = max(0.0, sunDot + bumpSlope * 0.4);
          vec3 dayLight = vec3(0.07) + vec3(0.93) * diffuse;

          // Ocean Specular Glint (water shines in direct sunlight, continents remain matte)
          float isWater = specData.r;
          vec3 viewDirLocal = normalize(-vPosition);
          vec3 halfVec = normalize(sunDir + viewDirLocal);
          float specDot = max(0.0, dot(normal, halfVec));
          float specular = pow(specDot, 28.0) * isWater * dayFactor;
          vec3 specularColor = vec3(1.0, 0.96, 0.85) * specular * 0.85;

          // Night side: luminous city lights and power grids glowing in darkness
          vec3 nightLight = nightColor.rgb * (nightFactor * 1.5);

          // Composite surface color
          vec3 surfaceColor = (dayColor.rgb * dayLight + twilightColor + specularColor) * dayFactor + nightLight;

          gl_FragColor = vec4(surfaceColor, 1.0);
        }
      `,
    });

    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const earthMesh = new THREE.Mesh(earthGeo, earthShaderMat);
    globeGroup.add(earthMesh);
    earthMeshRef.current = earthMesh;
    earthShaderMatRef.current = earthShaderMat;

    // 5. Real-Time Volumetric Clouds Shader (Sunlit day clouds, sunset tint, dark night clouds)
    const cloudsGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.012, 64, 64);
    const cloudsShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        cloudsTexture: { value: textures.cloudsMap },
        sunDirection: { value: initialSunLocal },
        mode: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D cloudsTexture;
        uniform vec3 sunDirection;
        uniform float mode;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec4 cloud = texture2D(cloudsTexture, vUv);
          float sunDot = dot(normalize(vNormal), normalize(sunDirection));
          if (mode > 0.5 && mode < 1.5) sunDot = 1.0;
          else if (mode > 1.5) sunDot = -1.0;

          float dayFactor = smoothstep(-0.14, 0.16, sunDot);
          float cloudLight = mix(0.12, 1.0, dayFactor);

          // Twilight sunset tint on clouds at the terminator
          float twilight = (1.0 - abs(sunDot) / 0.18) * step(abs(sunDot), 0.18);
          vec3 twilightTint = vec3(0.88, 0.38, 0.12) * twilight * 0.45;

          vec3 finalCloudColor = (vec3(cloudLight) + twilightTint) * cloud.rgb;
          gl_FragColor = vec4(finalCloudColor, cloud.r * 0.82);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsShaderMat);
    globeGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;
    cloudsShaderMatRef.current = cloudsShaderMat;

    // 6. Inner Atmospheric Limb Sheen (Fresnel Rim)
    const innerRimGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.003, 48, 48);
    const innerRimMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
          rim = pow(rim, 3.2);
          gl_FragColor = vec4(0.32, 0.68, 1.0, rim * 0.45);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const innerRimMesh = new THREE.Mesh(innerRimGeo, innerRimMat);
    globeGroup.add(innerRimMesh);
    innerRimMeshRef.current = innerRimMesh;

    // 7. Outer Atmospheric Rayleigh Scattering Halo (Illuminated on sunward limb)
    const haloGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: initialSunLocal },
        mode: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vNormalLocal;
        void main() {
          vNormalLocal = normalize(normal);
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        uniform float mode;
        varying vec3 vNormal;
        varying vec3 vNormalLocal;

        void main() {
          float viewDot = dot(vNormal, vec3(0.0, 0.0, 1.0));
          float intensity = pow(0.68 - viewDot, 2.6);

          float sunDot = dot(normalize(vNormalLocal), normalize(sunDirection));
          if (mode > 0.5 && mode < 1.5) sunDot = 1.0;
          else if (mode > 1.5) sunDot = -1.0;

          float dayFactor = smoothstep(-0.25, 0.35, sunDot);
          float atmoIntensity = intensity * mix(0.22, 1.35, dayFactor);

          vec3 atmosphereColor = mix(vec3(0.12, 0.28, 0.55), vec3(0.28, 0.65, 1.0), dayFactor);
          gl_FragColor = vec4(atmosphereColor, atmoIntensity);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    globeGroup.add(haloMesh);
    atmosphereMeshRef.current = haloMesh;
    atmosphereMatRef.current = haloMat;

    // 8. Sub-groups for dynamic telemetry pinpoints, responders & supply arcs
    const disasterGroup = new THREE.Group();
    const volunteerGroup = new THREE.Group();
    const arcsGroup = new THREE.Group();

    globeGroup.add(disasterGroup);
    globeGroup.add(volunteerGroup);
    globeGroup.add(arcsGroup);

    disasterGroupRef.current = disasterGroup;
    volunteerGroupRef.current = volunteerGroup;
    arcsGroupRef.current = arcsGroup;

    // Interaction handlers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;

        targetRotationRef.current.y += deltaX * 0.0055;
        targetRotationRef.current.x = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, targetRotationRef.current.x + deltaY * 0.0055)
        );

        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      mouse.x = (x / rect.width) * 2 - 1;
      mouse.y = -(y / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(disasterGroup.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const incidentData = hit.userData.incident as Incident | undefined;
        if (incidentData) {
          onSelectIncident(incidentData);
          flyToCoords(incidentData.coords.lat, incidentData.coords.lng);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetCameraDistanceRef.current = Math.max(
        150,
        Math.min(380, targetCameraDistanceRef.current + e.deltaY * 0.25)
      );
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('click', handleClick);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();
    const tempProjVec = new THREE.Vector3();
    const tempSunWorld = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth auto-rotation if enabled & not dragging
      if (isAutoRotating && !isDraggingRef.current) {
        targetRotationRef.current.y += 0.0014;
      }

      // Slow realistic starfield drift
      if (starsGroupRef.current) {
        starsGroupRef.current.rotation.y += 0.0002;
      }

      // Independent volumetric cloud drift (orbital parallax)
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.00035;
      }

      // Smooth damping rotation
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;

      globeGroup.rotation.x = currentRotationRef.current.x;
      globeGroup.rotation.y = currentRotationRef.current.y;

      // Smooth zoom damping
      cameraDistanceRef.current += (targetCameraDistanceRef.current - cameraDistanceRef.current) * 0.1;
      camera.position.z = cameraDistanceRef.current;

      // Align physical Sun directional light with the real-time subsolar position
      if (sunLightRef.current && earthShaderMatRef.current) {
        const localSun = earthShaderMatRef.current.uniforms.sunDirection.value as THREE.Vector3;
        tempSunWorld.copy(localSun);
        tempSunWorld.applyMatrix4(globeGroup.matrixWorld);
        sunLightRef.current.position.copy(tempSunWorld.clone().multiplyScalar(400));
      }

      // Pulse disaster sonar rings
      pulseRingsRef.current.forEach((ring, idx) => {
        const phase = (elapsedTime * 2 + idx * 0.4) % 1;
        ring.scale.set(1 + phase * 2.4, 1 + phase * 2.4, 1);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.85 * (1 - phase));
      });

      // Animate supply arc energy packets
      arcPacketsRef.current.forEach((item) => {
        item.progress = (item.progress + delta * item.speed) % 1;
        const pt = item.curve.getPoint(item.progress);
        item.mesh.position.copy(pt);
      });

      // Update Screen-Projected 2D Place Pinpoints
      const overlay = pinOverlayRef.current;
      if (overlay && camera) {
        const w = overlay.clientWidth;
        const h = overlay.clientHeight;

        incidents.forEach((inc) => {
          const pinEl = document.getElementById(`pinpoint-${inc.id}`);
          if (!pinEl) return;

          const pin3D = latLngToVector3(inc.coords.lat, inc.coords.lng, GLOBE_RADIUS + 8);
          tempProjVec.copy(pin3D);
          tempProjVec.applyMatrix4(globeGroup.matrixWorld);

          const isFront = tempProjVec.z > 10;

          if (isFront) {
            tempProjVec.project(camera);
            const screenX = (tempProjVec.x * 0.5 + 0.5) * w;
            const screenY = (-tempProjVec.y * 0.5 + 0.5) * h;

            pinEl.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
            pinEl.style.opacity = '1';
            pinEl.style.pointerEvents = 'auto';
          } else {
            pinEl.style.opacity = '0';
            pinEl.style.pointerEvents = 'none';
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('wheel', handleWheel);
      renderer.dispose();
      earthGeo.dispose();
      earthShaderMat.dispose();
      cloudsGeo.dispose();
      cloudsShaderMat.dispose();
      innerRimGeo.dispose();
      innerRimMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
    };
  }, [isAutoRotating, onSelectIncident, flyToCoords, incidents, currentSolarInfo]);

  // Handle Clouds Toggle
  useEffect(() => {
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.visible = showClouds;
    }
  }, [showClouds]);

  // Handle Atmosphere Toggle
  useEffect(() => {
    if (atmosphereMeshRef.current) {
      atmosphereMeshRef.current.visible = showAtmosphere;
    }
    if (innerRimMeshRef.current) {
      innerRimMeshRef.current.visible = showAtmosphere;
    }
  }, [showAtmosphere]);

  // Update Dynamic 3D Objects when data or layers change
  useEffect(() => {
    const disasterGroup = disasterGroupRef.current;
    const volunteerGroup = volunteerGroupRef.current;
    const arcsGroup = arcsGroupRef.current;
    if (!disasterGroup || !volunteerGroup || !arcsGroup) return;

    while (disasterGroup.children.length > 0) {
      disasterGroup.remove(disasterGroup.children[0]);
    }
    while (volunteerGroup.children.length > 0) {
      volunteerGroup.remove(volunteerGroup.children[0]);
    }
    while (arcsGroup.children.length > 0) {
      arcsGroup.remove(arcsGroup.children[0]);
    }

    pulseRingsRef.current = [];
    arcPacketsRef.current = [];

    // 1. Disaster Pinpoint Markers Layer
    if (layerState.disasterZones) {
      incidents.forEach((incident) => {
        const pos = latLngToVector3(incident.coords.lat, incident.coords.lng, GLOBE_RADIUS);
        const markerObj = new THREE.Group();
        markerObj.position.copy(pos);
        markerObj.lookAt(pos.clone().multiplyScalar(2));

        let colorHex = 0xef4444;
        if (incident.urgency === 'HIGH') colorHex = 0xf59e0b;
        if (incident.urgency === 'MEDIUM') colorHex = 0xeab308;
        if (incident.urgency === 'RESOLVED') colorHex = 0x10b981;

        const isSelected = incident.id === selectedIncidentId;

        // Ground Target Reticle Ring
        const groundRingGeo = new THREE.RingGeometry(1.6, 2.3, 24);
        const groundRingMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          side: THREE.DoubleSide,
        });
        const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
        groundRing.userData = { incident };
        markerObj.add(groundRing);

        // Pulsing Sonar Ring Beacon
        const pulseRingGeo = new THREE.RingGeometry(2.2, 3.2, 32);
        const pulseRingMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
        pulseRing.userData = { incident };
        markerObj.add(pulseRing);
        pulseRingsRef.current.push(pulseRing);

        // Vertical Pin Needle / Stalk
        const stemHeight = isSelected ? 9.5 : 7.0;
        const stemGeo = new THREE.CylinderGeometry(0.35, 0.1, stemHeight, 8);
        stemGeo.translate(0, stemHeight / 2, 0);
        stemGeo.rotateX(Math.PI / 2);
        const stemMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.9,
        });
        const stemMesh = new THREE.Mesh(stemGeo, stemMat);
        stemMesh.userData = { incident };
        markerObj.add(stemMesh);

        // Elevated Pin Head Sphere
        const headGeo = new THREE.SphereGeometry(isSelected ? 3.2 : 2.4, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.85,
          roughness: 0.2,
          metalness: 0.3,
        });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.position.z = stemHeight;
        headMesh.userData = { incident };
        markerObj.add(headMesh);

        // Vertical Beacon Light Pillar for Selected Pinpoint
        if (isSelected) {
          const pillarGeo = new THREE.CylinderGeometry(0.25, 0.8, 28, 12);
          pillarGeo.translate(0, 14, 0);
          pillarGeo.rotateX(Math.PI / 2);
          const pillarMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.55,
          });
          const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
          markerObj.add(pillarMesh);
        }

        disasterGroup.add(markerObj);
      });
    }

    // 2. Volunteer Density Standby Nodes Layer
    if (layerState.volunteerDensity) {
      volunteers.forEach((vol) => {
        const pos = latLngToVector3(vol.coords.lat, vol.coords.lng, GLOBE_RADIUS + 0.8);
        const vNode = new THREE.Group();
        vNode.position.copy(pos);
        vNode.lookAt(pos.clone().multiplyScalar(2));

        const diamondGeo = new THREE.OctahedronGeometry(1.6, 0);
        const diamondMat = new THREE.MeshStandardMaterial({
          color: 0x14b8a6,
          emissive: 0x0f766e,
          roughness: 0.3,
          metalness: 0.8,
        });
        const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
        vNode.add(diamondMesh);

        const dotGeo = new THREE.RingGeometry(1.8, 2.3, 16);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0x14b8a6,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        });
        const dotMesh = new THREE.Mesh(dotGeo, dotMat);
        vNode.add(dotMesh);

        volunteerGroup.add(vNode);
      });
    }

    // 3. Supply Route & Dispatch Arcs Layer
    if (layerState.supplyRouteArcs) {
      dispatchArcs.forEach((arc) => {
        const vFrom = latLngToVector3(arc.fromCoords.lat, arc.fromCoords.lng, GLOBE_RADIUS);
        const vTo = latLngToVector3(arc.toCoords.lat, arc.toCoords.lng, GLOBE_RADIUS);

        const distance = vFrom.distanceTo(vTo);
        const arcAltitude = Math.min(60, Math.max(15, distance * 0.28));

        const mid = vFrom.clone().add(vTo).multiplyScalar(0.5);
        const midElevated = mid.clone().normalize().multiplyScalar(GLOBE_RADIUS + arcAltitude);

        const cp1 = vFrom.clone().lerp(midElevated, 0.55).normalize().multiplyScalar(GLOBE_RADIUS + arcAltitude * 0.85);
        const cp2 = vTo.clone().lerp(midElevated, 0.55).normalize().multiplyScalar(GLOBE_RADIUS + arcAltitude * 0.85);

        const curve = new THREE.CubicBezierCurve3(vFrom, cp1, cp2, vTo);
        const points = curve.getPoints(50);
        const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

        const arcColor = new THREE.Color(arc.color || '#14b8a6');
        const curveMat = new THREE.LineBasicMaterial({
          color: arcColor,
          transparent: true,
          opacity: 0.7,
          linewidth: 2,
        });
        const lineMesh = new THREE.Line(curveGeo, curveMat);
        arcsGroup.add(lineMesh);

        const packetGeo = new THREE.SphereGeometry(1.3, 12, 12);
        const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const packetMesh = new THREE.Mesh(packetGeo, packetMat);
        arcsGroup.add(packetMesh);

        arcPacketsRef.current.push({
          mesh: packetMesh,
          curve,
          progress: Math.random(),
          speed: 0.18 + Math.random() * 0.15,
        });
      });
    }
  }, [incidents, volunteers, dispatchArcs, layerState, selectedIncidentId]);

  // Filtered incidents for search bar
  const matchingIncidents = searchQuery.trim()
    ? incidents.filter(
        (i) =>
          i.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : incidents;

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  return (
    <div className="relative w-full h-full min-h-[440px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex flex-col group">
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full flex-1 touch-none cursor-grab active:cursor-grabbing relative"
      />

      {/* Screen-Projected 2D Place Pinpoints Overlay */}
      <div
        ref={pinOverlayRef}
        className="absolute inset-0 pointer-events-none overflow-hidden z-10"
      >
        {incidents.map((incident) => {
          const isSelected = incident.id === selectedIncidentId;
          const isCritical = incident.urgency === 'CRITICAL';

          return (
            <div
              key={incident.id}
              id={`pinpoint-${incident.id}`}
              style={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectIncident(incident);
                flyToCoords(incident.coords.lat, incident.coords.lng);
              }}
              className="absolute top-0 left-0 -translate-x-1/2 -translate-y-full mb-1 cursor-pointer select-none transition-opacity duration-150 group/pin"
            >
              {isSelected ? (
                /* Selected Pinpoint Reticle & Badge */
                <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-slate-900/95 backdrop-blur-md border border-teal-400/80 text-slate-100 rounded-lg px-2.5 py-1.5 shadow-2xl flex items-center gap-2 mb-1 whitespace-nowrap ring-2 ring-teal-400/30">
                    <Crosshair className="w-3.5 h-3.5 text-teal-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                        <span className="text-teal-300">{incident.code}</span>
                        <span className="text-slate-400">•</span>
                        <span>{incident.locationName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {incident.coords.lat.toFixed(2)}°N, {incident.coords.lng.toFixed(2)}°E • {incident.country}
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center w-6 h-6">
                    <div className="absolute w-6 h-6 rounded-full border border-teal-400 animate-ping opacity-75" />
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-md shadow-teal-400/80" />
                  </div>
                </div>
              ) : (
                /* Standard Pinpoint Badge */
                <div className="flex flex-col items-center group-hover/pin:scale-105 transition-transform">
                  <div
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold backdrop-blur-sm border shadow-md flex items-center gap-1.5 whitespace-nowrap mb-0.5 transition-all ${
                      isCritical
                        ? 'bg-rose-950/85 text-rose-200 border-rose-600/70 group-hover/pin:bg-rose-900'
                        : 'bg-amber-950/85 text-amber-200 border-amber-600/70 group-hover/pin:bg-amber-900'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCritical ? 'bg-rose-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span>{incident.locationName}</span>
                    <span className="text-[10px] opacity-70">({incident.country})</span>
                  </div>

                  <div
                    className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] ${
                      isCritical ? 'border-t-rose-500' : 'border-t-amber-500'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Top Header Pinpoint Bar: Search, Quick-Jump, and Real-Time Solar Controls */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Quick Place Pinpoint Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1 pointer-events-auto scrollbar-none">
          <div className="px-2.5 py-1 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shrink-0 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="hidden sm:inline">Pinpoints:</span>
          </div>

          {incidents.slice(0, 5).map((inc) => {
            const isSelected = inc.id === selectedIncidentId;
            return (
              <button
                key={inc.id}
                onClick={() => {
                  onSelectIncident(inc);
                  flyToCoords(inc.coords.lat, inc.coords.lng);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all shrink-0 border flex items-center gap-1.5 shadow-sm ${
                  isSelected
                    ? 'bg-teal-500/20 text-teal-200 border-teal-500/60 ring-1 ring-teal-500/40'
                    : 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    inc.urgency === 'CRITICAL' ? 'bg-rose-400' : 'bg-amber-400'
                  }`}
                />
                <span>{inc.locationName.split(' ')[0]}</span>
                <span className="text-[10px] text-slate-400">({inc.country})</span>
              </button>
            );
          })}

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors shrink-0 shadow-sm"
            title="Search places on globe"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Side: Real-Time Solar Data Controls & Earth Layers */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Real-Time Day / Night Solar Terminator Controls */}
          <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-xs font-mono shadow-sm">
            {/* Live Real-Time Solar Sync Button */}
            <button
              id="btn-solar-realtime"
              onClick={() => {
                setSolarMode('REALTIME');
                setCurrentSolarInfo(calculateSubsolarPoint(new Date()));
                setShowTimeScrubber(false);
              }}
              title="Real-time astronomical solar terminator (synced to live UTC time)"
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
                solarMode === 'REALTIME'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${solarMode === 'REALTIME' ? 'bg-teal-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[11px]">Real-Time</span>
            </button>

            {/* Time Scrubber Toggle */}
            <button
              onClick={() => {
                setShowTimeScrubber(!showTimeScrubber);
                if (solarMode !== 'CUSTOM') setSolarMode('CUSTOM');
              }}
              title="Interactive 24-hour solar cycle scrubber"
              className={`p-1 rounded-md transition-all ${
                solarMode === 'CUSTOM'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Clock className="w-3 h-3" />
            </button>

            {/* Pure Day Toggle */}
            <button
              id="btn-solar-day"
              onClick={() => {
                setSolarMode('DAY');
                setShowTimeScrubber(false);
              }}
              title="Full Day: NASA Blue Marble"
              className={`p-1 rounded-md transition-all ${
                solarMode === 'DAY'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sun className="w-3 h-3" />
            </button>

            {/* Pure Night Toggle */}
            <button
              id="btn-solar-night"
              onClick={() => {
                setSolarMode('NIGHT');
                setShowTimeScrubber(false);
              }}
              title="Full Night: NASA Black Marble city lights"
              className={`p-1 rounded-md transition-all ${
                solarMode === 'NIGHT'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Moon className="w-3 h-3" />
            </button>
          </div>

          {/* Clouds Toggle */}
          <button
            onClick={() => setShowClouds(!showClouds)}
            title={showClouds ? 'Hide Cloud Cover' : 'Show Realistic Clouds'}
            className={`p-1.5 rounded-lg border transition-all shadow-sm ${
              showClouds
                ? 'bg-slate-900/90 border-slate-700 text-teal-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
          </button>

          {/* Atmosphere Toggle */}
          <button
            onClick={() => setShowAtmosphere(!showAtmosphere)}
            title={showAtmosphere ? 'Hide Atmospheric Rayleigh Glow' : 'Show Atmospheric Glow'}
            className={`p-1.5 rounded-lg border transition-all shadow-sm ${
              showAtmosphere
                ? 'bg-slate-900/90 border-slate-700 text-sky-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-Time Solar Telemetry Strip & Interactive Time Scrubber */}
      <div className="absolute top-13 right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-none">
        {/* Live Subsolar Coordinate & UTC Status */}
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 shadow-lg flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${solarMode === 'REALTIME' ? 'bg-teal-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-bold text-teal-300">{currentSolarInfo.utcTimeString}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Zenith: <span className="text-slate-200">{currentSolarInfo.lat.toFixed(1)}°N, {Math.abs(currentSolarInfo.lng).toFixed(1)}°{currentSolarInfo.lng >= 0 ? 'E' : 'W'}</span>
          </span>
          <span className="hidden sm:inline text-slate-500 text-[9px]">
            ({currentSolarInfo.localSolarRegion})
          </span>
        </div>

        {/* 24-Hour Solar Time Scrubber Drawer */}
        {showTimeScrubber && (
          <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md p-2.5 rounded-xl border border-sky-500/40 text-xs font-mono text-slate-200 shadow-2xl w-72 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-sky-300 font-bold flex items-center gap-1">
                <Sliders className="w-3 h-3" />
                <span>24-HOUR SOLAR TERMINATOR</span>
              </span>
              <button
                onClick={() => {
                  setSolarMode('REALTIME');
                  setShowTimeScrubber(false);
                }}
                className="text-[10px] text-teal-400 hover:underline"
              >
                Reset Live
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>00:00 UTC</span>
                <span className="text-sky-400 font-bold">
                  {Math.floor(customUtcHour).toString().padStart(2, '0')}:
                  {Math.floor((customUtcHour % 1) * 60).toString().padStart(2, '0')} UTC
                </span>
                <span>24:00 UTC</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.1"
                value={customUtcHour}
                onChange={(e) => {
                  setCustomUtcHour(parseFloat(e.target.value));
                  if (solarMode !== 'CUSTOM') setSolarMode('CUSTOM');
                }}
                className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Expandable Place Search Modal Overlay */}
      {isSearchOpen && (
        <div className="absolute top-14 left-3 z-30 w-80 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
              <Search className="w-3.5 h-3.5 text-teal-400" />
              <span>PINPOINT PLACE ON GLOBE</span>
            </div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            type="text"
            autoFocus
            placeholder="Type city, country, or incident code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 mb-2 font-mono"
          />

          <div className="max-h-48 overflow-y-auto space-y-1">
            {matchingIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => {
                  onSelectIncident(inc);
                  flyToCoords(inc.coords.lat, inc.coords.lng);
                  setIsSearchOpen(false);
                }}
                className="p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-teal-500/50 cursor-pointer text-xs transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-teal-400">{inc.code}</span>
                  <span className="text-slate-400">{inc.country}</span>
                </div>
                <div className="font-medium text-slate-200 truncate">{inc.locationName}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {inc.coords.lat.toFixed(2)}°, {inc.coords.lng.toFixed(2)}°
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating View Controls (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm p-1 rounded-lg border border-slate-800 text-slate-400">
        <button
          id="btn-globe-zoomin"
          onClick={() => {
            targetCameraDistanceRef.current = Math.max(160, targetCameraDistanceRef.current - 35);
          }}
          title="Zoom in to pinpoint"
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          id="btn-globe-zoomout"
          onClick={() => {
            targetCameraDistanceRef.current = Math.min(360, targetCameraDistanceRef.current + 35);
          }}
          title="Zoom out"
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3.5 bg-slate-800" />
        <button
          id="btn-globe-autorotate"
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          title={isAutoRotating ? 'Pause rotation' : 'Resume rotation'}
          className={`p-1.5 rounded transition-colors ${
            isAutoRotating ? 'text-teal-400' : 'hover:bg-slate-800'
          }`}
        >
          {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          id="btn-globe-reset"
          onClick={() => {
            targetRotationRef.current = { x: 0.2, y: 0 };
            targetCameraDistanceRef.current = 250;
            setFocusedCoordinates(null);
            setIsAutoRotating(true);
          }}
          title="Reset globe view"
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        {onToggleExpand && (
          <button
            id="btn-globe-expand"
            onClick={onToggleExpand}
            title={isExpanded ? 'Restore split layout' : 'Expand full globe'}
            className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Selected Incident Pinpoint Card (Bottom Left) */}
      {selectedIncident && (
        <div className="absolute bottom-3 left-3 z-20 max-w-sm bg-slate-900/95 backdrop-blur-md border border-teal-500/60 rounded-xl p-3 shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[10px] font-mono text-teal-400 font-bold uppercase">
                  LOCKED ON PINPOINT
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ({selectedIncident.coords.lat.toFixed(2)}°, {selectedIncident.coords.lng.toFixed(2)}°)
                </span>
              </div>
              <div className="text-xs font-bold text-slate-100 truncate">
                {selectedIncident.title}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">{selectedIncident.locationName}, {selectedIncident.country}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => flyToCoords(selectedIncident.coords.lat, selectedIncident.coords.lng, true)}
                title="Re-center onto pinpoint"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5 text-teal-400" />
              </button>

              {onOpenSmartMatch && (
                <button
                  id="btn-globe-smartmatch-target"
                  onClick={() => onOpenSmartMatch(selectedIncident)}
                  className="px-2.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95"
                >
                  <span>Match</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
