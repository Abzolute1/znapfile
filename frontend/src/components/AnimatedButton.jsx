import { motion } from 'framer-motion'

const AnimatedButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  type = 'button',
  disabled = false,
  className = '',
  ...props 
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg hover:shadow-xl btn-glow',
    secondary: 'glass-card text-text border border-border hover:border-primary transition-all',
    ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-white/5',
    danger: 'bg-gradient-to-r from-error to-red-600 text-white shadow-lg hover:shadow-xl'
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }
  
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        relative overflow-hidden font-medium rounded-lg transition-all duration-300
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {variant === 'primary' && !disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.button>
  )
}

export default AnimatedButton