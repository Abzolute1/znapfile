import { motion } from 'framer-motion'

const FloatingOrbs = () => {
  const orbs = [
    { size: 300, x: '10%', y: '20%', duration: 20, delay: 0 },
    { size: 200, x: '80%', y: '60%', duration: 25, delay: 5 },
    { size: 250, x: '50%', y: '80%', duration: 30, delay: 10 },
    { size: 180, x: '20%', y: '70%', duration: 22, delay: 15 },
    { size: 220, x: '70%', y: '30%', duration: 28, delay: 8 },
  ]

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {orbs.map((orb, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full filter blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)`,
            left: orb.x,
            top: orb.y,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      
      {/* Extra subtle gradient overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.03) 0%, transparent 60%)
          `
        }}
      />
    </div>
  )
}

export default FloatingOrbs