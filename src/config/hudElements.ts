/**
 * Configurações dos elementos HUD (Heads-Up Display)
 */

export const HUD_CONFIG = {
  scannerHUD: {
    position: { top: 20, left: 20 },
    size: { width: 200, height: 200 },
    updateInterval: 1000, // ms
  },
  
  systemStatus: {
    position: { top: 20, right: 20 },
    size: { width: 280, height: 150 },
  },
  
  timeline: {
    position: { bottom: 20 },
    size: { width: 600, height: 80 },
  },
  
  sideIcons: {
    position: { left: 20 },
    iconSize: 60,
    gap: 12,
  },
} as const;

export const ANIMATION_CONFIG = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 },
  },
  
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4 },
  },
  
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4 },
  },
  
  slideInBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  },
} as const;
