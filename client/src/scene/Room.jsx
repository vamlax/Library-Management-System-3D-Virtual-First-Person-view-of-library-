import { useMemo } from 'react';
import * as THREE from 'three';
import { ROOM } from '../config/layout';
import { signTexture, tileTexture } from './textures';

const W = ROOM.maxX - ROOM.minX;
const D = ROOM.maxZ - ROOM.minZ;
const CZ = (ROOM.maxZ + ROOM.minZ) / 2;
const H = ROOM.height;

const wall = new THREE.MeshStandardMaterial({ color: '#ece9e4', roughness: 0.95 });
const wood = new THREE.MeshStandardMaterial({ color: '#d9b27c', roughness: 0.65 });
const white = new THREE.MeshStandardMaterial({ color: '#f4f3f0', roughness: 0.5 });

function Chair({ position, rotY }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.45, 0]} material={white}><boxGeometry args={[0.46, 0.05, 0.46]} /></mesh>
      <mesh position={[0, 0.72, 0.21]} material={white}><boxGeometry args={[0.46, 0.5, 0.04]} /></mesh>
      {[[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} material={wood}><boxGeometry args={[0.04, 0.44, 0.04]} /></mesh>
      ))}
    </group>
  );
}

export default function Room() {
  const floorTex = useMemo(() => { const t = tileTexture('#a8a6a1', '#96938d'); t.repeat.set(W / 1.2, D / 1.2); return t; }, []);
  const ceilTex = useMemo(() => { const t = tileTexture('#efede8', '#d9d5cc'); t.repeat.set(W / 0.6, D / 0.6); return t; }, []);
  const welcome = useMemo(() => signTexture([
    { t: 'CENTRAL LIBRARY', size: 120, weight: 700 },
    { t: 'Walk the aisles · click a book to open it', size: 48, weight: 400, color: '#6e6e73' },
  ], { w: 1536, h: 360 }), []);

  const panels = [];
  for (const x of [-12, -7.5, -2.5, 2.5, 7.5, 12]) for (const z of [-11, -5, 1, 7]) panels.push([x, z]);
  const lights = [];
  for (const x of [-7.5, -2.5, 2.5, 7.5]) for (const z of [-6, 3]) lights.push([x, 2.7, z]); // 8 lights (was 12): fewer = smoother on laptops

  return (
    <group>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#ffffff', '#cfc8bc', 0.6]} />
      <directionalLight position={[4, 10, 6]} intensity={0.45} />
      {lights.map((p, i) => <pointLight key={i} position={p} intensity={5} distance={14} decay={1.5} color="#fff3de" />)}
      <pointLight position={[0, 2, -12]} intensity={10} distance={12} decay={1.5} color="#dcebff" />

      {/* floor + ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, CZ]}><planeGeometry args={[W, D]} /><meshStandardMaterial map={floorTex} roughness={0.85} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, CZ]}><planeGeometry args={[W, D]} /><meshStandardMaterial map={ceilTex} roughness={1} /></mesh>

      {/* walls */}
      <mesh position={[0, H / 2, ROOM.minZ]} material={wall}><planeGeometry args={[W, H]} /></mesh>
      <mesh position={[0, H / 2, ROOM.maxZ]} rotation={[0, Math.PI, 0]} material={wall}><planeGeometry args={[W, H]} /></mesh>
      <mesh position={[ROOM.minX, H / 2, CZ]} rotation={[0, Math.PI / 2, 0]} material={wall}><planeGeometry args={[D, H]} /></mesh>
      <mesh position={[ROOM.maxX, H / 2, CZ]} rotation={[0, -Math.PI / 2, 0]} material={wall}><planeGeometry args={[D, H]} /></mesh>
      <mesh position={[0, 2.5, ROOM.maxZ - 0.02]} rotation={[0, Math.PI, 0]}><planeGeometry args={[6, 1.4]} /><meshBasicMaterial map={welcome} /></mesh>

      {/* ceiling light panels */}
      {panels.map(([x, z], i) => (
        <mesh key={i} position={[x, H - 0.03, z]}><boxGeometry args={[1.3, 0.05, 0.6]} /><meshBasicMaterial color="#ffffff" /></mesh>
      ))}

      {/* big window on the far wall */}
      <mesh position={[0, 2.0, ROOM.minZ + 0.03]}><planeGeometry args={[10, 2.4]} /><meshBasicMaterial color="#d3e8ff" /></mesh>
      {[-5, -2.5, 0, 2.5, 5].map((x) => <mesh key={x} position={[x, 2.0, ROOM.minZ + 0.05]} material={white}><boxGeometry args={[0.06, 2.4, 0.04]} /></mesh>)}
      <mesh position={[0, 3.2, ROOM.minZ + 0.05]} material={white}><boxGeometry args={[10.1, 0.06, 0.04]} /></mesh>
      <mesh position={[0, 0.8, ROOM.minZ + 0.1]} material={white}><boxGeometry args={[10.1, 0.06, 0.2]} /></mesh>

      {/* reading table + chairs by the window */}
      <mesh position={[0, 0.72, -12]} material={white}><cylinderGeometry args={[0.55, 0.55, 0.04, 40]} /></mesh>
      <mesh position={[0, 0.36, -12]} material={wood}><cylinderGeometry args={[0.05, 0.05, 0.7, 12]} /></mesh>
      <mesh position={[0, 0.02, -12]} material={wood}><cylinderGeometry args={[0.32, 0.32, 0.04, 24]} /></mesh>
      <Chair position={[0.95, 0, -12]} rotY={Math.PI / 2} />
      <Chair position={[-0.95, 0, -12]} rotY={-Math.PI / 2} />

      {/* reception desk */}
      <mesh position={[8.5, 0.5, 9.5]} material={wood}><boxGeometry args={[3, 1, 0.8]} /></mesh>
      <mesh position={[8.5, 1.03, 9.5]} material={white}><boxGeometry args={[3.2, 0.06, 1]} /></mesh>
    </group>
  );
}
