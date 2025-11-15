import { motion } from 'framer-motion';

interface SystemStatusPanelProps {
  level: string;
  planetsVisible: number;
  totalWords: number;
}

export function SystemStatusPanel({ level, planetsVisible, totalWords }: SystemStatusPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-5 right-5 w-[280px] p-4 pointer-events-none"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.8), rgba(0, 217, 255, 0.1))',
        border: '2px solid hsl(var(--primary) / 0.3)',
        borderRadius: '12px',
        boxShadow: '0 0 20px rgba(0, 217, 255, 0.4)',
      }}
    >
      {/* Logo SCOPE */}
      <div className="text-2xl font-bold text-primary mb-3 tracking-widest" style={{ fontFamily: 'monospace' }}>
        SCOPE
      </div>

      {/* Status lines */}
      <div className="space-y-2 text-sm text-foreground/80 font-mono">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">LEVEL:</span>
          <span className="text-primary uppercase">{level}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">DOMAINS:</span>
          <span className="text-primary">{planetsVisible}/18</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">WORDS:</span>
          <span className="text-primary">{totalWords.toLocaleString()}</span>
        </div>
      </div>

      {/* Progress bars */}
      <div className="flex gap-2 mt-4">
        {[65, 82, 43].map((value, i) => (
          <div key={i} className="flex-1">
            <div className="h-16 bg-background/20 rounded relative overflow-hidden">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${value}%` }}
                transition={{ duration: 1, delay: i * 0.2 }}
                className="absolute bottom-0 w-full bg-primary/40"
                style={{
                  boxShadow: '0 0 10px hsl(var(--primary) / 0.6)',
                }}
              />
            </div>
            <div className="text-[10px] text-center mt-1 text-muted-foreground font-mono">
              {value}%
            </div>
          </div>
        ))}
      </div>

      {/* System status indicator */}
      <div className="flex items-center gap-2 mt-3 text-xs">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-muted-foreground font-mono">SYSTEM OPERATIONAL</span>
      </div>
    </motion.div>
  );
}
