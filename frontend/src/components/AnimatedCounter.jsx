import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'

const AnimatedCounter = ({ value, duration = 2000, prefix = '', suffix = '', decimals = 0 }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const [hasAnimated, setHasAnimated] = useState(false)
  
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })
  
  const display = useTransform(spring, (current) => {
    if (decimals > 0) {
      return current.toFixed(decimals)
    }
    return Math.floor(current)
  })

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true)
      spring.set(value)
    }
  }, [isInView, value, hasAnimated, spring])

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="tabular-nums"
    >
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  )
}

export default AnimatedCounter