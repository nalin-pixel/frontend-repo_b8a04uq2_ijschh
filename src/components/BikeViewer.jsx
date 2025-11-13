import React, { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Html } from '@react-three/drei'
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

export default function BikeViewer() {
  const [part, setPart] = useState('body')
  const [colors, setColors] = useState({
    body: '#c0c0c0',
    fairing: '#c0c0c0',
    tank: '#c0c0c0',
    wheels: '#2b2b2b',
    frame: '#808080',
  })

  const presetPalette = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#111827', '#ffffff']

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

          <div className="flex flex-wrap items-center gap-2">
            {presetPalette.map((hex) => (
              <button
                key={hex}
                className="w-8 h-8 rounded-full border shadow-sm"
                style={{ backgroundColor: hex }}
                onClick={() => handleColorPick(hex)}
                aria-label={`Pick ${hex}`}
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
