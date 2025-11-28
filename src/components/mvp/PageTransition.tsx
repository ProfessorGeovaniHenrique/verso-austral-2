import { motion, AnimatePresence } from "framer-motion";
import { Microscope } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface PageTransitionProps {
  isTransitioning: boolean;
  onComplete: () => void;
}

export function PageTransition({ isTransitioning, onComplete }: PageTransitionProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isTransitioning) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + 5;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [isTransitioning, onComplete]);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          className="fixed inset-0 z-50 bg-background flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4 max-w-md px-4"
          >
            <Microscope className="h-16 w-16 text-primary mx-auto animate-pulse" />
            <p className="text-xl font-medium">Preparando análise científica...</p>
            <Progress value={progress} className="w-64 mx-auto" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
