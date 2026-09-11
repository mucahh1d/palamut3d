// @ts-nocheck
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useState, useRef, useMemo, Suspense, useEffect, useCallback } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

// ============================================
// PROSEDÜREL NOISE TEXTURE OLUŞTURUCU
// ============================================
function createSmoothNoiseTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  
  const imageData = ctx.createImageData(size, size);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      
      let value = 0;
      value += Math.sin(x * 0.02) * Math.cos(y * 0.02) * 0.5;
      value += Math.sin(x * 0.05 + y * 0.03) * 0.3;
      value += Math.cos(x * 0.1 - y * 0.08) * 0.2;
      
      const normalized = ((value + 1) / 2) * 255;
      
      imageData.data[i] = normalized;
      imageData.data[i + 1] = normalized;
      imageData.data[i + 2] = normalized;
      imageData.data[i + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// ============================================
// GEOMETRİ YARDIMCI FONKSİYONLARI
// ============================================
function getEdgeLength(i1, i2, positions) {
  const x1 = positions[i1 * 3];
  const y1 = positions[i1 * 3 + 1];
  const z1 = positions[i1 * 3 + 2];
  
  const x2 = positions[i2 * 3];
  const y2 = positions[i2 * 3 + 1];
  const z2 = positions[i2 * 3 + 2];
  
  return Math.sqrt(
    Math.pow(x2 - x1, 2) + 
    Math.pow(y2 - y1, 2) + 
    Math.pow(z2 - z1, 2)
  );
}

function getMidpoint(i1, i2, positions, newPositions, cache) {
  const key = `${Math.min(i1, i2)}_${Math.max(i1, i2)}`;
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const x1 = positions[i1 * 3];
  const y1 = positions[i1 * 3 + 1];
  const z1 = positions[i1 * 3 + 2];
  
  const x2 = positions[i2 * 3];
  const y2 = positions[i2 * 3 + 1];
  const z2 = positions[i2 * 3 + 2];
  
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const midZ = (z1 + z2) / 2;
  
  const newIndex = Math.floor(newPositions.length / 3);
  newPositions.push(midX, midY, midZ);
  cache.set(key, newIndex);
  
  return newIndex;
}

// ============================================
// AKILLI REMESHING (ADAPTIF SUBDIVISION)
// ============================================
function smartRemesh(geometry, quality) {
  const edgeLengths = [1.5, 1.0, 0.6, 0.35, 0.2];
  const targetEdgeLength = edgeLengths[quality - 1] || 0.6;
  
  const MAX_VERTICES = 400000;
  const MAX_ITERATIONS = 4;
  
  let positions = geometry.attributes.position.array;
  let indices = geometry.index 
    ? Array.from(geometry.index.array)
    : Array.from({ length: positions.length / 3 }, (_, i) => i);
  
  let currentIteration = 0;
  let lastVertexCount = positions.length / 3;
  
  while (currentIteration < MAX_ITERATIONS) {
    const newPositions = [];
    const newIndices = [];
    const midpointCache = new Map();
    let needsSubdivision = false;
    
    for (let i = 0; i < positions.length; i++) {
      newPositions.push(positions[i]);
    }
    
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i];
      const i2 = indices[i + 1];
      const i3 = indices[i + 2];
      
      const len12 = getEdgeLength(i1, i2, positions);
      const len23 = getEdgeLength(i2, i3, positions);
      const len31 = getEdgeLength(i3, i1, positions);
      
      const maxLen = Math.max(len12, len23, len31);
      
      if (maxLen > targetEdgeLength && newPositions.length / 3 < MAX_VERTICES) {
        needsSubdivision = true;
        
        const m12 = getMidpoint(i1, i2, positions, newPositions, midpointCache);
        const m23 = getMidpoint(i2, i3, positions, newPositions, midpointCache);
        const m31 = getMidpoint(i3, i1, positions, newPositions, midpointCache);
        
        newIndices.push(i1, m12, m31);
        newIndices.push(m12, i2, m23);
        newIndices.push(m31, m23, i3);
        newIndices.push(m12, m23, m31);
      } else {
        newIndices.push(i1, i2, i3);
      }
    }
    
    positions = new Float32Array(newPositions);
    indices = newIndices;
    currentIteration++;
    
    const currentVertexCount = positions.length / 3;
    
    if (!needsSubdivision || currentVertexCount >= MAX_VERTICES) {
      break;
    }
    
    const growth = (currentVertexCount - lastVertexCount) / lastVertexCount;
    if (growth < 0.05) {
      break;
    }
    
    lastVertexCount = currentVertexCount;
  }
  
  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  newGeometry.setIndex(indices);
  newGeometry.computeVertexNormals();
  
  return {
    geometry: newGeometry,
    vertexCount: positions.length / 3,
    iterations: currentIteration
  };
}

// ============================================
// UV MAPPING EKLEME
// ============================================
function addUVMapping(geometry) {
  const posAttr = geometry.attributes.position;
  const vertexCount = posAttr.count;
  const uvArray = new Float32Array(vertexCount * 2);
  
  const box = new THREE.Box3().setFromBufferAttribute(posAttr);
  const size = box.getSize(new THREE.Vector3());
  const min = box.min;
  
  for (let i = 0; i < vertexCount; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    
    uvArray[i * 2] = (x - min.x) / size.x;
    uvArray[i * 2 + 1] = (y - min.y) / size.y;
  }
  
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
}

// ============================================
// STL MODEL BİLEŞENİ
// ============================================
function STLModel({ file, amplitude, scale, showWireframe, remeshQuality }) {
  const [geometry, setGeometry] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const displacementMap = useMemo(() => createSmoothNoiseTexture(), []);
  
  useEffect(() => {
    displacementMap.repeat.set(scale, scale);
    displacementMap.needsUpdate = true;
  }, [scale, displacementMap]);

  useEffect(() => {
    if (!file) {
      setGeometry(null);
      return;
    }
    
    setLoading(true);
    const loader = new STLLoader();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        const loadedGeometry = loader.parse(arrayBuffer);
        
        loadedGeometry.computeVertexNormals();
        loadedGeometry.center();
        
        const originalVertexCount = loadedGeometry.attributes.position.count;
        console.log(`📊 Orijinal vertex: ${originalVertexCount.toLocaleString()}`);
        
        const remeshResult = smartRemesh(loadedGeometry, remeshQuality);
        
        console.log(`🔄 Remeshing: ${originalVertexCount.toLocaleString()} → ${remeshResult.vertexCount.toLocaleString()} vertex`);
        console.log(` Artış: %${((remeshResult.vertexCount / originalVertexCount - 1) * 100).toFixed(0)}`);
        
        addUVMapping(remeshResult.geometry);
        
        const box = new THREE.Box3().setFromObject(new THREE.Mesh(remeshResult.geometry));
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale_factor = 5 / maxDim;
        remeshResult.geometry.scale(scale_factor, scale_factor, scale_factor);
        
        setGeometry(remeshResult.geometry);
        setLoading(false);
      } catch (error) {
        console.error(" STL yükleme hatası:", error);
        setLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, [file, remeshQuality]);

  if (!geometry) {
    return (
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10, 128, 128]} />
        <meshStandardMaterial
          color="#06b6d4"
          metalness={0.3}
          roughness={0.7}
          displacementMap={displacementMap}
          displacementScale={amplitude}
          side={THREE.DoubleSide}
          wireframe={showWireframe}
        />
      </mesh>
    );
  }

  return (
    <>
      {loading && (
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#06b6d4" wireframe />
        </mesh>
      )}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#06b6d4"
          metalness={0.3}
          roughness={0.7}
          displacementMap={displacementMap}
          displacementScale={amplitude * 0.15}
          side={THREE.DoubleSide}
          wireframe={showWireframe}
        />
      </mesh>
    </>
  );
}

// ============================================
// ANA SAYFA BİLEŞENİ
// ============================================
export default function Home() {
  const [amplitude, setAmplitude] = useState(0.3);
  const [scale, setScale] = useState(2);
  const [remeshQuality, setRemeshQuality] = useState(2);
  const [stlFile, setStlFile] = useState(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.stl') || file.name.endsWith('.STL'))) {
      setStlFile(file);
    } else {
      alert('⚠️ Lütfen geçerli bir STL dosyası seçin!');
    }
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-md p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cyan-400">
              Palamut3D <span className="text-gray-500 text-sm font-mono">v1.1.0</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">by roottechx | Profesyonel Remeshing</p>
          </div>
          <button
            onClick={() => setShowWireframe(!showWireframe)}
            className="px-4 py-2 text-xs font-mono bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition"
          >
            {showWireframe ? " Dolu Görünüm" : "⚪ Tel Kafes"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <Canvas camera={{ position: [0, 8, 8], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -5, -5]} intensity={0.3} />
            
            <Suspense fallback={null}>
              <STLModel 
                file={stlFile} 
                amplitude={amplitude} 
                scale={scale}
                showWireframe={showWireframe}
                remeshQuality={remeshQuality}
              />
            </Suspense>
            
            <OrbitControls makeDefault />
          </Canvas>

          <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-cyan-500/30 p-3 rounded-lg text-xs text-gray-300 font-mono">
            <p className="text-cyan-400 font-bold mb-1">✓ PROFESYONEL REMESHING</p>
            <p>• Adaptif subdivision (kenar bazlı)</p>
            <p>• Maksimum 400k vertex limiti</p>
            <p>• Smooth noise texture</p>
            <p>• Otomatik UV mapping</p>
          </div>
        </div>

        <aside className="w-80 bg-gray-900 border-l border-gray-800 p-6 space-y-6 overflow-y-auto">
          <div>
            <h2 className="text-sm font-bold text-gray-300 mb-4">📁 DOSYA YÜKLEME</h2>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-medium transition"
            >
              {stlFile ? '✓ Dosya Yüklendi' : ' STL Dosyası Yükle'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {stlFile && (
              <p className="text-xs text-gray-400 mt-2 truncate">
                {stlFile.name}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-4">🔧 REMESHING KALİTESİ</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Detay Seviyesi</span>
                <span className="text-cyan-400 font-mono">{remeshQuality}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={remeshQuality}
                onChange={(e) => setRemeshQuality(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Hızlı</span>
                <span>Dengeli</span>
                <span>Yüksek</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-4"> KABARTMA KONTROLLERİ</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Kabartma Derinliği</span>
                <span className="text-cyan-400 font-mono">{amplitude.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={amplitude}
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div className="space-y-2 mt-6">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Doku Sıklığı (Scale)</span>
                <span className="text-cyan-400 font-mono">{scale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}