import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function TicketQRCode({ value, size = 130, darkMode }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(
      canvasRef.current,
      String(value).toUpperCase(),
      {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      },
      (error) => {
        if (error) console.error('QR rendering error:', error);
      }
    );
  }, [value, size]);

  return (
    <div className={`p-2 rounded-xl border flex flex-col items-center justify-center ${
      darkMode ? 'bg-white text-black border-zinc-700' : 'bg-white text-black border-zinc-300'
    }`}>
      <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
      <span className="text-[9px] font-mono tracking-[0.3em] font-black text-black mt-1">
        {value}
      </span>
    </div>
  );
}
