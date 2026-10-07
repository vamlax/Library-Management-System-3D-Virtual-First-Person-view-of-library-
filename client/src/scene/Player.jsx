import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { COLLIDERS, ROOM } from '../config/layout';
import { useStore } from '../store';

const R = 0.35; // player radius
const blocked = (x, z) =>
  x < ROOM.minX + R || x > ROOM.maxX - R || z < ROOM.minZ + R || z > ROOM.maxZ - R ||
  COLLIDERS.some((c) => x > c.minX - R && x < c.maxX + R && z > c.minZ - R && z < c.maxZ + R);

export default function Player() {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const UP = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useEffect(() => {
    camera.position.set(2.5, 1.65, 9); // spawn in an aisle so the window is visible down the aisle
    camera.rotation.set(0, 0, 0);
    const dn = (e) => { if (e.target.tagName !== 'INPUT') keys.current[e.code] = true; };
    const up = (e) => { keys.current[e.code] = false; };
    const blur = () => { keys.current = {}; };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [camera]);

  useFrame((_, dt) => {
    if (!useStore.getState().locked) return;
    const k = keys.current;
    const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    if (!f && !s) return;
    camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();
    right.crossVectors(fwd, UP);
    const step = (k.ShiftLeft || k.ShiftRight ? 6.5 : 3.8) * Math.min(dt, 0.05);
    const mv = fwd.multiplyScalar(f).add(right.multiplyScalar(s));
    if (mv.lengthSq() === 0) return;
    mv.normalize().multiplyScalar(step);
    const p = camera.position;
    if (!blocked(p.x + mv.x, p.z)) p.x += mv.x; // axis-by-axis = slide along walls/shelves
    if (!blocked(p.x, p.z + mv.z)) p.z += mv.z;
  });

  // selector points at nothing: we handle lock-on-click ourselves (see Interaction.jsx)
  return (
    <PointerLockControls
      domElement={gl.domElement}
      selector="#__none__"
      onLock={() => useStore.getState().setLocked(true)}
      onUnlock={() => useStore.getState().setLocked(false)}
    />
  );
}
