import React, { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'

/*
  Bike model expectations:
  - We expect a glTF/GLB 3D model of the Yamaha R15 v2 with mesh parts named for paintable sections.
  - For this demo we generate a simple placeholder bike-like rig from primitives so the UX works now.
  - You can later replace <PlaceholderBike /> with a real GLB loader and map parts to materials.
*/

function Rotator({ children }) {
  const ref = useRef()
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.1
  })
  return <group ref={ref}>{children}</group>
}

function Paintable({ color, children }) {
  // Wraps children meshes and applies color to their material
  return (
    <group>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child, {
          material: new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.6 }),
        })
      })}
    </group>
  )
}

function PlaceholderBike({ colors }) {
  // colors: { body, fairing, tank, wheels, frame }
  const wheelGeom = useMemo(() => new THREE.TorusGeometry(0.6, 0.12, 16, 64), [])
  const diskGeom = useMemo(() => new THREE.CylinderGeometry(0.55, 0.55, 0.12, 32), [])
  const tankGeom = useMemo(() => new THREE.SphereGeometry(0.8, 32, 32), [])
  const seatGeom = useMemo(() => new THREE.BoxGeometry(1.2, 0.2, 0.6), [])
  const fairingGeom = useMemo(() => new THREE.CapsuleGeometry(0.5, 1.2, 8, 16), [])
  const frameGeom = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.4, 0, 0),
    new THREE.Vector3(-0.6, 0.3, 0.2),
    new THREE.Vector3(0.2, 0.2, 0),
    new THREE.Vector3(1.2, 0, 0),
  ]), 32, 0.05, 8, false), [])

  return (
    <group position={[0, 0.2, 0]}>
      {/* Frame */}
      <mesh geometry={frameGeom} material={new THREE.MeshStandardMaterial({ color: colors.frame, metalness: 0.6, roughness: 0.5 })} />

      {/* Tank */}
      <Paintable color={colors.tank}>
        <mesh geometry={tankGeom} position={[0, 0.9, 0]} />
      </Paintable>

      {/* Seat */}
      <Paintable color={colors.body}>
        <mesh geometry={seatGeom} position={[-0.3, 0.6, 0]} />
      </Paintable>

      {/* Front fairing */}
      <Paintable color={colors.fairing}>
        <mesh geometry={fairingGeom} position={[0.9, 0.7, 0]} rotation={[0, 0, Math.PI / 2]} />
      </Paintable>

      {/* Wheels */}
      <Paintable color={colors.wheels}>
        <group>
          <mesh geometry={wheelGeom} position={[-1.2, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={wheelGeom} position={[1.2, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={diskGeom} position={[-1.2, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={diskGeom} position={[1.2, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} />
        </group>
      </Paintable>

      {/* Ground shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[5, 64]} />
        <shadowMaterial opacity={0.15} />
      </mesh>
    </group>
  )
}

// Simple image palette extractor (no extra deps)
async function extractPaletteFromImage(url, maxColors = 6) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  const load = new Promise((resolve, reject) => {
    img.onload = () => resolve(null)
    img.onerror = (e) => reject(e)
  })
  img.src = url
  await load

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const targetW = 200
  const ratio = img.width ? targetW / img.width : 1
  canvas.width = Math.max(1, Math.floor(img.width * ratio))
  canvas.height = Math.max(1, Math.floor(img.height * ratio))
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const hist = new Map()
  const step = 4 // sample every pixel (RGBA stride is 4)
  for (let i = 0; i < data.length; i += step) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 200) continue // skip transparent

    // drop near-white/near-black extremes a bit less
    const maxRGB = Math.max(r, g, b)
    const minRGB = Math.min(r, g, b)
    if (maxRGB > 245 && minRGB > 230) continue // almost white

    // quantize to 5 bits per channel
    const rq = r >> 3
    const gq = g >> 3
    const bq = b >> 3
    const key = (rq << 10) | (gq << 5) | bq
    hist.set(key, (hist.get(key) || 0) + 1)
  }

  const entries = Array.from(hist.entries()).sort((a, b) => b[1] - a[1])
  const palette = []
  const distinct = (c1, c2) => {
    const dr = Math.abs(c1[0] - c2[0])
    const dg = Math.abs(c1[1] - c2[1])
    const db = Math.abs(c1[2] - c2[2])
    return Math.sqrt(dr * dr + dg * dg + db * db) > 30
  }

  for (const [key] of entries) {
    const rq = (key >> 10) & 31
    const gq = (key >> 5) & 31
    const bq = key & 31
    const r = (rq << 3) | 4
    const g = (gq << 3) | 4
    const b = (bq << 3) | 4
    const cand = [r, g, b]
    if (palette.every((p) => distinct(p, cand))) {
      palette.push(cand)
    }
    if (palette.length >= maxColors) break
  }

  if (palette.length === 0) {
    // fallback average color
    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a < 200) continue
      r += data[i]; g += data[i + 1]; b += data[i + 2]
      count++
    }
    if (count > 0) {
      palette.push([Math.round(r / count), Math.round(g / count), Math.round(b / count)])
    }
  }

  // convert to hex strings
  return palette.map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`)
}

export default function BikeViewer() {
  const [part, setPart] = useState('body')
  const [colors, setColors] = useState({
    body: '#c0c0c0',
    fairing: '#c0c0c0',
    tank: '#c0c0c0',
    wheels: '#2b2b2b',
    frame: '#808080',
  })

  const defaultPalette = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#111827', '#ffffff']
  const [palette, setPalette] = useState(defaultPalette)

  const handleColorPick = (hex) => {
    setColors((prev) => ({ ...prev, [part]: hex }))
  }

  const parts = [
    { id: 'body', name: 'Body' },
    { id: 'fairing', name: 'Fairing' },
    { id: 'tank', name: 'Tank' },
    { id: 'wheels', name: 'Wheels' },
    { id: 'frame', name: 'Frame' },
  ]

  // Image URL state for palette extraction (user's shared image)
  const [imageUrl, setImageUrl] = useState('https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fbike-images%2Fcolors%2Fyamaha%2Fyzf-r15-v20%2Fyamaha-yzf-r15-v20-sparky-green.png%3Fv%3D1&w=640&q=75')
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')

  const onExtract = async () => {
    setError('')
    setExtracting(true)
    try {
      const cols = await extractPaletteFromImage(imageUrl, 6)
      if (cols && cols.length) setPalette(cols)
    } catch (e) {
      setError('Could not extract colors from the image. Try another link or download and drop it here.')
    } finally {
      setExtracting(false)
    }
  }

  const onFileDrop = async (file) => {
    if (!file) return
    setError('')
    setExtracting(true)
    try {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      const cols = await extractPaletteFromImage(url, 6)
      if (cols && cols.length) setPalette(cols)
    } catch (e) {
      setError('Could not extract colors from the dropped image.')
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="w-full h-[90vh] flex flex-col">
      <div className="flex-1 relative">
        <Canvas shadows camera={{ position: [4, 2.5, 5], fov: 45 }}>
          <color attach="background" args={[0.97, 0.98, 1]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
          <Environment preset="city" />
          <Rotator>
            <PlaceholderBike colors={colors} />
          </Rotator>
          <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 1.9} />
        </Canvas>
      </div>

      {/* Controls */}
      <div className="w-full bg-white/80 backdrop-blur border-t border-gray-200 shadow-inner">
        <div className="max-w-5xl mx-auto p-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="text-sm text-gray-600">Select part:</div>
            <div className="flex gap-2">
              {parts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPart(p.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${part === p.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Image to palette */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-3">
            <div className="text-sm text-gray-600">Palette from image:</div>
            <div className="flex-1 flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL"
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <button
                onClick={onExtract}
                disabled={extracting}
                className={`px-3 py-2 rounded-md text-sm text-white ${extracting ? 'bg-gray-400' : 'bg-gray-900 hover:bg-black'}`}
              >
                {extracting ? 'Extracting…' : 'Extract colors'}
              </button>
            </div>
          </div>

          {/* Drop zone preview */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFileDrop(e.dataTransfer.files?.[0]) }}
            className="mb-3 border-2 border-dashed border-gray-300 rounded-md p-3 flex items-center gap-3"
          >
            <img src={imageUrl} alt="Reference" className="w-24 h-16 object-contain bg-white rounded" />
            <div className="text-xs text-gray-600">Drag & drop an image here to auto-generate a palette. Click a swatch to paint the selected part.</div>
          </div>

          {error && <div className="text-xs text-red-600 mb-2">{error}</div>}

          <div className="flex flex-wrap items-center gap-2">
            {palette.map((hex) => (
              <button
                key={hex}
                className="w-8 h-8 rounded-full border shadow-sm"
                style={{ backgroundColor: hex }}
                onClick={() => handleColorPick(hex)}
                aria-label={`Pick ${hex}`}
                title={hex}
              />
            ))}
            <label className="ml-2 text-sm text-gray-600">Custom:
              <input
                type="color"
                className="ml-2 w-10 h-8 p-0 border rounded"
                value={colors[part]}
                onChange={(e) => handleColorPick(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
