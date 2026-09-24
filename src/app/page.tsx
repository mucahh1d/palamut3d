// @ts-nocheck
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useState, useRef, useMemo, Suspense, useEffect, useCallback } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

// ============================================
// 25 PRESET TEXTURE FONKSİYONLARI
// ============================================
const PRESETS = {
  sepet: (ctx, s) => {
    ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#404040"; ctx.lineWidth = 3;
    for (let i = 0; i < s; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
    for (let i = 0; i < s; i += 32) {
      ctx.fillStyle = "#a0a0a0";
      for (let j = 0; j < s; j += 32) ctx.fillRect(i, j, 16, 16);
    }
  },
  tugla: (ctx, s) => {
    ctx.fillStyle = "#606060"; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#303030"; ctx.lineWidth = 2;
    const bw = 40, bh = 20;
    for (let row = 0; row < s; row += bh) {
      const offset = (Math.floor(row / bh) % 2) * (bw / 2);
      for (let col = -bw; col < s; col += bw) {
        ctx.strokeRect(col + offset, row, bw, bh);
        ctx.fillStyle = Math.random() > 0.5 ? "#707070" : "#505050";
        ctx.fillRect(col + offset + 2, row + 2, bw - 4, bh - 4);
      }
    }
  },
  balon: (ctx, s) => {
    ctx.fillStyle = "#202020"; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 10 + Math.random() * 20;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.7, "#808080"); grad.addColorStop(1, "#202020");
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  karbon: (ctx, s) => {
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 4) {
      for (let x = 0; x < s; x += 4) {
        const offset = (Math.floor(y / 4) % 2) * 2;
        ctx.fillStyle = ((x + offset) % 8 < 4) ? "#2a2a2a" : "#0a0a0a";
        ctx.fillRect(x, y, 4, 4);
      }
    }
  },
  kristal: (ctx, s) => {
    ctx.fillStyle = "#404040"; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * s, y = Math.random() * s, size = 5 + Math.random() * 15;
      ctx.fillStyle = `rgba(${150 + Math.random() * 105}, ${150 + Math.random() * 105}, ${150 + Math.random() * 105}, 0.7)`;
      ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y);
      ctx.closePath(); ctx.fill();
    }
  },
  noktalar: (ctx, s) => {
    ctx.fillStyle = "#202020"; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#ffffff";
    for (let y = 0; y < s; y += 16) {
      for (let x = 0; x < s; x += 16) {
        ctx.beginPath(); ctx.arc(x + 8, y + 8, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
  },
  izgara: (ctx, s) => {
    ctx.fillStyle = "#303030"; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#808080"; ctx.lineWidth = 2;
    for (let i = 0; i <= s; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
  },
  kavrama: (ctx, s) => {
    ctx.fillStyle = "#505050"; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) {
      for (let x = 0; x < s; x += 8) {
        ctx.fillStyle = ((x + y) % 16 < 8) ? "#707070" : "#303030";
        ctx.fillRect(x, y, 8, 8);
      }
    }
  },
  altigen: (ctx, s) => {
    ctx.fillStyle = "#404040"; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#909090"; ctx.lineWidth = 2;
    const hexSize = 20;
    for (let row = 0; row < s; row += hexSize * 1.5) {
      for (let col = 0; col < s; col += hexSize * Math.sqrt(3)) {
        const x = col + (Math.floor(row / (hexSize * 1.5)) % 2) * (hexSize * Math.sqrt(3) / 2);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const px = x + hexSize * Math.cos(angle), py = row + hexSize * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
    }
  },
  altigenler: (ctx, s) => {
    ctx.fillStyle = "#202020"; ctx.fillRect(0, 0, s, s);
    for (let row = 0; row < s; row += 30) {
      for (let col = 0; col < s; col += 30) {
        const x = col + (Math.floor(row / 30) % 2) * 15;
        ctx.fillStyle = "#606060"; ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const px = x + 12 * Math.cos(angle), py = row + 12 * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
      }
    }
  },
  izogrid: (ctx, s) => {
    ctx.fillStyle = "#303030"; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#808080"; ctx.lineWidth = 1;
    for (let i = 0; i < s; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(i, 0); ctx.stroke();
    }
  },
  orgu: (ctx, s) => {
    ctx.fillStyle = "#505050"; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 12) {
      for (let x = 0; x < s; x += 12) {
        ctx.strokeStyle = ((x + y) % 24 < 12) ? "#909090" : "#303030";
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 6, y + 6, 5, 0, Math.PI); ctx.stroke();
      }
    }
  },
  ornek: (ctx, s) => {
    ctx.fillStyle = "#404040"; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 16) {
      for (let x = 0; x < s; x += 16) {
        ctx.fillStyle = ((x / 16 + y / 16) % 2 === 0) ? "#707070" : "#202020";
        ctx.fillRect(x, y, 16, 16);
      }
    }
  },
  tirtillama: (ctx, s) => {
    ctx.fillStyle = "#303030"; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      ctx.strokeStyle = "#909090"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 5); ctx.lineTo(x + 5, y + 10); ctx.stroke();
    }
  },
  deri: (ctx, s) => {
    ctx.fillStyle = "#505050"; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      ctx.fillStyle = `rgba(${100 + Math.random() * 80}, ${100 + Math.random() * 80}, ${100 + Math.random() * 80}, 0.3)`;
      ctx.beginPath(); ctx.ellipse(x, y, 3 + Math.random() * 5, 2 + Math.random() * 3, Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
  },
  gurultu: (ctx, s) => {
    const imageData = ctx.createImageData(s, s);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.random() * 255;
      imageData.data[i] = v; imageData.data[i + 1] = v; imageData.data[i + 2] = v; imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  },
  cizgiler1: (ctx, s) => {
    ctx.fillStyle = "#202020"; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#808080"; ctx.lineWidth = 4;
    for (let i = 0; i < s; i += 12) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke(); }
  },
  cizgiler2: (ctx, s) => {
    ctx.fillStyle = "#303030"; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#909090"; ctx.lineWidth = 2;
    for (let i = 0; i < s; i += 8) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke(); }
  },
  voronoi: (ctx, s) => {
    ctx.fillStyle = "#404040"; ctx.fillRect(0, 0, s, s);
    const points = [];
    for (let i = 0; i < 30; i++) points.push({ x: Math.random() * s, y: Math.random() * s });
    for (let y = 0; y < s; y += 2) {
      for (let x = 0; x < s; x += 2) {
        let minDist = Infinity;
        for (const p of points) {
          const d = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
          if (d < minDist) minDist = d;
        }
        const v = Math.min(255, minDist * 3);
        ctx.fillStyle = `rgb(${v}, ${v}, ${v})`; ctx.fillRect(x, y, 2, 2);
      }
    }
  },
  dokuma1: (ctx, s) => {
    ctx.fillStyle = "#505050"; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) {
      for (let x = 0; x < s; x += 8) {
        ctx.fillStyle = ((x / 8 + y / 8) % 2 === 0) ? "#808080" : "#303030";
        ctx.fillRect(x, y, 8, 4);
      }
    }
  },
  dokuma2: (ctx, s) => {
    ctx.fillStyle = "#404040"; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 6) {
      ctx.strokeStyle = i % 12 < 6 ? "#909090" : "#202020"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
  },
  dokuma3: (ctx, s) => {
    ctx.fillStyle = "#303030"; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 10) {
      for (let x = 0; x < s; x += 10) {
        ctx.fillStyle = (x + y) % 20 < 10 ? "#707070" : "#202020";
        ctx.fillRect(x, y, 10, 5); ctx.fillRect(x + 5, y + 5, 10, 5);
      }
    }
  },
  ahşap1: (ctx, s) => {
    ctx.fillStyle = "#604030"; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 50; i++) {
      ctx.strokeStyle = `rgba(${40 + Math.random() * 40}, ${20 + Math.random() * 30}, ${10 + Math.random() * 20}, 0.5)`;
      ctx.lineWidth = 1 + Math.random() * 2; ctx.beginPath();
      const y = Math.random() * s; ctx.moveTo(0, y);
      ctx.bezierCurveTo(s / 3, y + Math.random() * 10 - 5, 2 * s / 3, y + Math.random() * 10 - 5, s, y);
      ctx.stroke();
    }
  },
  ahşap2: (ctx, s) => {
    ctx.fillStyle = "#806040"; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
      for (let x = 0; x < s; x += 2) {
        const v = Math.sin(x * 0.1) * 20 + Math.random() * 30;
        ctx.fillStyle = `rgb(${128 + v}, ${96 + v * 0.7}, ${64 + v * 0.5})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  },
  ahşap3: (ctx, s) => {
    ctx.fillStyle = "#504030"; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 20; i++) {
      const y = (i / 20) * s;
      ctx.strokeStyle = `rgba(${60 + Math.random() * 40}, ${40 + Math.random() * 30}, ${20 + Math.random() * 20}, 0.7)`;
      ctx.lineWidth = 3 + Math.random() * 5; ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x < s; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.05) * 5);
      ctx.stroke();
    }
  },
};

// Thumbnail oluştur (her preset için küçük resim)
function createThumbnail(presetId, size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (PRESETS[presetId]) PRESETS[presetId](ctx, size);
  return canvas.toDataURL();
}

// Büyük texture oluştur (3D model için)
function createTexture(presetId) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (PRESETS[presetId]) PRESETS[presetId](ctx, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ============================================
// GEOMETRİ İŞLEMLERİ
// ============================================
function getEdgeLength(i1, i2, positions) {
  const x1 = positions[i1 * 3], y1 = positions[i1 * 3 + 1], z1 = positions[i1 * 3 + 2];
  const x2 = positions[i2 * 3], y2 = positions[i2 * 3 + 1], z2 = positions[i2 * 3 + 2];
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}

function getMidpoint(i1, i2, positions, newPositions, cache) {
  const key = `${Math.min(i1, i2)}_${Math.max(i1, i2)}`;
  if (cache.has(key)) return cache.get(key);
  const x1 = positions[i1 * 3], y1 = positions[i1 * 3 + 1], z1 = positions[i1 * 3 + 2];
  const x2 = positions[i2 * 3], y2 = positions[i2 * 3 + 1], z2 = positions[i2 * 3 + 2];
  const newIndex = Math.floor(newPositions.length / 3);
  newPositions.push((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  cache.set(key, newIndex);
  return newIndex;
}

function smartRemesh(geometry, quality) {
  const edgeLengths = [1.5, 1.0, 0.6, 0.35, 0.2];
  const targetEdgeLength = edgeLengths[quality - 1] || 0.6;
  const MAX_VERTICES = 400000, MAX_ITERATIONS = 4;
  let positions = geometry.attributes.position.array;
  let indices = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: positions.length / 3 }, (_, i) => i);
  let currentIteration = 0, lastVertexCount = positions.length / 3;
  while (currentIteration < MAX_ITERATIONS) {
    const newPositions = [], newIndices = [], midpointCache = new Map();
    let needsSubdivision = false;
    for (let i = 0; i < positions.length; i++) newPositions.push(positions[i]);
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i], i2 = indices[i + 1], i3 = indices[i + 2];
      const maxLen = Math.max(getEdgeLength(i1, i2, positions), getEdgeLength(i2, i3, positions), getEdgeLength(i3, i1, positions));
      if (maxLen > targetEdgeLength && newPositions.length / 3 < MAX_VERTICES) {
        needsSubdivision = true;
        const m12 = getMidpoint(i1, i2, positions, newPositions, midpointCache);
        const m23 = getMidpoint(i2, i3, positions, newPositions, midpointCache);
        const m31 = getMidpoint(i3, i1, positions, newPositions, midpointCache);
        newIndices.push(i1, m12, m31, m12, i2, m23, m31, m23, i3, m12, m23, m31);
      } else newIndices.push(i1, i2, i3);
    }
    positions = new Float32Array(newPositions);
    indices = newIndices;
    currentIteration++;
    const currentVertexCount = positions.length / 3;
    if (!needsSubdivision || currentVertexCount >= MAX_VERTICES) break;
    const growth = (currentVertexCount - lastVertexCount) / lastVertexCount;
    if (growth < 0.05) break;
    lastVertexCount = currentVertexCount;
  }
  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  newGeometry.setIndex(indices);
  newGeometry.computeVertexNormals();
  return { geometry: newGeometry, vertexCount: positions.length / 3, iterations: currentIteration };
}

function addUVMapping(geometry) {
  const posAttr = geometry.attributes.position;
  const vertexCount = posAttr.count;
  const uvArray = new Float32Array(vertexCount * 2);
  const box = new THREE.Box3().setFromBufferAttribute(posAttr);
  const size = box.getSize(new THREE.Vector3());
  const min = box.min;
  for (let i = 0; i < vertexCount; i++) {
    uvArray[i * 2] = (posAttr.getX(i) - min.x) / size.x;
    uvArray[i * 2 + 1] = (posAttr.getY(i) - min.y) / size.y;
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
}

// ============================================
// 3D MODEL
// ============================================
function Model3D({ file, amplitude, scale, showWireframe, remeshQuality, modelColor, selectedPreset, useCube, onGeometryReady }) {
  const [geometry, setGeometry] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const displacementMap = useMemo(() => createTexture(selectedPreset), [selectedPreset]);
  
  useEffect(() => {
    displacementMap.repeat.set(scale, scale);
    displacementMap.needsUpdate = true;
  }, [scale, displacementMap]);

  useEffect(() => {
    if (useCube) {
      const cubeGeometry = new THREE.BoxGeometry(5, 5, 5, 64, 64, 64);
      addUVMapping(cubeGeometry);
      setGeometry(cubeGeometry);
      if (onGeometryReady) onGeometryReady(cubeGeometry);
    } else if (file) {
      setLoading(true);
      const loader = new STLLoader();
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedGeometry = loader.parse(e.target?.result);
          loadedGeometry.computeVertexNormals();
          loadedGeometry.center();
          const remeshResult = smartRemesh(loadedGeometry, remeshQuality);
          addUVMapping(remeshResult.geometry);
          const box = new THREE.Box3().setFromObject(new THREE.Mesh(remeshResult.geometry));
          const size = box.getSize(new THREE.Vector3());
          const scale_factor = 5 / Math.max(size.x, size.y, size.z);
          remeshResult.geometry.scale(scale_factor, scale_factor, scale_factor);
          setGeometry(remeshResult.geometry);
          setLoading(false);
          if (onGeometryReady) onGeometryReady(remeshResult.geometry);
        } catch (error) { console.error("STL hatası:", error); setLoading(false); }
      };
      reader.readAsArrayBuffer(file);
    }
  }, [file, remeshQuality, useCube]);

  if (!geometry) {
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5, 5, 5, 32, 32, 32]} />
        <meshStandardMaterial color={modelColor} metalness={0.3} roughness={0.7} displacementMap={displacementMap} displacementScale={amplitude} side={THREE.DoubleSide} wireframe={showWireframe} />
      </mesh>
    );
  }

  return (
    <>
      {loading && <mesh><sphereGeometry args={[0.5, 16, 16]} /><meshBasicMaterial color="#06b6d4" wireframe /></mesh>}
      <mesh geometry={geometry}>
        <meshStandardMaterial color={modelColor} metalness={0.3} roughness={0.7} displacementMap={displacementMap} displacementScale={amplitude * 0.15} side={THREE.DoubleSide} wireframe={showWireframe} />
      </mesh>
    </>
  );
}

// ============================================
// PRESET THUMBNAIL BİLEŞENİ
// ============================================
function PresetThumbnail({ presetId, name, isSelected, onClick }) {
  const thumbnailUrl = useMemo(() => createThumbnail(presetId, 64), [presetId]);
  
  return (
    <button
      onClick={onClick}
      className={`relative w-16 h-16 rounded border-2 transition-all ${
        isSelected ? 'border-cyan-400 ring-2 ring-cyan-400 scale-105' : 'border-gray-700 hover:border-gray-500'
      }`}
      title={name}
    >
      <img src={thumbnailUrl} alt={name} className="w-full h-full object-cover rounded" />
    </button>
  );
}

// ============================================
// ANA SAYFA
// ============================================
export default function Home() {
  const [amplitude, setAmplitude] = useState(0.3);
  const [scale, setScale] = useState(2);
  const [remeshQuality, setRemeshQuality] = useState(2);
  const [stlFile, setStlFile] = useState(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const [currentGeometry, setCurrentGeometry] = useState(null);
  const [exportStatus, setExportStatus] = useState('');
  const [modelColor, setModelColor] = useState('#06b6d4');
  const [selectedPreset, setSelectedPreset] = useState('kristal');
  const [useCube, setUseCube] = useState(true);
  const [stats, setStats] = useState({ vertices: 0, fileSize: '0 KB' });
  const fileInputRef = useRef(null);

  const presetList = [
    { id: 'sepet', name: 'Sepet' }, { id: 'tugla', name: 'Tuğla' }, { id: 'balon', name: 'Balon' },
    { id: 'karbon', name: 'Karbon' }, { id: 'kristal', name: 'Kristal' }, { id: 'noktalar', name: 'Noktalar' },
    { id: 'izgara', name: 'Izgara' }, { id: 'kavrama', name: 'Kavrama' }, { id: 'altigen', name: 'Altıgen' },
    { id: 'altigenler', name: 'Altıgenler' }, { id: 'izogrid', name: 'İzogrid' }, { id: 'orgu', name: 'Örgü' },
    { id: 'ornek', name: 'Örnek' }, { id: 'tirtillama', name: 'Tırtıl' }, { id: 'deri', name: 'Deri' },
    { id: 'gurultu', name: 'Gürültü' }, { id: 'cizgiler1', name: 'Çizgi 1' }, { id: 'cizgiler2', name: 'Çizgi 2' },
    { id: 'voronoi', name: 'Voronoi' }, { id: 'dokuma1', name: 'Dokuma 1' }, { id: 'dokuma2', name: 'Dokuma 2' },
    { id: 'dokuma3', name: 'Dokuma 3' }, { id: 'ahşap1', name: 'Ahşap 1' }, { id: 'ahşap2', name: 'Ahşap 2' },
    { id: 'ahşap3', name: 'Ahşap 3' },
  ];

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.stl')) {
      setStlFile(file);
      setUseCube(false);
      setExportStatus('');
      setStats({ vertices: 0, fileSize: `${(file.size / 1024).toFixed(1)} KB` });
    } else alert('Geçerli bir STL dosyası seçin!');
  }, []);

  const handleGeometryReady = useCallback((geometry) => {
    setCurrentGeometry(geometry);
    setStats(prev => ({ ...prev, vertices: geometry.attributes.position.count }));
  }, []);

  const handleExportSTL = useCallback(() => {
    if (!currentGeometry) { alert('Önce model yükleyin!'); return; }
    try {
      setExportStatus('Export ediliyor...');
      const exporter = new STLExporter();
      const stlString = exporter.parse(new THREE.Mesh(currentGeometry), { binary: true });
      const blob = new Blob([stlString], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `palamut3d_${Date.now()}.stl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportStatus('İndirildi!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) { console.error('Export hatası:', error); setExportStatus('Başarısız!'); setTimeout(() => setExportStatus(''), 3000); }
  }, [currentGeometry]);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-md p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cyan-400">Palamut3D <span className="text-gray-500 text-sm font-mono">v1.4.0</span></h1>
            <p className="text-xs text-gray-400 mt-1">3D Model Texturizer</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setUseCube(!useCube)} className="px-4 py-2 text-xs font-mono bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition">
              {useCube ? "📦 Küp" : "📄 STL"}
            </button>
            <button onClick={() => setShowWireframe(!showWireframe)} className="px-4 py-2 text-xs font-mono bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition">
              {showWireframe ? "Dolu" : "Tel"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -5, -5]} intensity={0.3} />
            <Suspense fallback={null}>
              <Model3D file={stlFile} amplitude={amplitude} scale={scale} showWireframe={showWireframe} remeshQuality={remeshQuality} modelColor={modelColor} selectedPreset={selectedPreset} useCube={useCube} onGeometryReady={handleGeometryReady} />
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>
        </div>

        <aside className="w-96 bg-gray-900 border-l border-gray-800 p-4 space-y-4 overflow-y-auto">
          <div>
            <h2 className="text-sm font-bold text-gray-300 mb-3">DOSYA</h2>
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-700 rounded text-sm transition">
              {stlFile ? '✓ STL Yüklendi' : 'STL Yükle'}
            </button>
            <input ref={fileInputRef} type="file" accept=".stl" onChange={handleFileChange} className="hidden" />
          </div>

          <div className="pt-3 border-t border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-3">İSTATİSTİK</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800 p-2 rounded">
                <p className="text-gray-400">Vertex</p>
                <p className="text-cyan-400 font-mono font-bold">{stats.vertices.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <p className="text-gray-400">Boyut</p>
                <p className="text-cyan-400 font-mono font-bold">{stats.fileSize}</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-3">EXPORT</h2>
            <button onClick={handleExportSTL} disabled={!currentGeometry} className={`w-full py-2 px-3 rounded text-sm transition ${currentGeometry ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
              STL İndir
            </button>
            {exportStatus && <p className="text-xs mt-2 text-center text-cyan-400">{exportStatus}</p>}
          </div>

          <div className="pt-3 border-t border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-3">RENK</h2>
            <div className="flex items-center gap-2">
              <input type="color" value={modelColor} onChange={(e) => setModelColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
              <div className="flex gap-1 flex-wrap flex-1">
                {['#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'].map(c => (
                  <button key={c} onClick={() => setModelColor(c)} className="w-5 h-5 rounded border border-gray-600" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* PRESET GRID - BumpMesh gibi gerçek thumbnail'lar */}
          <div className="pt-3 border-t border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-3">KABARTMA DESEN HARİTASI (25)</h2>
            <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
              {presetList.map(p => (
                <PresetThumbnail
                  key={p.id}
                  presetId={p.id}
                  name={p.name}
                  isSelected={selectedPreset === p.id}
                  onClick={() => setSelectedPreset(p.id)}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Seçili: <span className="text-cyan-400 font-bold">{presetList.find(p => p.id === selectedPreset)?.name}</span></p>
          </div>

          <div className="pt-3 border-t border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-3">REMESHING</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-gray-400">Kalite</span><span className="text-cyan-400 font-mono">{remeshQuality}/5</span></div>
              <input type="range" min="1" max="5" step="1" value={remeshQuality} onChange={(e) => setRemeshQuality(parseInt(e.target.value))} className="w-full accent-cyan-500" />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-3">KABARTMA</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Derinlik</span><span className="text-cyan-400 font-mono">{amplitude.toFixed(2)}</span></div>
                <input type="range" min="0" max="1" step="0.05" value={amplitude} onChange={(e) => setAmplitude(parseFloat(e.target.value))} className="w-full accent-cyan-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Scale</span><span className="text-cyan-400 font-mono">{scale.toFixed(1)}</span></div>
                <input type="range" min="0.5" max="10" step="0.5" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full accent-cyan-500" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}