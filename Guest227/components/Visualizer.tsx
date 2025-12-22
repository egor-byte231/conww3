
import React, { useEffect, useRef } from 'react';

export const Visualizer: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    let animationId: number;

    const bars = 30; // Зменшено кількість для швидкості
    const barWidth = 6;
    const spacing = 2;
    const data = new Float32Array(bars).fill(10);

    const render = () => {
      // Малюємо чорний фон замість clearRect для швидкості (alpha: false)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#1DB954';

      for (let i = 0; i < bars; i++) {
        // Оптимізована логіка руху барів
        const target = 10 + Math.random() * 40;
        data[i] += (target - data[i]) * 0.2;
        
        const h = data[i];
        const x = i * (barWidth + spacing);
        const y = canvas.height - h;
        
        ctx.fillRect(x, y | 0, barWidth, h | 0);
      }
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={240} 
      height={60} 
      className="opacity-60 pointer-events-none rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
