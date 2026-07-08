import React from 'react';

export default function TrekigoLogo({ 
  size = 48, 
  showText = false, 
  className = ''
}) {
  return (
    <div 
      style={{ width: size, height: size }} 
      className={`flex items-center justify-center shrink-0 overflow-hidden rounded-xl ${className}`}
    >
      <img 
        src="/trekigo.jpeg" 
        alt="Trekigo Logo" 
        style={{ 
          width: size, 
          height: size, 
          transform: 'scale(1.18)',
          transformOrigin: 'center'
        }} 
        className="object-contain"
      />
    </div>
  );
}
