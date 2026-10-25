import React, { useEffect, useRef } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';

interface MotionMenuSurfaceProps {
  id?: string;
  className: string;
  children: React.ReactNode;
}

/** Exiting popovers stay visible briefly, but stop accepting focus and clicks immediately. */
export function MotionMenuSurface({ id, className, children }: MotionMenuSurfaceProps) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    surfaceRef.current?.toggleAttribute('inert', !present);
  }, [present]);

  return (
    <motion.div
      ref={surfaceRef}
      id={id}
      aria-hidden={!present || undefined}
      initial={reduced ? false : { opacity: 0, y: -5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: 'top right', pointerEvents: present ? 'auto' : 'none' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
