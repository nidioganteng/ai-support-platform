'use client';

import Spline from '@splinetool/react-spline';
import { useState, useRef, useEffect } from 'react';

export function SplineScene() {
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = () => setReady(true);
    window.addEventListener('mousemove', trigger, { once: true });
    window.addEventListener('touchstart', trigger, { once: true });
    return () => {
      window.removeEventListener('mousemove', trigger);
      window.removeEventListener('touchstart', trigger);
    };
  }, []);

  // Forward window mousemove to Spline canvas for robot tracking
  useEffect(() => {
    if (!loaded) return;
    const handler = (e: MouseEvent) => {
      const canvas = canvasRef.current?.querySelector('canvas');
      if (!canvas) return;
      canvas.dispatchEvent(new MouseEvent('mousemove', {
        clientX: e.clientX,
        clientY: e.clientY,
        bubbles: true,
        cancelable: true,
      }));
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [loaded]);

  return (
    <div className="relative h-full w-full" style={{ background: '#c8c8c8', pointerEvents: 'none' }}>
      {ready && (
        <div
          ref={canvasRef}
          className="absolute inset-0"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.8s ease' }}
        >
          <Spline
            scene="https://prod.spline.design/x38TB1rj38saEdKj/scene.splinecode"
            onLoad={() => setLoaded(true)}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}
    </div>
  );
}
