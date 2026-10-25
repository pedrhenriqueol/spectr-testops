/** Shared interaction timing: quick controls, softer layout changes. */
export const easeOut = [0.22, 1, 0.36, 1] as const;
export const springSoft = { type: 'spring' as const, stiffness: 350, damping: 30, mass: 0.8 };
export const fadeTransition = { duration: 0.2, ease: easeOut };
export const layoutSpring = { type: 'spring' as const, stiffness: 280, damping: 32, mass: 0.9 };
