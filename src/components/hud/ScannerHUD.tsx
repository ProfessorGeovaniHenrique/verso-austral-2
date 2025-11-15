import { motion } from 'framer-motion';

interface ScannerHUDProps {
  scanPercentage: number;
  totalProbes?: number;
  scannedProbes?: number;
}

export function ScannerHUD({ scanPercentage, totalProbes = 0, scannedProbes = 0 }: ScannerHUDProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-5 left-5 w-[200px] h-[200px] pointer-events-none"
      style={{
        background: 'radial-gradient(circle, rgba(0, 217, 255, 0.1) 0%, rgba(10, 14, 39, 0.8) 70%)',
        border: '2px solid hsl(var(--primary) / 0.3)',
        borderRadius: '12px',
        boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
      }}
    >
      {/* Círculos concêntricos */}
      <svg className="w-full h-full" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Círculos de fundo */}
        {[60, 75, 90].map((radius, i) => (
          <circle
            key={i}
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="url(#scanGradient)"
            strokeWidth="1"
            opacity={0.3 - i * 0.1}
          />
        ))}

        {/* Chevrons rotativos */}
        <g className="animate-spin" style={{ transformOrigin: '100px 100px' }}>
          {[0, 120, 240].map((angle, i) => (
            <path
              key={i}
              d={`M ${100 + Math.cos((angle * Math.PI) / 180) * 50} ${
                100 + Math.sin((angle * Math.PI) / 180) * 50
              } L ${100 + Math.cos((angle * Math.PI) / 180) * 70} ${
                100 + Math.sin((angle * Math.PI) / 180) * 70
              }`}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />
          ))}
        </g>

        {/* Indicadores de status */}
        {[45, 135, 225, 315].map((angle, i) => (
          <circle
            key={i}
            cx={100 + Math.cos((angle * Math.PI) / 180) * 85}
            cy={100 + Math.sin((angle * Math.PI) / 180) * 85}
            r="4"
            fill="hsl(var(--primary))"
            className="animate-pulse"
            style={{
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </svg>

      {/* Texto de porcentagem */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-primary font-mono">
          {Math.round(scanPercentage)}%
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {scannedProbes}/{totalProbes} SCANNED
        </div>
      </div>

      {/* Códigos binários */}
      <div className="absolute bottom-2 left-2 right-2 text-[8px] text-primary/40 font-mono overflow-hidden">
        10101101 11001010
      </div>
    </motion.div>
  );
}
