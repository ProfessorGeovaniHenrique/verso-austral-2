import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  isLowPerformance: boolean;
}

interface UsePerformanceMonitorOptions {
  lowFpsThreshold?: number;
  sampleSize?: number;
  onLowPerformance?: () => void;
}

/**
 * Hook para monitorar performance em tempo real
 * 
 * Detecta automaticamente dispositivos de baixa performance
 * baseado em FPS e tempo de renderização
 * 
 * @example
 * const { fps, isLowPerformance } = usePerformanceMonitor({
 *   lowFpsThreshold: 30,
 *   onLowPerformance: () => toast.info('Modo de baixa performance ativado')
 * });
 */
export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const {
    lowFpsThreshold = 30,
    sampleSize = 60, // Samples ao longo de 1 segundo
    onLowPerformance
  } = options;
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    isLowPerformance: false
  });
  
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const lowPerformanceTriggeredRef = useRef(false);
  
  useEffect(() => {
    let rafId: number;
    
    const measureFrame = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;
      
      // Adicionar medição
      frameTimesRef.current.push(deltaTime);
      
      // Manter apenas últimas N medições
      if (frameTimesRef.current.length > sampleSize) {
        frameTimesRef.current.shift();
      }
      
      // Calcular métricas se tiver amostras suficientes
      if (frameTimesRef.current.length >= sampleSize) {
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const fps = 1000 / avgFrameTime;
        const isLowPerf = fps < lowFpsThreshold;
        
        setMetrics({
          fps: Math.round(fps),
          frameTime: Math.round(avgFrameTime * 100) / 100,
          isLowPerformance: isLowPerf
        });
        
        // Trigger callback apenas uma vez
        if (isLowPerf && !lowPerformanceTriggeredRef.current && onLowPerformance) {
          lowPerformanceTriggeredRef.current = true;
          onLowPerformance();
        }
      }
      
      rafId = requestAnimationFrame(measureFrame);
    };
    
    rafId = requestAnimationFrame(measureFrame);
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [lowFpsThreshold, sampleSize, onLowPerformance]);
  
  return metrics;
}

/**
 * Mede o tempo de execução de uma função
 */
export function measureExecutionTime<T>(
  fn: () => T,
  label: string = 'Execution'
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
  
  return result;
}

/**
 * Hook para debounce de valores (útil para throttling)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Hook para throttle de funções
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRunRef.current >= delay) {
      lastRunRef.current = now;
      fn(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        fn(...args);
      }, delay - (now - lastRunRef.current));
    }
  }) as T;
}
