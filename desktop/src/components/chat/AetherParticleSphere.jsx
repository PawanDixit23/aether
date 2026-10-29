import React, { useEffect, useRef } from 'react';

// 3D Fibonacci Particle Sphere Visual for Aether Core
export const AetherParticleSphere = ({ isListening, isSpeaking, onClick }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = 280;
    const height = 280;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const numParticles = 240;
    const particles = [];
    const baseRadius = 88;

    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < numParticles; i++) {
      const y = 1 - (i / (numParticles - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      particles.push({ x, y, z });
    }

    let angleX = 0;
    let angleY = 0;
    let pulseTime = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      pulseTime += 0.05;
      const pulseMultiplier = isListening 
        ? 1 + 0.14 * Math.sin(pulseTime * 3.5) 
        : isSpeaking 
          ? 1 + 0.18 * Math.sin(pulseTime * 4.5) 
          : 1 + 0.03 * Math.sin(pulseTime * 1.5);

      const r = baseRadius * pulseMultiplier;
      angleX += 0.0035;
      angleY += 0.007;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const projected = particles.map(p => {
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        const fov = 320;
        const scale = fov / (fov + z2 * r);
        const screenX = width / 2 + x1 * r * scale;
        const screenY = height / 2 + y2 * r * scale;
        const alpha = Math.max(0.12, Math.min(1, (z2 + 1.2) / 2.2));

        return { screenX, screenY, scale, alpha, z: z2 };
      });

      projected.sort((a, b) => a.z - b.z);

      projected.forEach(p => {
        ctx.beginPath();
        const dotSize = Math.max(0.9, 1.8 * p.scale);
        ctx.arc(p.screenX, p.screenY, dotSize, 0, Math.PI * 2);
        
        if (isListening) {
          ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 7;
        } else if (isSpeaking) {
          ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 9;
        } else {
          ctx.fillStyle = `rgba(240, 246, 255, ${p.alpha * 0.95})`;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
          ctx.shadowBlur = 3;
        }
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isListening, isSpeaking]);

  return (
    <div 
      onClick={onClick}
      className="jarvis-sphere-container"
      style={{ position: 'relative', width: '280px', height: '280px', margin: '0 auto', cursor: 'pointer' }}
      title="Tap to speak with Aether / माइक शुरू करें"
    >
      {isListening && <div className="jarvis-listening-pulse" />}
      <canvas ref={canvasRef} style={{ width: '280px', height: '280px' }} />
    </div>
  );
};

export default AetherParticleSphere;
