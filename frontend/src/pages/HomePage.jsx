import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { 
  Upload, Shield, Zap, Heart, Lock, Globe, 
  LogIn, UserPlus, BarChart3, ArrowRight,
  FileText, Users, Sparkles, Star, Check,
  Key, Server, ShieldCheck, Database, 
  Fingerprint, Activity, Layers, Code,
  AlertTriangle, Terminal, Cpu, CloudOff
} from 'lucide-react'
import useStore from '../store/useStore'
import ZnapfileLogo from '../components/ZnapfileLogo'
import FileUploader from '../components/FileUploader'

const HomePage = () => {
  const navigate = useNavigate()
  const [showUploader, setShowUploader] = useState(false)
  const [selectedSecurity, setSelectedSecurity] = useState(null)
  const user = useStore(state => state.user)
  const isAuthenticated = !!user
  
  // Redirect authenticated users to their home page
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/user/home')
    }
  }, [isAuthenticated, navigate])
  
  const { scrollY } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 100], [0.8, 1])
  const headerBlur = useTransform(scrollY, [0, 100], [10, 20])
  
  // Parallax effects for sections
  const securityY = useTransform(scrollY, [300, 800], [50, -50])
  const architectureY = useTransform(scrollY, [600, 1200], [30, -30])
  const featuresY = useTransform(scrollY, [900, 1500], [40, -40])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  }

  const features = [
    {
      icon: Shield,
      title: "Your Privacy, Our Promise",
      description: "",
      color: "primary",
      delay: 0.1
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "",
      color: "secondary",
      delay: 0.2
    },
    {
      icon: Globe,
      title: "Always Available",
      description: "",
      color: "accent",
      delay: 0.3
    },
    {
      icon: Heart,
      title: "No Ads, Ever",
      description: "",
      color: "error",
      delay: 0.4
    }
  ]

  return (
    <div className="min-h-screen relative">
      {/* Sticky Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <ZnapfileLogo onClick={() => navigate('/')} />
            <nav className="flex items-center gap-6">
              {isAuthenticated ? (
                <>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-text-muted flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    {user.email}
                  </motion.span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-all duration-300"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Dashboard
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      useStore.getState().clearAuth()
                      navigate('/')
                    }}
                    className="text-sm text-text-muted hover:text-text transition-all duration-300"
                  >
                    Logout
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-all duration-300"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/register')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-hover text-white rounded-lg transition-all duration-300 text-sm font-medium shadow-lg"
                  >
                    <UserPlus className="w-4 h-4" />
                    Get Started
                    <Sparkles className="w-3 h-3" />
                  </motion.button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto"
        >
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1 
              variants={itemVariants}
              className="text-5xl md:text-7xl font-bold mb-6"
            >
              <span className="gradient-text bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Share Your Files
              </span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="text-xl md:text-2xl text-text-muted mb-8"
            >
              Upload your files. Simple, secure, and blazing fast.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              {isAuthenticated ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUploader(true)}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-medium shadow-lg text-lg"
                >
                  <Upload className="w-5 h-5" />
                  Upload Files
                  <Sparkles className="w-4 h-4" />
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/register')}
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-medium shadow-lg text-lg"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 px-8 py-4 glass-card border border-border rounded-xl font-medium text-lg hover:border-primary transition-all"
                  >
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </motion.button>
                </>
              )}
            </motion.div>

            <motion.p 
              variants={itemVariants}
              className="text-sm text-text-muted mt-6"
            >
              No credit card required • No ads • Your privacy guaranteed
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Why Choose Znapfile?</h2>
            <p className="text-xl text-text-muted"></p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: feature.delay }}
                whileHover={{ y: -8 }}
                className="group relative"
              >
                {/* Gradient glow effect */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ${
                  feature.color === 'primary' ? 'bg-gradient-to-br from-primary/20 to-primary/10' :
                  feature.color === 'secondary' ? 'bg-gradient-to-br from-secondary/20 to-secondary/10' :
                  feature.color === 'accent' ? 'bg-gradient-to-br from-accent/20 to-accent/10' :
                  'bg-gradient-to-br from-error/20 to-error/10'
                }`} />
                
                <div className="relative h-full bg-gradient-to-br from-card-bg/90 to-card-bg/70 backdrop-blur-xl p-8 rounded-2xl border border-border/50 hover:border-border transition-all duration-300 overflow-hidden">
                  {/* Subtle gradient overlay */}
                  <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity ${
                    feature.color === 'primary' ? 'bg-gradient-to-br from-primary to-transparent' :
                    feature.color === 'secondary' ? 'bg-gradient-to-br from-secondary to-transparent' :
                    feature.color === 'accent' ? 'bg-gradient-to-br from-accent to-transparent' :
                    'bg-gradient-to-br from-error to-transparent'
                  }`} />
                  
                  <div className="relative">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 400 }}
                      className={`w-14 h-14 mb-6 mx-auto rounded-2xl flex items-center justify-center relative ${
                        feature.color === 'primary' ? 'bg-gradient-to-br from-primary/20 to-primary/10' :
                        feature.color === 'secondary' ? 'bg-gradient-to-br from-secondary/20 to-secondary/10' :
                        feature.color === 'accent' ? 'bg-gradient-to-br from-accent/20 to-accent/10' :
                        'bg-gradient-to-br from-error/20 to-error/10'
                      }`}
                    >
                      {/* Icon ring effect */}
                      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-700 ${
                        feature.color === 'primary' ? 'bg-primary/20' :
                        feature.color === 'secondary' ? 'bg-secondary/20' :
                        feature.color === 'accent' ? 'bg-accent/20' :
                        'bg-error/20'
                      }`} />
                      <feature.icon className={`w-7 h-7 relative z-10 ${
                        feature.color === 'primary' ? 'text-primary' :
                        feature.color === 'secondary' ? 'text-secondary' :
                        feature.color === 'accent' ? 'text-accent' :
                        'text-error'
                      }`} />
                    </motion.div>
                    
                    <h3 className="text-lg font-semibold text-center tracking-wide">{feature.title}</h3>
                    {feature.description && <p className="text-text-muted mt-2 text-center">{feature.description}</p>}
                    
                    {/* Bottom accent line */}
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-20 h-0.5 transition-all duration-500 ${
                      feature.color === 'primary' ? 'bg-gradient-to-r from-transparent via-primary to-transparent' :
                      feature.color === 'secondary' ? 'bg-gradient-to-r from-transparent via-secondary to-transparent' :
                      feature.color === 'accent' ? 'bg-gradient-to-r from-transparent via-accent to-transparent' :
                      'bg-gradient-to-r from-transparent via-error to-transparent'
                    }`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Implementation Section */}
      <section className="py-20 px-6 relative overflow-hidden bg-gradient-to-b from-transparent to-card-bg/30">
        <motion.div style={{ y: securityY }} className="absolute inset-0">
          <div className="absolute top-10 right-20 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-10 left-20 w-72 h-72 bg-secondary/10 rounded-full blur-[120px]" />
        </motion.div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block p-3 bg-primary/10 rounded-2xl mb-6">
              <Shield className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Security Architecture
            </h2>
            <p className="text-xl text-text-muted max-w-3xl mx-auto">
              Every layer of protection working together.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Key,
                title: "Client-Side AES-256-GCM",
                description: "Files encrypted before upload with military-grade encryption. We never see your unencrypted data.",
                details: "600,000 PBKDF2 iterations"
              },
              {
                icon: Fingerprint,
                title: "Zero-Knowledge Architecture",
                description: "Your password never touches our servers. Keys derived client-side, we store only encrypted blobs.",
                details: "True end-to-end encryption"
              },
              {
                icon: ShieldCheck,
                title: "Proof-of-Work Authentication",
                description: "Adaptive challenges prevent brute force attacks. Exponential difficulty for suspicious behavior.",
                details: "Up to 100x harder for attackers"
              },
              {
                icon: Database,
                title: "Automatic File Deletion",
                description: "Files self-destruct after expiry. No traces left in our systems, guaranteed by design.",
                details: "Cryptographic erasure"
              },
              {
                icon: Terminal,
                title: "CSP & XSS Protection",
                description: "Nonce-based Content Security Policy blocks all inline scripts. Safe DOM manipulation only.",
                details: "Zero XSS vulnerabilities"
              },
              {
                icon: Activity,
                title: "Rate Limiting & DDoS Protection",
                description: "Hierarchical token bucket algorithm with Redis. Streaming uploads prevent memory exhaustion.",
                details: "10,000 req/s capacity per node"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <div 
                  onClick={() => setSelectedSecurity(item)}
                  className="h-full glass-card p-6 rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                      <p className="text-sm text-text-muted mb-2">{item.description}</p>
                      <p className="text-xs text-primary font-medium">{item.details}</p>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to learn more →
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Defense in Depth Architecture */}
      <section className="py-20 px-6">
        <motion.div
          style={{ y: architectureY }}
          className="max-w-6xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block p-3 bg-secondary/10 rounded-2xl mb-6">
              <Layers className="w-12 h-12 text-secondary" />
            </div>
            <h2 className="text-4xl font-bold mb-6">Defense in Depth</h2>
            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              Multiple security layers protect your data. If one fails, others continue defending.
            </p>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                layer: "Network Layer",
                icon: Globe,
                color: "primary",
                items: [
                  "HTTPS enforced with HSTS",
                  "Dynamic CORS validation",
                  "Secure headers (X-Frame-Options, CSP)"
                ]
              },
              {
                layer: "Application Layer",
                icon: Code,
                color: "secondary",
                items: [
                  "Input validation & sanitization",
                  "SQL injection prevention",
                  "CSRF protection on all state changes"
                ]
              },
              {
                layer: "Authentication Layer",
                icon: Lock,
                color: "accent",
                items: [
                  "JWT with blacklist support",
                  "Adaptive proof-of-work",
                  "Automatic session invalidation"
                ]
              },
              {
                layer: "Cryptographic Layer",
                icon: Key,
                color: "success",
                items: [
                  "AES-256-GCM encryption",
                  "Separate IVs for each operation",
                  "Secure random generation"
                ]
              }
            ].map((layer, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass-card p-6 rounded-2xl border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    layer.color === 'primary' ? 'bg-primary/10' :
                    layer.color === 'secondary' ? 'bg-secondary/10' :
                    layer.color === 'accent' ? 'bg-accent/10' :
                    'bg-success/10'
                  }`}>
                    <layer.icon className={`w-5 h-5 ${
                      layer.color === 'primary' ? 'text-primary' :
                      layer.color === 'secondary' ? 'text-secondary' :
                      layer.color === 'accent' ? 'text-accent' :
                      'text-success'
                    }`} />
                  </div>
                  <h3 className="text-xl font-semibold">{layer.layer}</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {layer.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success flex-shrink-0" />
                      <span className="text-sm text-text-muted">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Security Standards */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-card-bg/20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block p-3 bg-accent/10 rounded-2xl mb-6">
              <Cpu className="w-12 h-12 text-accent" />
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Compliance & Standards
            </h2>
            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              Meeting and exceeding industry security standards.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                standard: "Encryption",
                level: "AES-256-GCM",
                description: "Military-grade encryption standard used by governments worldwide"
              },
              {
                standard: "Key Derivation",
                level: "PBKDF2 600K",
                description: "600,000 iterations making brute force mathematically infeasible"
              },
              {
                standard: "Token Security",
                level: "JWT + Blacklist",
                description: "Instant revocation capability with Redis-backed invalidation"
              },
              {
                standard: "Rate Limiting",
                level: "Adaptive PoW",
                description: "Exponentially harder challenges for suspicious behavior patterns"
              },
              {
                standard: "Memory Safety",
                level: "Stream Processing",
                description: "Chunk-based file handling prevents memory exhaustion attacks"
              },
              {
                standard: "XSS Prevention",
                level: "CSP Nonce-Based",
                description: "Content Security Policy blocks all unauthorized script execution"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card p-6 rounded-xl border border-border hover:border-accent/50 transition-all"
              >
                <h3 className="font-semibold mb-2">{item.standard}</h3>
                <div className="text-lg text-accent font-mono mb-3">{item.level}</div>
                <p className="text-sm text-text-muted">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6">
        <motion.div
          style={{ y: featuresY }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block p-3 bg-primary/10 rounded-2xl mb-6">
              <Heart className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-4xl font-bold mb-6">Privacy by Design</h2>
            <p className="text-xl text-text-muted mb-12 max-w-2xl mx-auto">
              We can't sell what we don't collect. We can't leak what we can't decrypt. 
              Your privacy is mathematically guaranteed.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card p-6 rounded-2xl border border-border"
              >
                <div className="text-3xl font-bold text-primary mb-2">0</div>
                <p className="text-text-muted">Files we can decrypt</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card p-6 rounded-2xl border border-border"
              >
                <div className="text-3xl font-bold text-primary mb-2">0</div>
                <p className="text-text-muted">User data collected</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card p-6 rounded-2xl border border-border"
              >
                <div className="text-3xl font-bold text-primary mb-2">∞</div>
                <p className="text-text-muted">Your peace of mind</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="glass-card p-12 rounded-3xl text-center relative overflow-hidden">
            
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-4">Ready to Share?</h2>
              <p className="text-xl text-text-muted mb-8">
                Join thousands who trust Znapfile for secure file sharing
              </p>
              {isAuthenticated ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUploader(true)}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-medium shadow-lg text-lg"
                >
                  <Upload className="w-5 h-5" />
                  Start Uploading
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-medium shadow-lg text-lg"
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-text-muted">
            © 2025 Znapfile. No cookies, no tracking, just file sharing done right.
          </p>
        </div>
      </footer>

      {/* Security Detail Modal */}
      <AnimatePresence>
        {selectedSecurity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSecurity(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-8 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                    {selectedSecurity.icon && <selectedSecurity.icon className="w-8 h-8 text-primary" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedSecurity.title}</h2>
                    <p className="text-sm text-primary font-medium">{selectedSecurity.details}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSecurity(null)}
                  className="p-2 hover:bg-white/5 rounded-lg transition text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">How it works</h3>
                  <p className="text-text-muted">{selectedSecurity.description}</p>
                </div>
                
                {selectedSecurity.title === "Client-Side AES-256-GCM" && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Technical Details</h3>
                      <ul className="space-y-2 text-text-muted">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Files are encrypted in your browser using the Web Crypto API</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>256-bit keys derived from your password using PBKDF2 with 600,000 iterations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Each file gets a unique initialization vector (IV)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>GCM mode provides both encryption and authentication</span>
                        </li>
                      </ul>
                    </div>
                  </>
                )}
                
                {selectedSecurity.title === "Zero-Knowledge Architecture" && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">What this means</h3>
                      <ul className="space-y-2 text-text-muted">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Your password is never sent to our servers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Encryption keys are derived client-side only</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>We store only encrypted data that we cannot decrypt</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Even with full database access, your files remain secure</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm">
                        <strong>Zero-Knowledge Proof:</strong> We can verify you have the correct password without ever knowing what it is.
                      </p>
                    </div>
                  </>
                )}
                
                {selectedSecurity.title === "Proof-of-Work Authentication" && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Adaptive Security</h3>
                      <ul className="space-y-2 text-text-muted">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>First few attempts: No challenges required</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Suspicious behavior: Computational puzzles get harder</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Brute force attempts: Exponentially increasing difficulty</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Legitimate users: Minimal impact on experience</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm text-text-muted mb-2">Challenge difficulty progression:</div>
                      <div className="flex items-center gap-2">
                        {[1, 2, 4, 8, 16, 32, 64].map((difficulty, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <div 
                              className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center text-xs"
                              style={{ opacity: 0.3 + (i * 0.1) }}
                            >
                              {difficulty}x
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {selectedSecurity.title === "Automatic File Deletion" && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Cryptographic Erasure</h3>
                      <ul className="space-y-2 text-text-muted">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Files are automatically deleted after expiry time</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Encryption keys are destroyed, making data unrecoverable</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>No manual intervention required or possible</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Even backups become unreadable after key deletion</span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-error/10 p-4 rounded-lg mt-4">
                      <p className="text-sm">
                        <strong>Note:</strong> Once deleted, files cannot be recovered by anyone, including us. This is by design.
                      </p>
                    </div>
                  </>
                )}
                
                {selectedSecurity.title === "CSP & XSS Protection" && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Content Security Policy</h3>
                      <ul className="space-y-2 text-text-muted">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Nonce-based CSP prevents inline script injection</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>No eval() or unsafe-inline allowed anywhere</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>All DOM manipulation uses safe methods only</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Third-party scripts completely blocked</span>
                        </li>
                      </ul>
                    </div>
                  </>
                )}
                
                {selectedSecurity.title === "Rate Limiting & DDoS Protection" && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Multi-Layer Protection</h3>
                      <ul className="space-y-2 text-text-muted">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Hierarchical token bucket algorithm with Redis</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Per-IP, per-endpoint, and global rate limits</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Streaming uploads prevent memory exhaustion</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Automatic scaling under load</span>
                        </li>
                      </ul>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-3 bg-dark-bg/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">10K</div>
                        <div className="text-xs text-text-muted">req/s per node</div>
                      </div>
                      <div className="text-center p-3 bg-dark-bg/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">50ms</div>
                        <div className="text-xs text-text-muted">avg latency</div>
                      </div>
                      <div className="text-center p-3 bg-dark-bg/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">99.9%</div>
                        <div className="text-xs text-text-muted">uptime SLA</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploader(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Upload Files</h2>
                <button
                  onClick={() => setShowUploader(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
              
              <FileUploader
                onUploadComplete={() => {
                  setShowUploader(false)
                  navigate('/dashboard')
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default HomePage