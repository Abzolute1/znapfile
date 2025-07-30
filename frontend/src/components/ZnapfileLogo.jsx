import { motion } from 'framer-motion'

const ZnapfileLogo = ({ className = "", onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`flex items-center gap-2 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Logo SVG */}
      <motion.svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.3 }}
      >
        {/* Background gradient circle */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Outer ring with magical glow */}
        <motion.circle
          cx="18"
          cy="18"
          r="16"
          stroke="url(#logoGradient)"
          strokeWidth="2"
          fill="none"
          filter="url(#glow)"
          animate={{
            strokeDasharray: ["0 100", "100 0"],
            rotate: [0, 360]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Lightning bolt / Snap effect */}
        <motion.path
          d="M21 8L15 18H21L15 28"
          stroke="url(#logoGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          animate={{
            pathLength: [0, 1, 1, 0],
            opacity: [0, 1, 1, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            times: [0, 0.2, 0.8, 1]
          }}
        />
        
        {/* File icon base */}
        <motion.g
          animate={{
            y: [0, -1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <path
            d="M10 24V12C10 11.4477 10.4477 11 11 11H19L23 15V24C23 24.5523 22.5523 25 22 25H11C10.4477 25 10 24.5523 10 24Z"
            fill="rgba(59, 130, 246, 0.1)"
            stroke="url(#logoGradient)"
            strokeWidth="1.5"
          />
          <path
            d="M19 11V15H23"
            stroke="url(#logoGradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
        
        {/* Sparkle effects */}
        <motion.circle
          cx="8"
          cy="8"
          r="1"
          fill="#3B82F6"
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: 0
          }}
        />
        <motion.circle
          cx="28"
          cy="28"
          r="1"
          fill="#06B6D4"
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: 1.5
          }}
        />
      </motion.svg>
      
      {/* Text logo */}
      <motion.h1 
        className="text-xl font-bold"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          znapfile
        </span>
      </motion.h1>
      
      {/* Magical particles */}
      <div className="absolute -inset-2">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            initial={{ 
              x: Math.random() * 40 - 20, 
              y: Math.random() * 40 - 20,
              scale: 0
            }}
            animate={{
              x: Math.random() * 60 - 30,
              y: Math.random() * 60 - 30,
              scale: [0, 1, 0],
              opacity: [0, 0.8, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeOut"
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default ZnapfileLogo