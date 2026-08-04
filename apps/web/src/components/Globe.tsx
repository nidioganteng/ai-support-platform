'use client';

import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

export function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    let rafId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.8,
      mapSamples: 20000,
      mapBrightness: 5,
      baseColor: [0.12, 0.08, 0.22],
      markerColor: [0.545, 0.361, 0.965],
      glowColor: [0.42, 0.2, 0.9],
      markers: [
        { location: [37.7595, -122.4367], size: 0.04 },
        { location: [40.7128, -74.006], size: 0.04 },
        { location: [51.5074, -0.1278], size: 0.03 },
        { location: [35.6762, 139.6503], size: 0.04 },
        { location: [-33.8688, 151.2093], size: 0.03 },
        { location: [48.8566, 2.3522], size: 0.03 },
        { location: [1.3521, 103.8198], size: 0.03 },
        { location: [-6.2088, 106.8456], size: 0.03 },
      ],
    });

    function animate() {
      phi += 0.004;
      globe.update({ phi });
      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 600, height: 600 }}
      className="animate-fade-in opacity-90"
    />
  );
}
