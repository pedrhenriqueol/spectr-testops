import React from 'react';
import { motion } from 'framer-motion';

interface SpectrLogoProps {
  className?: string;
  showVersion?: boolean;
}

export const SpectrLogo: React.FC<SpectrLogoProps> = ({ 
  className = '',
  showVersion = true 
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Ícone Vetorial: Prisma de Espectro com Frequência Dinâmica */}
      <motion.div 
        whileHover={{ scale: 1.06, rotate: 3 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-7 h-7 flex items-center justify-center cursor-pointer shrink-0"
      >
        <svg 
          viewBox="0 0 32 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-7 h-7 drop-shadow-[0_2px_8px_rgba(255,108,55,0.35)]"
        >
          <defs>
            {/* Gradiente Primário Espectro Laranja Postman */}
            <linearGradient id="spectrPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF8754" />
              <stop offset="50%" stopColor="#FF6C37" />
              <stop offset="100%" stopColor="#E05A2B" />
            </linearGradient>

            {/* Gradiente Secundário de Refração do Prisma */}
            <linearGradient id="spectrRefractionGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFA67E" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FF4B1F" stopOpacity="0.9" />
            </linearGradient>

            {/* Gradiente do Pulso de Telemetria */}
            <linearGradient id="spectrWaveGrad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#FFF3EE" />
              <stop offset="100%" stopColor="#FFE0D2" />
            </linearGradient>
          </defs>

          {/* Faceta Tridimensional do Prisma (Base Superior) */}
          <path
            d="M 16 3 L 28 9.5 L 16 16 L 4 9.5 Z"
            fill="url(#spectrRefractionGrad)"
            opacity="0.9"
          />

          {/* Faceta Esquerda do Prisma */}
          <path
            d="M 4 9.5 L 16 16 L 16 29 L 4 22.5 Z"
            fill="url(#spectrPrimaryGrad)"
          />

          {/* Faceta Direita do Prisma */}
          <path
            d="M 16 16 L 28 9.5 L 28 22.5 L 16 29 Z"
            fill="url(#spectrPrimaryGrad)"
            opacity="0.85"
          />

          {/* Onda Dinâmica de Telemetria / Frequência de TestOps */}
          <path
            d="M 7 15 L 11 11.5 L 14.5 18 L 18.5 8 L 22 15 L 25 12"
            stroke="url(#spectrWaveGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Core Emitter: Ponto Central de Luz */}
          <circle cx="18.5" cy="8" r="1.5" fill="#FFFFFF" />
        </svg>
      </motion.div>

      {/* Tipografia Corporativa Integrada */}
      <div className="flex items-center gap-1.5 leading-none">
        <span className="font-extrabold text-[14px] tracking-tight text-pm-light-text dark:text-pm-dark-text font-sans">
          SPECTR
        </span>
        <span className="font-mono text-[11px] font-semibold text-pm-orange tracking-normal">
          TestOps
        </span>

        {showVersion && (
          <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-wide uppercase bg-pm-orange/10 dark:bg-pm-orange/15 text-pm-orange border border-pm-orange/30">
            v2.4
          </span>
        )}
      </div>
    </div>
  );
};
