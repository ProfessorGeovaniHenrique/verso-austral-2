import { useState } from 'react';
import Draggable from 'react-draggable';
import { Dock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingControlPanelProps {
  position: { x: number; y: number };
  size: { width: number; height: number };
  onDock: () => void;
  onPositionChange: (pos: { x: number; y: number }) => void;
  children: React.ReactNode;
}

export const FloatingControlPanel = ({ 
  position, 
  size, 
  onDock,
  onPositionChange,
  children 
}: FloatingControlPanelProps) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Draggable
      handle=".drag-handle"
      position={position}
      onStart={() => setIsDragging(true)}
      onStop={(e, data) => {
        setIsDragging(false);
        onPositionChange({ x: data.x, y: data.y });
      }}
    >
      <div 
        className="fixed z-[9999]"
        style={{ 
          width: size.width, 
          height: size.height,
          pointerEvents: 'auto'
        }}
      >
        <div 
          className="rounded-2xl border-2 backdrop-blur-xl h-full flex flex-col overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.98), rgba(27, 94, 32, 0.9))',
            borderColor: 'hsl(var(--primary))',
            boxShadow: '0 0 50px hsl(var(--primary) / 0.5), inset 0 0 30px hsl(var(--primary) / 0.15)'
          }}
        >
          {/* Header com drag handle */}
          <div 
            className="drag-handle cursor-move p-4 border-b relative"
            style={{ borderColor: 'hsl(var(--primary) / 0.3)' }}
          >
            {/* Corner indicators */}
            <div 
              className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 animate-pulse" 
              style={{ borderColor: 'hsl(var(--primary))' }}
            />
            <div 
              className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 animate-pulse" 
              style={{ borderColor: 'hsl(var(--primary))' }}
            />
            <div 
              className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 animate-pulse" 
              style={{ borderColor: 'hsl(var(--primary))' }}
            />
            <div 
              className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 animate-pulse" 
              style={{ borderColor: 'hsl(var(--primary))' }}
            />
            
            <div className="flex items-center justify-between relative z-10">
              <h2 className="text-primary font-mono text-lg font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                CONSOLE FLUTUANTE
              </h2>
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={onDock}
                  className="text-primary hover:bg-primary/20"
                >
                  <Dock className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={onDock}
                  className="text-primary hover:bg-primary/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Conteúdo */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </Draggable>
  );
};
