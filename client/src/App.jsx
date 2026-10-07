import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Room from './scene/Room';
import Shelves from './scene/Shelves';
import Player from './scene/Player';
import Interaction from './scene/Interaction';
import Hud from './ui/Hud';
import BookCard from './ui/BookCard';
import ProfilePanel from './ui/ProfilePanel';
import LoginPanel from './ui/LoginPanel';
import { useStore } from './store';

export default function App() {
  const restore = useStore((s) => s.restore);
  useEffect(() => { restore(); }, [restore]);
  return (
    <>
      <div id="stage">
        <Canvas flat dpr={[1, 1.75]} camera={{ fov: 70, near: 0.05, far: 80, position: [0, 1.65, 9] }}>
          <color attach="background" args={['#e9e7e2']} />
          <Room />
          <Shelves />
          <Player />
          <Interaction />
        </Canvas>
      </div>
      <Hud />
      <BookCard />
      <ProfilePanel />
      <LoginPanel />
    </>
  );
}
