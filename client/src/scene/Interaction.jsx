import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FACES, UNIT } from '../config/layout';
import { useStore } from '../store';
import { refs } from './refs';

export default function Interaction() {
  const { camera, gl } = useThree();
  const rc = useMemo(() => { const r = new THREE.Raycaster(); r.far = 3.4; return r; }, []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  // what is the crosshair pointing at? + which section are we in?
  useFrame(() => {
    const s = useStore.getState();
    if (document.pointerLockElement !== gl.domElement) {
      if (s.hoveredId !== null) s.setHovered(null);
      return;
    }
    rc.setFromCamera(center, camera);
    const hits = rc.intersectObjects([refs.books, refs.frames].filter(Boolean), true);
    const id = hits.length ? hits[0].object.userData.bookId ?? null : null; // shelf frames block books behind them
    if (id !== s.hoveredId) s.setHovered(id);

    camera.getWorldDirection(look);
    const { x, z } = camera.position;
    let best = null, bestScore = -Infinity;
    for (const f of FACES) {
      const dx = f.ux + f.dir * 0.4 - x;
      if (Math.abs(dx) > 3.4 || z < f.uz - UNIT.length / 2 - 1 || z > f.uz + UNIT.length / 2 + 1) continue;
      const score = Math.sign(dx) * look.x * 2 - Math.abs(dx) * 0.4;
      if (score > bestScore) { bestScore = score; best = f.section; }
    }
    if (best !== s.section) s.setSection(best);
  });

  useEffect(() => {
    const el = gl.domElement;
    const onClick = () => {
      const s = useStore.getState();
      if (document.pointerLockElement === el) {
        if (s.hoveredId) { s.select(s.hoveredId); document.exitPointerLock(); }
      } else if (s.panel !== 'login') {
        if (s.selectedId) s.select(null);
        if (s.panel) s.closePanel();
        el.requestPointerLock();
      }
    };
    const onKey = (e) => {
      const s = useStore.getState();
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'KeyP' && s.panel !== 'login') s.openPanel(s.panel === 'profile' ? null : s.user ? 'profile' : 'login');
      if (e.code === 'KeyE' && document.pointerLockElement === el && s.hoveredId) { s.select(s.hoveredId); document.exitPointerLock(); }
      if (e.code === 'Escape' && document.pointerLockElement !== el) { s.select(null); if (s.panel !== 'login') s.closePanel(); }
    };
    el.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => { el.removeEventListener('click', onClick); window.removeEventListener('keydown', onKey); };
  }, [gl]);

  return null;
}
