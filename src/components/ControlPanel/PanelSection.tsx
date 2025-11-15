import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PanelSectionProps {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle?: () => void;
  hideToggle?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const PanelSection = ({ 
  title, 
  icon, 
  isOpen, 
  onToggle, 
  hideToggle = false,
  className,
  children 
}: PanelSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`border border-primary/30 rounded-lg bg-black/30 backdrop-blur-sm overflow-hidden ${className || ''}`}
    >
      {/* Header */}
      {!hideToggle && (
        <button
          onClick={onToggle}
          className="w-full p-3 border-b border-primary/20 flex items-center justify-between hover:bg-primary/10 transition-colors"
        >
          <span className="text-primary font-mono text-sm font-bold flex items-center gap-2">
            <span className="text-base">{icon}</span>
            {title}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
        </button>
      )}
      
      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
