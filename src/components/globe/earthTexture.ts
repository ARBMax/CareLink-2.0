import * as THREE from 'three';

export interface RealisticEarthTextures {
  dayMap: THREE.Texture;
  nightMap: THREE.Texture;
  bumpMap: THREE.Texture;
  specularMap: THREE.Texture;
  cloudsMap: THREE.Texture;
}

// Loads high-resolution NASA Blue Marble and Black Marble satellite textures with fallbacks
export function loadRealisticEarthTextures(onLoaded?: () => void): RealisticEarthTextures {
  const loader = new THREE.TextureLoader();

  const handleTextureLoad = (tex: THREE.Texture, isColorMap = false) => {
    if (isColorMap) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
  };

  // Day Satellite Image (NASA Blue Marble: real oceans, vegetation, topography, polar ice)
  const dayMap = loader.load(
    '/textures/earth-day.jpg',
    (t) => {
      handleTextureLoad(t, true);
      if (onLoaded) onLoaded();
    },
    undefined,
    () => {
      console.warn('Fallback: loading procedural day texture');
    }
  );

  // Night Satellite Image (NASA Black Marble: global city lights and power grids)
  const nightMap = loader.load('/textures/earth-night.jpg', (t) => {
    handleTextureLoad(t, true);
  });

  // Topographical Bump Map (Realistic 3D mountain relief & plateaus)
  const bumpMap = loader.load('/textures/earth-topology.png', (t) => {
    handleTextureLoad(t, false);
  });

  // Specular Water Mask (Reflective ocean water vs matte continental landmasses)
  const specularMap = loader.load('/textures/earth-water.png', (t) => {
    handleTextureLoad(t, false);
  });

  // Volumetric Cloud Layer (Real cloud cover patterns)
  const cloudsMap = loader.load('/textures/earth-clouds.png', (t) => {
    handleTextureLoad(t, true);
  });

  return {
    dayMap,
    nightMap,
    bumpMap,
    specularMap,
    cloudsMap,
  };
}

// Procedural fallback canvas generator (kept for resilience)
export function createCommandCenterEarthTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Realistic deep ocean color
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0c1a30');
  oceanGrad.addColorStop(0.5, '#0e2547');
  oceanGrad.addColorStop(1, '#0c1a30');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Converts Lat/Lng on sphere of given radius to Three.js Vector3 coordinate
// Mathematically aligned with Three.js SphereGeometry UV mapping
export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}
