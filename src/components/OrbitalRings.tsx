import { useEffect, useState } from 'react';

interface OrbitalRingsProps {
  level: 'universe' | 'galaxy' | 'stellar';
  isPaused: boolean;
  containerWidth: number;
  containerHeight: number;
}

export const OrbitalRings = ({ level, isPaused, containerWidth, containerHeight }: OrbitalRingsProps) => {
  const [rotation, setRotation] = useState(0);
  
  // Slow rotation animation
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setRotation(prev => (prev + 0.1) % 360);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isPaused]);
  
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  
  // Define orbits based on level (proportional to container size)
  const getOrbits = () => {
    const baseRadius = Math.min(containerWidth, containerHeight) * 0.12; // Base 12% do menor lado
    
    switch (level) {
      case 'universe':
        return [
          { radius: baseRadius * 1.0, speed: 1, dashArray: '10 5' },    // Órbita interna
          { radius: baseRadius * 1.67, speed: 0.7, dashArray: '12 6' }, // Órbita média
          { radius: baseRadius * 2.33, speed: 0.5, dashArray: '15 8' }  // Órbita externa
        ];
      case 'stellar':
        return [
          { radius: baseRadius * 1.25, speed: 1.2, dashArray: '8 4' },  // Órbita interna
          { radius: baseRadius * 2.08, speed: 0.8, dashArray: '10 5' }  // Órbita externa
        ];
      default:
        return [];
    }
  };
  
  const orbits = getOrbits();
  
  if (orbits.length === 0) return null;
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{
        width: containerWidth,
        height: containerHeight,
        zIndex: 1
      }}
    >
      <defs>
        {/* Radial gradient for orbit fade effect */}
        <radialGradient id="orbitGradient">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.2" />
        </radialGradient>
        
        {/* Glow filter */}
        <filter id="orbitGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Render each orbit */}
      {orbits.map((orbit, index) => (
        <g key={index}>
          {/* Main orbit circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={orbit.radius}
            fill="none"
            stroke="#00E5FF"
            strokeWidth="2"
            strokeDasharray={orbit.dashArray}
            strokeOpacity="0.4"
            filter="url(#orbitGlow)"
            style={{
              transform: `rotate(${rotation * orbit.speed}deg)`,
              transformOrigin: `${centerX}px ${centerY}px`,
              transition: isPaused ? 'none' : 'transform 0.05s linear'
            }}
          />
          
          {/* Subtle inner shadow for depth */}
          <circle
            cx={centerX}
            cy={centerY}
            r={orbit.radius - 1}
            fill="none"
            stroke="#00E5FF"
            strokeWidth="1"
            strokeDasharray={orbit.dashArray}
            strokeOpacity="0.15"
            style={{
              transform: `rotate(${-rotation * orbit.speed * 0.5}deg)`,
              transformOrigin: `${centerX}px ${centerY}px`,
              transition: isPaused ? 'none' : 'transform 0.05s linear'
            }}
          />
          
          {/* Orbit markers (small dots at cardinal points) */}
          {[0, 90, 180, 270].map((angle) => {
            const rad = (angle + rotation * orbit.speed) * (Math.PI / 180);
            const x = centerX + orbit.radius * Math.cos(rad);
            const y = centerY + orbit.radius * Math.sin(rad);
            
            return (
              <circle
                key={angle}
                cx={x}
                cy={y}
                r="3"
                fill="#00E5FF"
                opacity="0.6"
                filter="url(#orbitGlow)"
              >
                <animate
                  attributeName="opacity"
                  values="0.4;0.8;0.4"
                  dur="2s"
                  repeatCount="indefinite"
                  begin={`${angle / 90}s`}
                />
              </circle>
            );
          })}
        </g>
      ))}
      
      {/* Center indicator for stellar level */}
      {level === 'stellar' && (
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r="8"
            fill="#FFD700"
            opacity="0.3"
            filter="url(#orbitGlow)"
          >
            <animate
              attributeName="r"
              values="8;12;8"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx={centerX}
            cy={centerY}
            r="4"
            fill="#FFD700"
            opacity="0.8"
          />
        </g>
      )}
    </svg>
  );
};
